import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Key, Plus, Building2, Globe, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { BusinessAccount, MercuryCredential } from "@shared/schema";

interface MercuryIntegrationPanelProps {
  onApiKeyChange?: (isValid: boolean) => void;
}

interface StaticIPStatusResponse {
  success: boolean;
  isEnabled: boolean;
  ipAddress?: string;
  status: 'inactive' | 'pending' | 'active';
  message?: string;
}

export function MercuryIntegrationPanel({ onApiKeyChange }: MercuryIntegrationPanelProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [saveToEnv, setSaveToEnv] = useState<boolean>(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLegalName, setBusinessLegalName] = useState<string>("");
  const [businessTaxId, setBusinessTaxId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();

  // Get business accounts
  const { 
    data: businessAccounts, 
    isLoading: isLoadingBusinesses,
    refetch: refetchBusinesses 
  } = useQuery({
    queryKey: ['/api/business-accounts'],
    retry: 1,
  });

  // Get Mercury credentials for selected business
  const { 
    data: mercuryCredentials, 
    isLoading: isLoadingCredentials,
    refetch: refetchCredentials 
  } = useQuery({
    queryKey: ['/api/mercury/credentials', selectedBusinessId],
    enabled: !!selectedBusinessId,
    retry: 1,
  });
  
  // Get static IP status
  const { 
    data: staticIpStatus, 
    isLoading: isLoadingStaticIp,
    refetch: refetchStaticIp 
  } = useQuery<StaticIPStatusResponse>({
    queryKey: ['/api/static-ip/status'],
    retry: 1,
  });

  // Create business account
  const createBusinessMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      legalName: string; 
      taxId?: string; 
    }) => {
      return await apiRequest('/api/business-accounts', {
        method: 'POST',
        data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Business Added",
        description: "Business account has been added successfully.",
      });
      setIsCreateDialogOpen(false);
      refetchBusinesses();
      setSelectedBusinessId(data.id);

      // Reset form
      setBusinessName("");
      setBusinessLegalName("");
      setBusinessTaxId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add business: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Validate Mercury API key
  const validateMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest('/api/mercury/validate', {
        method: 'POST',
        data: { 
          apiKey: key,
          businessAccountId: selectedBusinessId 
        }
      });
      return res;
    },
    onSuccess: (data) => {
      setIsValid(data.success);
      if (data.success) {
        toast({
          title: "API Key Valid",
          description: `The Mercury API key is valid. Found ${data.accountsFound || 0} accounts.`,
        });
        if (onApiKeyChange) onApiKeyChange(true);
        refetchCredentials();
      } else {
        toast({
          title: "API Key Invalid",
          description: data.message || "The Mercury API key is invalid.",
          variant: "destructive",
        });
        if (onApiKeyChange) onApiKeyChange(false);
      }
    },
    onError: (error: Error) => {
      setIsValid(false);
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive",
      });
      if (onApiKeyChange) onApiKeyChange(false);
    }
  });

  // Save API key
  const saveMutation = useMutation({
    mutationFn: async (data: { 
      apiKey: string;
      businessAccountId: number;
      saveToEnv?: boolean;
    }) => {
      const res = await apiRequest('/api/mercury/save-key', {
        method: 'POST',
        data
      });
      return res;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "API Key Saved",
          description: "The Mercury API key has been saved successfully.",
        });
        refetchCredentials();
      } else {
        toast({
          title: "Save Failed",
          description: data.message || "Failed to save API key.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Save Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete credential
  const deleteCredentialMutation = useMutation({
    mutationFn: async (credentialId: number) => {
      const res = await apiRequest(`/api/mercury/credentials/${credentialId}`, {
        method: 'DELETE'
      });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Credential Deleted",
        description: "The Mercury API key has been deleted successfully.",
      });
      refetchCredentials();
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Enable static IP
  const enableStaticIpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/static-ip/enable', {
        method: 'POST'
      });
      return res;
    },
    onSuccess: (data) => {
      toast({
        title: "Static IP Enabled",
        description: data.message || "Static IP has been configured successfully.",
      });
      refetchStaticIp();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to enable static IP: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleBusinessCreate = () => {
    if (!businessName || !businessLegalName) {
      toast({
        title: "Missing Information",
        description: "Business name and legal name are required.",
        variant: "destructive",
      });
      return;
    }

    createBusinessMutation.mutate({
      name: businessName,
      legalName: businessLegalName,
      taxId: businessTaxId || undefined
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !selectedBusinessId) return;

    // First validate the key
    validateMutation.mutate(apiKey);

    // Save the key
    saveMutation.mutate({
      apiKey,
      businessAccountId: selectedBusinessId,
      saveToEnv
    });
  };

  // Set the first business as selected when data is loaded
  useEffect(() => {
    if (businessAccounts?.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businessAccounts[0].id);
    }
  }, [businessAccounts, selectedBusinessId]);

  return (
    <Tabs defaultValue="accounts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="accounts">
          <Building2 className="mr-2 h-4 w-4" />
          Business Accounts
        </TabsTrigger>
        <TabsTrigger value="staticip">
          <Shield className="mr-2 h-4 w-4" />
          Static IP
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="accounts" className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Business Accounts</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Business
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Business Account</DialogTitle>
                <DialogDescription>
                  Add a new business account to manage Mercury API credentials
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input
                    id="name"
                    placeholder="ARIBIA LLC"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    placeholder="ARIBIA LIMITED LIABILITY COMPANY"
                    value={businessLegalName}
                    onChange={(e) => setBusinessLegalName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxId">Tax ID (EIN) - Optional</Label>
                  <Input
                    id="taxId"
                    placeholder="XX-XXXXXXX"
                    value={businessTaxId}
                    onChange={(e) => setBusinessTaxId(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={handleBusinessCreate} disabled={createBusinessMutation.isPending}>
                  {createBusinessMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Add Business"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Business Account Sidebar */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Business</CardTitle>
              <CardDescription>
                Choose a business account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBusinesses ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : businessAccounts?.length > 0 ? (
                <ScrollArea className="h-60">
                  <div className="space-y-1">
                    {businessAccounts.map((business: BusinessAccount) => (
                      <button
                        key={business.id}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                          selectedBusinessId === business.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedBusinessId(business.id)}
                      >
                        {business.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No business accounts yet
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Business
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mercury API Integration */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Mercury Bank Integration</CardTitle>
              <CardDescription>
                {selectedBusinessId ? (
                  <>
                    Connect {businessAccounts?.find((b: BusinessAccount) => b.id === selectedBusinessId)?.name} to Mercury Bank
                  </>
                ) : (
                  "Select or create a business to connect Mercury Bank"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBusinessId ? (
                <>
                  {/* Show existing credentials */}
                  {!isLoadingCredentials && mercuryCredentials?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Active API Keys</h4>
                      <div className="space-y-2">
                        {mercuryCredentials.map((credential: MercuryCredential) => (
                          <div key={credential.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center">
                              <Key className="h-4 w-4 text-muted-foreground mr-2" />
                              <div>
                                <div className="text-sm font-medium">
                                  •••••••••••••••••{credential.apiKey.substring(credential.apiKey.length - 4)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Last validated: {new Date(credential.lastValidated).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={credential.isValid ? "default" : "destructive"}>
                                {credential.isValid ? "Valid" : "Invalid"}
                              </Badge>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteCredentialMutation.mutate(credential.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                    </div>
                  )}

                  {/* Add new API key form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="api-key">Add New Mercury API Key</Label>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="api-key"
                          placeholder="Enter your Mercury API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="flex-1"
                          type="password"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You can generate an API key from your Mercury Bank account settings.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="save-env" 
                        checked={saveToEnv}
                        onCheckedChange={setSaveToEnv}
                      />
                      <Label htmlFor="save-env">Also save as environment variable</Label>
                    </div>

                    {isValid !== null && (
                      <Alert variant={isValid ? "default" : "destructive"}>
                        {isValid ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {isValid ? "API Key Valid" : "API Key Invalid"}
                        </AlertTitle>
                        <AlertDescription>
                          {isValid
                            ? "Your Mercury API key is valid and ready to use."
                            : "Your Mercury API key is invalid. Please check and try again."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Please select a business from the sidebar or create a new one to connect Mercury Bank.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Business
                  </Button>
                </div>
              )}
            </CardContent>
            {selectedBusinessId && (
              <CardFooter>
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={!apiKey || !selectedBusinessId || validateMutation.isPending || saveMutation.isPending}
                  className="w-full"
                >
                  {validateMutation.isPending || saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {saveMutation.isPending ? "Saving..." : "Validating..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Validate & Save
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="staticip" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Static IP Configuration
            </CardTitle>
            <CardDescription>
              Configure a static IP for Mercury API access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStaticIp ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Static IP for API Security</AlertTitle>
                  <AlertDescription>
                    Mercury Bank requires connections from a static IP address. Our service can automatically route your API requests through a dedicated static IP.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <div className="flex items-center mt-1.5">
                        {staticIpStatus?.isEnabled ? (
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : staticIpStatus?.status === 'pending' ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Provisioning
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label>IP Address</Label>
                      <div className="font-mono text-sm mt-1.5">
                        {staticIpStatus?.ipAddress || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {staticIpStatus?.isEnabled ? (
                      <Alert className="bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle>Static IP is Active</AlertTitle>
                        <AlertDescription>
                          All Mercury API requests are automatically routed through your dedicated static IP address. You can add this IP address ({staticIpStatus.ipAddress}) to Mercury's allowed IP list.
                        </AlertDescription>
                      </Alert>
                    ) : staticIpStatus?.status === 'pending' ? (
                      <Alert className="bg-yellow-50">
                        <RefreshCw className="h-4 w-4 text-yellow-600" />
                        <AlertTitle>Static IP is Being Provisioned</AlertTitle>
                        <AlertDescription>
                          Your static IP is currently being set up. This typically takes 5-10 minutes. Please check back soon.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          You don't have a static IP configured. Enable it to allow secure API access to Mercury Bank.
                        </p>
                        <Button
                          onClick={() => enableStaticIpMutation.mutate()}
                          disabled={enableStaticIpMutation.isPending}
                        >
                          {enableStaticIpMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enabling...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Enable Static IP
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}