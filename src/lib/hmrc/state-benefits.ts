// HMRC State Benefits API Mapper
// Maps wizard state benefits data to HMRC Individuals State Benefits API
// API: https://api.service.hmrc.gov.uk/individuals/state-benefits
// Maps to: SA100 Boxes 13-15

import { hmrcClient } from './client';
import {
  StateBenefitsSubmission,
  StateBenefitItem,
  StateBenefitType,
} from './types';
import { StateBenefitsData } from '@/types/wizard';

const STATE_BENEFITS_API_BASE = '/individuals/state-benefits';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get state benefits for a tax year (may include HMRC pre-populated data)
 */
export async function getStateBenefits(
  userId: string,
  nino: string,
  taxYear: string
): Promise<StateBenefitsSubmission> {
  return hmrcClient.get(
    userId,
    `${STATE_BENEFITS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create or amend state benefits submission
 */
export async function submitStateBenefits(
  userId: string,
  nino: string,
  taxYear: string,
  data: StateBenefitsSubmission
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${STATE_BENEFITS_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete state benefits submission
 */
export async function deleteStateBenefits(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${STATE_BENEFITS_API_BASE}/${nino}/${taxYear}`
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard state benefits data to HMRC format
 */
export function mapStateBenefitsToHMRC(
  wizardData: StateBenefitsData,
  taxYear: string
): StateBenefitsSubmission | null {
  const stateBenefits: StateBenefitItem[] = [];

  // Parse tax year for date defaults
  const [startYear] = taxYear.split('-');
  const taxYearStart = `${startYear}-04-06`;
  const taxYearEnd = `${parseInt(startYear) + 1}-04-05`;

  // State Pension (SA100 Box 13)
  if (wizardData.statePension !== undefined && wizardData.statePension > 0) {
    stateBenefits.push({
      benefitType: 'statePension',
      startDate: wizardData.statePensionStartDate || taxYearStart,
      endDate: taxYearEnd,
      amount: wizardData.statePension,
    });
  }

  // State Pension Lump Sum (SA100 Box 14)
  if (wizardData.statePensionLumpSum !== undefined && wizardData.statePensionLumpSum > 0) {
    stateBenefits.push({
      benefitType: 'statePensionLumpSum',
      startDate: wizardData.statePensionLumpSumDate || taxYearStart,
      amount: wizardData.statePensionLumpSum,
      taxPaid: wizardData.taxOnStatePensionLumpSum,
    });
  }

  // Jobseeker's Allowance (SA100 Box 15)
  if (wizardData.jobseekersAllowance !== undefined && wizardData.jobseekersAllowance > 0) {
    stateBenefits.push({
      benefitType: 'jobSeekersAllowance',
      startDate: wizardData.jsaStartDate || taxYearStart,
      endDate: wizardData.jsaEndDate || taxYearEnd,
      amount: wizardData.jobseekersAllowance,
      taxPaid: wizardData.taxDeductedFromJSA,
    });
  }

  // Employment and Support Allowance (SA100 Box 15)
  if (wizardData.employmentSupportAllowance !== undefined && wizardData.employmentSupportAllowance > 0) {
    stateBenefits.push({
      benefitType: 'employmentSupportAllowance',
      startDate: wizardData.esaStartDate || taxYearStart,
      endDate: wizardData.esaEndDate || taxYearEnd,
      amount: wizardData.employmentSupportAllowance,
      taxPaid: wizardData.taxDeductedFromESA,
    });
  }

  // Bereavement Allowance (SA100 Box 15)
  if (wizardData.bereavementAllowance !== undefined && wizardData.bereavementAllowance > 0) {
    stateBenefits.push({
      benefitType: 'bereavementAllowance',
      startDate: wizardData.bereavementStartDate || taxYearStart,
      endDate: wizardData.bereavementEndDate || taxYearEnd,
      amount: wizardData.bereavementAllowance,
    });
  }

  // Other taxable state benefits (SA100 Box 15)
  if (wizardData.otherTaxableBenefits !== undefined && wizardData.otherTaxableBenefits > 0) {
    stateBenefits.push({
      benefitType: 'otherStateBenefits',
      startDate: taxYearStart,
      endDate: taxYearEnd,
      amount: wizardData.otherTaxableBenefits,
    });
  }

  // Incapacity Benefit (legacy, also Box 15)
  if (wizardData.incapacityBenefit !== undefined && wizardData.incapacityBenefit > 0) {
    stateBenefits.push({
      benefitType: 'otherStateBenefits',
      startDate: taxYearStart,
      endDate: taxYearEnd,
      amount: wizardData.incapacityBenefit,
      taxPaid: wizardData.taxDeductedFromIncapacityBenefit,
    });
  }

  if (stateBenefits.length === 0) {
    return null;
  }

  return { stateBenefits };
}

/**
 * Map HMRC state benefits data back to wizard format
 */
export function mapHMRCToStateBenefitsData(
  hmrcData: StateBenefitsSubmission
): Partial<StateBenefitsData> {
  const result: Partial<StateBenefitsData> = {};

  if (!hmrcData.stateBenefits) {
    return result;
  }

  for (const benefit of hmrcData.stateBenefits) {
    switch (benefit.benefitType) {
      case 'statePension':
        result.statePension = benefit.amount;
        result.statePensionStartDate = benefit.startDate;
        break;

      case 'statePensionLumpSum':
        result.statePensionLumpSum = benefit.amount;
        result.statePensionLumpSumDate = benefit.startDate;
        result.taxOnStatePensionLumpSum = benefit.taxPaid;
        break;

      case 'jobSeekersAllowance':
        result.jobseekersAllowance = benefit.amount;
        result.jsaStartDate = benefit.startDate;
        result.jsaEndDate = benefit.endDate;
        result.taxDeductedFromJSA = benefit.taxPaid;
        break;

      case 'employmentSupportAllowance':
        result.employmentSupportAllowance = benefit.amount;
        result.esaStartDate = benefit.startDate;
        result.esaEndDate = benefit.endDate;
        result.taxDeductedFromESA = benefit.taxPaid;
        break;

      case 'bereavementAllowance':
        result.bereavementAllowance = benefit.amount;
        result.bereavementStartDate = benefit.startDate;
        result.bereavementEndDate = benefit.endDate;
        break;

      case 'otherStateBenefits':
        // Add to other taxable benefits total
        result.otherTaxableBenefits =
          (result.otherTaxableBenefits || 0) + (benefit.amount || 0);
        break;
    }
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all state benefits data for a user
 */
export async function submitAllStateBenefitsData(
  userId: string,
  nino: string,
  taxYear: string,
  stateBenefitsData: StateBenefitsData
): Promise<{
  submitted: boolean;
  error?: string;
}> {
  try {
    const hmrcData = mapStateBenefitsToHMRC(stateBenefitsData, taxYear);

    if (!hmrcData) {
      return { submitted: false }; // No data to submit
    }

    await submitStateBenefits(userId, nino, taxYear, hmrcData);
    return { submitted: true };
  } catch (error) {
    return {
      submitted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// High Income Child Benefit Charge (HICBC) Helper
// ============================================================================

// HICBC thresholds for 2024/25
export const HICBC_THRESHOLDS = {
  startThreshold: 60000, // Charge starts at £60,000
  fullChargeThreshold: 80000, // 100% charge at £80,000+
};

/**
 * Calculate High Income Child Benefit Charge
 * Applies when adjusted net income exceeds £60,000
 */
export function calculateHICBC(
  adjustedNetIncome: number,
  childBenefitReceived: number
): {
  chargeApplies: boolean;
  chargePercentage: number;
  chargeAmount: number;
  netBenefitAfterCharge: number;
} {
  if (adjustedNetIncome < HICBC_THRESHOLDS.startThreshold) {
    return {
      chargeApplies: false,
      chargePercentage: 0,
      chargeAmount: 0,
      netBenefitAfterCharge: childBenefitReceived,
    };
  }

  // Calculate charge percentage (1% for every £200 over £60,000)
  const incomeOverThreshold = adjustedNetIncome - HICBC_THRESHOLDS.startThreshold;
  const chargePercentage = Math.min(100, Math.floor(incomeOverThreshold / 200));

  const chargeAmount = (childBenefitReceived * chargePercentage) / 100;
  const netBenefitAfterCharge = childBenefitReceived - chargeAmount;

  return {
    chargeApplies: true,
    chargePercentage,
    chargeAmount,
    netBenefitAfterCharge,
  };
}

// ============================================================================
// State Benefits Summary
// ============================================================================

/**
 * Calculate total taxable state benefits
 */
export function calculateStateBenefitsSummary(
  stateBenefitsData: StateBenefitsData
): {
  totalTaxableBenefits: number;
  totalTaxDeducted: number;
  breakdown: Array<{ type: string; amount: number; taxDeducted?: number }>;
} {
  const breakdown: Array<{ type: string; amount: number; taxDeducted?: number }> = [];
  let totalTaxableBenefits = 0;
  let totalTaxDeducted = 0;

  // State Pension
  if (stateBenefitsData.statePension) {
    breakdown.push({
      type: 'State Pension',
      amount: stateBenefitsData.statePension,
    });
    totalTaxableBenefits += stateBenefitsData.statePension;
  }

  // State Pension Lump Sum
  if (stateBenefitsData.statePensionLumpSum) {
    breakdown.push({
      type: 'State Pension Lump Sum',
      amount: stateBenefitsData.statePensionLumpSum,
      taxDeducted: stateBenefitsData.taxOnStatePensionLumpSum,
    });
    totalTaxableBenefits += stateBenefitsData.statePensionLumpSum;
    totalTaxDeducted += stateBenefitsData.taxOnStatePensionLumpSum || 0;
  }

  // JSA
  if (stateBenefitsData.jobseekersAllowance) {
    breakdown.push({
      type: "Jobseeker's Allowance",
      amount: stateBenefitsData.jobseekersAllowance,
      taxDeducted: stateBenefitsData.taxDeductedFromJSA,
    });
    totalTaxableBenefits += stateBenefitsData.jobseekersAllowance;
    totalTaxDeducted += stateBenefitsData.taxDeductedFromJSA || 0;
  }

  // ESA
  if (stateBenefitsData.employmentSupportAllowance) {
    breakdown.push({
      type: 'Employment and Support Allowance',
      amount: stateBenefitsData.employmentSupportAllowance,
      taxDeducted: stateBenefitsData.taxDeductedFromESA,
    });
    totalTaxableBenefits += stateBenefitsData.employmentSupportAllowance;
    totalTaxDeducted += stateBenefitsData.taxDeductedFromESA || 0;
  }

  // Bereavement Allowance
  if (stateBenefitsData.bereavementAllowance) {
    breakdown.push({
      type: 'Bereavement Allowance',
      amount: stateBenefitsData.bereavementAllowance,
    });
    totalTaxableBenefits += stateBenefitsData.bereavementAllowance;
  }

  // Other taxable benefits
  if (stateBenefitsData.otherTaxableBenefits) {
    breakdown.push({
      type: 'Other Taxable Benefits',
      amount: stateBenefitsData.otherTaxableBenefits,
    });
    totalTaxableBenefits += stateBenefitsData.otherTaxableBenefits;
  }

  return {
    totalTaxableBenefits,
    totalTaxDeducted,
    breakdown,
  };
}
