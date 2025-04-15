import { BaseConnector, ConnectorConfig } from '../connector-framework';
import { tryMultipleTokenFormats } from '../wave';

/**
 * Wave Accounting Connector
 * Implements the BaseConnector for integration with Wave Accounting API
 * Includes affiliate tracking for Wave signups
 */

// Wave-specific data types
interface WaveBusinesses {
  businesses: {
    id: string;
    name: string;
    isClassicAccounting: boolean;
    isPersonal: boolean;
  }[];
}

interface WaveCustomer {
  id: string;
  name: string;
  email?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  currency?: string;
}

interface WaveInvoice {
  id: string;
  invoiceNumber?: string;
  status: string;
  total?: {
    value: string;
    currency: {
      code: string;
    };
  };
}

// Wave connector configuration
const waveConnectorConfig: ConnectorConfig = {
  name: "Wave Accounting",
  description: "Connect to Wave Accounting for invoicing, customer management, and transaction syncing",
  version: "1.0.0",
  author: "ARIBIA LLC",
  website: "https://waveapps.com",
  supportEmail: "support@waveapps.com",
  pricing: "free",
  affiliateEnabled: true,
  affiliateConfig: {
    partnerCode: "ARIBIA",
    commissionRate: 0.1, // 10% commission
    signupUrl: "https://waveapps.com/signup",
  },
  requiredCredentials: [
    {
      name: "apiToken",
      description: "Wave API Token",
      type: "apiKey",
      isRequired: true,
    }
  ],
  actions: [
    "getBusinesses",
    "getCustomers",
    "createCustomer",
    "createInvoice",
    "createTransaction",
    "syncAccounts"
  ],
  triggers: [
    "newInvoice",
    "paymentReceived",
    "accountUpdated"
  ],
  dataSchema: {
    customer: {
      id: "string",
      name: "string",
      email: "string?",
      currency: "string?"
    },
    invoice: {
      id: "string",
      invoiceNumber: "string?",
      status: "string",
      total: "money"
    },
    transaction: {
      id: "string",
      description: "string",
      amount: "money",
      date: "date"
    },
    business: {
      id: "string",
      name: "string"
    }
  }
};

export class WaveConnector extends BaseConnector {
  private apiToken: string = "";
  private selectedBusinessId: string = "";
  
  constructor() {
    super(waveConnectorConfig);
  }
  
  async connect(): Promise<boolean> {
    try {
      if (!this.credentials.apiToken) {
        throw new Error("API Token is required");
      }
      
      this.apiToken = this.credentials.apiToken;
      
      // Test connection by fetching businesses
      const result = await this.testConnection();
      this.setConnected(result.success);
      
      return result.success;
    } catch (error) {
      this.setConnected(false);
      console.error("Wave connection error:", error);
      return false;
    }
  }
  
  async disconnect(): Promise<boolean> {
    this.setConnected(false);
    this.apiToken = "";
    this.selectedBusinessId = "";
    return true;
  }
  
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Validate API token by making a test request
      const businesses = await this.executeAction("getBusinesses", {});
      
      if (!businesses.success || !businesses.data?.businesses?.length) {
        return { 
          success: false, 
          message: "Invalid API token or no businesses found" 
        };
      }
      
      return { 
        success: true, 
        message: `Connected successfully. Found ${businesses.data.businesses.length} businesses.` 
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
        case "getBusinesses":
          return await this.getBusinesses();
        case "getCustomers":
          return await this.getCustomers(params.businessId);
        case "createCustomer":
          return await this.createCustomer(params);
        case "createInvoice":
          return await this.createInvoice(params);
        case "createTransaction":
          return await this.createTransaction(params);
        case "syncAccounts":
          return await this.syncAccounts(params.businessId);
        default:
          return { success: false, error: `Action ${action} not supported` };
      }
    } catch (error) {
      console.error(`Error executing Wave action ${action}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
  
  async setSelectedBusiness(businessId: string): Promise<void> {
    this.selectedBusinessId = businessId;
  }
  
  // Implementation of Wave API actions
  
  private async getBusinesses(): Promise<{ success: boolean; data?: WaveBusinesses; error?: string }> {
    try {
      const response = await this.makeWaveRequest("businesses", "GET");
      
      return {
        success: true,
        data: response as WaveBusinesses
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch businesses"
      };
    }
  }
  
  private async getCustomers(businessId?: string): Promise<{ success: boolean; data?: WaveCustomer[]; error?: string }> {
    try {
      const targetBusinessId = businessId || this.selectedBusinessId;
      if (!targetBusinessId) {
        return { success: false, error: "No business selected" };
      }
      
      const response = await this.makeWaveRequest(`businesses/${targetBusinessId}/customers`, "GET");
      
      return {
        success: true,
        data: response.customers || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch customers"
      };
    }
  }
  
  private async createCustomer(params: any): Promise<{ success: boolean; data?: WaveCustomer; error?: string }> {
    try {
      const businessId = params.businessId || this.selectedBusinessId;
      if (!businessId) {
        return { success: false, error: "No business selected" };
      }
      
      // Remove businessId from the params to avoid sending it to Wave
      const { businessId: _, ...customerData } = params;
      
      const response = await this.makeWaveRequest(`businesses/${businessId}/customers`, "POST", customerData);
      
      return {
        success: true,
        data: response.customer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create customer"
      };
    }
  }
  
  private async createInvoice(params: any): Promise<{ success: boolean; data?: WaveInvoice; error?: string }> {
    try {
      const businessId = params.businessId || this.selectedBusinessId;
      if (!businessId) {
        return { success: false, error: "No business selected" };
      }
      
      // Remove businessId from the params to avoid sending it to Wave
      const { businessId: _, ...invoiceData } = params;
      
      const response = await this.makeWaveRequest(`businesses/${businessId}/invoices`, "POST", invoiceData);
      
      return {
        success: true,
        data: response.invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create invoice"
      };
    }
  }
  
  private async createTransaction(params: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const businessId = params.businessId || this.selectedBusinessId;
      if (!businessId) {
        return { success: false, error: "No business selected" };
      }
      
      // Remove businessId from the params to avoid sending it to Wave
      const { businessId: _, ...transactionData } = params;
      
      const response = await this.makeWaveRequest(`businesses/${businessId}/transactions`, "POST", transactionData);
      
      return {
        success: true,
        data: response.transaction
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create transaction"
      };
    }
  }
  
  private async syncAccounts(businessId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const targetBusinessId = businessId || this.selectedBusinessId;
      if (!targetBusinessId) {
        return { success: false, error: "No business selected" };
      }
      
      const response = await this.makeWaveRequest(`businesses/${targetBusinessId}/accounts/sync`, "POST");
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync accounts"
      };
    }
  }
  
  // Helper method to make Wave API requests
  private async makeWaveRequest(endpoint: string, method: string, data?: any): Promise<any> {
    try {
      return await tryMultipleTokenFormats(this.apiToken, async (token) => {
        const url = `https://api.waveapps.com/v1/${endpoint}`;
        
        const options: RequestInit = {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        if (data) {
          options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Wave API error: ${error}`);
        }
        
        return await response.json();
      });
    } catch (error) {
      console.error("Wave API request failed:", error);
      throw error;
    }
  }
}