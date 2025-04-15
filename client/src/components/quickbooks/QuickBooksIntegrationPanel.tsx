import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink, Download, Upload, ArrowRightLeft } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Define type interfaces for API responses
interface QuickBooksStatus {
  connected: boolean;
  companyName?: string;
  error?: string;
}

interface QuickBooksAuthUrl {
  authUrl: string;
}

interface QuickBooksAccount {
  id: string;
  name: string;
  classification: string;
}

export default function QuickBooksIntegrationPanel() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);

  // Fetch QuickBooks connection status
  const { data: qbStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery<QuickBooksStatus>({
    queryKey: ['/api/quickbooks/validate'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Get authorization URL for QuickBooks OAuth
  const { data: authUrlData, isLoading: isAuthUrlLoading } = useQuery<QuickBooksAuthUrl>({
    queryKey: ['/api/quickbooks/auth-url'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !qbStatus?.connected,
  });

  // Get accounts from QuickBooks
  const { data: accounts, isLoading: isAccountsLoading } = useQuery<QuickBooksAccount[]>({
    queryKey: ['/api/quickbooks/accounts'],
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!qbStatus?.connected,
  });

  // Import data from QuickBooks
  const importMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);
      setImportProgress(10);
      
      const result = await apiRequest('/api/quickbooks/import', {
        method: 'POST',
      });
      
      setImportProgress(100);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: "QuickBooks data has been imported successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/transactions'] });
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred while importing data from QuickBooks.",
        variant: "destructive",
      });
      setIsImporting(false);
      setImportProgress(0);
    },
  });

  // Export data to QuickBooks
  const exportMutation = useMutation({
    mutationFn: async () => {
      setIsExporting(true);
      setExportProgress(10);
      
      const result = await apiRequest('/api/quickbooks/export', {
        method: 'POST',
      });
      
      setExportProgress(100);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Data has been exported to QuickBooks successfully.",
        variant: "default",
      });
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred while exporting data to QuickBooks.",
        variant: "destructive",
      });
      setIsExporting(false);
      setExportProgress(0);
    },
  });

  // Full migration from QuickBooks
  const migrateMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest('/api/quickbooks/migrate', {
        method: 'POST',
      });
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Migration Successful",
        description: "Full migration from QuickBooks completed successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during QuickBooks migration.",
        variant: "destructive",
      });
    },
  });

  // Handle connect button click
  const handleConnect = () => {
    if (authUrlData?.authUrl) {
      window.open(authUrlData.authUrl, '_blank');
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    refetchStatus();
  };

  const renderConnectionStatus = () => {
    if (isStatusLoading) {
      return <Badge variant="outline">Checking...</Badge>;
    }
    
    if (qbStatus?.connected) {
      return <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>;
    }
    
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>QuickBooks Integration</CardTitle>
            <CardDescription>Connect and sync with your QuickBooks account</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {renderConnectionStatus()}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isStatusLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!qbStatus?.connected ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            <div className="text-center">
              <h3 className="font-medium">Not Connected</h3>
              <p className="text-sm text-gray-500">Connect your QuickBooks account to enable syncing</p>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isAuthUrlLoading || !authUrlData?.authUrl}
            >
              Connect QuickBooks <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Connection Details</h3>
                <p className="text-sm text-gray-500">Account: {qbStatus?.companyName || "Unknown"}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            
            <Separator />
            
            {accounts?.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Linked Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {accounts.slice(0, 6).map((account: QuickBooksAccount) => (
                    <div key={account.id} className="text-sm p-2 bg-gray-50 rounded">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-gray-500 block">{account.classification}</span>
                    </div>
                  ))}
                  {accounts.length > 6 && (
                    <div className="text-sm p-2 bg-gray-50 rounded text-center">
                      <span className="text-gray-500">+{accounts.length - 6} more accounts</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing data...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            
            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting data...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} />
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {qbStatus?.connected && (
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || isImporting || exportMutation.isPending || isExporting}
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Import from QuickBooks
          </Button>
          
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || isExporting || importMutation.isPending || isImporting}
            size="sm"
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Export to QuickBooks
          </Button>
          
          <Button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending || isImporting || isExporting}
            size="sm"
            variant="secondary"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Full Migration
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}