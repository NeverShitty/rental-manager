import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { WaveIntegrationPanel } from "@/components/wave/WaveIntegrationPanel";
import { MercuryIntegrationPanel } from "@/components/mercury/MercuryIntegrationPanel";
import { Separator } from "@/components/ui/separator";

// Placeholder for now, will be implemented later
const QuickBooksIntegrationPanel = () => <div>QuickBooks Integration Coming Soon</div>;

export default function BookkeepingIntegrationsPage() {
  useEffect(() => {
    document.title = "Bookkeeping Integrations - ARIBIA Property Manager";
  }, []);

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-1">Bookkeeping Integrations</h1>
      <p className="text-gray-500 mb-6">
        Connect and manage your accounting service integrations
      </p>

      <div className="grid gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Wave Accounting</h2>
          <WaveIntegrationPanel />
        </div>

        <Separator className="my-4" />

        <div>
          <h2 className="text-xl font-semibold mb-4">QuickBooks</h2>
          <QuickBooksIntegrationPanel />
        </div>

        <Separator className="my-4" />

        <div>
          <h2 className="text-xl font-semibold mb-4">Mercury Bank</h2>
          <MercuryIntegrationPanel />
        </div>

        <Separator className="my-4" />

        <div>
          <h2 className="text-xl font-semibold mb-4">Additional Integrations</h2>
          <p className="text-gray-500 mb-4">
            More accounting integrations will be available soon. If you need a specific integration, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}