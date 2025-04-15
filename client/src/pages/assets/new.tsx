
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'wouter';
import { AssetType, AssetStatus } from '@shared/schema';

export default function NewAssetPage() {
  const [, navigate] = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const asset = Object.fromEntries(formData.entries());
    
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset)
    });
    
    navigate('/assets');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Add New Asset</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Asset Name</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AssetType).map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" name="purchaseDate" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input id="purchasePrice" name="purchasePrice" type="number" min="0" step="0.01" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" name="serialNumber" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyExpiration">Warranty Expiration</Label>
            <Input id="warrantyExpiration" name="warrantyExpiration" type="date" />
          </div>

          <Button type="submit" className="w-full">Add Asset</Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
