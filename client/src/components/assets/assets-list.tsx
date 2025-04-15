
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';
import { format } from 'date-fns';

export function AssetsList() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(setAssets);
  }, []);

  const recordMaintenance = async (id, notes) => {
    await fetch(`/api/assets/${id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceNotes: notes })
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <Card key={asset.id} className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{asset.name}</h3>
              <p className="text-sm text-muted-foreground">{asset.model}</p>
            </div>
            <Badge>{asset.status}</Badge>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Purchase Date:</span>
              {' '}{format(new Date(asset.purchaseDate), 'PP')}
            </div>
            <div className="text-sm">
              <span className="font-medium">Value:</span>
              {' '}${asset.purchasePrice}
            </div>
            {asset.lastMaintenanceDate && (
              <div className="text-sm">
                <span className="font-medium">Last Maintained:</span>
                {' '}{format(new Date(asset.lastMaintenanceDate), 'PP')}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => recordMaintenance(asset.id, 'Routine maintenance performed')}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Record Maintenance
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
