
import { Router } from 'express';
import { storage } from '../storage';
import { capitalAccounts, capitalTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/capital-account', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const account = await storage.db
      .select()
      .from(capitalAccounts)
      .where(eq(capitalAccounts.userId, userId))
      .limit(1);

    res.json(account[0] || null);
  } catch (error) {
    console.error('Error fetching capital account:', error);
    res.status(500).json({ error: 'Failed to fetch capital account' });
  }
});

router.get('/capital-transactions', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const account = await storage.db
      .select()
      .from(capitalAccounts)
      .where(eq(capitalAccounts.userId, userId))
      .limit(1);

    if (!account[0]) {
      return res.status(404).json({ error: 'Capital account not found' });
    }

    const transactions = await storage.db
      .select()
      .from(capitalTransactions)
      .where(eq(capitalTransactions.accountId, account[0].id))
      .orderBy(capitalTransactions.transactionDate);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching capital transactions:', error);
    res.status(500).json({ error: 'Failed to fetch capital transactions' });
  }
});

router.post('/capital-transactions', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, description } = req.body;

    const account = await storage.db
      .select()
      .from(capitalAccounts)
      .where(eq(capitalAccounts.userId, userId))
      .limit(1);

    if (!account[0]) {
      return res.status(404).json({ error: 'Capital account not found' });
    }

    const transaction = await storage.db.insert(capitalTransactions).values({
      accountId: account[0].id,
      type,
      amount,
      description,
      transactionDate: new Date(),
      createdBy: userId
    }).returning();

    // Update account balances
    const updateValues = type === 'contribution' 
      ? { 
          balance: account[0].balance + amount,
          totalContributions: account[0].totalContributions + amount
        }
      : {
          balance: account[0].balance - amount,
          totalDistributions: account[0].totalDistributions + amount
        };

    await storage.db
      .update(capitalAccounts)
      .set(updateValues)
      .where(eq(capitalAccounts.id, account[0].id));

    res.json(transaction[0]);
  } catch (error) {
    console.error('Error creating capital transaction:', error);
    res.status(500).json({ error: 'Failed to create capital transaction' });
  }
});

export default router;
