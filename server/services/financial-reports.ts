/**
 * Financial Reports Service
 * Generates standardized real estate financial reports
 */

import { storage } from '../storage';
import { FinancialFlowType } from './financial-flows';
import { Transaction, Property } from '@shared/schema';

// Report types
export enum ReportType {
  PROFIT_LOSS = "profit_loss",
  CASH_FLOW = "cash_flow",
  PROPERTY_PERFORMANCE = "property_performance",
  EXPENSE_BREAKDOWN = "expense_breakdown",
  INCOME_BREAKDOWN = "income_breakdown",
  TAX_SUMMARY = "tax_summary",
  OWNER_DISTRIBUTION = "owner_distribution",
  RENT_ROLL = "rent_roll",
  VENDOR_EXPENSE = "vendor_expense",
  MAINTENANCE_COST = "maintenance_cost"
}

// Report time period
export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

// Generate default periods for reports
export function getReportPeriods(): ReportPeriod[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Current month
  const currentMonthStart = new Date(currentYear, currentMonth, 1);
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
  
  // Previous month
  const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthEnd = new Date(currentYear, currentMonth, 0);
  
  // Year to date
  const ytdStart = new Date(currentYear, 0, 1);
  const ytdEnd = new Date(currentYear, currentMonth, now.getDate());
  
  // Previous year
  const prevYearStart = new Date(currentYear - 1, 0, 1);
  const prevYearEnd = new Date(currentYear - 1, 11, 31);

  // Get month name
  const getMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long' });
  };
  
  return [
    {
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      label: `Current Month (${getMonthName(currentMonthStart)} ${currentYear})`
    },
    {
      startDate: prevMonthStart,
      endDate: prevMonthEnd,
      label: `Previous Month (${getMonthName(prevMonthStart)} ${prevMonthStart.getFullYear()})`
    },
    {
      startDate: ytdStart,
      endDate: ytdEnd,
      label: `Year to Date (${currentYear})`
    },
    {
      startDate: prevYearStart,
      endDate: prevYearEnd,
      label: `Previous Year (${currentYear - 1})`
    }
  ];
}

// Base report interface
export interface FinancialReport {
  reportType: ReportType;
  generatedAt: Date;
  period: ReportPeriod;
  propertyId?: number;
  propertyName?: string;
  data: any;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
    metrics: Record<string, number>;
  };
}

/**
 * Generate Profit & Loss Report
 * Shows income and expenses for a property or all properties
 */
export async function generateProfitLossReport(
  period: ReportPeriod,
  propertyId?: number
): Promise<FinancialReport> {
  // Get all transactions for the period
  const transactions = await storage.getTransactionsByDateRange(
    period.startDate,
    period.endDate,
    propertyId
  );
  
  // Separate income and expenses
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  // Calculate totals
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netIncome = totalIncome - totalExpense;
  
  // Group by category
  const incomeByCategory = groupTransactionsByCategory(incomeTransactions);
  const expenseByCategory = groupTransactionsByCategory(expenseTransactions);
  
  // Get property info if applicable
  let propertyName: string | undefined;
  if (propertyId) {
    const property = await storage.getProperty(propertyId);
    propertyName = property?.name;
  }
  
  return {
    reportType: ReportType.PROFIT_LOSS,
    generatedAt: new Date(),
    period,
    propertyId,
    propertyName,
    data: {
      incomeByCategory,
      expenseByCategory,
      incomeTransactions,
      expenseTransactions
    },
    summary: {
      totalIncome,
      totalExpense,
      netIncome,
      metrics: {
        profitMargin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
        expenseRatio: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
      }
    }
  };
}

/**
 * Generate Cash Flow Report
 * Shows cash inflows and outflows for a period
 */
export async function generateCashFlowReport(
  period: ReportPeriod,
  propertyId?: number
): Promise<FinancialReport> {
  // Get all transactions for the period
  const transactions = await storage.getTransactionsByDateRange(
    period.startDate,
    period.endDate,
    propertyId
  );
  
  // Group transactions by date
  const transactionsByDate: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    const dateString = transaction.date.toISOString().split('T')[0];
    if (!transactionsByDate[dateString]) {
      transactionsByDate[dateString] = [];
    }
    transactionsByDate[dateString].push(transaction);
  });
  
  // Calculate daily cash flow
  const dailyCashFlow: Record<string, { inflow: number; outflow: number; net: number }> = {};
  
  Object.keys(transactionsByDate).sort().forEach(date => {
    const dayTransactions = transactionsByDate[date];
    const inflow = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const outflow = dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
    dailyCashFlow[date] = {
      inflow,
      outflow,
      net: inflow - outflow
    };
  });
  
  // Calculate cumulative cash flow
  let runningBalance = 0;
  const cumulativeCashFlow: Record<string, number> = {};
  
  Object.keys(dailyCashFlow).sort().forEach(date => {
    runningBalance += dailyCashFlow[date].net;
    cumulativeCashFlow[date] = runningBalance;
  });
  
  // Calculate monthly totals
  const monthlyTotals: Record<string, { inflow: number; outflow: number; net: number }> = {};
  
  Object.keys(dailyCashFlow).forEach(date => {
    const yearMonth = date.substring(0, 7); // YYYY-MM
    if (!monthlyTotals[yearMonth]) {
      monthlyTotals[yearMonth] = { inflow: 0, outflow: 0, net: 0 };
    }
    
    monthlyTotals[yearMonth].inflow += dailyCashFlow[date].inflow;
    monthlyTotals[yearMonth].outflow += dailyCashFlow[date].outflow;
    monthlyTotals[yearMonth].net += dailyCashFlow[date].net;
  });
  
  // Get property info if applicable
  let propertyName: string | undefined;
  if (propertyId) {
    const property = await storage.getProperty(propertyId);
    propertyName = property?.name;
  }
  
  const totalInflow = Object.values(dailyCashFlow).reduce((sum, day) => sum + day.inflow, 0);
  const totalOutflow = Object.values(dailyCashFlow).reduce((sum, day) => sum + day.outflow, 0);
  
  return {
    reportType: ReportType.CASH_FLOW,
    generatedAt: new Date(),
    period,
    propertyId,
    propertyName,
    data: {
      dailyCashFlow,
      cumulativeCashFlow,
      monthlyTotals,
      transactionsByDate
    },
    summary: {
      totalIncome: totalInflow,
      totalExpense: totalOutflow,
      netIncome: totalInflow - totalOutflow,
      metrics: {
        averageDailyInflow: totalInflow / Object.keys(dailyCashFlow).length,
        averageDailyOutflow: totalOutflow / Object.keys(dailyCashFlow).length,
        endingBalance: runningBalance
      }
    }
  };
}

/**
 * Generate Property Performance Report
 * Compares metrics across properties
 */
export async function generatePropertyPerformanceReport(
  period: ReportPeriod
): Promise<FinancialReport> {
  // Get all properties
  const properties = await storage.getProperties();
  
  // Calculate performance metrics for each property
  const propertyMetrics: Record<number, {
    property: Property;
    income: number;
    expense: number;
    netIncome: number;
    roi: number;
    occupancyRate: number;
  }> = {};
  
  for (const property of properties) {
    // Get transactions for this property
    const transactions = await storage.getTransactionsByDateRange(
      period.startDate,
      period.endDate,
      property.id
    );
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
    const netIncome = income - expense;
    
    // Calculate ROI (assuming property value is stored in metadata)
    const propertyValue = property.purchasePrice || 100000; // Default if not available
    const roi = (netIncome / propertyValue) * 100;
    
    // Calculate occupancy (simplified for demo)
    const occupancyRate = property.status === 'occupied' ? 100 : 0;
    
    propertyMetrics[property.id] = {
      property,
      income,
      expense,
      netIncome,
      roi,
      occupancyRate
    };
  }
  
  // Calculate portfolio totals
  const totalIncome = Object.values(propertyMetrics).reduce((sum, p) => sum + p.income, 0);
  const totalExpense = Object.values(propertyMetrics).reduce((sum, p) => sum + p.expense, 0);
  const totalNetIncome = totalIncome - totalExpense;
  
  // Calculate average metrics
  const avgRoi = Object.values(propertyMetrics).reduce((sum, p) => sum + p.roi, 0) / properties.length;
  const avgOccupancy = Object.values(propertyMetrics).reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length;
  
  // Sort properties by performance (net income)
  const rankedProperties = Object.values(propertyMetrics).sort((a, b) => b.netIncome - a.netIncome);
  
  return {
    reportType: ReportType.PROPERTY_PERFORMANCE,
    generatedAt: new Date(),
    period,
    data: {
      propertyMetrics,
      rankedProperties,
      topPerformer: rankedProperties[0],
      bottomPerformer: rankedProperties[rankedProperties.length - 1]
    },
    summary: {
      totalIncome,
      totalExpense,
      netIncome: totalNetIncome,
      metrics: {
        propertyCount: properties.length,
        averageRoi: avgRoi,
        averageOccupancy: avgOccupancy,
        portfolioYield: (totalNetIncome / totalIncome) * 100
      }
    }
  };
}

/**
 * Generate Expense Breakdown Report
 * Detailed analysis of expenses by category
 */
export async function generateExpenseBreakdownReport(
  period: ReportPeriod,
  propertyId?: number
): Promise<FinancialReport> {
  // Get all transactions for the period
  const transactions = await storage.getTransactionsByDateRange(
    period.startDate,
    period.endDate,
    propertyId
  );
  
  // Filter expense transactions
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  // Group by category
  const expensesByCategory = groupTransactionsByCategory(expenseTransactions);
  
  // Calculate category percentages
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const categoryPercentages: Record<string, number> = {};
  
  Object.keys(expensesByCategory).forEach(category => {
    const categoryTotal = expensesByCategory[category].total;
    categoryPercentages[category] = (categoryTotal / totalExpense) * 100;
  });
  
  // Identify top expense categories
  const topCategories = Object.keys(expensesByCategory)
    .sort((a, b) => expensesByCategory[b].total - expensesByCategory[a].total)
    .slice(0, 3);
    
  // Get property info if applicable
  let propertyName: string | undefined;
  if (propertyId) {
    const property = await storage.getProperty(propertyId);
    propertyName = property?.name;
  }
  
  return {
    reportType: ReportType.EXPENSE_BREAKDOWN,
    generatedAt: new Date(),
    period,
    propertyId,
    propertyName,
    data: {
      expensesByCategory,
      categoryPercentages,
      topCategories,
      expenseTransactions
    },
    summary: {
      totalIncome: 0, // Not relevant for this report
      totalExpense,
      netIncome: -totalExpense,
      metrics: {
        expenseCount: expenseTransactions.length,
        averageExpense: totalExpense / expenseTransactions.length,
        topCategoryPercentage: topCategories.length > 0 ? categoryPercentages[topCategories[0]] : 0
      }
    }
  };
}

/**
 * Generate Maintenance Cost Report
 * Analyzes maintenance expenses by property
 */
export async function generateMaintenanceCostReport(
  period: ReportPeriod,
  propertyId?: number
): Promise<FinancialReport> {
  // Get all transactions for the period
  const transactions = await storage.getTransactionsByDateRange(
    period.startDate,
    period.endDate,
    propertyId
  );
  
  // Filter maintenance transactions
  const maintenanceTransactions = transactions.filter(
    t => t.type === 'expense' && t.category === 'maintenance'
  );
  
  // Group by property
  interface PropertyMaintenance {
    property: Property;
    transactions: Transaction[];
    total: number;
    count: number;
    averageCost: number;
  }
  
  const maintenanceByProperty: Record<number, PropertyMaintenance> = {};
  
  for (const transaction of maintenanceTransactions) {
    if (!transaction.propertyId) continue;
    
    if (!maintenanceByProperty[transaction.propertyId]) {
      const property = await storage.getProperty(transaction.propertyId);
      if (!property) continue;
      
      maintenanceByProperty[transaction.propertyId] = {
        property,
        transactions: [],
        total: 0,
        count: 0,
        averageCost: 0
      };
    }
    
    const entry = maintenanceByProperty[transaction.propertyId];
    entry.transactions.push(transaction);
    entry.total += Math.abs(transaction.amount);
    entry.count++;
    entry.averageCost = entry.total / entry.count;
  }
  
  // Calculate totals
  const totalMaintenance = maintenanceTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const maintenanceCount = maintenanceTransactions.length;
  
  // Sort properties by maintenance cost
  const rankedProperties = Object.values(maintenanceByProperty)
    .sort((a, b) => b.total - a.total);
    
  return {
    reportType: ReportType.MAINTENANCE_COST,
    generatedAt: new Date(),
    period,
    propertyId,
    data: {
      maintenanceByProperty,
      rankedProperties,
      maintenanceTransactions
    },
    summary: {
      totalIncome: 0, // Not relevant for this report
      totalExpense: totalMaintenance,
      netIncome: -totalMaintenance,
      metrics: {
        maintenanceCount,
        averageMaintenanceCost: maintenanceCount > 0 ? totalMaintenance / maintenanceCount : 0,
        highestPropertyCost: rankedProperties.length > 0 ? rankedProperties[0].total : 0,
        propertiesWithMaintenance: Object.keys(maintenanceByProperty).length
      }
    }
  };
}

/**
 * Generate a report based on type and period
 */
export async function generateReport(
  reportType: ReportType,
  period: ReportPeriod,
  propertyId?: number
): Promise<FinancialReport> {
  // Generate base report
  let report: FinancialReport;
  switch (reportType) {
    case ReportType.PROFIT_LOSS:
      report = await generateProfitLossReport(period, propertyId);
      break;
    case ReportType.CASH_FLOW:
      report = await generateCashFlowReport(period, propertyId);
      break;
    case ReportType.PROPERTY_PERFORMANCE:
      report = await generatePropertyPerformanceReport(period);
      break;
    case ReportType.EXPENSE_BREAKDOWN:
      report = await generateExpenseBreakdownReport(period, propertyId);
      break;
    case ReportType.MAINTENANCE_COST:
      report = await generateMaintenanceCostReport(period, propertyId);
      break;
    default:
      throw new Error(`Report type ${reportType} not implemented`);
  }

  // Add AI-powered insights
  const insights = await generateAIInsights(report);
  return {
    ...report,
    aiInsights: insights
  };
}

async function generateAIInsights(report: FinancialReport) {
  const prompt = `Analyze this financial report and provide actionable insights:
    Report Type: ${report.reportType}
    Period: ${report.period.label}
    Total Income: $${report.summary.totalIncome}
    Total Expenses: $${report.summary.totalExpense}
    Net Income: $${report.summary.netIncome}
    
    Key Metrics:
    ${Object.entries(report.summary.metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}

    Provide:
    1. Key trends and patterns
    2. Areas of concern
    3. Cost optimization opportunities
    4. Revenue enhancement suggestions
    5. Cash flow management recommendations`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    temperature: 0.2
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

/**
 * Save a generated report to storage
 */
export async function saveReport(report: FinancialReport): Promise<number> {
  const storedReport = await storage.createFinancialReport({
    reportType: report.reportType,
    generatedAt: report.generatedAt,
    periodStart: report.period.startDate,
    periodEnd: report.period.endDate,
    propertyId: report.propertyId || null,
    data: report.data,
    summary: report.summary,
    createdAt: new Date()
  });
  
  return storedReport.id;
}

// Helper Functions

/**
 * Group transactions by category
 */
function groupTransactionsByCategory(transactions: Transaction[]): Record<string, {
  transactions: Transaction[];
  total: number;
  count: number;
}> {
  const result: Record<string, {
    transactions: Transaction[];
    total: number;
    count: number;
  }> = {};
  
  transactions.forEach(transaction => {
    const category = transaction.category;
    if (!result[category]) {
      result[category] = {
        transactions: [],
        total: 0,
        count: 0
      };
    }
    
    result[category].transactions.push(transaction);
    result[category].total += Math.abs(transaction.amount);
    result[category].count++;
  });
  
  return result;
}