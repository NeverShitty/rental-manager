import { Client } from '@hubspot/api-client';

// Initialize HubSpot client
const hubspotClient = new Client({ 
  accessToken: process.env.HUBSPOT_API_KEY 
});

// Property lead type definition
type PropertyLead = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  propertyId?: number | string;
  source: 'furnishedfinder' | 'zillow' | 'turbotenant' | 'openphone';
};

// Create a new property lead in HubSpot
export async function createPropertyLead(leadData: PropertyLead) {
  try {
    console.log('Creating property lead in HubSpot...', leadData);
    
    // Create contact in HubSpot
    const contactProperties = {
      email: leadData.email,
      firstname: leadData.firstName,
      lastname: leadData.lastName,
      phone: leadData.phone || '',
      lead_source: leadData.source,
      lead_status: 'new',
      lead_type: 'rental',
      lead_date: new Date().toISOString()
    };
    
    // Create or update the contact
    const contact = await upsertHubspotContact({ properties: contactProperties });
    
    // If property ID is provided, create a deal
    if (leadData.propertyId) {
      const dealProperties = {
        dealname: `${leadData.firstName} ${leadData.lastName} - Property ${leadData.propertyId}`,
        dealstage: 'qualifiedtobuy',
        pipeline: 'default',
        property_id: leadData.propertyId.toString(),
        lead_source: leadData.source,
        amount: '0', // Will be updated later
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };
      
      // Create the deal and associate with contact
      await upsertHubspotDeal({ properties: dealProperties }, [contact.id]);
    }
    
    console.log('Successfully created property lead in HubSpot');
    return contact;
  } catch (error) {
    console.error('Error creating property lead in HubSpot:', error);
    throw error;
  }
}

// Update application status in HubSpot
export async function updateApplicationStatus(dealId: string, status: string, applicationData: any) {
  try {
    console.log(`Updating application status to ${status} for deal ${dealId}`);
    
    // Map status to deal stage
    const statusToDealStage: Record<string, string> = {
      'reviewing': 'contractsent',
      'approved': 'closedwon',
      'denied': 'closedlost'
    };
    
    const dealStage = statusToDealStage[status] || 'qualifiedtobuy';
    
    // Update deal properties
    const dealProperties: Record<string, string> = {
      dealstage: dealStage
    };
    
    // Add application data to deal properties
    if (applicationData) {
      if (applicationData.rentAmount) {
        dealProperties.amount = applicationData.rentAmount.toString();
      }
      
      if (applicationData.leaseStartDate) {
        dealProperties.closedate = new Date(applicationData.leaseStartDate).toISOString();
      }
      
      if (applicationData.tenantInfo && applicationData.tenantInfo.email) {
        // Update or create contact with tenant info
        const contactProperties = {
          email: applicationData.tenantInfo.email,
          firstname: applicationData.tenantInfo.firstName || '',
          lastname: applicationData.tenantInfo.lastName || '',
          phone: applicationData.tenantInfo.phone || '',
          address: applicationData.propertyAddress || '',
          status: status
        };
        
        await upsertHubspotContact({ properties: contactProperties });
      }
    }
    
    // Update the deal
    const updatedDeal = await hubspotClient.crm.deals.basicApi.update(
      dealId,
      { properties: dealProperties }
    );
    
    console.log(`Successfully updated application status for deal ${dealId}`);
    return updatedDeal;
  } catch (error) {
    console.error(`Error updating application status for deal ${dealId}:`, error);
    throw error;
  }
}

// Fetch contacts from HubSpot
export async function fetchHubspotContacts(limit = 100, after?: string) {
  try {
    console.log('Fetching contacts from HubSpot API...');
    const response = await hubspotClient.crm.contacts.basicApi.getPage(
      limit, 
      after, 
      undefined, 
      undefined, 
      ['email', 'firstname', 'lastname', 'phone', 'address', 'tenant_id', 'property_id', 'status']
    );
    
    console.log(`Successfully fetched ${response.results.length} contacts from HubSpot`);
    return {
      contacts: response.results,
      nextAfter: response.paging?.next?.after
    };
  } catch (error) {
    console.error('Error fetching contacts from HubSpot:', error);
    throw error;
  }
}

// Fetch deals from HubSpot
export async function fetchHubspotDeals(limit = 100, after?: string) {
  try {
    console.log('Fetching deals from HubSpot API...');
    const response = await hubspotClient.crm.deals.basicApi.getPage(
      limit, 
      after, 
      undefined, 
      undefined, 
      ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline', 'dealtype', 'property_id']
    );
    
    console.log(`Successfully fetched ${response.results.length} deals from HubSpot`);
    return {
      deals: response.results,
      nextAfter: response.paging?.next?.after
    };
  } catch (error) {
    console.error('Error fetching deals from HubSpot:', error);
    throw error;
  }
}

// Fetch companies from HubSpot
export async function fetchHubspotCompanies(limit = 100, after?: string) {
  try {
    console.log('Fetching companies from HubSpot API...');
    const response = await hubspotClient.crm.companies.basicApi.getPage(
      limit, 
      after, 
      undefined, 
      undefined, 
      ['name', 'website', 'domain', 'city', 'state', 'phone', 'industry']
    );
    
    console.log(`Successfully fetched ${response.results.length} companies from HubSpot`);
    return {
      companies: response.results,
      nextAfter: response.paging?.next?.after
    };
  } catch (error) {
    console.error('Error fetching companies from HubSpot:', error);
    throw error;
  }
}

// Create or update a contact in HubSpot
export async function upsertHubspotContact(contactData: any) {
  try {
    console.log('Creating/updating contact in HubSpot API...');
    
    // Check if contact exists using email
    const email = contactData.properties.email;
    let contactId;
    
    try {
      const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }
            ]
          }
        ]
      });
      
      contactId = searchResponse.results[0]?.id;
    } catch (err) {
      console.error('Error searching for contact:', err);
    }
    
    let response;
    
    if (contactId) {
      // Update existing contact
      response = await hubspotClient.crm.contacts.basicApi.update(
        contactId,
        { properties: contactData.properties }
      );
      console.log(`Successfully updated contact ${contactId} in HubSpot`);
    } else {
      // Create new contact
      response = await hubspotClient.crm.contacts.basicApi.create(
        { properties: contactData.properties }
      );
      console.log(`Successfully created new contact in HubSpot`);
    }
    
    return response;
  } catch (error) {
    console.error('Error creating/updating contact in HubSpot:', error);
    throw error;
  }
}

// Create or update a deal in HubSpot
export async function upsertHubspotDeal(dealData: any, contactIds?: string[]) {
  try {
    console.log('Creating/updating deal in HubSpot API...');
    
    // Check if deal exists using property_id or dealname
    let dealId;
    const propertyId = dealData.properties.property_id;
    
    if (propertyId) {
      try {
        const searchResponse = await hubspotClient.crm.deals.searchApi.doSearch({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'property_id',
                  operator: 'EQ',
                  value: propertyId
                }
              ]
            }
          ]
        });
        
        dealId = searchResponse.results[0]?.id;
      } catch (err) {
        console.error('Error searching for deal:', err);
      }
    }
    
    let response;
    
    if (dealId) {
      // Update existing deal
      response = await hubspotClient.crm.deals.basicApi.update(
        dealId,
        { properties: dealData.properties }
      );
      console.log(`Successfully updated deal ${dealId} in HubSpot`);
      
      // Update associations if provided
      if (contactIds && contactIds.length > 0) {
        for (const contactId of contactIds) {
          await hubspotClient.crm.deals.associationsApi.create(
            dealId,
            'contacts',
            contactId,
            [{ category: 'HUBSPOT_DEFINED', typeId: 3 }] // Contact of deal association
          );
        }
      }
    } else {
      // Create new deal
      response = await hubspotClient.crm.deals.basicApi.create(
        { properties: dealData.properties }
      );
      console.log(`Successfully created new deal in HubSpot`);
      
      // Create associations if provided
      if (contactIds && contactIds.length > 0) {
        for (const contactId of contactIds) {
          await hubspotClient.crm.deals.associationsApi.create(
            response.id,
            'contacts',
            contactId,
            [{ category: 'HUBSPOT_DEFINED', typeId: 3 }] // Contact of deal association
          );
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error creating/updating deal in HubSpot:', error);
    throw error;
  }
}

// Sync tenant data to HubSpot as contacts
export async function syncTenantToHubspot(tenant: any) {
  try {
    console.log(`Syncing tenant ${tenant.id} to HubSpot...`);
    
    // Create a HubSpot contact properties object
    const contactProperties = {
      email: tenant.email,
      firstname: tenant.firstName,
      lastname: tenant.lastName,
      phone: tenant.phone || '',
      tenant_id: tenant.id.toString(),
      property_id: tenant.propertyId ? tenant.propertyId.toString() : '',
      status: tenant.status,
      lease_start: tenant.leaseStart ? new Date(tenant.leaseStart).toISOString() : '',
      lease_end: tenant.leaseEnd ? new Date(tenant.leaseEnd).toISOString() : '',
      monthly_rent: tenant.monthlyRent || '',
      security_deposit: tenant.securityDeposit || '',
      notes: tenant.notes || ''
    };
    
    // Upsert the contact
    const response = await upsertHubspotContact({ properties: contactProperties });
    
    console.log(`Successfully synced tenant ${tenant.id} to HubSpot`);
    return response;
  } catch (error) {
    console.error(`Error syncing tenant ${tenant.id} to HubSpot:`, error);
    throw error;
  }
}