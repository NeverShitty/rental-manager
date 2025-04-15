import express, { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertOpenPhoneContactSchema, insertOpenPhoneMessageSchema } from '@shared/schema';
import {
  getOpenPhoneLines,
  getOpenPhoneContacts,
  getOpenPhoneCalls,
  getOpenPhoneMessages,
  sendOpenPhoneMessage,
  makeOpenPhoneCall,
  createOpenPhoneContact,
  syncOpenPhoneData
} from '../services/openphone';
import { z } from 'zod';

const router = Router();

// API key check middleware
const checkApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.OPENPHONE_API_KEY) {
    return res.status(503).json({
      error: 'OpenPhone API is not configured. Please set the OPENPHONE_API_KEY environment variable.'
    });
  }
  next();
};

// Get all phone lines
router.get('/lines', checkApiKey, async (req, res) => {
  try {
    const lines = await storage.getOpenPhoneLines();
    res.json(lines);
  } catch (error) {
    console.error('Error fetching phone lines:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get phone line by ID
router.get('/lines/:id', checkApiKey, async (req, res) => {
  try {
    const line = await storage.getOpenPhoneLine(parseInt(req.params.id));
    if (!line) {
      return res.status(404).json({ error: 'Phone line not found' });
    }
    res.json(line);
  } catch (error) {
    console.error('Error fetching phone line:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get phone lines assigned to current user
router.get('/lines/user/me', checkApiKey, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const lines = await storage.getOpenPhoneLinesByUser(req.user.id);
    res.json(lines);
  } catch (error) {
    console.error('Error fetching user phone lines:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get all contacts
router.get('/contacts', checkApiKey, async (req, res) => {
  try {
    const contacts = await storage.getOpenPhoneContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get contact by ID
router.get('/contacts/:id', checkApiKey, async (req, res) => {
  try {
    const contact = await storage.getOpenPhoneContact(parseInt(req.params.id));
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create contact
router.post('/contacts', checkApiKey, async (req, res) => {
  try {
    const contactData = insertOpenPhoneContactSchema.parse(req.body);
    
    // Create contact in OpenPhone API
    const apiContact = await createOpenPhoneContact({
      phoneNumber: contactData.phoneNumber,
      name: contactData.name || undefined,
      email: contactData.email || undefined,
      notes: contactData.notes || undefined,
      tags: contactData.tags || undefined
    });
    
    // Create in our database with the external ID
    const contact = await storage.createOrUpdateOpenPhoneContact({
      ...contactData,
      externalId: apiContact.id,
      createdAt: new Date()
    });
    
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get calls for a phone line
router.get('/lines/:lineId/calls', checkApiKey, async (req, res) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const line = await storage.getOpenPhoneLine(lineId);
    
    if (!line) {
      return res.status(404).json({ error: 'Phone line not found' });
    }
    
    // Optional date range filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }
    
    let calls;
    if (startDate && endDate) {
      calls = await storage.getOpenPhoneCallsByDateRange(startDate, endDate, lineId);
    } else {
      calls = await storage.getOpenPhoneCalls(lineId);
    }
    
    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Make a call
router.post('/lines/:lineId/calls', checkApiKey, async (req, res) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const line = await storage.getOpenPhoneLine(lineId);
    
    if (!line) {
      return res.status(404).json({ error: 'Phone line not found' });
    }
    
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Missing required parameter: to' });
    }
    
    // Make call via API
    const call = await makeOpenPhoneCall(line.externalId, to);
    
    // Find or create contact
    let contact = await storage.getOpenPhoneContactByPhoneNumber(to);
    
    if (!contact) {
      // Create a basic contact
      const apiContact = await createOpenPhoneContact({
        phoneNumber: to
      });
      
      contact = await storage.createOrUpdateOpenPhoneContact({
        externalId: apiContact.id,
        phoneNumber: to,
        name: null,
        email: null,
        propertyId: null,
        notes: null,
        tags: [],
        lastContactedAt: null,
        createdAt: new Date()
      });
    }
    
    // Create the call in our database
    const dbCall = await storage.createOpenPhoneCall({
      externalId: call.id,
      phoneLineId: lineId,
      contactId: contact.id,
      direction: 'outbound',
      status: 'completed',
      duration: 0, // Will be updated when call completes
      recordingUrl: null,
      notes: null,
      callDate: new Date(),
      createdAt: new Date()
    });
    
    res.status(201).json(dbCall);
  } catch (error) {
    console.error('Error making call:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get messages for a phone line
router.get('/lines/:lineId/messages', checkApiKey, async (req, res) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const line = await storage.getOpenPhoneLine(lineId);
    
    if (!line) {
      return res.status(404).json({ error: 'Phone line not found' });
    }
    
    // Optional date range filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }
    
    let messages;
    if (startDate && endDate) {
      messages = await storage.getOpenPhoneMessagesByDateRange(startDate, endDate, lineId);
    } else {
      messages = await storage.getOpenPhoneMessages(lineId);
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Send a message
router.post('/lines/:lineId/messages', checkApiKey, async (req, res) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const line = await storage.getOpenPhoneLine(lineId);
    
    if (!line) {
      return res.status(404).json({ error: 'Phone line not found' });
    }
    
    const messageData = insertOpenPhoneMessageSchema.omit({
      externalId: true,
      phoneLineId: true,
      contactId: true,
      direction: true,
      messageDate: true,
      isRead: true,
      createdAt: true
    }).parse(req.body);
    
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Missing required parameter: to' });
    }
    
    // Send message via API
    const message = await sendOpenPhoneMessage(line.externalId, to, messageData.content);
    
    // Find or create contact
    let contact = await storage.getOpenPhoneContactByPhoneNumber(to);
    
    if (!contact) {
      // Create a basic contact
      const apiContact = await createOpenPhoneContact({
        phoneNumber: to
      });
      
      contact = await storage.createOrUpdateOpenPhoneContact({
        externalId: apiContact.id,
        phoneNumber: to,
        name: null,
        email: null,
        propertyId: null,
        notes: null,
        tags: [],
        lastContactedAt: null,
        createdAt: new Date()
      });
    }
    
    // Create the message in our database
    const dbMessage = await storage.createOpenPhoneMessage({
      externalId: message.id,
      phoneLineId: lineId,
      contactId: contact.id,
      direction: 'outbound',
      content: messageData.content,
      mediaUrls: messageData.mediaUrls || [],
      isRead: true,
      messageDate: new Date(),
      createdAt: new Date()
    });
    
    res.status(201).json(dbMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Mark message as read
router.patch('/messages/:id/read', checkApiKey, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const message = await storage.markOpenPhoneMessageAsRead(messageId);
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Sync OpenPhone data
router.post('/sync', checkApiKey, async (req, res) => {
  try {
    await syncOpenPhoneData();
    res.json({ success: true, message: 'OpenPhone data synced successfully' });
  } catch (error) {
    console.error('Error syncing OpenPhone data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;