import axios from 'axios';
import { storage } from '../storage';

interface WaveCustomer {
  id: string;
  name: string;
  email?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  currency?: string;
}

interface WaveBusiness {
  id: string;
  name: string;
  isClassicAccounting: boolean;
  isPersonal: boolean;
}

interface WaveInvoice {
  id: string;
  invoiceNumber?: string;
  status: string;
  total?: {
    value: string;
    currency: {
      code: string;
    };
  };
}

interface WaveTransaction {
  id: string;
  description: string;
  amount: {
    value: string;
    currency: {
      code: string;
    };
  };
  date: string;
}

// Mock Wave API credentials validation
export async function validateWaveCredentials(apiKey?: string): Promise<{success: boolean; message?: string}> {
  try {
    if (!apiKey) {
      return { success: false, message: "No API key provided" };
    }
    
    // Since we're in a demo environment without real credentials,
    // we'll validate based on a minimum length for now
    if (apiKey.length < 10) {
      return { success: false, message: "API key must be at least 10 characters long" };
    }

    // In a real implementation, we would call the Wave API here
    // For now, we'll consider any keys with a specific format as valid
    if (apiKey.startsWith('wave_') || apiKey.includes('-')) {
      return { success: true };
    }

    return { success: false, message: "Invalid API key format. Wave API keys typically start with 'wave_' or contain hyphens" };
  } catch (error) {
    console.error("Error validating Wave credentials:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred validating Wave credentials"
    };
  }
}

/**
 * Fetch all businesses from Wave API
 */
export async function getWaveBusinesses(): Promise<WaveBusiness[]> {
  try {
    // In a real implementation, this would make an API call to Wave
    // For this demo, we'll return mock data
    return [
      {
        id: "business-1",
        name: "ARIBIA LLC",
        isClassicAccounting: false,
        isPersonal: false
      },
      {
        id: "business-2",
        name: "City Studio Properties",
        isClassicAccounting: false,
        isPersonal: false
      }
    ];
  } catch (error) {
    console.error("Error fetching Wave businesses:", error);
    throw error;
  }
}

/**
 * Fetch all customers from a Wave business
 */
export async function getWaveCustomers(businessId?: string): Promise<WaveCustomer[]> {
  try {
    // In a real implementation, this would make an API call to Wave
    // For this demo, we'll return mock data
    return [
      {
        id: "customer-1",
        name: "John Smith",
        email: "john.smith@example.com",
        address: {
          addressLine1: "123 Main St",
          city: "Chicago",
          postalCode: "60601",
          country: "US"
        }
      },
      {
        id: "customer-2",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        address: {
          addressLine1: "456 Oak Ave",
          city: "Chicago",
          postalCode: "60607",
          country: "US"
        }
      }
    ];
  } catch (error) {
    console.error("Error fetching Wave customers:", error);
    throw error;
  }
}

/**
 * Create a new customer in Wave
 */
export async function createWaveCustomer({
  name,
  email,
  address,
  businessId
}: {
  name: string;
  email?: string;
  address?: any;
  businessId?: string;
}): Promise<WaveCustomer> {
  try {
    // In a real implementation, this would make an API call to Wave
    // For this demo, we'll return mock data
    const newCustomer: WaveCustomer = {
      id: `customer-${Date.now()}`,
      name,
      email,
      address
    };
    
    return newCustomer;
  } catch (error) {
    console.error("Error creating Wave customer:", error);
    throw error;
  }
}

/**
 * Create an invoice in Wave for a specific customer
 */
export async function createWaveInvoiceForCustomer({
  customerId,
  amount,
  title,
  businessId
}: {
  customerId: string;
  amount: number;
  title: string;
  businessId?: string;
}): Promise<WaveInvoice> {
  try {
    // In a real implementation, this would make an API call to Wave
    // For this demo, we'll return mock data
    const newInvoice: WaveInvoice = {
      id: `invoice-${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      status: "DRAFT",
      total: {
        value: amount.toString(),
        currency: {
          code: "USD"
        }
      }
    };
    
    return newInvoice;
  } catch (error) {
    console.error("Error creating Wave invoice:", error);
    throw error;
  }
}

/**
 * Create a payment from a Mercury or Stripe transaction
 */
export async function createWavePayment({
  invoiceId,
  amount,
  date,
  description,
  businessId
}: {
  invoiceId: string;
  amount: number;
  date: Date;
  description: string;
  businessId?: string;
}): Promise<any> {
  try {
    // In a real implementation, this would make an API call to Wave
    // For this demo, we'll return mock data
    return {
      id: `payment-${Date.now()}`,
      amount: {
        value: amount.toString(),
        currency: {
          code: "USD"
        }
      },
      date: date.toISOString().split('T')[0],
      invoiceId,
      status: "COMPLETED"
    };
  } catch (error) {
    console.error("Error creating Wave payment:", error);
    throw error;
  }
}

/**
 * Find a customer by name or email
 */
export async function findWaveCustomer({
  name,
  email,
  businessId
}: {
  name?: string;
  email?: string;
  businessId?: string;
}): Promise<WaveCustomer | null> {
  try {
    if (!name && !email) {
      throw new Error("Must provide either name or email to find a customer");
    }
    
    // Get all customers
    const customers = await getWaveCustomers(businessId);
    
    // Try to find by email first (more precise)
    if (email) {
      const customerByEmail = customers.find((c: WaveCustomer) => c.email === email);
      if (customerByEmail) return customerByEmail;
    }
    
    // Then try by name if provided
    if (name) {
      // Try exact match first
      const exactMatch = customers.find((c: WaveCustomer) => c.name === name);
      if (exactMatch) return exactMatch;
      
      // Try case-insensitive match
      const caseInsensitiveMatch = customers.find(
        (c: WaveCustomer) => c.name.toLowerCase() === name.toLowerCase()
      );
      if (caseInsensitiveMatch) return caseInsensitiveMatch;
      
      // Try partial match as last resort
      const partialMatch = customers.find(
        (c: WaveCustomer) => c.name.toLowerCase().includes(name.toLowerCase())
      );
      if (partialMatch) return partialMatch;
    }
    
    return null;
  } catch (error) {
    console.error("Error finding Wave customer:", error);
    throw error;
  }
}

/**
 * Get or create a customer
 */
export async function getOrCreateWaveCustomer({
  name,
  email,
  address,
  businessId
}: {
  name: string;
  email?: string;
  address?: any;
  businessId?: string;
}): Promise<WaveCustomer> {
  try {
    // Try to find existing customer
    const existingCustomer = await findWaveCustomer({ name, email, businessId });
    if (existingCustomer) return existingCustomer;
    
    // Create a new customer if none exists
    return await createWaveCustomer({ name, email, address, businessId });
  } catch (error) {
    console.error("Error in getOrCreateWaveCustomer:", error);
    throw error;
  }
}

/**
 * Create a property-related transaction in Wave
 */
export async function createPropertyTransaction({
  propertyName,
  amount,
  date,
  description,
  type = "income",
  businessId
}: {
  propertyName: string;
  amount: number;
  date: Date;
  description: string;
  type?: "income" | "expense";
  businessId?: string;
}): Promise<any> {
  try {
    // First, get or create the customer (property)
    const customer = await getOrCreateWaveCustomer({
      name: propertyName,
      businessId
    });
    
    // If it's income, create an invoice and payment
    if (type === "income") {
      // Create an invoice
      const invoice = await createWaveInvoiceForCustomer({
        customerId: customer.id,
        amount,
        title: description,
        businessId
      });
      
      // Create a payment for the invoice
      const payment = await createWavePayment({
        invoiceId: invoice.id,
        amount,
        date,
        description,
        businessId
      });
      
      return {
        success: true,
        customer,
        invoice,
        payment
      };
    } else {
      // For expenses, we would create an expense transaction
      // This is a simplified implementation
      return {
        success: true,
        customer,
        expense: {
          id: `expense-${Date.now()}`,
          amount: {
            value: amount.toString(),
            currency: {
              code: "USD"
            }
          },
          date: date.toISOString().split('T')[0],
          description
        }
      };
    }
  } catch (error) {
    console.error("Error creating property transaction in Wave:", error);
    throw error;
  }
}