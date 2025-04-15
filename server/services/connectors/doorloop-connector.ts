import { BaseConnector, ConnectorConfig } from '../connector-framework';
import { TransactionCategory, TransactionType } from '@shared/schema';

/**
 * DoorLoop Property Management Connector
 * Implements the BaseConnector for integration with DoorLoop API
 * Includes affiliate tracking for DoorLoop signups
 */

// DoorLoop-specific data types
interface DoorLoopProperty {
  id: string;
  name: string;
  address: string;
  units: number;
  status: string;
}

interface DoorLoopTenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  leaseStart: string;
  leaseEnd: string;
}

interface DoorLoopTransaction {
  id: string;
  amount: number;
  date: string;
  type: string;
  description: string;
  status: string;
}

// DoorLoop connector configuration
const doorloopConnectorConfig: ConnectorConfig = {
  name: "DoorLoop Property Management",
  description: "Connect to DoorLoop for property management, tenant tracking, and rent collection",
  version: "1.0.0",
  author: "ARIBIA LLC",
  website: "https://doorloop.com",
  supportEmail: "support@doorloop.com",
  pricing: "premium",
  affiliateEnabled: true,
  affiliateConfig: {
    partnerCode: "ARIBIA",
    commissionRate: 0.2, // 20% commission
    signupUrl: "https://doorloop.com/signup",
  },
  requiredCredentials: [
    {
      name: "apiKey",
      description: "DoorLoop API Key",
      type: "apiKey",
      isRequired: true,
    }
  ],
  actions: [
    "getProperties",
    "getTenants",
    "getTransactions",
    "createProperty",
    "createTenant",
    "reconcileFinancials"
  ],
  triggers: [
    "newLease",
    "leaseRenewal",
    "maintenanceRequest",
    "paymentReceived",
    "leaseEnding"
  ],
  dataSchema: {
    property: {
      id: "string",
      name: "string",
      address: "string",
      units: "number",
      status: "string"
    },
    tenant: {
      id: "string",
      firstName: "string",
      lastName: "string",
      email: "string",
      phone: "string",
      leaseStart: "string",
      leaseEnd: "string"
    },
    transaction: {
      id: "string",
      amount: "number",
      date: "string",
      type: "string",
      description: "string",
      status: "string"
    }
  }
};

export class DoorLoopConnector extends BaseConnector {
  private apiKey: string = "";
  
  constructor() {
    super(doorloopConnectorConfig);
  }
  
  async connect(): Promise<boolean> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error("API Key is required");
      }
      
      this.apiKey = this.credentials.apiKey;
      
      // Test connection by fetching properties
      const result = await this.testConnection();
      this.setConnected(result.success);
      
      return result.success;
    } catch (error) {
      this.setConnected(false);
      console.error("DoorLoop connection error:", error);
      return false;
    }
  }
  
  async disconnect(): Promise<boolean> {
    this.setConnected(false);
    this.apiKey = "";
    return true;
  }
  
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Validate API key by making a test request
      const properties = await this.executeAction("getProperties", {});
      
      if (!properties.success) {
        return { 
          success: false, 
          message: "Invalid API key or connection failed" 
        };
      }
      
      return { 
        success: true, 
        message: `Connected successfully. Found ${properties.data?.length || 0} properties.`
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }
  
  async getSchema(): Promise<Record<string, any>> {
    return this.config.dataSchema;
  }
  
  async executeAction(
    action: string, 
    params: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      switch (action) {
        case "getProperties":
          return await this.getProperties();
        case "getTenants":
          return await this.getTenants();
        case "getTransactions":
          return await this.getTransactions();
        case "createProperty":
          return await this.createProperty(params);
        case "createTenant":
          return await this.createTenant(params);
        case "reconcileFinancials":
          return await this.reconcileFinancials();
        default:
          return { success: false, error: `Action ${action} not supported` };
      }
    } catch (error) {
      console.error(`Error executing DoorLoop action ${action}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
  
  // Implementation of DoorLoop API actions
  
  private async getProperties(): Promise<{ success: boolean; data?: DoorLoopProperty[]; error?: string }> {
    try {
      const response = await this.makeDoorLoopRequest("properties", "GET");
      
      if (!Array.isArray(response)) {
        return {
          success: false,
          error: "Unexpected response format from DoorLoop API"
        };
      }
      
      return {
        success: true,
        data: response as DoorLoopProperty[]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch properties"
      };
    }
  }
  
  private async getTenants(): Promise<{ success: boolean; data?: DoorLoopTenant[]; error?: string }> {
    try {
      const response = await this.makeDoorLoopRequest("tenants", "GET");
      
      if (!Array.isArray(response)) {
        return {
          success: false,
          error: "Unexpected response format from DoorLoop API"
        };
      }
      
      return {
        success: true,
        data: response as DoorLoopTenant[]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tenants"
      };
    }
  }
  
  private async getTransactions(): Promise<{ success: boolean; data?: DoorLoopTransaction[]; error?: string }> {
    try {
      const response = await this.makeDoorLoopRequest("transactions", "GET");
      
      if (!Array.isArray(response)) {
        return {
          success: false,
          error: "Unexpected response format from DoorLoop API"
        };
      }
      
      return {
        success: true,
        data: response as DoorLoopTransaction[]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch transactions"
      };
    }
  }
  
  private async createProperty(propertyData: Partial<DoorLoopProperty>): Promise<{ success: boolean; data?: DoorLoopProperty; error?: string }> {
    try {
      const response = await this.makeDoorLoopRequest("properties", "POST", propertyData);
      
      return {
        success: true,
        data: response as DoorLoopProperty
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create property"
      };
    }
  }
  
  private async createTenant(tenantData: Partial<DoorLoopTenant>): Promise<{ success: boolean; data?: DoorLoopTenant; error?: string }> {
    try {
      const response = await this.makeDoorLoopRequest("tenants", "POST", tenantData);
      
      return {
        success: true,
        data: response as DoorLoopTenant
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create tenant"
      };
    }
  }
  
  private async reconcileFinancials(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const transactions = await this.getTransactions();
      
      if (!transactions.success) {
        return {
          success: false,
          error: "Failed to get transactions for reconciliation"
        };
      }
      
      // This would typically involve complex reconciliation logic
      // For now, we'll just return a placeholder success response
      return {
        success: true,
        data: {
          reconciled: true,
          transactionCount: transactions.data?.length || 0,
          totalAmount: transactions.data?.reduce((sum, t) => sum + t.amount, 0) || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reconcile financials"
      };
    }
  }
  
  // Map DoorLoop transaction categories to our standard categories
  mapDoorLoopCategory(description: string): keyof typeof TransactionCategory {
    // Convert description to lowercase for case-insensitive matching
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('rent') || lowerDesc.includes('lease')) {
      return 'rent';
    } else if (lowerDesc.includes('repair') || lowerDesc.includes('maintenance')) {
      return 'maintenance';
    } else if (lowerDesc.includes('water') || lowerDesc.includes('electric') || lowerDesc.includes('gas') || lowerDesc.includes('utility')) {
      return 'utilities';
    } else if (lowerDesc.includes('insurance')) {
      return 'insurance';
    } else if (lowerDesc.includes('tax')) {
      return 'taxes';
    } else if (lowerDesc.includes('mortgage') || lowerDesc.includes('loan')) {
      return 'mortgage';
    } else if (lowerDesc.includes('supply') || lowerDesc.includes('supplies')) {
      return 'supplies';
    } else if (lowerDesc.includes('clean') || lowerDesc.includes('janitorial')) {
      return 'cleaning';
    } else if (lowerDesc.includes('advertis') || lowerDesc.includes('marketing')) {
      return 'marketing';
    } else {
      return 'other';
    }
  }
  
  // Map DoorLoop transaction types to our standard types
  mapDoorLoopTransactionType(type: string): keyof typeof TransactionType {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('income') || lowerType.includes('revenue') || lowerType.includes('payment received')) {
      return 'income';
    } else {
      return 'expense';
    }
  }
  
  // Helper method to make DoorLoop API requests
  private async makeDoorLoopRequest(endpoint: string, method: string, data?: any): Promise<any> {
    try {
      // In a real implementation, this would make actual API calls to DoorLoop
      // For demo purposes, we'll simulate responses
      
      // Normally this would be:
      // const url = `https://api.doorloop.com/v1/${endpoint}`;
      // const options = {
      //   method,
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: data ? JSON.stringify(data) : undefined
      // };
      // const response = await fetch(url, options);
      // return await response.json();
      
      // For now, we'll simulate a response to demonstrate the connector structure
      
      if (endpoint === 'properties') {
        if (method === 'GET') {
          // Simulate getting properties
          return [
            { id: 'p1', name: 'Lakeview Apartments', address: '123 Lake St', units: 12, status: 'active' },
            { id: 'p2', name: 'Downtown Condos', address: '456 Main St', units: 8, status: 'active' }
          ];
        } else if (method === 'POST') {
          // Simulate creating a property
          return { 
            id: 'p3', 
            name: data.name || 'New Property', 
            address: data.address || '789 New St', 
            units: data.units || 1, 
            status: 'active' 
          };
        }
      } else if (endpoint === 'tenants') {
        if (method === 'GET') {
          // Simulate getting tenants
          return [
            { 
              id: 't1', 
              firstName: 'John', 
              lastName: 'Doe', 
              email: 'john@example.com', 
              phone: '555-1234', 
              leaseStart: '2023-01-01', 
              leaseEnd: '2024-01-01' 
            },
            { 
              id: 't2', 
              firstName: 'Jane', 
              lastName: 'Smith', 
              email: 'jane@example.com', 
              phone: '555-5678', 
              leaseStart: '2023-03-15', 
              leaseEnd: '2024-03-15' 
            }
          ];
        } else if (method === 'POST') {
          // Simulate creating a tenant
          return { 
            id: 't3', 
            firstName: data.firstName || 'New', 
            lastName: data.lastName || 'Tenant', 
            email: data.email || 'new@example.com', 
            phone: data.phone || '555-9876', 
            leaseStart: data.leaseStart || '2023-06-01', 
            leaseEnd: data.leaseEnd || '2024-06-01' 
          };
        }
      } else if (endpoint === 'transactions') {
        if (method === 'GET') {
          // Simulate getting transactions
          return [
            { 
              id: 'tr1', 
              amount: 1200, 
              date: '2023-05-01', 
              type: 'income', 
              description: 'Rent payment - Unit 101', 
              status: 'completed' 
            },
            { 
              id: 'tr2', 
              amount: -150, 
              date: '2023-05-05', 
              type: 'expense', 
              description: 'Plumbing repair - Unit 103', 
              status: 'completed' 
            },
            { 
              id: 'tr3', 
              amount: -200, 
              date: '2023-05-10', 
              type: 'expense', 
              description: 'Water bill', 
              status: 'completed' 
            }
          ];
        }
      }
      
      // Default empty response for unhandled endpoints
      return [];
      
    } catch (error) {
      console.error("DoorLoop API request failed:", error);
      throw error;
    }
  }
}