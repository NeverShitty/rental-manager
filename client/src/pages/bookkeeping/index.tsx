import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AssetTaxOptimizer } from '@/components/bookkeeping/AssetTaxOptimizer';
import { AccountSyncPanel } from '@/components/bookkeeping/AccountSyncPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw, Settings } from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';


export default function BookkeepingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('wave');
  const [apiKeysValid, setApiKeysValid] = useState({
    wave: false,
    doorloop: false,
    mercury: false
  });
  const [syncStatus, setSyncStatus] = useState({
    doorloopSynced: false,
    categorized: false,
    pushedToWave: false
  });

  // Reset sync status when API keys change
  useEffect(() => {
    if (!apiKeysValid.wave || !apiKeysValid.doorloop) {
      setSyncStatus({
        doorloopSynced: false,
        categorized: false,
        pushedToWave: false
      });
    }
  }, [apiKeysValid]);

  // Validate API keys on component mount
  useEffect(() => {
    const validateKeys = async () => {
      try {
        const response = await apiRequest('/api/bookkeeping/validate-keys');
        
        // Ensure we have all the key fields we need (in case the API doesn't return all fields)
        setApiKeysValid({
          wave: response.data?.wave || false,
          doorloop: response.data?.doorloop || false,
          mercury: response.data?.mercury || false
        });
      } catch (error) {
        toast({
          title: 'API Key Validation Failed',
          description: 'Please check your API keys in settings',
          variant: 'destructive'
        });
      }
    };
    validateKeys();
  }, []);

  // Fetch transaction categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/bookkeeping/categories'],
    queryFn: async () => {
      const response = await apiRequest('/api/bookkeeping/categories');
      return response as Record<string, Record<string, string>>;
    }
  });

  // Wave API integration
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncWaveAccountsMutation = useMutation({
    mutationFn: async () => {
      setSyncError(null);
      try {
        return await apiRequest('/api/bookkeeping/sync/wave', {
          method: 'POST'
        });
      } catch (error) {
        if (error instanceof Error) {
          setSyncError(error.message);
        } else {
          setSyncError('Unknown error occurred during sync');
        }
        throw error;
      }
    },
    onSuccess: (data: { accountsImported: number; accountsMapped: number }) => {
      toast({
        title: 'Wave Accounts Synced',
        description: `Successfully imported ${data.accountsImported} accounts and mapped ${data.accountsMapped} accounts.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Transaction push to Wave
  const pushToWaveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/push-to-wave', {
        method: 'POST'
      });
    },
    onSuccess: (data: { totalPushed: number; errors: number }) => {
      toast({
        title: 'Transactions Pushed to Wave',
        description: `Successfully pushed ${data.totalPushed} transactions (${data.errors} errors).`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Push Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // AI Categorization
  const categorizeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/categorize-transactions', {
        method: 'POST'
      });
    },
    onSuccess: (data: { processed: number; categorized: number; unchanged: number }) => {
      toast({
        title: 'Transactions Categorized',
        description: `Processed ${data.processed} transactions, categorized ${data.categorized} (${data.unchanged} unchanged).`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Categorization Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // DoorLoop Integration
  const syncDoorLoopMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/sync/doorloop', {
        method: 'POST'
      });
    },
    onSuccess: (data: { imported: number; categorized: number }) => {
      setSyncStatus(prev => ({ ...prev, doorloopSynced: true }));
      toast({
        title: 'DoorLoop Transactions Synced',
        description: `Imported ${data.imported} transactions, categorized ${data.categorized}.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'DoorLoop Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reconciliation Report
  const reconciliationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/reconciliation-report', {
        method: 'POST'
      });
    },
    onSuccess: (data: { reconciliationDate: string }) => {
      toast({
        title: 'Reconciliation Report Generated',
        description: `Report for ${new Date(data.reconciliationDate).toLocaleDateString()} created successfully.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Report Generation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const syncBusinessAccountsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/sync/business-accounts', {method: 'POST'});
    },
    onSuccess: () => {
      toast({
        title: 'Business Accounts Synced',
        description: 'Successfully synced selected business accounts.'
      })
    },
    onError: (error) => {
      toast({
        title: 'Business Accounts Sync Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  // Mercury Integration
  const mercurySyncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/bookkeeping/sync/mercury-coa', {
        method: 'POST'
      });
    },
    onSuccess: (data: { imported: number; categorized: number; mapped: number }) => {
      toast({
        title: 'Mercury Transactions Synced',
        description: `Imported ${data.imported} transactions, categorized ${data.categorized}, mapped ${data.mapped} to COA.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Mercury Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  })
  
  const syncMercuryWithCOA = () => {
    mercurySyncMutation.mutate();
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Automated Bookkeeping</h1>
          <Link to="/bookkeeping/integrations">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Manage Integrations
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Integration Status</AlertTitle>
            <AlertDescription>
              Wave API is connected. DoorLoop and Mercury integrations are ready to be authorized.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <AccountSyncPanel />
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="wave">Wave Accounting</TabsTrigger>
            <TabsTrigger value="doorloop">DoorLoop</TabsTrigger>
            <TabsTrigger value="vendors">Business Accounts</TabsTrigger>
            <TabsTrigger value="mercury">Mercury Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="wave" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wave Account Sync</CardTitle>
                  <CardDescription>
                    Synchronize your Wave accounting chart of accounts with the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    This will fetch all accounts from Wave and map them to the appropriate 
                    categories in our system. This helps ensure accurate transaction syncing.
                  </p>

                  {syncError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sync Failed</AlertTitle>
                      <AlertDescription>
                        {syncError}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => syncWaveAccountsMutation.mutate()}
                    disabled={syncWaveAccountsMutation.isPending}
                  >
                    {syncWaveAccountsMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Wave Accounts'
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Push to Wave</CardTitle>
                  <CardDescription>
                    Push transactions from our system to Wave accounting.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    This will send all transactions from the last 30 days to your Wave 
                    accounting system. Transactions are automatically mapped to the
                    appropriate accounts.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => pushToWaveMutation.mutate()}
                    disabled={pushToWaveMutation.isPending}
                  >
                    {pushToWaveMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Pushing...
                      </>
                    ) : (
                      'Push Transactions to Wave'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="doorloop" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>DoorLoop Synchronization</CardTitle>
                <CardDescription>
                  Import transactions from DoorLoop property management platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This will fetch all recent transactions from DoorLoop and import them into our system.
                  Transactions are automatically categorized and ready for accounting sync.
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Note: You need to provide your DoorLoop API key in settings before using this feature.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => syncDoorLoopMutation.mutate()}
                  disabled={syncDoorLoopMutation.isPending}
                >
                  {syncDoorLoopMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync DoorLoop Transactions'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Account Integration</CardTitle>
                <CardDescription>
                  Import transactions from business accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {['REI Pro Account', 'Home Depot Pro', 'HOA Statements', 'Amazon Business', 'Lowes Pro'].map((account) => (
                      <div key={account} className="flex items-center space-x-2">
                        <Checkbox id={account} />
                        <label htmlFor={account} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {account}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => syncBusinessAccountsMutation.mutate()}>
                  Sync Selected Accounts
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="mercury" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mercury Bank Synchronization</CardTitle>
                  <CardDescription>
                    Import transactions from Mercury Bank accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    This will fetch all recent transactions from your Mercury Bank accounts and
                    import them into our system. Transactions are automatically categorized and
                    ready for accounting sync.
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Note: You need to provide your Mercury API key in settings before using this feature.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => syncMercuryWithCOA()}
                    disabled={!apiKeysValid.mercury || mercurySyncMutation.isPending}
                  >
                    {mercurySyncMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Mercury Transactions'
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mercury API Configuration</CardTitle>
                  <CardDescription>
                    Configure your Mercury API integration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {apiKeysValid.mercury ? (
                      <>Your Mercury API key is configured and ready to use.</>
                    ) : (
                      <>You haven't configured a Mercury API key yet. Please visit the Integrations page to set it up.</>
                    )}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link to="/bookkeeping/integrations">
                    <Button variant="outline">
                      Manage API Key
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Transaction Categorization</CardTitle>
              <CardDescription>
                Automatically categorize uncategorized transactions using AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                This will analyze all transactions with missing or generic categories
                and attempt to categorize them using advanced AI analysis.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => categorizeMutation.mutate()}
                disabled={categorizeMutation.isPending}
              >
                {categorizeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Categorizing...
                  </>
                ) : (
                  'Categorize Transactions'
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Report</CardTitle>
              <CardDescription>
                Generate a reconciliation report across platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                This will create a detailed report comparing transactions across
                all connected platforms to identify discrepancies.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => reconciliationMutation.mutate()}
                disabled={reconciliationMutation.isPending}
              >
                {reconciliationMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      <div className="mt-8">
          <AssetTaxOptimizer />
        </div>
      </div>
    </DashboardLayout>
  );
}