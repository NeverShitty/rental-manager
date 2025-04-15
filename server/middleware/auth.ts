
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const session = await storage.get(`session:${token}`);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.user = session.user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
}
