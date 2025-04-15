
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AssetsList } from '@/components/assets/assets-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';

export default function AssetsPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Asset Management</h1>
            <p className="text-muted-foreground">Track and manage property assets</p>
          </div>
          <Link href="/assets/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>
        <AssetsList />
      </div>
    </DashboardLayout>
  );
}
