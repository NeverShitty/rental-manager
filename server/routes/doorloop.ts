import { Router } from 'express';
import { storage } from '../storage';
import { 
  fetchDoorloopTenants, 
  fetchDoorloopProperties, 
  fetchDoorloopLedger,
  syncDoorloopData
} from '../services/doorloop';

const router = Router();

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
};

// Get all tenants from DoorLoop
router.get('/tenants', isAuthenticated, async (req, res) => {
  try {
    const tenants = await fetchDoorloopTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Failed to fetch tenants from DoorLoop:', error);
    res.status(500).json({ error: 'Failed to fetch tenants from DoorLoop' });
  }
});

// Get all properties from DoorLoop
router.get('/properties', isAuthenticated, async (req, res) => {
  try {
    const properties = await fetchDoorloopProperties();
    res.json(properties);
  } catch (error) {
    console.error('Failed to fetch properties from DoorLoop:', error);
    res.status(500).json({ error: 'Failed to fetch properties from DoorLoop' });
  }
});

// Get tenant ledger from DoorLoop
router.get('/tenants/:id/ledger', isAuthenticated, async (req, res) => {
  try {
    const ledger = await fetchDoorloopLedger(req.params.id);
    res.json(ledger);
  } catch (error) {
    console.error('Failed to fetch ledger from DoorLoop:', error);
    res.status(500).json({ error: 'Failed to fetch ledger from DoorLoop' });
  }
});

// Sync data from DoorLoop to our database
router.post('/sync', isAuthenticated, async (req, res) => {
  try {
    const result = await syncDoorloopData(storage);
    res.json(result);
  } catch (error) {
    console.error('Failed to sync DoorLoop data:', error);
    res.status(500).json({ error: 'Failed to sync DoorLoop data' });
  }
});

export default router;