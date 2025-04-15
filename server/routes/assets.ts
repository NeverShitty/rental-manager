
import { Router } from 'express';
import { storage } from '../storage';
import { AssetType, AssetStatus } from '@shared/schema';

const router = Router();

// Get all assets
router.get('/', async (req, res) => {
  try {
    const assets = await storage.getAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Get assets by property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const assets = await storage.getAssetsByProperty(parseInt(req.params.propertyId));
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch property assets' });
  }
});

// Create new asset
router.post('/', async (req, res) => {
  try {
    const asset = await storage.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// Update asset
router.put('/:id', async (req, res) => {
  try {
    const asset = await storage.updateAsset(parseInt(req.params.id), req.body);
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// Record maintenance
router.post('/:id/maintenance', async (req, res) => {
  try {
    const asset = await storage.updateAsset(parseInt(req.params.id), {
      lastMaintenanceDate: new Date(),
      status: AssetStatus.MAINTENANCE,
      notes: `${req.body.maintenanceNotes}\n${new Date().toISOString()}`
    });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record maintenance' });
  }
});

export default router;
