import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

// HMRC SA103 category labels
const HMRC_CATEGORY_LABELS: Record<string, string> = {
  // Income categories
  turnover: 'Sales/Turnover',
  otherIncome: 'Other Income',
  // Expense categories
  costOfGoods: 'Cost of Goods',
  wagesAndStaffCosts: 'Wages & Staff',
  paymentsToSubcontractors: 'Subcontractors',
  premisesRunningCosts: 'Premises Costs',
  maintenanceCosts: 'Repairs & Maintenance',
  carVanTravelExpenses: 'Travel & Vehicle',
  advertisingCosts: 'Advertising',
  professionalFees: 'Professional Fees',
  financeCharges: 'Bank Charges',
  interestOnBankOtherLoans: 'Loan Interest',
  adminCosts: 'Office & Admin',
  otherExpenses: 'Other Expenses',
};

export function formatCategory(category: string | null | undefined): string {
  if (!category) return '-';
  return HMRC_CATEGORY_LABELS[category] || category;
}
