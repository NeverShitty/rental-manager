import { Router } from 'express';
import { storage } from '../storage';
import { processPayment, getPaymentStatus } from '../services/charge-automation';
import { insertPaymentSchema } from '@shared/schema';
import { analyzeTransaction } from '../services/openai';

const router = Router();

// Create a new payment request
router.post('/api/payments', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = insertPaymentSchema.parse(req.body);
    
    // Process payment through ChargeAutomation
    const paymentResult = await processPayment({
      amount: Number(data.amount),
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      description: data.description,
      dueDate: new Date(data.dueDate)
    });
    
    // Create payment record
    const payment = await storage.createPayment({
      ...data,
      externalId: paymentResult.id,
      status: paymentResult.status,
      processingFee: paymentResult.processingFee,
      paidAt: paymentResult.status === 'completed' ? paymentResult.transactionDate : null,
      createdBy: req.user.id
    });
    
    // If payment is completed, create a transaction record
    if (paymentResult.status === 'completed') {
      // Analyze the transaction using OpenAI
      const analysis = await analyzeTransaction(
        data.description,
        Number(data.amount)
      );
      
      // Create transaction record
      await storage.createTransaction({
        propertyId: data.propertyId,
        amount: data.amount,
        type: 'INCOME',
        category: analysis.category,
        description: data.description,
        date: paymentResult.transactionDate,
        aiCategorized: true,
        aiConfidence: analysis.confidence,
        createdBy: req.user.id
      });
    }
    
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get payment status and sync with ChargeAutomation
router.get('/api/payments/:id/status', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const payment = await storage.getPayment(parseInt(req.params.id));
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Get latest status from ChargeAutomation
    const paymentStatus = await getPaymentStatus(payment.externalId);
    
    // Update payment status if changed
    if (paymentStatus.status !== payment.status) {
      const updatedPayment = await storage.updatePayment(payment.id, {
        status: paymentStatus.status,
        paidAt: paymentStatus.status === 'completed' ? paymentStatus.transactionDate : null
      });
      
      // If payment just completed, create transaction record
      if (paymentStatus.status === 'completed' && payment.status !== 'completed') {
        const analysis = await analyzeTransaction(
          payment.description,
          Number(payment.amount)
        );
        
        await storage.createTransaction({
          propertyId: payment.propertyId,
          amount: payment.amount,
          type: 'INCOME',
          category: analysis.category,
          description: payment.description,
          date: paymentStatus.transactionDate,
          aiCategorized: true,
          aiConfidence: analysis.confidence,
          createdBy: req.user.id
        });
      }
      
      return res.json(updatedPayment);
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
import { Router } from 'express';
import { storage } from '../storage';
import { createWavePayment } from '../services/wave-chitty';

const router = Router();

router.post('/process', async (req, res) => {
  const { amount, description, invoiceId } = req.body;
  try {
    const payment = await createWavePayment({
      amount,
      description,
      invoiceId,
      date: new Date()
    });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

export default router;
