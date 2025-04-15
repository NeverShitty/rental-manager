import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Key, RefreshCw } from "lucide-react";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WaveIntegrationPanelProps {
  onApiKeyChange?: (isValid: boolean) => void;
}

export function WaveIntegrationPanel({ onApiKeyChange }: WaveIntegrationPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const validateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/wave/validate', {
        method: 'GET',
        params: { apiKey }
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "API Key Valid",
          description: "Successfully connected to Wave"
        });
        if (onApiKeyChange) onApiKeyChange(true);
      } else {
        toast({
          title: "API Key Invalid",
          description: data.message || "Please check your API key",
          variant: "destructive"
        });
        if (onApiKeyChange) onApiKeyChange(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      if (onApiKeyChange) onApiKeyChange(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wave Integration</CardTitle>
        <CardDescription>
          Connect to Wave Accounting for synchronizing transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key">Wave API Key</Label>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Input
                id="api-key"
                placeholder="Enter your Wave API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
                type="password"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can generate an API key from your Wave account settings.
            </p>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending || !apiKey.trim()}
          className="w-full"
        >
          {validateMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate Connection'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}