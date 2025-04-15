import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subMonths } from "date-fns";

export function AccountSyncPanel() {
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  // Get integration status
  const { data: integrationStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/bookkeeping/integration-status'],
    queryFn: () => apiRequest('/api/bookkeeping/integration-status')
      .then(res => res.json())
      .then(data => data.integrationStatus),
  });

  // Auto-reconciliation mutation
  const autoReconcile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/bookkeeping/auto-reconcile', {
        method: 'POST',
        data: {
          startDate,
          endDate
        }
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Auto-reconciliation completed",
        description: "All accounts have been synchronized and reconciled.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Reconciliation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Transaction push to Wave mutation
  const pushToWave = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/bookkeeping/push-to-wave', {
        method: 'POST',
        data: {
          startDate,
          endDate
        }
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transactions pushed to Wave",
        description: `Pushed ${data.pushed || 0} transactions successfully.`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to push transactions",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // DoorLoop sync mutation
  const syncDoorLoop = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/bookkeeping/sync/doorloop', {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "DoorLoop sync completed",
        description: `${data.imported || 0} transactions imported and ${data.mapped || 0} mapped to COA categories.`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "DoorLoop sync failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mercury sync mutation
  const syncMercury = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/bookkeeping/sync/mercury-coa', {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mercury sync completed",
        description: `${data.imported || 0} transactions imported and ${data.mapped || 0} mapped to COA categories.`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Mercury sync failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: boolean, error: string | null) => {
    if (error) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return status ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Synchronization</CardTitle>
          <CardDescription>Loading integration status...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Synchronization</CardTitle>
        <CardDescription>Synchronize transactions between platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Start Date</h3>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                placeholder="Select start date"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">End Date</h3>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                placeholder="Select end date"
              />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium mb-2">Integration Status</h3>
            <div className="grid gap-2">
              {integrationStatus && (
                <>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.wave.connected, integrationStatus.wave.error)}
                      <span>Wave Accounting</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {integrationStatus.wave.connected 
                        ? `${integrationStatus.wave.businesses?.length || 0} businesses` 
                        : "Not connected"}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.mercury.connected, integrationStatus.mercury.error)}
                      <span>Mercury Banking</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {integrationStatus.mercury.connected 
                        ? `${integrationStatus.mercury.accounts?.length || 0} accounts` 
                        : "Not connected"}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.doorloop.connected, integrationStatus.doorloop.error)}
                      <span>DoorLoop</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {integrationStatus.doorloop.connected 
                        ? "Connected" 
                        : "Not connected"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="default" 
            onClick={() => autoReconcile.mutate()} 
            className="gap-2"
            disabled={autoReconcile.isPending}
          >
            {autoReconcile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Auto Reconcile
          </Button>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => syncDoorLoop.mutate()} 
            className="gap-2"
            disabled={syncDoorLoop.isPending || !integrationStatus?.doorloop.connected}
          >
            {syncDoorLoop.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync DoorLoop
          </Button>
          <Button 
            variant="outline" 
            onClick={() => syncMercury.mutate()} 
            className="gap-2"
            disabled={syncMercury.isPending || !integrationStatus?.mercury.connected}
          >
            {syncMercury.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Mercury
          </Button>
          <Button 
            variant="outline" 
            onClick={() => pushToWave.mutate()} 
            className="gap-2"
            disabled={pushToWave.isPending || !integrationStatus?.wave.connected}
          >
            {pushToWave.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Push to Wave
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}