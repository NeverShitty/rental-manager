import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { WaveIntegrationPanel } from '@/components/wave/WaveIntegrationPanel';

export default function WavePage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Wave Accounting</h1>
        <WaveIntegrationPanel />
      </div>
    </DashboardLayout>
  );
}