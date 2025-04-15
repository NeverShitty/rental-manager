/**
 * Mercury Bank Connector
 * 
 * This service handles connections to Mercury Bank's API, allowing users to sync
 * their transaction data. It integrates with our static IP proxy to ensure all
 * requests come from a consistent IP address that can be whitelisted in Mercury.
 */

import axios from 'axios';
import { makeProxyRequest, enableStaticIpProxy, getProxyStatus } from '../static-ip-proxy';
import { storage } from '../../storage';
import { categorizeTransaction } from '../ai-categorization';
import { BusinessAccount, MercuryCredential } from '@shared/schema';

// Mercury API configuration
const MERCURY_API_URL = 'https://api.mercury.com/api/v1';

// Types for Mercury API responses
interface MercuryAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  balance: number;
  type: 'checking' | 'savings';
}

interface MercuryTransaction {
  id: string;
  amount: {
    value: string;
    currency: string;
  };
  status: 'pending' | 'posted';
  postedAt: string;
  counterpartyName: string;
  description: string;
}

/**
 * Validate a Mercury API key for a specific business account
 */
export async function validateMercuryApiKey(
  apiKey: string,
  businessAccountId: number
): Promise<{ success: boolean; accountsFound?: number; message?: string }> {
  try {
    // Make sure we have a static IP configured
    await ensureStaticIp();
    
    // Attempt to fetch accounts as a validation test
    const accounts = await fetchMercuryAccounts(apiKey);
    
    // If we get accounts, the API key is valid
    return {
      success: true,
      accountsFound: accounts.length
    };
  } catch (error) {
    console.error('Mercury API key validation failed:', error);
    return {
      success: false,
      message: error instanceof Error 
        ? error.message 
        : 'Failed to validate Mercury API key'
    };
  }
}

/**
 * Save a Mercury API key for a business account
 */
export async function saveMercuryApiKey(
  apiKey: string,
  businessAccountId: number,
  saveToEnv: boolean = false
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get the business account
    const business = await storage.getBusinessAccount(businessAccountId);
    if (!business) {
      throw new Error(`Business account ${businessAccountId} not found`);
    }
    
    // Save to database
    await storage.saveMercuryCredential({
      businessAccountId,
      apiKey,
      isValid: true,
      lastValidated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Optionally save to environment variables
    if (saveToEnv) {
      // In a real implementation, this would save to .env or environment service
      process.env.MERCURY_API_KEY = apiKey;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save Mercury API key:', error);
    return {
      success: false,
      message: error instanceof Error 
        ? error.message 
        : 'Failed to save Mercury API key'
    };
  }
}

/**
 * Get Mercury credentials for a business account
 */
export async function getMercuryCredentials(
  businessAccountId: number
): Promise<MercuryCredential[]> {
  return await storage.getMercuryCredentialsByBusiness(businessAccountId);
}

/**
 * Synchronize transactions from Mercury to our system
 */
export async function syncMercuryTransactions(
  businessAccountId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean;
  transactionsSynced?: number;
  message?: string;
}> {
  try {
    // Make sure we have a static IP configured
    await ensureStaticIp();
    
    // Get credentials for this business
    const credentials = await storage.getMercuryCredentialsByBusiness(businessAccountId);
    if (!credentials || credentials.length === 0) {
      throw new Error('No valid Mercury credentials found for this business');
    }
    
    // Use the most recently validated credential
    const latestCredential = credentials.sort((a, b) => 
      new Date(b.lastValidated).getTime() - new Date(a.lastValidated).getTime()
    )[0];
    
    // Get Mercury accounts for this business
    const mercuryAccounts = await fetchMercuryAccounts(latestCredential.apiKey);
    
    // For each account, synchronize transactions
    let totalTransactions = 0;
    
    for (const account of mercuryAccounts) {
      // Save or update the account in our database
      const savedAccount = await storage.saveMercuryAccount({
        businessAccountId,
        externalId: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance.toString(),
        currency: account.currency,
        lastSyncedAt: new Date()
      });
      
      // Fetch transactions for this account
      const transactions = await fetchMercuryTransactions(
        latestCredential.apiKey,
        account.id,
        startDate,
        endDate
      );
      
      // Process and save each transaction
      for (const transaction of transactions) {
        // Check if transaction already exists
        const existingTransaction = await storage.getMercuryTransactionByExternalId(transaction.id);
        
        if (!existingTransaction) {
          // Save the Mercury transaction
          await storage.saveMercuryTransaction({
            externalId: transaction.id,
            accountId: savedAccount.id,
            type: parseFloat(transaction.amount.value) > 0 ? 'credit' : 'debit',
            amount: Math.abs(parseFloat(transaction.amount.value)).toString(),
            description: transaction.description,
            counterpartyName: transaction.counterpartyName,
            transactionDate: new Date(transaction.postedAt),
            status: transaction.status,
            createdAt: new Date()
          });
          
          // Create a regular transaction record with AI categorization
          const categorization = await categorizeTransaction({
            description: transaction.description,
            amount: Math.abs(parseFloat(transaction.amount.value)),
            vendor: transaction.counterpartyName,
            date: new Date(transaction.postedAt)
          });
          
          await storage.createTransaction({
            amount: parseFloat(transaction.amount.value) > 0 
              ? Math.abs(parseFloat(transaction.amount.value)).toString()
              : (-Math.abs(parseFloat(transaction.amount.value))).toString(),
            type: parseFloat(transaction.amount.value) > 0 ? 'income' : 'expense',
            category: categorization.category,
            description: transaction.description,
            date: new Date(transaction.postedAt),
            externalId: transaction.id,
            externalSource: 'mercury',
            aiCategorized: true,
            aiConfidence: categorization.confidence.toString(),
            createdAt: new Date(),
            createdBy: null // System generated
          });
          
          totalTransactions++;
        }
      }
    }
    
    // Update the credential's lastValidated timestamp
    await storage.updateMercuryCredential(latestCredential.id, {
      lastValidated: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      transactionsSynced: totalTransactions,
      message: `Successfully synced ${totalTransactions} transactions from Mercury`
    };
  } catch (error) {
    console.error('Failed to sync Mercury transactions:', error);
    return {
      success: false,
      message: error instanceof Error 
        ? error.message 
        : 'Failed to sync Mercury transactions'
    };
  }
}

/**
 * Get business accounts with Mercury integration status
 */
export async function getBusinessAccountsWithMercuryStatus(): Promise<Array<BusinessAccount & { 
  hasMercury: boolean;
  lastSynced?: Date;
}>> {
  const businesses = await storage.getBusinessAccounts();
  const result = [];
  
  for (const business of businesses) {
    const credentials = await storage.getMercuryCredentialsByBusiness(business.id);
    const hasMercury = credentials && credentials.length > 0 && 
                      credentials.some(c => c.isValid);
    
    let lastSynced: Date | undefined;
    if (hasMercury) {
      const accounts = await storage.getMercuryAccountsByBusiness(business.id);
      if (accounts && accounts.length > 0) {
        // Find the most recently synced account
        const dates = accounts.map(a => new Date(a.lastSyncedAt));
        lastSynced = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }
    
    result.push({
      ...business,
      hasMercury,
      lastSynced
    });
  }
  
  return result;
}

// Private helper functions

/**
 * Fetch accounts from Mercury API
 */
async function fetchMercuryAccounts(apiKey: string): Promise<MercuryAccount[]> {
  try {
    const response = await makeProxyRequest(`${MERCURY_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Mercury API returned status ${response.status}`);
    }
    
    return response.data.accounts || [];
  } catch (error) {
    console.error('Failed to fetch Mercury accounts:', error);
    throw new Error(
      error instanceof Error && error.message
        ? `Failed to fetch Mercury accounts: ${error.message}`
        : 'Failed to fetch Mercury accounts'
    );
  }
}

/**
 * Fetch transactions from Mercury API
 */
async function fetchMercuryTransactions(
  apiKey: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<MercuryTransaction[]> {
  try {
    // Format dates for Mercury API (YYYY-MM-DD)
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const response = await makeProxyRequest(
      `${MERCURY_API_URL}/accounts/${accountId}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        params: {
          start,
          end
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Mercury API returned status ${response.status}`);
    }
    
    return response.data.transactions || [];
  } catch (error) {
    console.error('Failed to fetch Mercury transactions:', error);
    throw new Error(
      error instanceof Error && error.message
        ? `Failed to fetch Mercury transactions: ${error.message}`
        : 'Failed to fetch Mercury transactions'
    );
  }
}

/**
 * Ensure static IP is enabled before making API calls
 */
async function ensureStaticIp(): Promise<void> {
  // Check current status
  const status = await getProxyStatus();
  
  // If not enabled or not active, enable it
  if (!status.enabled || status.status !== 'active') {
    await enableStaticIpProxy();
    
    // Check status again
    const newStatus = await getProxyStatus();
    if (newStatus.status !== 'active') {
      // If not immediately active, that's okay - the proxy will handle falling back
      // to direct connections if needed, but log a warning
      console.warn(`Static IP proxy not fully active (status: ${newStatus.status}). API calls may use dynamic IPs.`);
    }
  }
}