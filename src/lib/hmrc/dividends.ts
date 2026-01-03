// HMRC Dividends Income API Mapper
// Maps wizard dividends data to HMRC Individuals Dividends Income API
// API: https://api.service.hmrc.gov.uk/individuals/income-received/dividends
// Maps to: SA100 Boxes 4-6

import { hmrcClient } from './client';
import {
  UKDividendsIncome,
  OtherDividendsIncome,
  ForeignDividendsIncome,
  ForeignDividendItem,
} from './types';
import { DividendsData } from '@/types/wizard';

const DIVIDENDS_API_BASE = '/individuals/income-received/dividends';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Retrieve UK dividends for a tax year
 */
export async function getUKDividends(
  userId: string,
  nino: string,
  taxYear: string
): Promise<UKDividendsIncome> {
  return hmrcClient.get(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create or amend UK dividends
 */
export async function submitUKDividends(
  userId: string,
  nino: string,
  taxYear: string,
  data: UKDividendsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete UK dividends submission
 */
export async function deleteUKDividends(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Retrieve other dividends (stock dividends, etc.)
 */
export async function getOtherDividends(
  userId: string,
  nino: string,
  taxYear: string
): Promise<OtherDividendsIncome> {
  return hmrcClient.get(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}/other`
  );
}

/**
 * Create or amend other dividends
 */
export async function submitOtherDividends(
  userId: string,
  nino: string,
  taxYear: string,
  data: OtherDividendsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}/other`,
    data
  );
}

/**
 * Retrieve foreign dividends
 */
export async function getForeignDividends(
  userId: string,
  nino: string,
  taxYear: string
): Promise<ForeignDividendsIncome> {
  return hmrcClient.get(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}/foreign`
  );
}

/**
 * Create or amend foreign dividends
 */
export async function submitForeignDividends(
  userId: string,
  nino: string,
  taxYear: string,
  data: ForeignDividendsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${DIVIDENDS_API_BASE}/${nino}/${taxYear}/foreign`,
    data
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard dividends data to HMRC UK Dividends format
 */
export function mapDividendsToHMRCUKDividends(
  wizardData: DividendsData
): UKDividendsIncome | null {
  const result: UKDividendsIncome = {};

  // UK company dividends (SA100 Box 4)
  if (wizardData.ukDividends !== undefined && wizardData.ukDividends > 0) {
    result.ukDividends = wizardData.ukDividends;
  }

  // Other UK dividends - unit trusts, OEICs (SA100 Box 5)
  if (wizardData.ukDividendsFromUnitTrusts !== undefined && wizardData.ukDividendsFromUnitTrusts > 0) {
    result.otherUkDividends = wizardData.ukDividendsFromUnitTrusts;
  }

  // Return null if no data
  if (result.ukDividends === undefined && result.otherUkDividends === undefined) {
    return null;
  }

  return result;
}

/**
 * Map wizard dividends data to HMRC Foreign Dividends format
 */
export function mapDividendsToHMRCForeignDividends(
  wizardData: DividendsData
): ForeignDividendsIncome | null {
  // If no foreign dividends, return null
  if (!wizardData.foreignDividends || wizardData.foreignDividends <= 0) {
    return null;
  }

  // For foreign dividends, we need country-level breakdown
  // If wizard only has a total, we'll use a generic entry
  const foreignDividends: ForeignDividendItem[] = [];

  // Check if there's detailed country breakdown
  if (wizardData.foreignDividendsByCountry && wizardData.foreignDividendsByCountry.length > 0) {
    for (const country of wizardData.foreignDividendsByCountry) {
      foreignDividends.push({
        countryCode: country.countryCode,
        amountBeforeTax: country.amount,
        taxTakenOff: country.taxPaid,
        foreignTaxCreditRelief: wizardData.claimForeignTaxCredit ?? false,
        taxableAmount: country.amount || 0,
      });
    }
  } else {
    // Single entry with total foreign dividends
    // Default to 'OTH' (Other) if no country specified
    foreignDividends.push({
      countryCode: wizardData.foreignDividendsCountry || 'OTH',
      amountBeforeTax: wizardData.foreignDividends,
      taxTakenOff: wizardData.foreignTaxPaid,
      foreignTaxCreditRelief: wizardData.claimForeignTaxCredit ?? false,
      taxableAmount: wizardData.foreignDividends,
    });
  }

  return { foreignDividend: foreignDividends };
}

/**
 * Map wizard dividends data to HMRC Other Dividends format (stock dividends, etc.)
 */
export function mapDividendsToHMRCOtherDividends(
  wizardData: DividendsData
): OtherDividendsIncome | null {
  const result: OtherDividendsIncome = {};
  let hasData = false;

  // Stock dividends (SA101 Box 35)
  if (wizardData.stockDividends !== undefined && wizardData.stockDividends > 0) {
    result.stockDividend = {
      grossAmount: wizardData.stockDividends,
    };
    hasData = true;
  }

  // Close company loans written off (SA101 Box 38)
  if (wizardData.closeCompanyLoansWrittenOff !== undefined && wizardData.closeCompanyLoansWrittenOff > 0) {
    result.closeCompanyLoansWrittenOff = {
      grossAmount: wizardData.closeCompanyLoansWrittenOff,
    };
    hasData = true;
  }

  return hasData ? result : null;
}

/**
 * Map HMRC dividends data back to wizard format
 */
export function mapHMRCToDividendsData(
  ukDividends?: UKDividendsIncome,
  foreignDividends?: ForeignDividendsIncome,
  otherDividends?: OtherDividendsIncome
): Partial<DividendsData> {
  const result: Partial<DividendsData> = {};

  // UK Dividends
  if (ukDividends) {
    result.ukDividends = ukDividends.ukDividends;
    result.ukDividendsFromUnitTrusts = ukDividends.otherUkDividends;
  }

  // Foreign Dividends
  if (foreignDividends?.foreignDividend && foreignDividends.foreignDividend.length > 0) {
    // Sum up all foreign dividends
    result.foreignDividends = foreignDividends.foreignDividend.reduce(
      (sum, item) => sum + (item.taxableAmount || 0),
      0
    );
    result.foreignTaxPaid = foreignDividends.foreignDividend.reduce(
      (sum, item) => sum + (item.taxTakenOff || 0),
      0
    );

    // Store country breakdown
    result.foreignDividendsByCountry = foreignDividends.foreignDividend.map((item) => ({
      countryCode: item.countryCode,
      amount: item.amountBeforeTax || item.taxableAmount || 0,
      taxPaid: item.taxTakenOff,
    }));
  }

  // Other Dividends
  if (otherDividends) {
    result.stockDividends = otherDividends.stockDividend?.grossAmount;
    result.closeCompanyLoansWrittenOff = otherDividends.closeCompanyLoansWrittenOff?.grossAmount;
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all dividends data for a user
 */
export async function submitAllDividendsData(
  userId: string,
  nino: string,
  taxYear: string,
  dividendsData: DividendsData
): Promise<{
  ukSubmitted: boolean;
  foreignSubmitted: boolean;
  otherSubmitted: boolean;
  errors: string[];
}> {
  const result = {
    ukSubmitted: false,
    foreignSubmitted: false,
    otherSubmitted: false,
    errors: [] as string[],
  };

  // Submit UK dividends
  try {
    const ukData = mapDividendsToHMRCUKDividends(dividendsData);
    if (ukData) {
      await submitUKDividends(userId, nino, taxYear, ukData);
      result.ukSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `UK dividends: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Submit foreign dividends
  try {
    const foreignData = mapDividendsToHMRCForeignDividends(dividendsData);
    if (foreignData) {
      await submitForeignDividends(userId, nino, taxYear, foreignData);
      result.foreignSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Foreign dividends: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Submit other dividends (stock dividends, etc.)
  try {
    const otherData = mapDividendsToHMRCOtherDividends(dividendsData);
    if (otherData) {
      await submitOtherDividends(userId, nino, taxYear, otherData);
      result.otherSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Other dividends: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

// ============================================================================
// Tax Calculation Helpers
// ============================================================================

// 2024/25 Dividend Allowance
export const DIVIDEND_ALLOWANCE_2024_25 = 500;

/**
 * Calculate taxable dividends after allowance
 */
export function calculateTaxableDividends(
  totalDividends: number,
  taxYear: string = '2024-25'
): {
  totalDividends: number;
  dividendAllowance: number;
  taxableDividends: number;
} {
  // Get allowance for tax year
  let allowance = DIVIDEND_ALLOWANCE_2024_25;
  if (taxYear === '2023-24') {
    allowance = 1000; // Was £1,000 in 2023/24
  } else if (taxYear === '2022-23') {
    allowance = 2000; // Was £2,000 in 2022/23
  }

  const taxableDividends = Math.max(0, totalDividends - allowance);

  return {
    totalDividends,
    dividendAllowance: Math.min(allowance, totalDividends),
    taxableDividends,
  };
}
