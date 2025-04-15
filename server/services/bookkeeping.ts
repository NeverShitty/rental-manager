import { storage } from '../storage';
import { Transaction, InsertTransaction } from '@shared/schema';
import * as doorloop from './doorloop';
import * as wave from './wave';
import * as mercury from './mercury';
import { standardCategories, mapDoorLoopCategory, mapMercuryCategory } from './coa';
import { analyzeTransaction } from './openai';
import axios from 'axios'; // Import axios for Wave token validation

// For TypeScript type safety
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
 * Synchronizes transactions from DoorLoop to the internal system
 * with proper categorization and mapping to Wave accounts
 */
export async function validateWaveCredentials(apiKey?: string): Promise<{success: boolean; message?: string}> {
  const tokenToValidate = apiKey || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
  
  if (!tokenToValidate) {
    return { 
      success: false, 
      message: 'No Wave API token provided or found in environment variables' 
    };
  }
  
  try {
    // Try to make a simple request to Wave API to validate token
    const headers = {
      'Authorization': tokenToValidate.startsWith('Bearer ') ? tokenToValidate : `Bearer ${tokenToValidate}`,
      'Content-Type': 'application/json'
    };
    
    // Simple validation query that should work with any valid token
    const query = `
      query {
        user {
          id
          firstName
          lastName
          defaultEmail
        }
      }
    `;
    
    const response = await axios.post('https://gql.waveapps.com/graphql/public', { query }, { headers });
    
    if (response.data.errors) {
      return { 
        success: false, 
        message: `Wave API validation failed: ${response.data.errors.map((e: any) => e.message).join(', ')}` 
      };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error validating Wave credentials:', error);
    return { 
      success: false, 
      message: `Validation failed: ${error.message || 'Unknown error'}` 
    };
  }
}

export async function pushTransactionsToWave(transactions: MappedTransaction[]): Promise<{
  totalPushed: number;
  errors: number;
}> {
  const result = {
    totalPushed: 0,
    errors: 0
  };
  
  try {
    // Get Wave API token from environment
    const apiToken = process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
    
    if (!apiToken) {
      throw new Error('Wave API token is required. Please set WAVE_API_FULLACCESS_TOKEN environment variable.');
    }
    
    // Call the token-based implementation
    return await pushTransactionsToWaveWithToken(apiToken, undefined, undefined, transactions);
  } catch (error: any) {
    console.error('Error in bulk Wave push:', error);
    throw new Error(`Failed to push transactions to Wave: ${error.message}`);
  }
}

/**
 * Synchronizes Mercury bank transactions with the system and maps them to COA categories
 */
export async function syncMercuryWithCOA(apiKey?: string): Promise<{
  imported: number;
  categorized: number;
  mapped: number;
  accountsProcessed: number;
}> {
  try {
    // Set the API key in the environment if provided and not already there
    if (apiKey && !process.env.MERCURY_API_KEY) {
      process.env.MERCURY_API_KEY = apiKey;
    }

    // Validate that we have an API key
    if (!process.env.MERCURY_API_KEY && !apiKey) {
      throw new Error('Mercury API key is required');
    }

    console.log('Syncing Mercury accounts and transactions...');
    
    // Get all Mercury accounts first
    const mercuryAccounts = await mercury.getMercuryAccounts();
    
    // Track metrics
    const result = {
      imported: 0,
      categorized: 0,
      mapped: 0,
      accountsProcessed: mercuryAccounts.length
    };
    
    // Process each account
    for (const account of mercuryAccounts) {
      console.log(`Processing account: ${account.name} (${account.id})`);
      
      // Store/update the account in our system
      const storedAccount = await storage.createOrUpdateMercuryAccount({
        externalId: account.id,
        name: account.name,
        type: account.type.toLowerCase(),
        balance: account.balance.amount.toString(),
        currency: account.balance.currency,
        lastSyncedAt: new Date(),
        createdAt: new Date()
      });
      
      // Get the last sync date for this account to avoid duplicate imports
      const lastSync = await storage.getLastMercurySync(account.id);
      
      // Get transactions for this account
      const mercuryTransactions = await mercury.getMercuryTransactions(account.id, lastSync);
      console.log(`Retrieved ${mercuryTransactions.length} transactions for account ${account.name}`);
      
      // Process each transaction
      for (const transaction of mercuryTransactions) {
        // Map to internal transaction format
        const mappedTransaction: MappedTransaction = {
          sourceId: transaction.id,
          sourcePlatform: 'mercury',
          amount: transaction.amount,
          date: new Date(transaction.transaction_date),
          description: transaction.description,
          type: transaction.type === 'credit' ? 'income' : 'expense',
          category: 'other', // Default to 'other', will try to categorize below
          metadata: { 
            originalObject: transaction,
            counterpartyName: transaction.counterparty_name
          }
        };
        
        // Map Mercury transaction to standard category based on description and counterparty
        let category = 'other';
        
        // Try to find a category match from standard categories
        const description = (transaction.description || '').toLowerCase();
        const counterparty = (transaction.counterparty_name || '').toLowerCase();
        
        // Category mapping logic
        if (description.includes('rent') || description.includes('lease payment')) {
          category = 'rent';
        } else if (description.includes('repair') || description.includes('maintenance') || 
                  counterparty.includes('home depot') || counterparty.includes('lowe')) {
          category = 'maintenance';
        } else if (description.includes('utility') || description.includes('electric') || 
                  description.includes('gas') || description.includes('water') ||
                  counterparty.includes('utility') || counterparty.includes('electric') || 
                  counterparty.includes('energy')) {
          category = 'utilities';
        } else if (description.includes('insurance') || counterparty.includes('insurance')) {
          category = 'insurance';
        } else if (description.includes('tax') || counterparty.includes('tax')) {
          category = 'taxes';
        } else if (description.includes('mortgage') || description.includes('loan payment')) {
          category = 'mortgage';
        } else if (description.includes('supply') || description.includes('office') ||
                  counterparty.includes('staples') || counterparty.includes('amazon')) {
          category = 'supplies';
        } else if (description.includes('clean') || counterparty.includes('cleaning')) {
          category = 'cleaning';
        } else if (description.includes('marketing') || description.includes('advertising') ||
                  counterparty.includes('facebook') || counterparty.includes('google ads')) {
          category = 'marketing';
        }
        
        mappedTransaction.category = category as any;
        
        // If we found a category match
        if (category !== 'other') {
          result.categorized++;
        } else {
          // If category is still 'other', try AI categorization
          try {
            const analysis = await analyzeTransaction(
              mappedTransaction.description,
              mappedTransaction.amount
            );
            
            if (analysis.confidence > 0.7) {
              mappedTransaction.category = analysis.category;
              mappedTransaction.type = analysis.type;
              result.categorized++;
            }
          } catch (err) {
            console.error('Error analyzing transaction:', err);
          }
        }
        
        // Store the mapped transaction in our system
        try {
          const transaction: Omit<Transaction, "id"> = {
            amount: mappedTransaction.amount.toString(),
            description: mappedTransaction.description,
            date: mappedTransaction.date,
            category: mappedTransaction.category,
            type: mappedTransaction.type,
            propertyId: mappedTransaction.propertyId || null,
            externalId: mappedTransaction.sourceId,
            externalSource: mappedTransaction.sourcePlatform,
            aiCategorized: category === 'other', // Only true if AI categorized
            aiConfidence: category === 'other' ? "0.7" : "1.0", // Set appropriate confidence level
            metadata: JSON.stringify(mappedTransaction.metadata),
            receipt: null, // No receipt available from automatic syncing
            createdAt: new Date(),
            createdBy: null
          };
          
          await storage.createTransaction(transaction);
          result.imported++;
          
          // Update the mapping counter if we successfully categorized
          if (mappedTransaction.category !== 'other') {
            result.mapped++;
          }
        } catch (err) {
          console.error('Error saving transaction:', err);
        }
      }
    }
    
    console.log(`Mercury sync completed: ${result.imported} transactions imported, ${result.categorized} categorized, ${result.mapped} mapped`);
    return result;
  } catch (error: any) {
    console.error('Error syncing Mercury transactions:', error);
    throw new Error(`Failed to sync Mercury transactions: ${error.message}`);
  }
}

export async function syncDoorLoopTransactions(apiKey: string): Promise<{
  imported: number;
  categorized: number;
  mapped: number;
}> {
  if (!apiKey) {
    throw new Error('DoorLoop API key is required');
  }

  try {
    // Set the API key in the environment if not already there
    if (!process.env.DOORLOOP_API_KEY) {
      process.env.DOORLOOP_API_KEY = apiKey;
    }

    console.log('Fetching transactions from DoorLoop...');
    const doorloopTransactions = await doorloop.syncTransactions();
    console.log(`Retrieved ${doorloopTransactions.length} transactions from DoorLoop`);

    // Track metrics
    const result = {
      imported: 0,
      categorized: 0,
      mapped: 0
    };

    // Map and store transactions
    for (const dlTransaction of doorloopTransactions) {
      // Map to internal transaction format
      const mappedTransaction: MappedTransaction = {
        sourceId: dlTransaction.id,
        sourcePlatform: 'doorloop',
        amount: dlTransaction.amount,
        date: new Date(dlTransaction.date),
        description: dlTransaction.description,
        type: dlTransaction.type === 'income' ? 'income' : 'expense',
        category: mapDoorLoopCategory(dlTransaction.description) as "rent" | "maintenance" | "utilities" | "insurance" | "taxes" | "mortgage" | "supplies" | "cleaning" | "marketing" | "other",
        metadata: { originalObject: dlTransaction }
      };

      // If category couldn't be clearly determined, use AI to categorize
      if (mappedTransaction.category === 'other') {
        try {
          const analysis = await analyzeTransaction(
            mappedTransaction.description,
            mappedTransaction.amount
          );

          if (analysis.confidence > 0.7) {
            mappedTransaction.category = analysis.category;
            mappedTransaction.type = analysis.type;
            result.categorized++;
          }
        } catch (err) {
          console.error('Error analyzing transaction:', err);
        }
      } else {
        result.categorized++;
      }

      // Store the transaction in our system
      try {
        const transaction: Omit<Transaction, "id"> = {
          amount: mappedTransaction.amount.toString(),
          description: mappedTransaction.description,
          date: mappedTransaction.date,
          category: mappedTransaction.category,
          type: mappedTransaction.type,
          propertyId: mappedTransaction.propertyId || null,
          externalId: mappedTransaction.sourceId,
          externalSource: mappedTransaction.sourcePlatform,
          aiCategorized: mappedTransaction.category === 'other' ? false : true,
          aiConfidence: "1.0", // Set appropriate confidence level
          metadata: JSON.stringify(mappedTransaction.metadata),
          receipt: null, // No receipt available from automatic syncing
          createdAt: new Date(),
          createdBy: null
        };

        await storage.createTransaction(transaction);
        result.imported++;
      } catch (err) {
        console.error('Error saving transaction:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('Error syncing DoorLoop transactions:', error);
    throw new Error(`Failed to sync DoorLoop transactions: ${error.message}`);
  }
}

/**
 * Synchronizes Wave chart of accounts and maps to standard categories
 */
export async function syncWaveAccounts(apiToken: string): Promise<{
  accountsImported: number;
  accountsMapped: number;
}> {
  if (!apiToken) {
    throw new Error('Wave API token is required');
  }

  try {
    console.log('Fetching accounts from Wave...');
    const waveData = await wave.syncWaveAccounts(apiToken);

    const result = {
      accountsImported: 0,
      accountsMapped: 0
    };

    // Process Wave accounts data
    if (waveData?.data?.user?.businesses?.edges) {
      const businessEdges = waveData.data.user.businesses.edges;

      for (const businessEdge of businessEdges) {
        const business = businessEdge.node;
        console.log(`Processing business: ${business.name}`);

        if (business.accounts?.edges) {
          for (const edge of business.accounts.edges) {
            const account = edge.node;
            console.log(`Found Wave account: ${account.name} (${account.type}/${account.subtype})`);

            // Store the Wave account ID in our standard categories mapping
            // This will be used to map transactions to the correct Wave account
            const categoryMap = standardCategories as Record<string, Record<string, any>>;

            // Check each key in our standard categories
            Object.keys(categoryMap).forEach(key => {
              if (account.name.toLowerCase().includes(key.toLowerCase())) {
                // Update the category with the Wave account ID
                console.log(`Mapping category '${key}' to Wave account '${account.name}' (ID: ${account.id})`);
                categoryMap[key].wave = account.id;
                result.accountsMapped++;
              }
            });

            result.accountsImported++;
          }
        }
      }
    }

    // If no accounts were imported, this could indicate an issue with the API response format
    if (result.accountsImported === 0) {
      console.warn('No Wave accounts were imported. API response format may have changed.');
      console.log('Wave API response:', JSON.stringify(waveData, null, 2));
    }

    return result;
  } catch (error) {
    console.error('Error syncing Wave accounts:', error);
    throw new Error(`Failed to sync Wave accounts: ${error.message}`);
  }
}

/**
 * Push transactions from our system to Wave accounting with API token
 */
export async function pushTransactionsToWaveWithToken(
  apiToken: string,
  startDate?: Date,
  endDate?: Date,
  transactions?: MappedTransaction[]
): Promise<{
  totalPushed: number;
  errors: number;
}> {
  if (!apiToken) {
    throw new Error('Wave API token is required');
  }

  const now = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(now.getDate() - 30); // Default to last 30 days

  startDate = startDate || defaultStartDate;
  endDate = endDate || now;

  try {
    // If no transactions provided, get from storage based on date range
    let transactionsToProcess = transactions;
    if (!transactionsToProcess) {
      transactionsToProcess = await storage.getTransactionsByDateRange(startDate, endDate);
    }

    const result = {
      totalPushed: 0,
      errors: 0
    };

    // Get the Wave business ID (would normally come from settings)
    // This is a placeholder - in a real implementation you would store this
    const businessId = process.env.WAVE_BUSINESS_ID || 'default_business_id';

    // Push each transaction to Wave
    for (const transaction of transactionsToProcess) {
      try {
        // Skip transactions already pushed to Wave
        if (transaction.externalSource === 'wave') {
          continue;
        }

        // Prepare the transaction for Wave
        const waveTransaction = {
          businessId,
          date: transaction.date.toISOString().split('T')[0],
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category
        };

        // Push to Wave
        await wave.createWaveTransaction(waveTransaction, apiToken);
        result.totalPushed++;
      } catch (err) {
        console.error('Error pushing transaction to Wave:', err);
        result.errors++;
      }
    }

    return result;
  } catch (error) {
    console.error('Error pushing transactions to Wave:', error);
    throw new Error(`Failed to push transactions to Wave: ${error.message}`);
  }
}

/**
 * Generate a reconciliation report between platforms
 */
export async function generateReconciliationReport(
  doorloopApiKey: string,
  waveApiToken: string,
  forDate?: Date
): Promise<{
  doorloopTotal: number;
  waveTotal: number;
  mercuryTotal: number;
  discrepancies: Array<{
    platform: string;
    description: string;
    amount: number;
    matched: boolean;
  }>;
  reconciliationDate: Date;
}> {
  const reportDate = forDate || new Date();
  const startOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
  const endOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);

  // Set API keys in environment
  if (doorloopApiKey) process.env.DOORLOOP_API_KEY = doorloopApiKey;

  try {
    // Fetch data from all platforms
    const doorloopTransactions = await doorloop.syncTransactions();

    // Filter transactions for the current month
    const filteredDoorloopTransactions = doorloopTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startOfMonth && txDate <= endOfMonth;
    });

    // Get Mercury accounts and transactions
    const mercuryAccounts = await storage.getMercuryAccounts();
    let mercuryTotal = 0;

    for (const account of mercuryAccounts) {
      const mercuryTransactions = await storage.getMercuryTransactions(account.id, startOfMonth);
      mercuryTotal += mercuryTransactions.reduce((sum, tx) => {
        // Only include transactions within the date range
        const txDate = new Date(tx.transactionDate);
        if (txDate >= startOfMonth && txDate <= endOfMonth) {
          return sum + parseFloat(tx.amount);
        }
        return sum;
      }, 0);
    }

    // Calculate totals
    const doorloopTotal = filteredDoorloopTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // For Wave, we'd need to query their API directly
    // This is a placeholder for the actual implementation
    let waveTotal = 0;

    // Build the reconciliation report
    const report = {
      doorloopTotal,
      waveTotal, 
      mercuryTotal,
      discrepancies: [],
      reconciliationDate: new Date()
    };

    // In a full implementation, we would compare transactions across platforms
    // and identify discrepancies

    return report;
  } catch (error) {
    console.error('Error generating reconciliation report:', error);
    throw new Error(`Failed to generate reconciliation report: ${error.message}`);
  }
}

/**
 * Automatically categorize a batch of transactions using AI
 */
export async function bulkCategorizeTransactions(): Promise<{
  processed: number;
  categorized: number;
  unchanged: number;
}> {
  try {
    // Get uncategorized transactions (category = OTHER)
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(today.getMonth() - 1);

    const transactions = await storage.getTransactionsByDateRange(monthAgo, today);
    const uncategorizedTransactions = transactions.filter(tx => 
      tx.category === 'other' || !tx.aiCategorized
    );

    const result = {
      processed: 0,
      categorized: 0,
      unchanged: 0
    };

    // Process each transaction with AI
    for (const transaction of uncategorizedTransactions) {
      try {
        const analysis = await analyzeTransaction(
          transaction.description,
          transaction.amount
        );

        result.processed++;

        // Only update if confidence is high enough
        if (analysis.confidence > 0.7 && analysis.category.toLowerCase() !== transaction.category) {
          await storage.updateTransaction(transaction.id, {
            category: analysis.category.toLowerCase() as "rent" | "maintenance" | "utilities" | "insurance" | "taxes" | "mortgage" | "supplies" | "cleaning" | "marketing" | "other",
            type: analysis.type.toLowerCase() as "income" | "expense",
            aiCategorized: true,
            aiConfidence: analysis.confidence.toString()
          });
          result.categorized++;
        } else {
          result.unchanged++;
        }
      } catch (err) {
        console.error('Error categorizing transaction:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in bulk categorization:', error);
    throw new Error(`Failed to categorize transactions: ${error.message}`);
  }
}

// Added function to get DoorLoop transactions (placeholder)
async function getDoorLoopTransactions() {
    // Replace with actual implementation to fetch DoorLoop transactions
    return [];
}


export async function reconcileFinancials() {
  const reconciliation = {
    totalReconciled: 0,
    errors: [],
    unmatchedTransactions: [],
    duplicateTransactions: []
  };

  // Add validation for duplicate transactions
  const transactionMap = new Map();
  const doorloopTransactions = await getDoorLoopTransactions();

  for (const transaction of doorloopTransactions) {
    const key = `${transaction.amount}-${transaction.date}-${transaction.description}`;
    if (transactionMap.has(key)) {
      reconciliation.duplicateTransactions.push(transaction);
    }
    transactionMap.set(key, transaction);
  }

  // ...rest of the reconciliation logic (Placeholder)
  return reconciliation;
}
interface BusinessTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category?: string;
  vendor: string;
  receiptUrl?: string;
}

export async function syncBusinessAccounts(accounts: string[]): Promise<{
  imported: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    errors: [] as string[]
  };

  const supportedAccounts = {
    'rei': async () => {
      const transactions = await reiProSync();
      const apiToken = process.env.WAVE_API_TOKEN || '';
      await pushTransactionsToWaveWithToken(apiToken, undefined, undefined, transactions.map(t => ({
        sourceId: t.id,
        sourcePlatform: 'manual',
        amount: t.amount,
        date: t.date,
        description: `REI Pro: ${t.description}`,
        category: t.category as any || 'supplies',
        type: t.amount < 0 ? 'expense' : 'income',
        metadata: { vendor: 'REI', receiptUrl: t.receiptUrl }
      })));
      return transactions.length;
    },
    'homedepot': async () => {
      const transactions = await homeDepotSync();
      const apiToken = process.env.WAVE_API_TOKEN || '';
      await pushTransactionsToWaveWithToken(apiToken, undefined, undefined, transactions.map(t => ({
        sourceId: t.id,
        sourcePlatform: 'manual',
        amount: t.amount,
        date: t.date,
        description: `Home Depot Pro: ${t.description}`,
        category: t.category as any || 'supplies',
        type: t.amount < 0 ? 'expense' : 'income',
        metadata: { vendor: 'Home Depot', receiptUrl: t.receiptUrl }
      })));
      return transactions.length;
    },
    'amazon': async () => {
      const transactions = await amazonBusinessSync();
      const apiToken = process.env.WAVE_API_TOKEN || '';
      await pushTransactionsToWaveWithToken(apiToken, undefined, undefined, transactions.map(t => ({
        sourceId: t.id,
        sourcePlatform: 'manual',
        amount: t.amount,
        date: t.date,
        description: `Amazon Business: ${t.description}`,
        category: t.category as any || 'supplies',
        type: t.amount < 0 ? 'expense' : 'income',
        metadata: { vendor: 'Amazon', receiptUrl: t.receiptUrl }
      })));
      return transactions.length;
    },
    'lowes': async () => {
      const transactions = await lowesProSync();
      const apiToken = process.env.WAVE_API_TOKEN || '';
      await pushTransactionsToWaveWithToken(apiToken, undefined, undefined, transactions.map(t => ({
        sourceId: t.id,
        sourcePlatform: 'manual',
        amount: t.amount,
        date: t.date,
        description: `Lowes Pro: ${t.description}`,
        category: t.category as any || 'supplies',
        type: t.amount < 0 ? 'expense' : 'income',
        metadata: { vendor: 'Lowes', receiptUrl: t.receiptUrl }
      })));
      return transactions.length;
    }
  };

  try {
    for (const account of accounts) {
      if (supportedAccounts[account]) {
        const importCount = await supportedAccounts[account]();
        result.imported += importCount;
      } else {
        result.errors.push(`Unsupported account type: ${account}`);
      }
    }
  } catch (error) {
    console.error('Error syncing business accounts:', error);
    throw new Error(`Failed to sync business accounts: ${error.message}`);
  }

  return result;
}

async function reiProSync(): Promise<BusinessTransaction[]> {
  // TODO: Implement actual REI Pro API integration
  return [];
}

async function homeDepotSync(): Promise<BusinessTransaction[]> {
  // TODO: Implement actual Home Depot Pro API integration
  return [];
}

async function amazonBusinessSync(): Promise<BusinessTransaction[]> {
  // TODO: Implement actual Amazon Business API integration
  return [];
}

async function lowesProSync(): Promise<BusinessTransaction[]> {
  // TODO: Implement actual Lowes Pro API integration
  return [];
}
