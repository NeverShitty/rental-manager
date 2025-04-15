import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function GuestBillingDashboard() {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (description) {
      analyzeBillingDescription(description);
    }
  }, [description]);

  const analyzeBillingDescription = async (desc: string) => {
    try {
      const response = await apiRequest('/api/billing/analyze', {
        method: 'POST',
        data: { description: desc }
      });
      setSuggestions(response.suggestions);
    } catch (error) {
      console.error('Error getting billing suggestions:', error);
    }
  };

  const handleCharge = async () => {
    try {
      const response = await apiRequest('/api/billing/charge', {
        method: 'POST',
        data: {
          amount: parseFloat(amount),
          description,
          // Assuming analyzeBillingDescription provides suggestedCategory
          //  Handle potential errors if suggestedCategory is not available
          category: response.suggestedCategory || "uncategorized" 
        }
      });

      toast({
        title: 'Charge Created',
        description: `Successfully created charge for $${amount}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create charge',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Billing</CardTitle>
        <CardDescription>Create and manage guest charges</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {suggestions.length > 0 && (
            <div>
              <h3>AI Suggestions:</h3>
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={handleCharge}>Create Charge</Button>
        </div>
      </CardContent>
    </Card>
  );
}