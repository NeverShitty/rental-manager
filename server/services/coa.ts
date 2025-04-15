
import { TransactionCategory } from '@shared/schema';

export const standardCategories = {
  // Income Categories
  'rent': {
    doorloop: 'Rent Income',
    mercury: 'Rental Income',
    wave: null, // Will be dynamically updated during sync
    internal: 'rent'
  },
  
  // Expense Categories
  'maintenance': {
    doorloop: 'Repairs & Maintenance',
    mercury: 'Maintenance Expense',
    wave: null, // Will be dynamically updated during sync
    internal: 'maintenance'
  },
  'utilities': {
    doorloop: 'Utilities',
    mercury: 'Utility Payments',
    wave: null, // Will be dynamically updated during sync
    internal: 'utilities'
  },
  'insurance': {
    doorloop: 'Insurance',
    mercury: 'Insurance Expense',
    wave: null, // Will be dynamically updated during sync
    internal: 'insurance'
  },
  'taxes': {
    doorloop: 'Property Taxes',
    mercury: 'Tax Payment',
    wave: null, // Will be dynamically updated during sync
    internal: 'taxes'
  },
  'mortgage': {
    doorloop: 'Mortgage Payment',
    mercury: 'Loan Payment',
    wave: null, // Will be dynamically updated during sync
    internal: 'mortgage'
  },
  'supplies': {
    doorloop: 'Office Supplies',
    mercury: 'Supplies',
    wave: null,
    internal: 'supplies'
  },
  'cleaning': {
    doorloop: 'Cleaning',
    mercury: 'Cleaning Services',
    wave: null,
    internal: 'cleaning'
  },
  'marketing': {
    doorloop: 'Marketing',
    mercury: 'Advertising',
    wave: null,
    internal: 'marketing'
  },
  'other': {
    doorloop: 'Other Expenses',
    mercury: 'Other',
    wave: null,
    internal: 'other'
  }
};

export function mapDoorLoopCategory(category: string): string {
  const match = Object.values(standardCategories).find(c => c.doorloop === category);
  return match?.internal || 'other';
}

export function mapMercuryCategory(category: string): string {
  const match = Object.values(standardCategories).find(c => c.mercury === category);
  return match?.internal || 'other';
}
