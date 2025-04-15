/**
 * Financial Flows Service
 * Defines standard financial flows for real estate operations
 * This service maps financial transactions across systems
 */

import { TransactionCategory, TransactionType } from '@shared/schema';
import { categorizeTransaction } from './ai-categorization';
import { storage } from '../storage';

// Standard flow types
export enum FinancialFlowType {
  RENT_COLLECTION = "rent_collection",
  EXPENSE_PAYMENT = "expense_payment",
  MAINTENANCE_EXPENSE = "maintenance_expense",
  UTILITY_PAYMENT = "utility_payment",
  OWNER_DISTRIBUTION = "owner_distribution",
  TAX_PAYMENT = "tax_payment",
  INSURANCE_PAYMENT = "insurance_payment",
  SECURITY_DEPOSIT = "security_deposit",
  SECURITY_DEPOSIT_RETURN = "security_deposit_return",
  LATE_FEE = "late_fee"
}

// Data structure for mapping flows
export interface FinancialFlow {
  id: string;
  name: string;
  type: FinancialFlowType;
  description: string;
  category: keyof typeof TransactionCategory;
  transactionType: keyof typeof TransactionType;
  accounts: {
    source?: string;
    destination?: string;
  };
  properties: {
    requiresProperty: boolean;
    propertyField?: string;
  };
  metadata: {
    isRecurring?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'annually';
    dayOfMonth?: number;
    dayOfWeek?: number; 
  };
}

// Standard flows for real estate operations
export const standardFlows: FinancialFlow[] = [
  {
    id: 'flow_rent_collection',
    name: 'Rent Collection',
    type: FinancialFlowType.RENT_COLLECTION,
    description: 'Tenant rent payments collected and recorded',
    category: 'rent',
    transactionType: 'income',
    accounts: {
      destination: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: true,
      frequency: 'monthly',
      dayOfMonth: 1
    }
  },
  {
    id: 'flow_maintenance_expense',
    name: 'Maintenance Expense',
    type: FinancialFlowType.MAINTENANCE_EXPENSE,
    description: 'Payment for property maintenance and repairs',
    category: 'maintenance',
    transactionType: 'expense',
    accounts: {
      source: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: false
    }
  },
  {
    id: 'flow_utility_payment',
    name: 'Utility Payment',
    type: FinancialFlowType.UTILITY_PAYMENT,
    description: 'Payment for property utilities',
    category: 'utilities',
    transactionType: 'expense',
    accounts: {
      source: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: true,
      frequency: 'monthly'
    }
  },
  {
    id: 'flow_owner_distribution',
    name: 'Owner Distribution',
    type: FinancialFlowType.OWNER_DISTRIBUTION,
    description: 'Distribution of funds to property owners',
    category: 'other',
    transactionType: 'expense',
    accounts: {
      source: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: true,
      frequency: 'monthly',
      dayOfMonth: 15
    }
  },
  {
    id: 'flow_security_deposit',
    name: 'Security Deposit',
    type: FinancialFlowType.SECURITY_DEPOSIT,
    description: 'Collection of security deposit from tenant',
    category: 'other',
    transactionType: 'income',
    accounts: {
      destination: 'security_deposit_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: false
    }
  },
  {
    id: 'flow_security_deposit_return',
    name: 'Security Deposit Return',
    type: FinancialFlowType.SECURITY_DEPOSIT_RETURN,
    description: 'Return of security deposit to tenant',
    category: 'other',
    transactionType: 'expense',
    accounts: {
      source: 'security_deposit_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: false
    }
  },
  {
    id: 'flow_late_fee',
    name: 'Late Fee',
    type: FinancialFlowType.LATE_FEE,
    description: 'Late fee charged to tenant',
    category: 'rent',
    transactionType: 'income',
    accounts: {
      destination: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: false
    }
  },
  {
    id: 'flow_tax_payment',
    name: 'Property Tax Payment',
    type: FinancialFlowType.TAX_PAYMENT,
    description: 'Payment of property taxes',
    category: 'taxes',
    transactionType: 'expense',
    accounts: {
      source: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: true,
      frequency: 'annually'
    }
  },
  {
    id: 'flow_insurance_payment',
    name: 'Insurance Payment',
    type: FinancialFlowType.INSURANCE_PAYMENT,
    description: 'Payment for property insurance',
    category: 'insurance',
    transactionType: 'expense',
    accounts: {
      source: 'operating_account'
    },
    properties: {
      requiresProperty: true,
      propertyField: 'propertyId'
    },
    metadata: {
      isRecurring: true,
      frequency: 'annually'
    }
  }
];

/**
 * Find a financial flow based on transaction data
 * @param transactionData - The transaction data to analyze
 * @returns The most appropriate financial flow
 */
export async function identifyFinancialFlow(transactionData: {
  description: string;
  amount: number;
  vendor?: string;
  date?: Date;
  propertyId?: number;
}): Promise<FinancialFlow | null> {
  try {
    // First, categorize the transaction using AI
    const categorization = await categorizeTransaction({
      description: transactionData.description,
      amount: transactionData.amount,
      vendor: transactionData.vendor,
      date: transactionData.date
    });

    // Find matching flows based on category and transaction type
    const matchingFlows = standardFlows.filter(flow => 
      flow.category === categorization.category && 
      flow.transactionType === categorization.type
    );

    if (matchingFlows.length === 0) {
      return null;
    }

    // If we have multiple matches, use more specific criteria
    if (matchingFlows.length > 1) {
      // If a property is associated, prioritize flows that require properties
      if (transactionData.propertyId) {
        const propertyFlows = matchingFlows.filter(flow => flow.properties.requiresProperty);
        if (propertyFlows.length > 0) {
          return propertyFlows[0];
        }
      }

      // Check for keyword matches in description
      const lowerDesc = transactionData.description.toLowerCase();
      
      // Try to find more specific matches based on description keywords
      for (const flow of matchingFlows) {
        if (flow.type === FinancialFlowType.RENT_COLLECTION && 
            (lowerDesc.includes('rent') || lowerDesc.includes('lease payment'))) {
          return flow;
        } else if (flow.type === FinancialFlowType.MAINTENANCE_EXPENSE && 
                  (lowerDesc.includes('repair') || lowerDesc.includes('maintenance'))) {
          return flow;
        } else if (flow.type === FinancialFlowType.UTILITY_PAYMENT && 
                  (lowerDesc.includes('utility') || lowerDesc.includes('water') || 
                   lowerDesc.includes('electric') || lowerDesc.includes('gas'))) {
          return flow;
        } else if (flow.type === FinancialFlowType.SECURITY_DEPOSIT && 
                  lowerDesc.includes('deposit')) {
          return flow;
        } else if (flow.type === FinancialFlowType.LATE_FEE && 
                  lowerDesc.includes('late fee')) {
          return flow;
        }
      }
    }

    // If we still have multiple or 1 match, return the first one
    return matchingFlows[0];
  } catch (error) {
    console.error("Error identifying financial flow:", error);
    return null;
  }
}

/**
 * Execute a financial flow
 * @param flowId - The ID of the flow to execute
 * @param data - The transaction data
 * @returns The result of the flow execution
 */
export async function executeFinancialFlow(flowId: string, data: {
  amount: number;
  description: string;
  date: Date;
  propertyId?: number;
  metadata?: Record<string, any>;
  externalId?: string;
  externalSource?: string;
}): Promise<{ success: boolean; transactionId?: number; message?: string }> {
  try {
    // Find the flow by ID
    const flow = standardFlows.find(f => f.id === flowId);
    
    if (!flow) {
      return { success: false, message: `Financial flow with ID ${flowId} not found` };
    }
    
    // Check if property is required but not provided
    if (flow.properties.requiresProperty && !data.propertyId) {
      return { success: false, message: "Property ID is required for this financial flow" };
    }
    
    // Create a transaction in our system
    const transaction = await storage.createTransaction({
      amount: data.amount,
      description: data.description,
      date: data.date,
      category: flow.category,
      type: flow.transactionType,
      propertyId: data.propertyId || null,
      externalId: data.externalId || null,
      externalSource: data.externalSource || null,
      metadata: {
        ...data.metadata,
        flowId,
        flowType: flow.type
      },
      createdAt: new Date(),
      createdBy: null
    });
    
    return { 
      success: true, 
      transactionId: transaction.id,
      message: `Successfully executed ${flow.name} flow`
    };
  } catch (error) {
    console.error("Error executing financial flow:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error executing financial flow"
    };
  }
}

/**
 * Get all financial flows or specific flows by type
 * @param type - Optional flow type to filter by
 * @returns Array of financial flows
 */
export function getFinancialFlows(type?: FinancialFlowType): FinancialFlow[] {
  if (type) {
    return standardFlows.filter(flow => flow.type === type);
  }
  return standardFlows;
}

/**
 * Get a financial flow by ID
 * @param id - The flow ID
 * @returns The financial flow or null if not found
 */
export function getFinancialFlowById(id: string): FinancialFlow | null {
  return standardFlows.find(flow => flow.id === id) || null;
}