import axios from 'axios';

// Wave API client
const waveClient = axios.create({
  baseURL: 'https://api.waveapps.com',
  headers: {
    'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Fetch businesses from Wave
export async function fetchWaveBusinesses() {
  try {
    console.log('Fetching businesses from Wave API...');
    const response = await waveClient.get('/businesses');
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully fetched businesses from Wave`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching businesses from Wave:', error);
    throw error;
  }
}

// Fetch invoices for a business
export async function fetchWaveInvoices(businessId: string) {
  try {
    console.log(`Fetching invoices for business ${businessId} from Wave API...`);
    const response = await waveClient.get(`/businesses/${businessId}/invoices`);
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully fetched invoices from Wave`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching invoices from Wave:', error);
    throw error;
  }
}

// Fetch transactions for a business
export async function fetchWaveTransactions(businessId: string, accountId?: string) {
  try {
    let url = `/businesses/${businessId}/transactions`;
    if (accountId) {
      url += `?accountId=${accountId}`;
    }
    
    console.log(`Fetching transactions from Wave API...`);
    const response = await waveClient.get(url);
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully fetched transactions from Wave`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching transactions from Wave:', error);
    throw error;
  }
}

// Fetch accounts for a business
export async function fetchWaveAccounts(businessId: string) {
  try {
    console.log(`Fetching accounts for business ${businessId} from Wave API...`);
    const response = await waveClient.get(`/businesses/${businessId}/accounts`);
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully fetched accounts from Wave`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching accounts from Wave:', error);
    throw error;
  }
}

// Fetch customers for a business
export async function fetchWaveCustomers(businessId: string) {
  try {
    console.log(`Fetching customers for business ${businessId} from Wave API...`);
    const response = await waveClient.get(`/businesses/${businessId}/customers`);
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully fetched customers from Wave`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching customers from Wave:', error);
    throw error;
  }
}

// Create an invoice in Wave
export async function createWaveInvoice(businessId: string, invoiceData: any) {
  try {
    console.log(`Creating invoice in Wave API...`);
    const response = await waveClient.post(`/businesses/${businessId}/invoices`, invoiceData);
    
    if (response.status !== 201) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully created invoice in Wave`);
    return response.data.data;
  } catch (error) {
    console.error('Error creating invoice in Wave:', error);
    throw error;
  }
}

// Generate financial reports from Wave data
export async function generateFinancialReport(businessId: string, reportType: string, startDate: string, endDate: string) {
  try {
    console.log(`Generating ${reportType} report from Wave API...`);
    const response = await waveClient.get(`/businesses/${businessId}/reports/${reportType}`, {
      params: {
        startDate,
        endDate
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Wave API error: ${response.status}`);
    }
    
    console.log(`Successfully generated ${reportType} report from Wave`);
    return response.data.data;
  } catch (error) {
    console.error(`Error generating ${reportType} report from Wave:`, error);
    throw error;
  }
}