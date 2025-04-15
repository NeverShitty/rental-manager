import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import openPhoneRoutes from './routes/openphone';
import communicationsRoutes from './routes/communications';
import doorloopRoutes from './routes/doorloop';
import financeRoutes from './routes/finance';
import expenseRoutes from './routes/expenses';
import documentsRouter from './routes/documents';
import analysisRoutes from './routes/analysis';
import usersRoutes from './routes/users';
import bookkeepingRoutes from './routes/bookkeeping';
import waveChittyRoutes from './routes/wave-chitty';
import assetsRoutes from './routes/assets';
import assetAnalysisRoutes from './routes/asset-analysis';
import membersRoutes from './routes/members';
import leadsRoutes from './routes/leads';
import quickbooksRoutes from './routes/quickbooks';
import mercuryRoutes from './routes/mercury';
import staticIpRoutes from './routes/static-ip-routes';
import tenantsRoutes from './routes/tenants';

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Register routes
  app.use('/api/users', usersRoutes);
  app.use('/api/openphone', openPhoneRoutes);
  app.use('/api/communications', communicationsRoutes);
  app.use('/api/doorloop', doorloopRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/documents', documentsRouter);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/bookkeeping', bookkeepingRoutes);
  app.use('/api/wave', waveChittyRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/asset-analysis', assetAnalysisRoutes);
  app.use('/api/members', membersRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/quickbooks', quickbooksRoutes);
  app.use('/api/mercury', mercuryRoutes);
  app.use('/api/static-ip', staticIpRoutes);
  app.use('/api/tenants', tenantsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}