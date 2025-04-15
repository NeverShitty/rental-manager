import { MercuryAccountsList } from "@/components/mercury/accounts-list";

export default function MercuryDashboard() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Mercury Bank Accounts</h1>
        <p className="text-muted-foreground">Manage your Mercury bank accounts and transactions</p>
      </div>
      <MercuryAccountsList />
    </div>
  );
}
