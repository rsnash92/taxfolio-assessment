// HMRC Pensions Income API Mapper
// Maps wizard pension data to HMRC Individuals Pensions Income API
// API: https://api.service.hmrc.gov.uk/individuals/income-received/pensions
// Note: State Pension is handled via State Benefits API

import { hmrcClient } from './client';
import {
  PensionsIncome,
  ForeignPensionItem,
} from './types';
import { PensionIncomeData, PrivatePension } from '@/types/wizard';

const PENSIONS_API_BASE = '/individuals/income-received/pensions';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get pensions income for a tax year
 */
export async function getPensionsIncome(
  userId: string,
  nino: string,
  taxYear: string
): Promise<PensionsIncome> {
  return hmrcClient.get(
    userId,
    `${PENSIONS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create or amend pensions income
 */
export async function submitPensionsIncome(
  userId: string,
  nino: string,
  taxYear: string,
  data: PensionsIncome
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${PENSIONS_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete pensions income submission
 */
export async function deletePensionsIncome(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${PENSIONS_API_BASE}/${nino}/${taxYear}`
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard pension income data to HMRC Pensions Income format
 * Note: Private/occupational UK pensions are often pre-populated via Employment API
 * This primarily handles foreign pensions
 */
export function mapPensionIncomeToHMRC(
  wizardData: PensionIncomeData
): PensionsIncome | null {
  const result: PensionsIncome = {};
  let hasData = false;

  // Foreign pensions
  if (wizardData.foreignPensions && wizardData.foreignPensions.length > 0) {
    const foreignPension: ForeignPensionItem[] = [];

    for (const pension of wizardData.foreignPensions) {
      if (pension.pensionAmount && pension.pensionAmount > 0) {
        foreignPension.push({
          countryCode: pension.countryCode || 'OTH',
          amountBeforeTax: pension.pensionAmount,
          taxTakenOff: pension.taxPaid,
          foreignTaxCreditRelief: wizardData.claimForeignPensionTaxCredit ?? false,
          taxableAmount: pension.pensionAmount,
        });
        hasData = true;
      }
    }

    if (foreignPension.length > 0) {
      result.foreignPension = foreignPension;
    }
  }

  // Single foreign pension entry (if not using array)
  if (!hasData && wizardData.foreignPensionTotal && wizardData.foreignPensionTotal > 0) {
    result.foreignPension = [
      {
        countryCode: wizardData.foreignPensionCountry || 'OTH',
        amountBeforeTax: wizardData.foreignPensionTotal,
        taxTakenOff: wizardData.foreignPensionTaxPaid,
        foreignTaxCreditRelief: wizardData.claimForeignPensionTaxCredit ?? false,
        taxableAmount: wizardData.foreignPensionTotal,
      },
    ];
    hasData = true;
  }

  return hasData ? result : null;
}

/**
 * Map HMRC pensions data back to wizard format
 */
export function mapHMRCToPensionIncomeData(
  hmrcData: PensionsIncome
): Partial<PensionIncomeData> {
  const result: Partial<PensionIncomeData> = {};

  // Foreign pensions
  if (hmrcData.foreignPension && hmrcData.foreignPension.length > 0) {
    result.foreignPensions = hmrcData.foreignPension.map((pension, index) => ({
      id: `foreign-pension-${index + 1}`,
      countryCode: pension.countryCode,
      pensionAmount: pension.taxableAmount || pension.amountBeforeTax || 0,
      taxPaid: pension.taxTakenOff,
    }));

    // Calculate totals
    result.foreignPensionTotal = hmrcData.foreignPension.reduce(
      (sum, p) => sum + (p.taxableAmount || 0),
      0
    );
    result.foreignPensionTaxPaid = hmrcData.foreignPension.reduce(
      (sum, p) => sum + (p.taxTakenOff || 0),
      0
    );
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all pension income data for a user
 * Note: State pension should be submitted via state-benefits.ts
 * Private UK pensions are often handled via employment data
 */
export async function submitAllPensionIncomeData(
  userId: string,
  nino: string,
  taxYear: string,
  pensionData: PensionIncomeData
): Promise<{
  submitted: boolean;
  error?: string;
}> {
  try {
    const hmrcData = mapPensionIncomeToHMRC(pensionData);

    if (!hmrcData) {
      return { submitted: false }; // No foreign pension data to submit
    }

    await submitPensionsIncome(userId, nino, taxYear, hmrcData);
    return { submitted: true };
  } catch (error) {
    return {
      submitted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Private Pension Helpers
// ============================================================================

/**
 * Note: Private/occupational UK pensions are typically:
 * 1. Pre-populated by HMRC from pension provider P60 data
 * 2. Submitted via the Employment Income API (as pension income is treated similarly)
 *
 * The mapPrivatePensionToEmployment function can be used if manual submission is needed
 */

export interface PrivatePensionEmploymentData {
  pay: {
    taxablePayToDate: number;
    totalTaxToDate: number;
  };
}

/**
 * Map private pension data to employment format
 * Used when private pension needs to be submitted as an "employment"
 */
export function mapPrivatePensionToEmploymentData(
  pension: PrivatePension
): PrivatePensionEmploymentData {
  return {
    pay: {
      taxablePayToDate: pension.grossAmount ?? pension.pensionAmount ?? 0,
      totalTaxToDate: pension.taxDeducted || 0,
    },
  };
}

// ============================================================================
// Pension Income Summary
// ============================================================================

/**
 * Calculate total pension income summary
 */
export function calculatePensionIncomeSummary(
  pensionData: PensionIncomeData
): {
  statePension: number;
  privatePensions: number;
  foreignPensions: number;
  totalPensionIncome: number;
  totalTaxDeducted: number;
} {
  let statePension = 0;
  let privatePensions = 0;
  let foreignPensions = 0;
  let totalTaxDeducted = 0;

  // State pension (from stateBenefits section, but included for summary)
  statePension = pensionData.statePension || 0;

  // Private pensions
  if (pensionData.privatePensions && pensionData.privatePensions.length > 0) {
    for (const pension of pensionData.privatePensions) {
      privatePensions += pension.grossAmount ?? pension.pensionAmount ?? 0;
      totalTaxDeducted += pension.taxDeducted || 0;
    }
  }

  // Foreign pensions
  if (pensionData.foreignPensions && pensionData.foreignPensions.length > 0) {
    for (const pension of pensionData.foreignPensions) {
      foreignPensions += pension.pensionAmount || 0;
      totalTaxDeducted += pension.taxPaid || 0;
    }
  } else if (pensionData.foreignPensionTotal) {
    foreignPensions = pensionData.foreignPensionTotal;
    totalTaxDeducted += pensionData.foreignPensionTaxPaid || 0;
  }

  const totalPensionIncome = statePension + privatePensions + foreignPensions;

  return {
    statePension,
    privatePensions,
    foreignPensions,
    totalPensionIncome,
    totalTaxDeducted,
  };
}

// ============================================================================
// Tax Relief on Pension Contributions
// ============================================================================

// Annual Allowance for 2024/25
export const PENSION_ANNUAL_ALLOWANCE = 60000;
export const PENSION_ANNUAL_ALLOWANCE_TAPERED_MIN = 10000;
export const PENSION_MONEY_PURCHASE_ANNUAL_ALLOWANCE = 10000;

/**
 * Calculate available pension annual allowance
 * Note: This is for contributions (relief), not pension income
 */
export function calculatePensionAnnualAllowance(
  adjustedIncome: number,
  thresholdIncome: number
): number {
  // Standard allowance
  if (thresholdIncome <= 200000 || adjustedIncome <= 260000) {
    return PENSION_ANNUAL_ALLOWANCE;
  }

  // Tapered annual allowance
  const excess = adjustedIncome - 260000;
  const reduction = Math.floor(excess / 2);
  const taperedAllowance = Math.max(
    PENSION_ANNUAL_ALLOWANCE_TAPERED_MIN,
    PENSION_ANNUAL_ALLOWANCE - reduction
  );

  return taperedAllowance;
}
