
import { Router } from 'express';
import { processPayment } from '../services/charge-automation';
import { storage } from '../storage';

const router = Router();

router.post('/api/billing/charge', async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    const paymentResult = await processPayment({
      amount,
      description,
      dueDate: new Date(),
      propertyId: req.body.propertyId,
      tenantId: req.body.tenantId
    });
    
    const charge = await storage.createCharge({
      amount,
      description,
      status: paymentResult.status,
      externalId: paymentResult.id,
      createdBy: req.user.id
    });
    
    res.json(charge);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/billing/analyze', async (req, res) => {
  try {
    const { description } = req.body;
    
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: `Analyze this billing description and provide suggestions:
          Description: ${description}
          
          Provide:
          1. Suggested category
          2. Potential issues to check
          3. Similar past transactions to verify
          4. Recommendations for documentation
          
          Format as JSON with fields:
          {
            "suggestedCategory": string,
            "suggestions": string[],
            "verificationChecks": string[]
          }`
      }],
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
