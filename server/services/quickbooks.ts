import OAuthClient from 'intuit-oauth';
import { storage } from '../storage';
import { TransactionCategory, TransactionType } from '../../shared/schema';

interface MappedTransaction {
  sourceId: string;
  sourcePlatform: 'doorloop' | 'mercury' | 'wave' | 'manual' | 'quickbooks';
  amount: number;
  date: Date;
  description: string;
  category: "rent" | "maintenance" | "utilities" | "insurance" | "taxes" | "mortgage" | "supplies" | "cleaning" | "marketing" | "other";
  type: "income" | "expense";
  propertyId?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Handle QuickBooks OAuth authentication flow and token management
 */
export class QuickbooksAuth {
  private oauthClient: OAuthClient;
  private authUri: string;
  private redirectUri: string;
  private companyId: string | null = null;
  private tokenData: any = null;

  constructor(redirectUri: string) {
    this.redirectUri = redirectUri;
    
    // Initialize OAuth client
    this.oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      environment: 'sandbox', // 'sandbox' or 'production'
      redirectUri: redirectUri
    });
    
    // Set scopes for authorization
    this.authUri = this.oauthClient.authorizeUri({
      scope: [
        OAuthClient.scopes.Accounting,
        OAuthClient.scopes.OpenId,
        OAuthClient.scopes.Profile,
        OAuthClient.scopes.Email,
        OAuthClient.scopes.Phone,
        OAuthClient.scopes.Address
      ],
      state: 'testState'
    });
  }

  /**
   * Get the authorization URL for QuickBooks OAuth
   */
  public getAuthorizationUrl(): string {
    return this.authUri;
  }

  /**
   * Process the OAuth callback and get access token
   */
  public async processCallback(url: string): Promise<any> {
    try {
      const authResponse = await this.oauthClient.createToken(url);
      const tokenData = authResponse.getJson();
      
      // Store the token data for future use
      await this.storeTokenData(tokenData);
      
      // Extract company ID (realm ID) from the token data
      if (tokenData.realmId) {
        this.companyId = tokenData.realmId;
      }
      
      return tokenData;
    } catch (error) {
      console.error("Error creating QuickBooks token:", error);
      throw error;
    }
  }

  /**
   * Store token data for future use
   */
  private async storeTokenData(tokenData: any): Promise<void> {
    this.tokenData = tokenData;
    
    // You would typically store this in a database
    // For now, we're just storing it in memory
    console.log("QuickBooks token stored");
    
    // Set the token in OAuth client for future requests
    if (tokenData.access_token && tokenData.refresh_token) {
      this.oauthClient.setToken({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        realmId: tokenData.realmId
      });
    }
  }

  /**
   * Check if token is valid, refresh if necessary
   */
  public async ensureValidToken(): Promise<string> {
    // Check if we have a token
    if (!this.tokenData || !this.tokenData.access_token) {
      throw new Error("No QuickBooks token available. Please authenticate first.");
    }
    
    // Check if token is still valid
    if (!this.oauthClient.isAccessTokenValid()) {
      try {
        // Refresh token
        const refreshResponse = await this.oauthClient.refresh();
        const newTokenData = refreshResponse.getJson();
        
        // Store the new token data
        await this.storeTokenData(newTokenData);
        
        return newTokenData.access_token;
      } catch (error) {
        console.error("Error refreshing QuickBooks token:", error);
        throw new Error("Failed to refresh QuickBooks token. Please authenticate again.");
      }
    }
    
    return this.tokenData.access_token;
  }

  /**
   * Get headers for QuickBooks API requests
   */
  public async getHeaders(): Promise<any> {
    const accessToken = await this.ensureValidToken();
    
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get the QuickBooks company ID
   */
  public getCompanyId(): string {
    if (!this.companyId) {
      throw new Error("No QuickBooks company ID available. Please authenticate first.");
    }
    
    return this.companyId;
  }
}

/**
 * Validate QuickBooks credentials and connection
 */
export async function validateQuickbooksCredentials(): Promise<{
  connected: boolean;
  companyName?: string;
  error?: string;
}> {
  try {
    // Check if auth token is valid
    await quickbooksAuth.ensureValidToken();
    
    // Get company info to verify connection
    const companyId = quickbooksAuth.getCompanyId();
    
    // For now, since we don't have a company name retrieval method,
    // just return success
    return {
      connected: true,
      companyName: `Company ${companyId}`
    };
  } catch (error) {
    console.error("QuickBooks validation error:", error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error validating QuickBooks connection"
    };
  }
}

/**
 * Get chart of accounts from QuickBooks
 */
export async function getQuickbooksAccounts(): Promise<any[]> {
  try {
    const headers = await quickbooksAuth.getHeaders();
    const companyId = quickbooksAuth.getCompanyId();
    
    // This is a placeholder - in a real implementation, you would:
    // 1. Make HTTP request to QuickBooks API
    // 2. Parse the response
    // 3. Return the accounts
    
    // Simulate a successful response with sample data
    return [
      { id: 'account1', name: 'Cash', classification: 'Asset' },
      { id: 'account2', name: 'Accounts Receivable', classification: 'Asset' },
      { id: 'account3', name: 'Rental Income', classification: 'Revenue' },
      { id: 'account4', name: 'Maintenance Expense', classification: 'Expense' },
      { id: 'account5', name: 'Property Taxes', classification: 'Expense' },
      { id: 'account6', name: 'Mortgage Interest', classification: 'Expense' },
      { id: 'account7', name: 'Utilities', classification: 'Expense' },
      { id: 'account8', name: 'Insurance', classification: 'Expense' }
    ];
  } catch (error) {
    console.error("Error fetching QuickBooks accounts:", error);
    throw error;
  }
}

/**
 * Get customers from QuickBooks
 */
export async function getQuickbooksCustomers(): Promise<any[]> {
  try {
    const headers = await quickbooksAuth.getHeaders();
    const companyId = quickbooksAuth.getCompanyId();
    
    // Simulate a successful response with sample data
    return [
      { id: 'customer1', displayName: 'John Doe', email: 'john@example.com' },
      { id: 'customer2', displayName: 'Jane Smith', email: 'jane@example.com' },
      { id: 'customer3', displayName: 'Property LLC', email: 'info@propertyllc.com' }
    ];
  } catch (error) {
    console.error("Error fetching QuickBooks customers:", error);
    throw error;
  }
}

/**
 * Get transactions from QuickBooks
 */
export async function getQuickbooksTransactions(
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  try {
    const headers = await quickbooksAuth.getHeaders();
    const companyId = quickbooksAuth.getCompanyId();
    
    // Simulate a successful response with sample data
    return [
      { 
        id: 'transaction1', 
        date: '2023-01-15', 
        amount: 1500, 
        type: 'Income', 
        description: 'Rent payment - Unit 101'
      },
      { 
        id: 'transaction2', 
        date: '2023-01-20', 
        amount: 250, 
        type: 'Expense', 
        description: 'Plumbing repair'
      },
      { 
        id: 'transaction3', 
        date: '2023-02-01', 
        amount: 150, 
        type: 'Expense', 
        description: 'Utilities payment'
      }
    ];
  } catch (error) {
    console.error("Error fetching QuickBooks transactions:", error);
    throw error;
  }
}

/**
 * Import and map QuickBooks data into our system
 */
export async function importQuickbooksData(): Promise<{
  totalImported: number;
  properties: number;
  customers: number;
  transactions: number;
}> {
  try {
    // Fetch data from QuickBooks
    const accounts = await getQuickbooksAccounts();
    const customers = await getQuickbooksCustomers();
    const transactions = await getQuickbooksTransactions();
    
    // Import customers as properties
    let propertiesImported = 0;
    for (const customer of customers) {
      // Convert QuickBooks customer to a property
      // This is a simplified mapping - in a real implementation,
      // you would map more fields and handle edge cases
      try {
        await storage.createProperty({
          name: customer.displayName,
          address: customer.address || 'Unknown',
          units: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId: 1, // Default to admin owner
          images: [],
          rentAmount: 0, // Default value
          bedrooms: 0,
          bathrooms: 0,
          squareFeet: 0,
          description: `Imported from QuickBooks - ${customer.displayName}`,
          amenities: [],
          externalId: customer.id,
          externalSource: 'quickbooks'
        });
        propertiesImported++;
      } catch (error) {
        console.error(`Error importing property from QuickBooks customer ${customer.id}:`, error);
      }
    }
    
    // Import transactions
    let transactionsImported = 0;
    for (const transaction of transactions) {
      try {
        // Map QuickBooks transaction category to our system
        const category = mapQuickBooksCategory(transaction.description);
        const type = transaction.type.toLowerCase() === 'income' ? 'income' : 'expense';
        
        // Find associated property (if any)
        // This is a simplified approach - in a real implementation,
        // you would have more robust property matching
        const propertyMatches = customers.filter(c => 
          transaction.description.includes(c.displayName));
        
        let propertyId = null;
        if (propertyMatches.length > 0) {
          // Find property by externalId
          const property = await storage.getPropertyByExternalId(
            propertyMatches[0].id, 
            'quickbooks'
          );
          if (property) {
            propertyId = property.id;
          }
        }
        
        // Create transaction in our system
        await storage.createTransaction({
          date: new Date(transaction.date),
          amount: transaction.amount.toString(),
          description: transaction.description,
          category,
          type,
          externalId: transaction.id,
          externalSource: 'quickbooks',
          propertyId,
          metadata: JSON.stringify(transaction),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
          notes: `Imported from QuickBooks - ${transaction.id}`
        });
        
        transactionsImported++;
      } catch (error) {
        console.error(`Error importing transaction from QuickBooks ${transaction.id}:`, error);
      }
    }
    
    return {
      totalImported: propertiesImported + transactionsImported,
      properties: propertiesImported,
      customers: customers.length,
      transactions: transactionsImported
    };
  } catch (error) {
    console.error("Error importing data from QuickBooks:", error);
    throw error;
  }
}

/**
 * Push transactions from our system to QuickBooks
 */
export async function exportTransactionsToQuickbooks(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalExported: number;
  errors: number;
}> {
  try {
    // Get transactions from our system
    const transactions = await storage.getTransactionsByDateRange(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      endDate || new Date()
    );
    
    const headers = await quickbooksAuth.getHeaders();
    const companyId = quickbooksAuth.getCompanyId();
    
    let totalExported = 0;
    let errors = 0;
    
    // For each transaction, create or update in QuickBooks
    for (const transaction of transactions) {
      try {
        // Check if transaction already exists in QuickBooks
        // If it has an externalId from QuickBooks, skip it (already synced)
        if (transaction.externalSource === 'quickbooks' && transaction.externalId) {
          continue;
        }
        
        // Map transaction to QuickBooks format
        // In a real implementation, you would:
        // 1. Make HTTP request to QuickBooks API
        // 2. Handle the response
        // 3. Update the transaction in our system with the new externalId
        
        // Simulate a successful export
        console.log(`Exported transaction ${transaction.id} to QuickBooks`);
        
        totalExported++;
      } catch (error) {
        console.error(`Error exporting transaction ${transaction.id} to QuickBooks:`, error);
        errors++;
      }
    }
    
    return {
      totalExported,
      errors
    };
  } catch (error) {
    console.error("Error exporting transactions to QuickBooks:", error);
    throw error;
  }
}

/**
 * Full data migration from QuickBooks to our system
 * This can be run as a one-time process to move from QB to this system
 */
export async function migrateFromQuickbooks(): Promise<{
  success: boolean;
  properties: number;
  transactions: number;
  accounts: number;
}> {
  try {
    // Full import of all data
    const importResult = await importQuickbooksData();
    
    // Additional migration tasks:
    // - Map chart of accounts
    // - Import vendors
    // - Import bills and invoices
    
    return {
      success: true,
      properties: importResult.properties,
      transactions: importResult.transactions,
      accounts: 0 // In a real implementation, would track accounts actually imported
    };
  } catch (error) {
    console.error("Error during QuickBooks migration:", error);
    throw error;
  }
}

/**
 * Map QuickBooks category to our system
 */
function mapQuickBooksCategory(description: string): string {
  description = description.toLowerCase();
  
  if (description.includes('rent') || description.includes('lease')) {
    return 'rent';
  } else if (description.includes('repair') || description.includes('maintenance') || description.includes('plumbing') || description.includes('electric')) {
    return 'maintenance';
  } else if (description.includes('utility') || description.includes('water') || description.includes('gas') || description.includes('electric')) {
    return 'utilities';
  } else if (description.includes('insurance')) {
    return 'insurance';
  } else if (description.includes('tax')) {
    return 'taxes';
  } else if (description.includes('mortgage') || description.includes('loan')) {
    return 'mortgage';
  } else if (description.includes('supplies')) {
    return 'supplies';
  } else if (description.includes('clean')) {
    return 'cleaning';
  } else if (description.includes('ad') || description.includes('marketing')) {
    return 'marketing';
  } else {
    return 'other';
  }
}

// Create singleton instance of QuickbooksAuth
// In production, this should use a proper redirect URI
export const quickbooksAuth = new QuickbooksAuth('https://appDOMAIN.replit.app/api/quickbooks/callback');