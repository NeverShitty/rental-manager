import { useMercuryAccounts } from "@/lib/mercury";
import { Card } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";

export function MercuryAccountsList() {
  const { data: accounts, isLoading, error } = useMercuryAccounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>Error loading accounts: {error.message}</p>
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No Mercury accounts found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <Card key={account.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{account.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{account.type}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: account.currency
                }).format(parseFloat(account.balance))}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}