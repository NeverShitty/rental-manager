
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { RefreshCw } from "lucide-react";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function AccountSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAccountsMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      try {
        const [mercuryRes, waveRes] = await Promise.all([
          apiRequest('/api/bookkeeping/sync/mercury', { method: 'POST' }),
          apiRequest('/api/bookkeeping/sync/wave', { method: 'POST' })
        ]);
        return { mercury: mercuryRes, wave: waveRes };
      } finally {
        setIsSyncing(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Accounts Synced',
        description: `Successfully synced Mercury and Wave accounts.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Sync</CardTitle>
        <CardDescription>Sync your Mercury Bank and Wave accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Click sync to update your transactions and balances from connected accounts.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => syncAccountsMutation.mutate()}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            'Sync Now'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
