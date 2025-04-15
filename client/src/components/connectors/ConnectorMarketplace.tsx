import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';``
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, ExternalLink, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

// Types for connectors
interface Connector {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  website?: string;
  pricing: 'free' | 'premium' | 'enterprise';
  affiliateEnabled: boolean;
  actions: string[];
  triggers: string[];
  requiredCredentials: Array<{
    name: string;
    description: string;
    type: string;
    isRequired: boolean;
  }>;
}

interface ConnectorInstance {
  id: string;
  connectorId: string;
  name: string;
  isConnected: boolean;
  lastSync?: string;
  createdAt: string;
  credentials: Record<string, any>;
}

export function ConnectorMarketplace() {
  const { toast } = useToast();
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('available');

  // Fetch available connectors
  const { data: availableConnectors, isLoading: loadingConnectors } = useQuery({
    queryKey: ['/api/connectors/available'],
    retry: 1,
  });

  // Fetch installed connectors
  const { data: installedConnectors, isLoading: loadingInstalled, refetch: refetchInstalled } = useQuery({
    queryKey: ['/api/connectors/installed'],
    retry: 1,
  });

  // Get connector details
  const getConnectorDetails = useMutation({
    mutationFn: async (connectorId: string) => {
      return await apiRequest(`/api/connectors/${connectorId}`, {
        method: 'GET',
      });
    },
    onSuccess: (data) => {
      setSelectedConnector(data);
      setCredentialsDialog(true);
      // Initialize empty credentials object
      const creds: Record<string, string> = {};
      data.requiredCredentials.forEach((cred: any) => {
        creds[cred.name] = '';
      });
      setCredentials(creds);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to get connector details: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Install connector
  const installConnector = useMutation({
    mutationFn: async ({ connectorId, credentials }: { connectorId: string; credentials: Record<string, string> }) => {
      return await apiRequest('/api/connectors/install', {
        method: 'POST',
        data: {
          connectorId,
          credentials,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connector installed successfully',
      });
      setCredentialsDialog(false);
      refetchInstalled();
      setActiveTab('installed');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to install connector: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Test connector
  const testConnector = useMutation({
    mutationFn: async ({ connectorId, credentials }: { connectorId: string; credentials: Record<string, string> }) => {
      return await apiRequest('/api/connectors/test', {
        method: 'POST',
        data: {
          connectorId,
          credentials,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Connection Test',
        description: data.message || 'Connection successful',
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle clicking a connector
  const handleConnectorClick = (connectorId: string) => {
    getConnectorDetails.mutate(connectorId);
  };

  // Handle credential input change
  const handleCredentialChange = (name: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle test connection
  const handleTestConnection = () => {
    if (!selectedConnector) return;
    
    testConnector.mutate({
      connectorId: selectedConnector.id,
      credentials,
    });
  };

  // Handle install
  const handleInstall = () => {
    if (!selectedConnector) return;
    
    installConnector.mutate({
      connectorId: selectedConnector.id,
      credentials,
    });
  };

  // Sync connector
  const syncConnector = useMutation({
    mutationFn: async (instanceId: string) => {
      return await apiRequest(`/api/connectors/${instanceId}/sync`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync Complete',
        description: data.message || 'Connector synchronized successfully',
      });
      refetchInstalled();
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete connector
  const deleteConnector = useMutation({
    mutationFn: async (instanceId: string) => {
      return await apiRequest(`/api/connectors/${instanceId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connector deleted successfully',
      });
      refetchInstalled();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete connector: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Get pricing badge color
  const getPricingBadgeColor = (pricing: string) => {
    switch (pricing) {
      case 'free':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'premium':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Integration Marketplace</h1>
          <p className="text-muted-foreground">
            Connect your property management platform with external services
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Connectors</TabsTrigger>
          <TabsTrigger value="installed">Installed Connectors</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {loadingConnectors ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableConnectors?.map((connector: any) => (
                <Card key={connector.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{connector.name}</CardTitle>
                      <Badge className={getPricingBadgeColor(connector.pricing)}>
                        {connector.pricing.charAt(0).toUpperCase() + connector.pricing.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>{connector.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Author:</span> {connector.author}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Version:</span> {connector.version}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleConnectorClick(connector.id)}
                      className="w-full"
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installed" className="mt-6">
          {loadingInstalled ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : installedConnectors?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {installedConnectors?.map((instance: ConnectorInstance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{instance.name}</CardTitle>
                      {instance.isConnected ? (
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      ) : (
                        <Badge variant="destructive">Disconnected</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {instance.lastSync ? (
                        <span>Last synchronized: {new Date(instance.lastSync).toLocaleString()}</span>
                      ) : (
                        <span>Never synchronized</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Status:</span>{' '}
                        {instance.isConnected ? (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Added on:</span>{' '}
                        {new Date(instance.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteConnector.mutate(instance.id)}
                      disabled={deleteConnector.isPending}
                    >
                      {deleteConnector.isPending ? 'Removing...' : 'Remove'}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => syncConnector.mutate(instance.id)}
                      disabled={syncConnector.isPending || !instance.isConnected}
                    >
                      {syncConnector.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        'Sync Now'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-lg">
              <h3 className="text-lg font-medium mb-2">No connectors installed</h3>
              <p className="text-muted-foreground mb-4">
                Install connectors from the Available Connectors tab to get started
              </p>
              <Button onClick={() => setActiveTab('available')}>
                Browse Connectors
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialog} onOpenChange={setCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedConnector?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to connect to {selectedConnector?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-2 px-1">
              {selectedConnector?.requiredCredentials.map((cred) => (
                <div key={cred.name} className="space-y-2">
                  <Label htmlFor={cred.name}>
                    {cred.description}
                    {cred.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    id={cred.name}
                    type={cred.type === 'apiKey' || cred.type === 'token' ? 'password' : 'text'}
                    placeholder={`Enter your ${cred.description}`}
                    value={credentials[cred.name] || ''}
                    onChange={(e) => handleCredentialChange(cred.name, e.target.value)}
                  />
                </div>
              ))}

              {selectedConnector?.website && (
                <>
                  <Separator className="my-4" />
                  <div className="pt-2">
                    <a
                      href={selectedConnector.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visit {selectedConnector.name} website
                    </a>
                  </div>
                </>
              )}

              {selectedConnector?.affiliateEnabled && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                  <p>
                    Don't have an account? Sign up for {selectedConnector.name} through our partner
                    link to receive special benefits.
                  </p>
                  <a
                    href={`/api/connectors/${selectedConnector.id}/signup`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center mt-2 font-medium hover:underline"
                  >
                    Sign up for {selectedConnector.name} <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={
                testConnector.isPending ||
                !selectedConnector?.requiredCredentials.every(
                  (cred) => !cred.isRequired || !!credentials[cred.name]
                )
              }
            >
              {testConnector.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              onClick={handleInstall}
              disabled={
                installConnector.isPending ||
                !selectedConnector?.requiredCredentials.every(
                  (cred) => !cred.isRequired || !!credentials[cred.name]
                )
              }
            >
              {installConnector.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install Connector'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}