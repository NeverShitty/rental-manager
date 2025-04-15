import { Router } from 'express';
import { 
  validateWaveCredentials, 
  syncDoorLoopTransactions, 
  syncMercuryWithCOA,
  pushTransactionsToWave, 
  bulkCategorizeTransactions as categorizeTransactions, 
  reconcileFinancials as generateReconciliationReport, 
  syncBusinessAccounts, 
  pushTransactionsToWaveWithToken 
} from '../services/bookkeeping';
import { storage } from '../storage';
import { TransactionCategory } from '@shared/schema';
import { syncWaveAccounts } from '../services/wave';
import { getMercuryAccounts } from '../services/mercury';
import { getWaveBusinesses } from '../services/wave-chitty';

const router = Router();

// Validate API keys
router.get('/validate-keys', async (req, res) => {
  try {
    const { apiKey } = req.query;
    const validation = await validateWaveCredentials(apiKey as string);
    res.json({
      wave: validation.success,
      message: validation.message,
      doorloop: process.env.DOORLOOP_API_KEY ? true : false,
      mercury: process.env.MERCURY_API_KEY ? true : false
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Validation failed', 
      message: error.message || 'Unknown error'
    });
  }
});

// Sync DoorLoop transactions
router.post('/sync/doorloop', async (req, res) => {
  try {
    // Get API key from request body or environment
    const apiKey = req.body.apiKey || process.env.DOORLOOP_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Missing API key', 
        message: 'Please provide a DoorLoop API key'
      });
    }
    
    const result = await syncDoorLoopTransactions(apiKey);
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Sync failed',
      message: error.message || 'Unknown error' 
    });
  }
});

// Sync Mercury transactions with COA
router.post('/sync/mercury-coa', async (req, res) => {
  try {
    // Get API key from request body or environment
    const apiKey = req.body.apiKey || process.env.MERCURY_API_KEY;
    
    if (!apiKey && !process.env.MERCURY_API_KEY) {
      return res.status(400).json({ 
        error: 'Missing API key', 
        message: 'Please provide a Mercury API key'
      });
    }
    
    // Check if a secret already exists, if not, ask for one
    if (!process.env.MERCURY_API_KEY && !apiKey) {
      return res.status(401).json({
        error: 'Mercury API key not configured',
        message: 'Please provide a Mercury API key to continue'
      });
    }
    
    const result = await syncMercuryWithCOA(apiKey);
    
    res.json({
      success: true,
      message: `Successfully synced Mercury transactions with Chart of Accounts: ${result.imported} imported, ${result.categorized} categorized, ${result.mapped} mapped to COA categories`,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Mercury sync failed',
      message: error.message || 'Unknown error' 
    });
  }
});

// AI Categorization
router.post('/categorize-transactions', async (req, res) => {
  try {
    const result = await categorizeTransactions();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Categorization failed',
      message: error.message || 'Unknown error'
    });
  }
});

// Push to Wave
router.post('/push-to-wave', async (req, res) => {
  try {
    const { startDate, endDate, transactions } = req.body;
    
    // Validate the Wave API token
    const apiToken = req.body.apiToken || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
    
    if (!apiToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing API token', 
        message: 'Please provide a Wave API token'
      });
    }
    
    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    
    const result = await pushTransactionsToWaveWithToken(
      apiToken,
      parsedStartDate,
      parsedEndDate,
      transactions
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Push failed',
      message: error.message || 'Unknown error'
    });
  }
});

// Generate reconciliation report
router.post('/reconciliation-report', async (req, res) => {
  try {
    const { forDate } = req.body;
    
    // Get API keys from request body or environment
    const doorloopApiKey = req.body.doorloopApiKey || process.env.DOORLOOP_API_KEY;
    const waveApiToken = req.body.waveApiToken || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
    
    // Validate we have at least one API key
    if (!doorloopApiKey && !waveApiToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing API keys', 
        message: 'Please provide at least one API key (DoorLoop or Wave)'
      });
    }
    
    // Parse date if provided
    const parsedDate = forDate ? new Date(forDate) : undefined;
    
    const result = await generateReconciliationReport(
      doorloopApiKey,
      waveApiToken,
      parsedDate
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Report generation failed',
      message: error.message || 'Unknown error'
    });
  }
});

// Get available transaction categories
router.get('/categories', (req: any, res: any) => {
  const categories = Object.values(TransactionCategory).map(category => ({
    id: category,
    name: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
  }));

  res.json({
    success: true,
    data: categories
  });
});

// Get transactions with filtering options
router.get('/transactions', async (req: any, res: any) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;

    const transactions = await storage.getTransactionsByDateRange(startDate, endDate, propertyId);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch transactions: ${error.message || 'Unknown error'}`
    });
  }
});

// Sync business accounts (vendors like REI, Home Depot, etc.)
router.post('/sync/business-accounts', async (req, res) => {
  try {
    // Get list of accounts to sync from request body
    const { accounts } = req.body;
    
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid accounts parameter', 
        message: 'Please provide an array of business accounts to sync'
      });
    }
    
    // Validate supported accounts
    const supportedAccounts = ['rei', 'homedepot', 'amazon', 'lowes'];
    const validAccounts = accounts.filter(account => supportedAccounts.includes(account));
    const invalidAccounts = accounts.filter(account => !supportedAccounts.includes(account));
    
    if (validAccounts.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid accounts provided', 
        message: `Supported accounts are: ${supportedAccounts.join(', ')}`
      });
    }
    
    // Check if Wave API token is available
    const apiToken = req.body.apiToken || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
    
    if (!apiToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing Wave API token', 
        message: 'A Wave API token is required for business account sync'
      });
    }
    
    // Perform the sync
    const result = await syncBusinessAccounts(validAccounts);
    
    // Add warning about invalid accounts if any
    const response: any = {
      success: true,
      ...result
    };
    
    if (invalidAccounts.length > 0) {
      response.warnings = [`Ignored unsupported accounts: ${invalidAccounts.join(', ')}`];
    }
    
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Business account sync failed',
      message: error.message || 'Unknown error'
    });
  }
});

// Bulk reconciliation endpoint for automating the entire process
router.post('/auto-reconcile', async (req, res) => {
  try {
    const results = {
      doorloopSync: null as any,
      mercurySync: null as any,
      categorization: null as any,
      wavePush: null as any,
      reconciliationReport: null as any
    };
    
    // Step 1a: Sync DoorLoop transactions
    try {
      const doorloopApiKey = req.body.doorloopApiKey || process.env.DOORLOOP_API_KEY;
      if (doorloopApiKey) {
        results.doorloopSync = await syncDoorLoopTransactions(doorloopApiKey);
      }
    } catch (err: any) {
      results.doorloopSync = { error: err.message || 'DoorLoop sync failed' };
    }
    
    // Step 1b: Sync Mercury transactions with COA
    try {
      const mercuryApiKey = req.body.mercuryApiKey || process.env.MERCURY_API_KEY;
      if (mercuryApiKey) {
        results.mercurySync = await syncMercuryWithCOA(mercuryApiKey);
      }
    } catch (err: any) {
      results.mercurySync = { error: err.message || 'Mercury sync failed' };
    }
    
    // Step 2: Run AI categorization
    try {
      results.categorization = await categorizeTransactions();
    } catch (err: any) {
      results.categorization = { error: err.message || 'Categorization failed' };
    }
    
    // Step 3: Push to Wave
    try {
      const apiToken = req.body.waveApiToken || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
      if (apiToken) {
        // Get date range (default to current month)
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        
        results.wavePush = await pushTransactionsToWaveWithToken(apiToken, startDate, endDate);
      } else {
        results.wavePush = { error: 'No Wave API token provided' };
      }
    } catch (err: any) {
      results.wavePush = { error: err.message || 'Wave push failed' };
    }
    
    // Step 4: Generate reconciliation report
    try {
      const doorloopApiKey = req.body.doorloopApiKey || process.env.DOORLOOP_API_KEY;
      const waveApiToken = req.body.waveApiToken || process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
      
      if (doorloopApiKey || waveApiToken) {
        results.reconciliationReport = await generateReconciliationReport(doorloopApiKey, waveApiToken);
      } else {
        results.reconciliationReport = { error: 'No API keys provided' };
      }
    } catch (err: any) {
      results.reconciliationReport = { error: err.message || 'Reconciliation report generation failed' };
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Auto-reconciliation failed',
      message: error.message || 'Unknown error'
    });
  }
});

// Get integration status
router.get('/integration-status', async (req, res) => {
  try {
    const integrationStatus = {
      wave: {
        connected: false,
        businesses: [],
        lastSync: null,
        error: null
      },
      mercury: {
        connected: false,
        accounts: [],
        lastSync: null,
        error: null
      },
      doorloop: {
        connected: false,
        lastSync: null,
        error: null
      }
    };

    // Check Wave integration
    try {
      const waveApiToken = process.env.WAVE_API_FULLACCESS_TOKEN || process.env.WAVE_API_TOKEN;
      if (waveApiToken) {
        integrationStatus.wave.connected = true;
        // Get businesses
        const businesses = await getWaveBusinesses();
        integrationStatus.wave.businesses = businesses;
      }
    } catch (err: any) {
      integrationStatus.wave.error = err.message || 'Failed to connect to Wave';
      console.error('Error checking Wave integration:', err);
    }

    // Check Mercury integration
    try {
      const mercuryApiKey = process.env.MERCURY_API_KEY;
      if (mercuryApiKey) {
        integrationStatus.mercury.connected = true;
        // Get accounts
        const accounts = await getMercuryAccounts();
        integrationStatus.mercury.accounts = accounts;

        // Get last sync date
        const firstAccount = accounts[0];
        if (firstAccount) {
          const lastSync = await storage.getLastMercurySync(firstAccount.id);
          integrationStatus.mercury.lastSync = lastSync;
        }
      }
    } catch (err: any) {
      integrationStatus.mercury.error = err.message || 'Failed to connect to Mercury';
      console.error('Error checking Mercury integration:', err);
    }

    // Check DoorLoop integration
    try {
      const doorloopApiKey = process.env.DOORLOOP_API_KEY;
      if (doorloopApiKey) {
        integrationStatus.doorloop.connected = true;
        // We don't have a method to get last sync date for DoorLoop yet
        // This could be added in the future
      }
    } catch (err: any) {
      integrationStatus.doorloop.error = err.message || 'Failed to connect to DoorLoop';
      console.error('Error checking DoorLoop integration:', err);
    }

    res.json({
      success: true,
      integrationStatus
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get integration status',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;
