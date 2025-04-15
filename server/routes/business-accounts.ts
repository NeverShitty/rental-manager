import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { getBusinessAccountsWithMercuryStatus } from '../services/connectors/mercury-connector';

const router = Router();

/**
 * GET /api/business-accounts
 * Get all business accounts with Mercury integration status
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const businessesWithStatus = await getBusinessAccountsWithMercuryStatus();
    
    res.json(businessesWithStatus);
  } catch (error) {
    console.error('Failed to get business accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve business accounts',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/business-accounts/:id
 * Get a specific business account
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    
    if (isNaN(businessId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ID', 
        message: 'Business ID must be a number' 
      });
    }
    
    const business = await storage.getBusinessAccount(businessId);
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        error: 'Not found', 
        message: `Business with ID ${businessId} not found` 
      });
    }
    
    res.json(business);
  } catch (error) {
    console.error('Failed to get business account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve business account',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/business-accounts
 * Create a new business account
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, legalName, taxId } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field', 
        message: 'Business name is required' 
      });
    }
    
    // Create the business account
    const newBusiness = await storage.createBusinessAccount({
      name,
      legalName: legalName || name,
      taxId: taxId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.json(newBusiness);
  } catch (error) {
    console.error('Failed to create business account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create business account',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * PUT /api/business-accounts/:id
 * Update a business account
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    
    if (isNaN(businessId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ID', 
        message: 'Business ID must be a number' 
      });
    }
    
    const { name, legalName, taxId } = req.body;
    
    // Get the existing business
    const existingBusiness = await storage.getBusinessAccount(businessId);
    
    if (!existingBusiness) {
      return res.status(404).json({ 
        success: false, 
        error: 'Not found', 
        message: `Business with ID ${businessId} not found` 
      });
    }
    
    // Update the business account
    const updatedBusiness = await storage.updateBusinessAccount(businessId, {
      name: name || existingBusiness.name,
      legalName: legalName || existingBusiness.legalName,
      taxId: taxId !== undefined ? taxId : existingBusiness.taxId,
      updatedAt: new Date()
    });
    
    res.json(updatedBusiness);
  } catch (error) {
    console.error('Failed to update business account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update business account',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * DELETE /api/business-accounts/:id
 * Delete a business account
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    
    if (isNaN(businessId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ID', 
        message: 'Business ID must be a number' 
      });
    }
    
    // Delete the business account
    await storage.deleteBusinessAccount(businessId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete business account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete business account',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;