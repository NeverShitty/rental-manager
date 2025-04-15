import { Request, Response, Router } from 'express';
import { getMercuryAccounts } from '../services/mercury';

const router = Router();

/**
 * POST /api/mercury/validate
 * Validate Mercury API credentials
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    // Get API key from request body or environment
    const apiKey = req.body.apiKey || process.env.MERCURY_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing API key', 
        message: 'Please provide a Mercury API key'
      });
    }
    
    // Test connection by fetching accounts
    const accounts = await getMercuryAccounts(apiKey);
    
    if (accounts && accounts.length > 0) {
      return res.json({
        success: true,
        message: 'Mercury API connection successful',
        accountsFound: accounts.length
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No accounts found',
        message: 'Could not retrieve any accounts with the provided API key'
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Validation failed',
      message: error.message || 'Unknown error' 
    });
  }
});

/**
 * POST /api/mercury/save-key
 * Save the Mercury API key to environment variables
 */
router.post('/save-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing API key', 
        message: 'Please provide a Mercury API key'
      });
    }
    
    // In a real application, we would securely store this
    // For demo purposes, we'll just set it in the process environment
    process.env.MERCURY_API_KEY = apiKey;
    
    res.json({
      success: true,
      message: 'Mercury API key saved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Save failed',
      message: error.message || 'Unknown error' 
    });
  }
});

/**
 * GET /api/mercury/accounts
 * Get all Mercury bank accounts
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    // Get API key from request body or environment
    const apiKey = req.query.apiKey as string || process.env.MERCURY_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing API key', 
        message: 'Please provide a Mercury API key'
      });
    }
    
    const accounts = await getMercuryAccounts(apiKey);
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve accounts',
      message: error.message || 'Unknown error' 
    });
  }
});

export default router;