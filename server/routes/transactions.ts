import { Router } from 'express';
import { storage } from '../storage';
import { createWaveTransaction, syncWaveAccounts } from '../services/wave';

const router = Router();

router.post('/wave/sync', async (req, res) => {
  try {
    const result = await syncWaveAccounts();
    res.json(result);
  } catch (error) {
    console.error("Error syncing with Wave:", error);
    res.status(500).json({ error: 'Failed to sync with Wave' });
  }
});

export default router;