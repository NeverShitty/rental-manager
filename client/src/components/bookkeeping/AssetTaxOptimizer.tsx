
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssetType, AssetStatus } from '@shared/schema';

interface AssetTaxAnalysis {
  assetId: number;
  name: string;
  purchasePrice: number;
  currentValue: number;
  depreciationValue: number;
  taxSavings: number;
  optimalDecommissionDate: Date;
}

export function AssetTaxOptimizer() {
  const [assetAnalytics, setAssetAnalytics] = useState<AssetTaxAnalysis[]>([]);

  useEffect(() => {
    fetch('/api/bookkeeping/asset-tax-analysis')
      .then(res => res.json())
      .then(setAssetAnalytics);
  }, []);

  const handleOptimizeAssets = async () => {
    const response = await fetch('/api/bookkeeping/optimize-assets', {
      method: 'POST'
    });
    const data = await response.json();
    setAssetAnalytics(data.analytics);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset Tax Optimization</h2>
        <Button onClick={handleOptimizeAssets}>Run Tax Analysis</Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assetAnalytics.map((asset) => (
          <Card key={asset.assetId} className="p-4">
            <h3 className="font-semibold">{asset.name}</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div>Purchase Price: ${asset.purchasePrice}</div>
              <div>Current Value: ${asset.currentValue}</div>
              <div>Depreciation: ${asset.depreciationValue}</div>
              <div>Potential Tax Savings: ${asset.taxSavings}</div>
              <div>Optimal Decommission: {new Date(asset.optimalDecommissionDate).toLocaleDateString()}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
