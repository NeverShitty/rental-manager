import { Router, Request, Response } from "express";
import { storage } from "../storage";
import * as waveService from "../services/wave-chitty";

const router = Router();

/**
 * GET /api/wave/validate
 * Validate Wave API credentials
 */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const apiKey = req.query.apiKey as string;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API key is required" });
    }

    // Check if the WAVE_API_TOKEN exists in environment
    const existingToken = process.env.WAVE_API_TOKEN;
    
    // Use existing token first if available (useful for checking if current token is valid)
    const result = await waveService.validateWaveCredentials(apiKey || existingToken);
    
    return res.json(result);
  } catch (error) {
    console.error("Error validating Wave API key:", error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

/**
 * POST /api/wave/save-key
 * Save the Wave API key to environment variables
 */
router.post('/save-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API key is required" });
    }

    // In a real environment, we would securely store this key
    // For this demo, we'll just set it in the environment
    process.env.WAVE_API_TOKEN = apiKey;
    
    return res.json({ success: true, message: "API key saved successfully" });
  } catch (error) {
    console.error("Error saving Wave API key:", error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

/**
 * GET /api/wave/businesses
 * Get all businesses from Wave
 */
router.get('/businesses', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.WAVE_API_TOKEN;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Wave API token not found" });
    }

    const businesses = await waveService.getWaveBusinesses();
    return res.json({ success: true, businesses });
  } catch (error) {
    console.error("Error fetching Wave businesses:", error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

/**
 * GET /api/wave/customers
 * Get all customers from a Wave business
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const businessId = req.query.businessId as string;
    const customers = await waveService.getWaveCustomers(businessId);
    return res.json({ success: true, customers });
  } catch (error) {
    console.error("Error fetching Wave customers:", error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

/**
 * POST /api/wave/customers
 * Create a new customer in Wave
 */
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { name, email, address, businessId } = req.body;
    const customer = await waveService.createWaveCustomer({
      name,
      email,
      address,
      businessId
    });
    return res.json({ success: true, customer });
  } catch (error) {
    console.error("Error creating Wave customer:", error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    });
  }
});

export default router;