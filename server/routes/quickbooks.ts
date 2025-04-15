import { Router, Request, Response } from 'express';
import { quickbooksAuth, validateQuickbooksCredentials, getQuickbooksAccounts, getQuickbooksCustomers, getQuickbooksTransactions, importQuickbooksData, exportTransactionsToQuickbooks, migrateFromQuickbooks } from '../services/quickbooks';

const router = Router();

/**
 * GET /api/quickbooks/auth-url
 * Get the authorization URL for QuickBooks OAuth
 */
router.get('/auth-url', (req: Request, res: Response) => {
  try {
    const authUrl = quickbooksAuth.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating QuickBooks auth URL:", error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
});

/**
 * GET /api/quickbooks/callback
 * Handle the OAuth callback from QuickBooks
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const url = req.url;
    const token = await quickbooksAuth.processCallback(url);
    
    // Redirect to the integrations page with success parameter
    res.redirect('/bookkeeping/integrations?qb_auth=success');
  } catch (error) {
    console.error("Error processing QuickBooks callback:", error);
    res.redirect('/bookkeeping/integrations?qb_auth=error');
  }
});

/**
 * GET /api/quickbooks/validate
 * Validate QuickBooks connection
 */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const result = await validateQuickbooksCredentials();
    res.json(result);
  } catch (error) {
    console.error("Error validating QuickBooks credentials:", error);
    res.status(500).json({ connected: false, error: "Failed to validate QuickBooks connection" });
  }
});

/**
 * GET /api/quickbooks/accounts
 * Get accounts from QuickBooks
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await getQuickbooksAccounts();
    res.json(accounts);
  } catch (error) {
    console.error("Error fetching QuickBooks accounts:", error);
    res.status(500).json({ error: "Failed to fetch QuickBooks accounts" });
  }
});

/**
 * GET /api/quickbooks/customers
 * Get customers from QuickBooks
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const customers = await getQuickbooksCustomers();
    res.json(customers);
  } catch (error) {
    console.error("Error fetching QuickBooks customers:", error);
    res.status(500).json({ error: "Failed to fetch QuickBooks customers" });
  }
});

/**
 * GET /api/quickbooks/transactions
 * Get transactions from QuickBooks
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const transactions = await getQuickbooksTransactions(startDate, endDate);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching QuickBooks transactions:", error);
    res.status(500).json({ error: "Failed to fetch QuickBooks transactions" });
  }
});

/**
 * POST /api/quickbooks/import
 * Import data from QuickBooks to our system
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const result = await importQuickbooksData();
    res.json(result);
  } catch (error) {
    console.error("Error importing data from QuickBooks:", error);
    res.status(500).json({ error: "Failed to import data from QuickBooks" });
  }
});

/**
 * POST /api/quickbooks/export
 * Export transactions from our system to QuickBooks
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
    
    const result = await exportTransactionsToQuickbooks(startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error("Error exporting data to QuickBooks:", error);
    res.status(500).json({ error: "Failed to export data to QuickBooks" });
  }
});

/**
 * POST /api/quickbooks/migrate
 * Perform a full migration from QuickBooks to our system
 */
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    const result = await migrateFromQuickbooks();
    res.json(result);
  } catch (error) {
    console.error("Error migrating from QuickBooks:", error);
    res.status(500).json({ error: "Failed to migrate from QuickBooks" });
  }
});

export default router;