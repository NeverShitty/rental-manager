
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CapitalAccount {
  id: number;
  balance: number;
  totalContributions: number;
  totalDistributions: number;
}

interface CapitalTransaction {
  id: number;
  type: 'contribution' | 'distribution' | 'investment' | 'return';
  amount: number;
  description: string;
  transactionDate: string;
}

export function MemberPortal() {
  const [account, setAccount] = useState<CapitalAccount | null>(null);
  const [transactions, setTransactions] = useState<CapitalTransaction[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchAccountData();
    fetchTransactions();
  }, []);

  const fetchAccountData = async () => {
    const response = await fetch('/api/members/capital-account');
    const data = await response.json();
    setAccount(data);
  };

  const fetchTransactions = async () => {
    const response = await fetch('/api/members/capital-transactions');
    const data = await response.json();
    setTransactions(data);
  };

  const handleTransaction = async (type: 'contribution' | 'distribution') => {
    await fetch('/api/members/capital-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount: parseFloat(amount), description })
    });
    fetchAccountData();
    fetchTransactions();
    setAmount('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capital Account Summary</CardTitle>
          <CardDescription>View your current capital account status</CardDescription>
        </CardHeader>
        <CardContent>
          {account && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold">Current Balance</h3>
                <p className="text-2xl">${account.balance}</p>
              </div>
              <div>
                <h3 className="font-semibold">Total Contributions</h3>
                <p className="text-2xl">${account.totalContributions}</p>
              </div>
              <div>
                <h3 className="font-semibold">Total Distributions</h3>
                <p className="text-2xl">${account.totalDistributions}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CardContent>
        <CardFooter className="space-x-2">
          <Button onClick={() => handleTransaction('contribution')}>
            Make Contribution
          </Button>
          <Button onClick={() => handleTransaction('distribution')} variant="outline">
            Request Distribution
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="font-semibold capitalize">{transaction.type}</p>
                  <p className="text-sm text-gray-500">{transaction.description}</p>
                </div>
                <div>
                  <p className="font-semibold">${transaction.amount}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.transactionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
