
import { openai } from './openai-client';
import { Transaction, TransactionCategory, TransactionType } from '@shared/schema';

interface AnalyzeTransactionResult {
  category: keyof typeof TransactionCategory;
  type: keyof typeof TransactionType;
  confidence: number;
  insights?: string;
}

interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  summary: string;
}

// Add the missing translateText function
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const prompt = `Translate the following text to ${targetLanguage}:
  
  "${text}"
  
  Provide only the translated text with no additional context or explanation.`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0.3,
  });

  return completion.choices[0].message.content || text;
}

// Add the missing analyzeSentiment function
export async function analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
  const prompt = `Analyze the sentiment of the following feedback:
  
  "${text}"
  
  Respond in this JSON format:
  {
    "sentiment": "positive", "negative", or "neutral",
    "score": 0.0 to 1.0 (where 1.0 is extremely positive/negative),
    "summary": "One sentence summary of the feedback sentiment"
  }`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content || '{"sentiment":"neutral", "score":0.5, "summary":"No sentiment detected"}') as SentimentAnalysisResult;
}

export async function analyzeTransaction(description: string, amount: number): Promise<AnalyzeTransactionResult> {
  const prompt = `Analyze this transaction and categorize it:
Amount: $${amount}
Description: ${description}

Categorize this transaction into one of these categories:
${Object.keys(TransactionCategory).join(', ')}

And determine if it's INCOME or EXPENSE.

Respond in this JSON format:
{
  "category": "category_name",
  "type": "INCOME or EXPENSE",
  "confidence": 0.0 to 1.0,
  "insights": "Brief explanation of categorization"
}`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content || '{}') as AnalyzeTransactionResult;
}

export async function generateFinancialReport(
  transactions: Transaction[], 
  startDate: Date, 
  endDate: Date, 
  reportType: 'monthly' | 'quarterly' | 'yearly'
): Promise<string> {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const categoryBreakdown = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const prompt = `Generate a detailed ${reportType} financial report analysis for a property management business:

Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
Total Income: $${totalIncome}
Total Expenses: $${totalExpenses}
Net Income: $${totalIncome - totalExpenses}

Category Breakdown:
${Object.entries(categoryBreakdown)
  .map(([category, amount]) => `${category}: $${amount}`)
  .join('\n')}

Please provide a comprehensive analysis including:
1. Key Performance Indicators and their trends
2. Revenue analysis and growth opportunities
3. Cost optimization recommendations
4. Risk factors and mitigation strategies
5. Comparative analysis with previous periods
6. Actionable recommendations for property managers

Focus on property management insights and actionable recommendations.`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0.2,
  });

  return completion.choices[0].message.content || '';
}
