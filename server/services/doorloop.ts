import axios from 'axios';
import { TenantStatus } from '@shared/schema';

// DoorLoop API client
const doorloopClient = axios.create({
  baseURL: 'https://api.doorloop.com',
  headers: {
    'Authorization': `Bearer ${process.env.DOORLOOP_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Map DoorLoop tenant status to our application tenant status
const mapTenantStatus = (doorloopStatus: string): string => {
  const statusMap: Record<string, string> = {
    'prospect': TenantStatus.PROSPECT,
    'applicant': TenantStatus.APPLICATION,
    'approved': TenantStatus.APPROVED,
    'current': TenantStatus.ACTIVE,
    'past': TenantStatus.PAST,
    // Add more mappings as needed
  };
  return statusMap[doorloopStatus.toLowerCase()] || TenantStatus.PROSPECT;
};

// Fetch tenants from DoorLoop API
export async function fetchDoorloopTenants(): Promise<Partial<Tenant>[]> {
  try {
    console.log('Fetching tenants from DoorLoop API...');
    const response = await doorloopClient.get('/api/v1/tenants');
    
    if (response.status !== 200) {
      throw new Error(`DoorLoop API error: ${response.status}`);
    }
    
    const tenants = response.data.data.map((tenant: any) => ({
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      email: tenant.email,
      phone: tenant.phone || null,
      status: mapTenantStatus(tenant.status),
      externalId: tenant.id.toString(),
      externalSource: 'doorloop',
      leaseStart: tenant.lease_start ? new Date(tenant.lease_start) : null,
      leaseEnd: tenant.lease_end ? new Date(tenant.lease_end) : null,
      monthlyRent: tenant.rent ? tenant.rent.toString() : null,
      securityDeposit: tenant.security_deposit ? tenant.security_deposit.toString() : null,
      notes: tenant.notes || null,
      // Add other fields as needed
    }));
    
    console.log(`Successfully fetched ${tenants.length} tenants from DoorLoop`);
    return tenants;
  } catch (error) {
    console.error('Error fetching tenants from DoorLoop:', error);
    throw error;
  }
}

// Fetch properties from DoorLoop API
export async function fetchDoorloopProperties(): Promise<Partial<Property>[]> {
  try {
    console.log('Fetching properties from DoorLoop API...');
    const response = await doorloopClient.get('/api/v1/properties');
    
    if (response.status !== 200) {
      throw new Error(`DoorLoop API error: ${response.status}`);
    }
    
    const properties = response.data.data.map((property: any) => ({
      name: property.name,
      address: property.address,
      city: property.city || null,
      state: property.state || null,
      zipCode: property.zip || null,
      units: property.units ? parseInt(property.units) : null,
      externalId: property.id.toString(),
      externalSource: 'doorloop',
      // Add other fields as needed
    }));
    
    console.log(`Successfully fetched ${properties.length} properties from DoorLoop`);
    return properties;
  } catch (error) {
    console.error('Error fetching properties from DoorLoop:', error);
    throw error;
  }
}

// Fetch ledger entries from DoorLoop API
export async function fetchDoorloopLedger(tenantId: string): Promise<any[]> {
  try {
    console.log(`Fetching ledger for tenant ${tenantId} from DoorLoop API...`);
    const response = await doorloopClient.get(`/api/v1/tenants/${tenantId}/ledger`);
    
    if (response.status !== 200) {
      throw new Error(`DoorLoop API error: ${response.status}`);
    }
    
    const ledgerEntries = response.data.data || [];
    console.log(`Successfully fetched ${ledgerEntries.length} ledger entries from DoorLoop`);
    return ledgerEntries;
  } catch (error) {
    console.error('Error fetching ledger from DoorLoop:', error);
    throw error;
  }
}

// Sync DoorLoop data with our database
export async function syncDoorloopData(storage: any) {
  try {
    console.log('Starting DoorLoop data synchronization...');
    
    // Fetch and sync properties
    const properties = await fetchDoorloopProperties();
    for (const property of properties) {
      // Check if property exists by externalId
      const existingProperty = await storage.getPropertyByExternalId(property.externalId as string, 'doorloop');
      
      if (existingProperty) {
        // Update existing property
        await storage.updateProperty(existingProperty.id, property);
      } else {
        // Create new property
        await storage.createProperty(property);
      }
    }
    
    // Fetch and sync tenants
    const tenants = await fetchDoorloopTenants();
    for (const tenant of tenants) {
      // Check if tenant exists by externalId
      const existingTenant = await storage.getTenantByExternalId(tenant.externalId as string, 'doorloop');
      
      if (existingTenant) {
        // Update existing tenant
        await storage.updateTenant(existingTenant.id, tenant);
      } else {
        // Create new tenant
        await storage.createTenant(tenant);
      }
    }
    
    console.log('DoorLoop data synchronization completed successfully');
    return { success: true, message: 'DoorLoop data synchronized successfully' };
  } catch (error) {
    console.error('Error synchronizing DoorLoop data:', error);
    return { success: false, message: `Error synchronizing DoorLoop data: ${error}` };
  }
}