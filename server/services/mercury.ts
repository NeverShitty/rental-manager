import { storage } from '../storage';

const API_BASE = 'https://api.mercury.com/api/v1';

interface MercuryBalance {
  amount: number;
  currency: string;
  updated_at: string;
}

interface MercuryAccountResponse {
  id: string;
  name: string;
  type: string;
  balance: MercuryBalance;
}

interface MercuryTransactionResponse {
  id: string;
  amount: number;
  counterparty_name: string;
  description: string;
  status: 'pending' | 'posted';
  transaction_date: string;
  type: 'credit' | 'debit';
}

async function mercuryRequest(endpoint: string, apiKey?: string, options: RequestInit = {}) {
  const key = apiKey || process.env.MERCURY_API_KEY;
  
  if (!key) {
    throw new Error('Mercury API key not configured');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mercury API error (${response.status}): ${error}`);
  }

  return response.json();
}

export async function getMercuryAccounts(apiKey?: string): Promise<MercuryAccountResponse[]> {
  try {
    const response = await mercuryRequest('/accounts', apiKey);
    return response.accounts || [];
  } catch (error) {
    console.error('Failed to fetch Mercury accounts:', error);
    throw error;
  }
}

export async function getMercuryTransactions(accountId: string, apiKey?: string, startDate?: Date): Promise<MercuryTransactionResponse[]> {
  try {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    const response = await mercuryRequest(`/accounts/${accountId}/transactions?${queryParams}`, apiKey);
    return response.transactions || [];
  } catch (error) {
    console.error('Failed to fetch Mercury transactions:', error);
    throw error;
  }
}

export async function syncMercuryData(apiKey?: string): Promise<void> {
  try {
    // Fetch and sync accounts
    const accounts = await getMercuryAccounts(apiKey);

    for (const account of accounts) {
      // Need to check if account type is checking or savings as per schema
      const accountTypeLower = account.type.toLowerCase();
      const accountType = accountTypeLower === 'checking' || accountTypeLower === 'savings' 
        ? (accountTypeLower as "checking" | "savings")
        : "checking" // Default to checking if type is not recognized
        
      await storage.createOrUpdateMercuryAccount({
        externalId: account.id,
        name: account.name,
        type: accountType,
        balance: account.balance.amount.toString(),
        currency: account.balance.currency,
        lastSyncedAt: new Date()
      });

      // Fetch and sync transactions for each account
      const lastSync = await storage.getLastMercurySync(account.id);
      const transactions = await getMercuryTransactions(account.id, apiKey, lastSync);

      for (const transaction of transactions) {
        await storage.createMercuryTransaction({
          externalId: transaction.id,
          accountId: null, // Will be populated after account lookup
          type: transaction.type,
          amount: transaction.amount.toString(),
          description: transaction.description,
          counterpartyName: transaction.counterparty_name || null,
          transactionDate: new Date(transaction.transaction_date),
          status: transaction.status
        });
      }
    }

    console.log('Mercury data sync completed successfully');
  } catch (error) {
    console.error('Error syncing Mercury data:', error);
    throw error;
  }
}