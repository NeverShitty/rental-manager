import { Router } from 'express';
import { storage } from '../storage';
import { insertTenantSchema } from '@shared/schema';
import { ZodError } from 'zod';

const router = Router();

// Authentication middleware for secure routes
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
};

// Get all tenants
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const tenants = await storage.getTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get a specific tenant by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const tenant = await storage.getTenantById(parseInt(req.params.id));
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error) {
    console.error('Failed to fetch tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Create a new tenant
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Creating new tenant with data:', req.body);
    
    // Validate request data
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      console.log('Tenant created successfully:', tenant);
      res.status(201).json(tenant);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        console.error('Validation error:', validationError.errors);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationError.errors 
        });
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Failed to create tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update a tenant
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // First check if tenant exists
    const existingTenant = await storage.getTenantById(id);
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Update the tenant
    const tenant = await storage.updateTenant(id, req.body);
    res.json(tenant);
  } catch (error) {
    console.error('Failed to update tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Delete a tenant
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const success = await storage.deleteTenant(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;