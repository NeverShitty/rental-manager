import { TransactionCategory, TransactionType } from '@shared/schema';
import { openai } from './openai-client';

interface TransactionData {
  description: string;
  amount: number;
  vendor?: string;
  date?: Date;
  sourceSystem?: string;
}

interface CategoryMapping {
  category: keyof typeof TransactionCategory;
  confidence: number;
  type: keyof typeof TransactionType;
}

interface MappingResult {
  sourceCategory: string;
  standardCategory: keyof typeof TransactionCategory;
  confidence: number;
  mappingRule?: string;
}

/**
 * AI-powered automatic transaction categorization
 * Uses OpenAI to analyze transaction descriptions and determine categories
 */
export async function categorizeTransaction(transaction: TransactionData): Promise<CategoryMapping> {
  try {
    // Prepare the prompt for OpenAI
    const prompt = `
    Categorize this financial transaction for a property management company.
    
    Transaction: ${transaction.description}
    Amount: ${transaction.amount}
    ${transaction.vendor ? `Vendor: ${transaction.vendor}` : ''}
    ${transaction.sourceSystem ? `Source System: ${transaction.sourceSystem}` : ''}
    
    Assign one of these categories:
    - rent (rent payments, late fees, etc.)
    - maintenance (repairs, maintenance services)
    - utilities (water, electric, gas)
    - insurance (property insurance)
    - taxes (property taxes)
    - mortgage (mortgage payments)
    - supplies (office or maintenance supplies)
    - cleaning (cleaning services)
    - marketing (advertising, listing fees)
    - other (anything not fitting into the categories above)
    
    Also determine the transaction type:
    - income
    - expense
    
    Format your response as JSON:
    {
      "category": "category_name",
      "type": "income_or_expense",
      "confidence": confidence_score_between_0_and_1
    }`;

    // Call OpenAI API for categorization
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a financial assistant specializing in property management accounting. Your task is to accurately categorize financial transactions." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.2,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          category: result.category as keyof typeof TransactionCategory,
          type: result.type as keyof typeof TransactionType,
          confidence: result.confidence
        };
      }
    } catch (error) {
      console.error("Failed to parse AI response:", error);
    }

    // Fallback if we can't parse the response
    return {
      category: 'other',
      type: transaction.amount >= 0 ? 'income' : 'expense',
      confidence: 0.5
    };
  } catch (error) {
    console.error("AI categorization error:", error);
    // Default fallback
    return {
      category: 'other',
      type: transaction.amount >= 0 ? 'income' : 'expense',
      confidence: 0.3
    };
  }
}

/**
 * Creates a mapping between an external system's categories and our standard categories
 * This will learn over time to improve the mapping accuracy
 */
export async function createCategoryMappingRule(
  externalCategory: string,
  externalSystem: string,
  sampleTransactions: TransactionData[] = []
): Promise<MappingResult> {
  try {
    // If we have sample transactions, use them for better context
    const transactionContext = sampleTransactions.length > 0 
      ? `Sample transactions in this category:
        ${sampleTransactions.slice(0, 5).map(t => 
          `- "${t.description}" for ${t.amount}`
        ).join('\n')}`
      : '';

    // Prepare the prompt for OpenAI
    const prompt = `
    Create a mapping rule between an external financial system's category and our standard categories.
    
    External System: ${externalSystem}
    External Category: ${externalCategory}
    ${transactionContext}
    
    Our standard categories are:
    - rent (rent payments, late fees, etc.)
    - maintenance (repairs, maintenance services)
    - utilities (water, electric, gas)
    - insurance (property insurance)
    - taxes (property taxes)
    - mortgage (mortgage payments)
    - supplies (office or maintenance supplies)
    - cleaning (cleaning services)
    - marketing (advertising, listing fees)
    - other (anything not fitting into the categories above)
    
    Create a mapping rule and explain your reasoning.
    Format your response as JSON:
    {
      "standardCategory": "category_name",
      "confidence": confidence_score_between_0_and_1,
      "mappingRule": "brief explanation of mapping logic"
    }`;

    // Call OpenAI API for mapping creation
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a financial systems integration specialist. Your task is to create accurate mappings between different accounting systems." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.2,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          sourceCategory: externalCategory,
          standardCategory: result.standardCategory as keyof typeof TransactionCategory,
          confidence: result.confidence,
          mappingRule: result.mappingRule
        };
      }
    } catch (error) {
      console.error("Failed to parse AI mapping response:", error);
    }

    // Fallback if we can't parse the response
    return {
      sourceCategory: externalCategory,
      standardCategory: 'other',
      confidence: 0.4
    };
  } catch (error) {
    console.error("AI mapping creation error:", error);
    // Default fallback
    return {
      sourceCategory: externalCategory,
      standardCategory: 'other',
      confidence: 0.3
    };
  }
}

/**
 * Generate a complete mapping dictionary for a new external system
 * @param externalSystem Name of the external system (e.g., "quickbooks", "xero")
 * @param sampleCategories Array of category names from the external system
 * @param sampleTransactions Optional sample transactions for better context
 */
export async function generateSystemMapping(
  externalSystem: string,
  sampleCategories: string[],
  sampleTransactions: Record<string, TransactionData[]> = {}
): Promise<Record<string, keyof typeof TransactionCategory>> {
  const mapping: Record<string, keyof typeof TransactionCategory> = {};
  
  // Process each category
  for (const category of sampleCategories) {
    // Get sample transactions for this category if available
    const samples = sampleTransactions[category] || [];
    
    // Create mapping rule
    const result = await createCategoryMappingRule(category, externalSystem, samples);
    
    // Add to mapping dictionary if confidence is reasonable
    if (result.confidence > 0.5) {
      mapping[category] = result.standardCategory;
    } else {
      mapping[category] = 'other'; // Default to other for low confidence
    }
  }
  
  return mapping;
}