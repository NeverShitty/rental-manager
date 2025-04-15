
import { Router } from 'express';
import { storage } from '../storage';
import { translateText, analyzeSentiment } from '../services/openai';

const router = Router();

// Get all messages for a property
router.get('/:propertyId/messages', async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const messages = await storage.getPropertyMessages(parseInt(req.params.propertyId));
  res.json(messages);
});

// Send mass notification
router.post('/notify', async (req, res) => {
  if (!req.isAuthenticated() || req.user?.role !== "manager") {
    return res.sendStatus(403);
  }
  
  const { propertyId, message, translateTo } = req.body;
  
  let finalMessage = message;
  if (translateTo) {
    finalMessage = await translateText(message, translateTo);
  }
  
  await storage.createMassNotification({
    propertyId,
    message: finalMessage,
    sentBy: req.user.id,
    sentAt: new Date()
  });
  
  res.status(201).json({ success: true });
});

// Submit satisfaction survey
router.post('/survey', async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  const { propertyId, rating, feedback } = req.body;
  const sentiment = await analyzeSentiment(feedback);
  
  await storage.createSurveyResponse({
    propertyId,
    tenantId: req.user.id,
    rating,
    feedback,
    sentiment,
    submittedAt: new Date()
  });
  
  res.status(201).json({ success: true });
});

export default router;
