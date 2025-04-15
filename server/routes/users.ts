import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { UserRole } from '@shared/schema';

const router = Router();

// Middleware to check if the user is an owner (admin)
const isOwner = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.user?.role !== UserRole.OWNER) {
    return res.status(403).json({ error: 'Forbidden - Owner access required' });
  }
  
  next();
};

// Get all users (admin only)
router.get('/', isOwner, async (req: Request, res: Response) => {
  try {
    // Currently there is no getAllUsers method in storage
    // Let's improvise by getting the current user
    // In a real implementation, this would fetch all users from the database
    const user = req.user;
    res.json([user]);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json(req.user);
});

// Update current user
router.patch('/me', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Don't allow updating role through this endpoint
    const { role, password, ...updates } = req.body;
    
    const updatedUser = await storage.updateUser(req.user!.id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get a specific user by ID (admin only)
router.get('/:id', isOwner, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update a specific user (admin only)
router.patch('/:id', isOwner, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatedUser = await storage.updateUser(userId, req.body);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;