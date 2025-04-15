/**
 * Connector Framework - Base system for building service connectors
 * with built-in affiliate tracking and analytics
 */

export interface ConnectorConfig {
  name: string;
  description: string;
  version: string;
  author: string;
  website?: string;
  supportEmail?: string;
  pricing?: 'free' | 'premium' | 'enterprise';
  affiliateEnabled: boolean;
  affiliateConfig?: {
    partnerCode?: string;
    commissionRate?: number;
    signupUrl?: string;
  };
  requiredCredentials: Array<{
    name: string;
    description: string;
    type: 'apiKey' | 'oauth' | 'username_password' | 'token';
    isRequired: boolean;
  }>;
  actions: string[]; // Available actions this connector can perform
  triggers: string[]; // Events this connector can emit
  dataSchema: Record<string, any>; // JSON schema of the data model
}

// Base connector class that all service connectors will extend
export abstract class BaseConnector {
  public config: ConnectorConfig;
  protected credentials: Record<string, any> = {};
  private _isConnected: boolean = false;
  private _lastSync?: Date;
  private _affiliateStats: {
    views: number;
    clicks: number;
    signups: number;
    revenue: number;
  } = { views: 0, clicks: 0, signups: 0, revenue: 0 };

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  // Core methods that all connectors must implement
  abstract async connect(): Promise<boolean>;
  abstract async disconnect(): Promise<boolean>;
  abstract async testConnection(): Promise<{ success: boolean; message?: string }>;
  abstract async getSchema(): Promise<Record<string, any>>;
  
  // Optional methods with default implementations
  async getAvailableActions(): Promise<string[]> {
    return this.config.actions;
  }
  
  async getAvailableTriggers(): Promise<string[]> {
    return this.config.triggers;
  }
  
  // Every connector must implement executeAction with custom typing
  abstract async executeAction(
    action: string, 
    params: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }>;
  
  // Set credentials
  async setCredentials(creds: Record<string, any>): Promise<void> {
    this.credentials = creds;
  }
  
  // Connection status
  get isConnected(): boolean {
    return this._isConnected;
  }
  
  protected setConnected(status: boolean): void {
    this._isConnected = status;
    if (status) {
      this._lastSync = new Date();
    }
  }
  
  get lastSync(): Date | undefined {
    return this._lastSync;
  }
  
  // Affiliate tracking methods
  recordView(): void {
    if (this.config.affiliateEnabled) {
      this._affiliateStats.views++;
      // In a real implementation, we would log this to a database
      console.log(`View recorded for ${this.config.name} connector`);
    }
  }
  
  recordClick(): void {
    if (this.config.affiliateEnabled) {
      this._affiliateStats.clicks++;
      // In a real implementation, we would log this to a database
      console.log(`Click recorded for ${this.config.name} connector`);
    }
  }
  
  recordSignup(): void {
    if (this.config.affiliateEnabled) {
      this._affiliateStats.signups++;
      // In a real implementation, we would log this to a database
      console.log(`Signup recorded for ${this.config.name} connector`);
    }
  }
  
  recordRevenue(amount: number): void {
    if (this.config.affiliateEnabled) {
      this._affiliateStats.revenue += amount;
      // In a real implementation, we would log this to a database
      console.log(`Revenue of ${amount} recorded for ${this.config.name} connector`);
    }
  }
  
  getAffiliateStats(): typeof this._affiliateStats {
    return { ...this._affiliateStats };
  }
  
  getSignupUrl(userId?: string): string {
    if (!this.config.affiliateEnabled || !this.config.affiliateConfig?.signupUrl) {
      return '';
    }
    
    const baseUrl = this.config.affiliateConfig.signupUrl;
    const partnerCode = this.config.affiliateConfig.partnerCode;
    
    // Add tracking parameters to the URL
    const url = new URL(baseUrl);
    if (partnerCode) {
      url.searchParams.append('partner', partnerCode);
    }
    if (userId) {
      url.searchParams.append('ref', userId);
    }
    
    return url.toString();
  }
}

// Registry to manage all available connectors
export class ConnectorRegistry {
  private connectors: Map<string, typeof BaseConnector> = new Map();
  
  registerConnector(id: string, connectorClass: typeof BaseConnector): void {
    this.connectors.set(id, connectorClass);
  }
  
  getConnector(id: string): typeof BaseConnector | undefined {
    return this.connectors.get(id);
  }
  
  listConnectors(): Array<{ id: string, config: ConnectorConfig }> {
    const result: Array<{ id: string, config: ConnectorConfig }> = [];
    
    this.connectors.forEach((ConnectorClass, id) => {
      // Create a temporary instance to get the config
      const tempInstance = new (ConnectorClass as any)();
      result.push({
        id,
        config: tempInstance.config
      });
    });
    
    return result;
  }
}

// Global connector registry instance
export const connectorRegistry = new ConnectorRegistry();

// Interface for workflow definitions
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: {
    connectorId: string;
    event: string;
    config: Record<string, any>;
  };
  actions: Array<{
    connectorId: string;
    action: string;
    config: Record<string, any>;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  runCount: number;
  ownerId: number;
}

// WorkflowEngine manages all workflows and their execution
export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }
  
  removeWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }
  
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }
  
  listWorkflows(ownerId?: number): Workflow[] {
    const result: Workflow[] = [];
    
    this.workflows.forEach(workflow => {
      if (!ownerId || workflow.ownerId === ownerId) {
        result.push(workflow);
      }
    });
    
    return result;
  }
  
  // Execute a specific workflow manually
  async executeWorkflow(
    id: string, 
    triggerData?: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    const workflow = this.workflows.get(id);
    
    if (!workflow) {
      return { success: false, message: 'Workflow not found' };
    }
    
    if (!workflow.isActive) {
      return { success: false, message: 'Workflow is not active' };
    }
    
    try {
      // In a real implementation, we would:
      // 1. Load the trigger connector
      // 2. Verify the trigger event
      // 3. Execute each action in order
      // 4. Handle failures and retry logic
      
      // For now, we'll just log the execution
      console.log(`Executing workflow ${workflow.name}`);
      
      // Update workflow statistics
      workflow.lastRun = new Date();
      workflow.runCount++;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine();