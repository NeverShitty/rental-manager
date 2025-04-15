
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CapitalAccount {
  id: number;
  balance: number;
  contributionsTotal: number;
  distributionsTotal: number;
}

export function CapitalAccountDashboard() {
  const { toast } = useToast();
  const [account, setAccount] = useState<CapitalAccount | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const response = await apiRequest('/api/members/capital-account');
      setAccount(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch capital account data',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Account</CardTitle>
        <CardDescription>Track your investment balance and transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {account && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium">Current Balance</h3>
                <p className="text-2xl font-bold">${account.balance.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Total Contributions</h3>
                <p className="text-2xl font-bold">${account.contributionsTotal.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Total Distributions</h3>
                <p className="text-2xl font-bold">${account.distributionsTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
