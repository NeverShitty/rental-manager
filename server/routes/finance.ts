
import { Router } from 'express';
import { storage } from '../storage';
import { generateFinancialReport } from '../services/openai';

const router = Router();

// Generate financial report
router.post('/reports/generate', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { startDate, endDate, propertyId, reportType } = req.body;
    
    const transactions = await storage.getTransactionsByDateRange(
      new Date(startDate),
      new Date(endDate),
      propertyId
    );
    
    const insights = await generateFinancialReport(
      transactions,
      new Date(startDate),
      new Date(endDate),
      reportType
    );
    
    const report = await storage.createFinancialReport({
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Financial Report`,
      type: reportType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      propertyId,
      summary: insights,
      aiInsights: insights,
      metrics: JSON.stringify({
        totalIncome: transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        totalExpenses: transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        transactionCount: transactions.length,
        categoryBreakdown: transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
          return acc;
        }, {} as Record<string, number>)
      }),
      createdBy: req.user.id
    });
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get report history
router.get('/reports', async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const { propertyId, type, startDate, endDate } = req.query;
  
  const reports = await storage.getFinancialReports({
    propertyId: propertyId ? parseInt(propertyId as string) : undefined,
    type: type as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  });
  
  res.json(reports);
});

export default router;
