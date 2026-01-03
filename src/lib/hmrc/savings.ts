// HMRC Savings/Interest Income API Mapper
// Maps wizard interest data to HMRC Individuals Savings Income API
// API: https://api.service.hmrc.gov.uk/individuals/income-received/savings
// Maps to: SA100 Boxes 1-3

import { hmrcClient } from './client';
import {
  SavingsIncome,
  UKSavingsAccountsIncome,
  SavingsAccountItem,
  ForeignInterestItem,
} from './types';
import { InterestData } from '@/types/wizard';

const SAVINGS_API_BASE = '/individuals/income-received/savings';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Retrieve UK savings income (taxed interest) for a tax year
 */
export async function getSavingsIncome(
  userId: string,
  nino: string,
  taxYear: string
): Promise<SavingsIncome> {
  return hmrcClient.get(
    userId,
    `${SAVINGS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create or amend UK savings income (taxed interest)
 */
export async function submitSavingsIncome(
  userId: string,
  nino: string,
  taxYear: string,
  data: SavingsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${SAVINGS_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete UK savings income submission
 */
export async function deleteSavingsIncome(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${SAVINGS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Retrieve UK savings accounts (untaxed interest) for a tax year
 */
export async function getUKSavingsAccounts(
  userId: string,
  nino: string,
  taxYear: string
): Promise<UKSavingsAccountsIncome> {
  return hmrcClient.get(
    userId,
    `${SAVINGS_API_BASE}/${nino}/${taxYear}/uk`
  );
}

/**
 * Create or amend UK savings accounts (untaxed interest)
 */
export async function submitUKSavingsAccounts(
  userId: string,
  nino: string,
  taxYear: string,
  data: UKSavingsAccountsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${SAVINGS_API_BASE}/${nino}/${taxYear}/uk`,
    data
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard interest data to HMRC Savings Income format (taxed interest)
 */
export function mapInterestToHMRCSavingsIncome(
  wizardData: InterestData
): SavingsIncome | null {
  const result: SavingsIncome = {};
  let hasData = false;

  // Taxed UK interest (SA100 Box 1) - interest with tax deducted at source
  // This is less common now as most interest is paid gross
  if (wizardData.taxedUKInterest !== undefined && wizardData.taxedUKInterest > 0) {
    result.securities = {
      grossAmount: wizardData.taxedUKInterest,
      taxTakenOff: wizardData.taxDeductedFromInterest,
    };
    hasData = true;
  }

  // Foreign interest (SA100 Box 3)
  if (wizardData.foreignInterest !== undefined && wizardData.foreignInterest > 0) {
    const foreignInterest: ForeignInterestItem[] = [];

    // Check for detailed country breakdown
    if (wizardData.foreignInterestByCountry && wizardData.foreignInterestByCountry.length > 0) {
      for (const country of wizardData.foreignInterestByCountry) {
        foreignInterest.push({
          countryCode: country.countryCode,
          amountBeforeTax: country.amount,
          taxTakenOff: country.taxPaid,
          foreignTaxCreditRelief: wizardData.claimForeignTaxCreditOnInterest ?? false,
          taxableAmount: country.amount || 0,
        });
      }
    } else {
      // Single entry with total foreign interest
      foreignInterest.push({
        countryCode: wizardData.foreignInterestCountry || 'OTH',
        amountBeforeTax: wizardData.foreignInterest,
        taxTakenOff: wizardData.foreignTaxPaidOnInterest,
        foreignTaxCreditRelief: wizardData.claimForeignTaxCreditOnInterest ?? false,
        taxableAmount: wizardData.foreignInterest,
      });
    }

    result.foreignInterest = foreignInterest;
    hasData = true;
  }

  return hasData ? result : null;
}

/**
 * Map wizard interest data to HMRC UK Savings Accounts format (untaxed interest)
 */
export function mapInterestToHMRCUKSavingsAccounts(
  wizardData: InterestData
): UKSavingsAccountsIncome | null {
  // Untaxed UK interest (SA100 Box 2) - most bank/building society interest
  if (!wizardData.untaxedUKInterest || wizardData.untaxedUKInterest <= 0) {
    return null;
  }

  const savingsAccounts: SavingsAccountItem[] = [];

  // Check for detailed account breakdown
  if (wizardData.savingsAccounts && wizardData.savingsAccounts.length > 0) {
    for (const account of wizardData.savingsAccounts) {
      savingsAccounts.push({
        savingsAccountId: `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accountName: account.accountName || 'Savings Account',
        grossAmount: account.interestReceived || 0,
      });
    }
  } else {
    // Single consolidated entry
    savingsAccounts.push({
      savingsAccountId: `uk-savings-${Date.now()}`,
      accountName: 'UK Savings Interest',
      grossAmount: wizardData.untaxedUKInterest,
    });
  }

  return { savingsAccounts };
}

/**
 * Map HMRC savings data back to wizard format
 */
export function mapHMRCToInterestData(
  savingsIncome?: SavingsIncome,
  ukSavingsAccounts?: UKSavingsAccountsIncome
): Partial<InterestData> {
  const result: Partial<InterestData> = {};

  // Taxed UK interest
  if (savingsIncome?.securities) {
    result.taxedUKInterest = savingsIncome.securities.grossAmount;
    result.taxDeductedFromInterest = savingsIncome.securities.taxTakenOff;
  }

  // Foreign interest
  if (savingsIncome?.foreignInterest && savingsIncome.foreignInterest.length > 0) {
    result.foreignInterest = savingsIncome.foreignInterest.reduce(
      (sum, item) => sum + (item.taxableAmount || 0),
      0
    );
    result.foreignTaxPaidOnInterest = savingsIncome.foreignInterest.reduce(
      (sum, item) => sum + (item.taxTakenOff || 0),
      0
    );

    // Store country breakdown
    result.foreignInterestByCountry = savingsIncome.foreignInterest.map((item) => ({
      countryCode: item.countryCode,
      amount: item.amountBeforeTax || item.taxableAmount || 0,
      taxPaid: item.taxTakenOff,
    }));
  }

  // Untaxed UK interest
  if (ukSavingsAccounts?.savingsAccounts && ukSavingsAccounts.savingsAccounts.length > 0) {
    result.untaxedUKInterest = ukSavingsAccounts.savingsAccounts.reduce(
      (sum, account) => sum + (account.grossAmount || 0),
      0
    );

    result.savingsAccounts = ukSavingsAccounts.savingsAccounts.map((account) => ({
      accountName: account.accountName,
      interestReceived: account.grossAmount || 0,
      isTaxed: false,
    }));
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all interest/savings data for a user
 */
export async function submitAllInterestData(
  userId: string,
  nino: string,
  taxYear: string,
  interestData: InterestData
): Promise<{
  savingsIncomeSubmitted: boolean;
  ukAccountsSubmitted: boolean;
  errors: string[];
}> {
  const result = {
    savingsIncomeSubmitted: false,
    ukAccountsSubmitted: false,
    errors: [] as string[],
  };

  // Submit taxed interest and foreign interest
  try {
    const savingsData = mapInterestToHMRCSavingsIncome(interestData);
    if (savingsData) {
      await submitSavingsIncome(userId, nino, taxYear, savingsData);
      result.savingsIncomeSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Savings income: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Submit untaxed UK interest
  try {
    const ukAccountsData = mapInterestToHMRCUKSavingsAccounts(interestData);
    if (ukAccountsData) {
      await submitUKSavingsAccounts(userId, nino, taxYear, ukAccountsData);
      result.ukAccountsSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `UK savings accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

// ============================================================================
// Tax Calculation Helpers
// ============================================================================

// Personal Savings Allowance for 2024/25
export const PERSONAL_SAVINGS_ALLOWANCE = {
  basic: 1000, // Basic rate taxpayers
  higher: 500, // Higher rate taxpayers
  additional: 0, // Additional rate taxpayers
};

/**
 * Calculate Personal Savings Allowance based on tax band
 */
export function getPersonalSavingsAllowance(
  taxBand: 'basic' | 'higher' | 'additional'
): number {
  return PERSONAL_SAVINGS_ALLOWANCE[taxBand];
}

/**
 * Calculate taxable interest after Personal Savings Allowance
 */
export function calculateTaxableInterest(
  totalInterest: number,
  taxBand: 'basic' | 'higher' | 'additional'
): {
  totalInterest: number;
  personalSavingsAllowance: number;
  taxableInterest: number;
} {
  const allowance = getPersonalSavingsAllowance(taxBand);
  const taxableInterest = Math.max(0, totalInterest - allowance);

  return {
    totalInterest,
    personalSavingsAllowance: Math.min(allowance, totalInterest),
    taxableInterest,
  };
}
