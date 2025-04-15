import { Router } from 'express';
import { AssetStatus, AssetType } from '@shared/schema';
import { storage } from '../storage';

const router = Router();

// Asset tax analysis endpoint
router.get('/asset-tax-analysis', async (req, res) => {
  try {
    const assetList = await storage.getAssets();
    
    // Define depreciation rates by asset type
    const depreciationRates = {
      [AssetType.APPLIANCE.toLowerCase()]: 0.1, // 10% for appliances
      [AssetType.FURNITURE.toLowerCase()]: 0.2, // 20% for furniture
      [AssetType.ELECTRONICS.toLowerCase()]: 0.25, // 25% for electronics
      [AssetType.TOOLS.toLowerCase()]: 0.15, // 15% for tools
      [AssetType.FIXTURES.toLowerCase()]: 0.05, // 5% for fixtures
    };

    // Define tax rates by asset type
    const taxRates = {
      [AssetType.APPLIANCE.toLowerCase()]: 0.3, // 30% for appliances
      [AssetType.FURNITURE.toLowerCase()]: 0.25, // 25% for furniture
      [AssetType.ELECTRONICS.toLowerCase()]: 0.35, // 35% for electronics
      [AssetType.TOOLS.toLowerCase()]: 0.28, // 28% for tools
      [AssetType.FIXTURES.toLowerCase()]: 0.32, // 32% for fixtures
    };

    const analytics = assetList.map(asset => {
      const purchaseDate = new Date(asset.purchaseDate);
      const ageInYears = (new Date().getTime() - purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      const depreciationRate = depreciationRates[asset.type.toLowerCase()] || 0.1;
      const taxRate = taxRates[asset.type.toLowerCase()] || 0.3;
      
      // Convert purchasePrice to number to ensure correct calculation
      const purchasePriceNum = typeof asset.purchasePrice === 'string' 
        ? parseFloat(asset.purchasePrice) 
        : Number(asset.purchasePrice);
        
      const depreciation = purchasePriceNum * (depreciationRate * Math.min(ageInYears, 1/depreciationRate));
      const currentValue = purchasePriceNum - depreciation;
      
      return {
        assetId: asset.id,
        name: asset.name,
        purchasePrice: asset.purchasePrice,
        currentValue: currentValue,
        depreciationValue: depreciation,
        taxSavings: depreciation * taxRate,
        optimalDecommissionDate: new Date(purchaseDate.getTime() + (5 * 365 * 24 * 60 * 60 * 1000)) // 5 year optimal cycle
      };
    });
    
    res.json(analytics);
  } catch (error) {
    console.error('Error analyzing assets:', error);
    res.status(500).json({ error: 'Failed to analyze assets' });
  }
});

// Asset optimization endpoint
router.post('/optimize-assets', async (req, res) => {
  try {
    // Get all assets
    const assetList = await storage.getAssets();
    const results = [];
    
    // Process each asset
    for (const asset of assetList) {
      const purchaseDate = new Date(asset.purchaseDate);
      const ageInYears = (new Date().getTime() - purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      
      // Mark for decommission if older than 5 years
      if (ageInYears > 5) {
        await storage.updateAsset(asset.id, { 
          status: AssetStatus.RETIRED 
        });
      }
      
      // Add to results
      results.push({
        assetId: asset.id,
        name: asset.name,
        status: ageInYears > 5 ? AssetStatus.RETIRED : asset.status
      });
    }
    
    // Return response
    res.json({ 
      message: 'Assets optimized successfully',
      optimizedAssets: results
    });
  } catch (error) {
    console.error('Error optimizing assets:', error);
    res.status(500).json({ error: 'Failed to optimize assets' });
  }
});

export default router;