
import express from 'express';
import multer from 'multer';
import { processEmailReceipt, forwardToAccounting } from '../services/expenses';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/receipts/upload', upload.single('receipt'), async (req, res) => {
  try {
    const file = req.file;
    const propertyId = req.body.propertyId;
    
    const receipt = await processEmailReceipt(
      req.body.email,
      req.body.subject,
      [file]
    );

    if (req.body.forward) {
      await forwardToAccounting(receipt);
    }

    res.json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

router.get('/forwarding', async (req, res) => {
  const config = await getForwardingConfig();
  res.json(config);
});

router.post('/forwarding', async (req, res) => {
  const { email, enabled } = req.body;
  await setForwardingConfig({ email, enabled });
  res.json({ success: true });
});

export default router;
