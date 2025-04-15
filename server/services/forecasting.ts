
import { openai } from './openai-client';
import { Transaction } from '@shared/schema';

interface ForecastResult {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  recommendations: string[];
  riskFactors: string[];
  categoryForecasts: Record<string, number>;
}

export async function generatePropertyForecast(
  transactions: Transaction[],
  propertyId: number
): Promise<ForecastResult> {
  const monthlyPattern = analyzeMonthlyPattern(transactions);
  
  const expectedExpenseCategories = [
  'mortgage', 'insurance', 'taxes', 'utilities', 'maintenance',
  'cleaning', 'marketing', 'supplies', 'management_fees'
];

const missingExpenses = expectedExpenseCategories.filter(category => 
  !transactions.some(t => t.category === category)
);

const prompt = `Analyze these property management transactions and generate a 12-month forecast:

Monthly Patterns:
${JSON.stringify(monthlyPattern, null, 2)}

Missing Expense Categories:
${JSON.stringify(missingExpenses, null, 2)}

Current Profitability Metrics:
- Total Income: ${transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)}
- Total Expenses: ${transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)}

Generate a detailed forecast including:
1. Projected monthly income and expenses
2. Expected trends by category
3. Risk factors and missing expense categories
4. Revenue enhancement opportunities
5. Cost optimization recommendations for profitability

Format the response as JSON with these fields:
{
  monthlyIncome: number,
  monthlyExpenses: number,
  netIncome: number,
  recommendations: string[],
  riskFactors: string[],
  categoryForecasts: Record<string, number>
}`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

function analyzeMonthlyPattern(transactions: Transaction[]) {
  const monthlyTotals: Record<string, {income: number, expenses: number}> = {};
  
  transactions.forEach(tx => {
    const month = new Date(tx.date).toISOString().slice(0,7);
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = {income: 0, expenses: 0};
    }
    
    if (tx.type === 'income') {
      monthlyTotals[month].income += Number(tx.amount);
    } else {
      monthlyTotals[month].expenses += Number(tx.amount);
    }
  });
  
  return monthlyTotals;
}
