import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [doorloopKey, setDoorloopKey] = useState('');
  const [waveKey, setWaveKey] = useState('');
  const [hubspotKey, setHubspotKey] = useState('');
  const [ms365Settings, setMs365Settings] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check current integration status
  const { data: integrationStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/bookkeeping/validate-keys'],
  });
  
  // Function to save API keys
  const saveCredentials = async (service: string, credentials: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/settings/save-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service,
          credentials
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Credentials Saved",
          description: `${service} credentials have been saved successfully.`,
        });
        // Refresh integration status
        refetchStatus();
      } else {
        toast({
          title: "Error Saving Credentials",
          description: result.message || `Failed to save ${service} credentials.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error saving ${service} credentials:`, error);
      toast({
        title: "Error",
        description: `An error occurred while saving ${service} credentials.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Save DoorLoop API key
  const saveDoorloopKey = () => {
    saveCredentials('doorloop', { apiKey: doorloopKey });
  };
  
  // Save Wave API key
  const saveWaveKey = () => {
    saveCredentials('wave', { apiKey: waveKey });
  };
  
  // Save HubSpot API key
  const saveHubspotKey = () => {
    saveCredentials('hubspot', { apiKey: hubspotKey });
  };
  
  // Save Microsoft 365 settings
  const saveMs365Settings = () => {
    saveCredentials('microsoft365', ms365Settings);
  };
  
  // Test connection to each service
  const testConnection = async (service: string) => {
    try {
      const response = await fetch(`/api/settings/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${service}.`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || `Failed to connect to ${service}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error testing ${service} connection:`, error);
      toast({
        title: "Error",
        description: `An error occurred while testing connection to ${service}.`,
        variant: "destructive",
      });
    }
  };
  
  // Connection status indicators
  const ConnectionStatus = ({ status }: { status: boolean | undefined }) => {
    if (status === undefined) return (
      <div className="flex items-center text-yellow-500">
        <AlertCircle className="w-4 h-4 mr-1" />
        <span>Unknown</span>
      </div>
    );
    
    return status ? (
      <div className="flex items-center text-green-500">
        <CheckCircle className="w-4 h-4 mr-1" />
        <span>Connected</span>
      </div>
    ) : (
      <div className="flex items-center text-red-500">
        <XCircle className="w-4 h-4 mr-1" />
        <span>Disconnected</span>
      </div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Service Integrations</h1>
      </div>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          These API keys and credentials are securely stored as environment variables. 
          They are required for different features of the system to function properly.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="property" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property">Property Management</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="crm">CRM & Marketing</TabsTrigger>
          <TabsTrigger value="documents">Documents & Email</TabsTrigger>
        </TabsList>
        
        <TabsContent value="property" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DoorLoop Integration</CardTitle>
              <CardDescription>Connect to your DoorLoop account to sync properties, tenants, and transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="doorloopKey">DoorLoop API Key</Label>
                  <Input
                    id="doorloopKey"
                    placeholder="Enter your DoorLoop API key"
                    value={doorloopKey}
                    onChange={(e) => setDoorloopKey(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Status:</span>
                  <ConnectionStatus status={integrationStatus?.doorloop} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => testConnection('doorloop')} disabled={isSubmitting}>
                Test Connection
              </Button>
              <Button onClick={saveDoorloopKey} disabled={isSubmitting || !doorloopKey}>
                Save Credentials
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wave Accounting Integration</CardTitle>
              <CardDescription>Connect to Wave for financial data, invoices, and transaction tracking.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="waveKey">Wave API Key</Label>
                  <Input
                    id="waveKey"
                    placeholder="Enter your Wave API key"
                    value={waveKey}
                    onChange={(e) => setWaveKey(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Status:</span>
                  <ConnectionStatus status={integrationStatus?.wave} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => testConnection('wave')} disabled={isSubmitting}>
                Test Connection
              </Button>
              <Button onClick={saveWaveKey} disabled={isSubmitting || !waveKey}>
                Save Credentials
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="crm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HubSpot Integration</CardTitle>
              <CardDescription>Connect to HubSpot for lead management and CRM functionality.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="hubspotKey">HubSpot API Key</Label>
                  <Input
                    id="hubspotKey"
                    placeholder="Enter your HubSpot API key"
                    value={hubspotKey}
                    onChange={(e) => setHubspotKey(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Status:</span>
                  <ConnectionStatus status={integrationStatus?.hubspot} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => testConnection('hubspot')} disabled={isSubmitting}>
                Test Connection
              </Button>
              <Button onClick={saveHubspotKey} disabled={isSubmitting || !hubspotKey}>
                Save Credentials
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Microsoft 365 Integration</CardTitle>
              <CardDescription>Connect to Microsoft 365 for email, calendar, and document management.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input
                    id="tenantId"
                    placeholder="Enter your Microsoft 365 Tenant ID"
                    value={ms365Settings.tenantId}
                    onChange={(e) => setMs365Settings({...ms365Settings, tenantId: e.target.value})}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="Enter your Microsoft 365 Client ID"
                    value={ms365Settings.clientId}
                    onChange={(e) => setMs365Settings({...ms365Settings, clientId: e.target.value})}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    placeholder="Enter your Microsoft 365 Client Secret"
                    value={ms365Settings.clientSecret}
                    onChange={(e) => setMs365Settings({...ms365Settings, clientSecret: e.target.value})}
                    type="password"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Status:</span>
                  <ConnectionStatus status={integrationStatus?.microsoft365} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => testConnection('microsoft365')} disabled={isSubmitting}>
                Test Connection
              </Button>
              <Button 
                onClick={saveMs365Settings} 
                disabled={isSubmitting || !ms365Settings.tenantId || !ms365Settings.clientId || !ms365Settings.clientSecret}
              >
                Save Credentials
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}