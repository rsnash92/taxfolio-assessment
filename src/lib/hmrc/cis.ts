// HMRC CIS Deductions API Mapper
// Maps wizard CIS data to HMRC CIS Deductions API
// API: https://api.service.hmrc.gov.uk/individuals/deductions/cis
// Maps to: SA100 Box 17 (CIS deductions to be offset against tax)

import { hmrcClient } from './client';
import {
  CISDeductionsSubmission,
  CISDeductionsResponse,
  CISDeductionPeriod,
} from './types';
import { CISData, CISContractor } from '@/types/wizard';

const CIS_API_BASE = '/individuals/deductions/cis';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get current CIS deductions position (pre-populated from contractor submissions)
 */
export async function getCISCurrentPosition(
  userId: string,
  nino: string
): Promise<CISDeductionsResponse> {
  return hmrcClient.get(
    userId,
    `${CIS_API_BASE}/${nino}/current-position`
  );
}

/**
 * Get CIS deductions for a specific tax year
 */
export async function getCISDeductions(
  userId: string,
  nino: string,
  taxYear: string
): Promise<CISDeductionsResponse> {
  return hmrcClient.get(
    userId,
    `${CIS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create CIS deductions amendment (if disagreeing with contractor data)
 */
export async function createCISDeductions(
  userId: string,
  nino: string,
  taxYear: string,
  data: CISDeductionsSubmission
): Promise<{ submissionId: string }> {
  return hmrcClient.post(
    userId,
    `${CIS_API_BASE}/${nino}/amendments/${taxYear}`,
    data
  );
}

/**
 * Amend existing CIS deductions submission
 */
export async function amendCISDeductions(
  userId: string,
  nino: string,
  taxYear: string,
  submissionId: string,
  data: CISDeductionsSubmission
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${CIS_API_BASE}/${nino}/amendments/${taxYear}/${submissionId}`,
    data
  );
}

/**
 * Delete CIS deductions amendment
 */
export async function deleteCISDeductions(
  userId: string,
  nino: string,
  taxYear: string,
  submissionId: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${CIS_API_BASE}/${nino}/amendments/${taxYear}/${submissionId}`
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map a wizard CIS contractor to HMRC submission format
 */
export function mapContractorToHMRCFormat(
  contractor: CISContractor,
  taxYearStart: string,
  taxYearEnd: string
): CISDeductionsSubmission {
  // Calculate period data from payments
  const periodData: CISDeductionPeriod[] = [];

  if (contractor.payments && contractor.payments.length > 0) {
    // Group by month or use individual payments
    for (const payment of contractor.payments) {
      periodData.push({
        deductionFromDate: payment.periodStart || taxYearStart,
        deductionToDate: payment.periodEnd || taxYearEnd,
        grossAmountPaid: payment.grossAmount,
        deductionAmount: payment.cisDeducted,
        costOfMaterials: payment.materialsAmount,
      });
    }
  } else {
    // Single period with totals
    periodData.push({
      deductionFromDate: taxYearStart,
      deductionToDate: taxYearEnd,
      grossAmountPaid: contractor.grossPayments || 0,
      deductionAmount: contractor.cisDeductions || 0,
      costOfMaterials: contractor.materialsDeducted,
    });
  }

  return {
    fromDate: taxYearStart,
    toDate: taxYearEnd,
    contractorName: contractor.contractorName,
    employerRef: contractor.contractorUTR || '',
    periodData,
  };
}

/**
 * Map all wizard CIS data to HMRC submissions
 */
export function mapCISDataToHMRC(
  cisData: CISData,
  taxYear: string
): CISDeductionsSubmission[] {
  const submissions: CISDeductionsSubmission[] = [];

  // Parse tax year to get dates
  const [startYear] = taxYear.split('-');
  const taxYearStart = `${startYear}-04-06`;
  const taxYearEnd = `${parseInt(startYear) + 1}-04-05`;

  // Map each contractor
  if (cisData.contractors && cisData.contractors.length > 0) {
    for (const contractor of cisData.contractors) {
      // Skip if no data
      if (!contractor.contractorName) continue;

      submissions.push(
        mapContractorToHMRCFormat(contractor, taxYearStart, taxYearEnd)
      );
    }
  }

  return submissions;
}

/**
 * Map HMRC CIS response back to wizard format
 */
export function mapHMRCToCISData(
  hmrcResponse: CISDeductionsResponse
): Partial<CISData> {
  const result: Partial<CISData> = {
    contractors: [],
    totalGrossPayments: hmrcResponse.totalGrossAmountPaid || 0,
    totalCISDeductions: hmrcResponse.totalDeductionAmount || 0,
    totalMaterials: hmrcResponse.totalCostOfMaterials || 0,
  };

  if (hmrcResponse.cisDeductions) {
    result.contractors = hmrcResponse.cisDeductions.map((cis) => {
      const grossPayments = cis.totalGrossAmountPaid || 0;
      const cisDeductions = cis.totalDeductionAmount || 0;
      return {
        id: cis.employerRef,
        contractorName: cis.contractorName || 'Unknown Contractor',
        contractorUTR: cis.employerRef,
        grossPayments,
        cisDeductions,
        netPayments: grossPayments - cisDeductions,
        materialsDeducted: cis.totalCostOfMaterials,
        deductionRate: calculateDeductionRate(
          cis.totalDeductionAmount,
          cis.totalGrossAmountPaid,
          cis.totalCostOfMaterials
        ),
        payments: cis.periodData?.map((period) => ({
          periodStart: period.deductionFromDate,
          periodEnd: period.deductionToDate,
          grossAmount: period.grossAmountPaid,
          cisDeducted: period.deductionAmount,
          materialsAmount: period.costOfMaterials,
        })),
      };
    });
  }

  return result;
}

/**
 * Calculate CIS deduction rate from amounts
 */
function calculateDeductionRate(
  deduction?: number,
  gross?: number,
  materials?: number
): '20' | '30' | '0' {
  if (!deduction || !gross) return '20';

  const labour = gross - (materials || 0);
  if (labour <= 0) return '20';

  const rate = (deduction / labour) * 100;

  if (rate >= 28) return '30';
  if (rate >= 18) return '20';
  return '0'; // Gross payment status
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all CIS data for a user
 */
export async function submitAllCISData(
  userId: string,
  nino: string,
  taxYear: string,
  cisData: CISData
): Promise<{
  submitted: string[];
  errors: Array<{ contractor: string; error: string }>;
}> {
  const result = {
    submitted: [] as string[],
    errors: [] as Array<{ contractor: string; error: string }>,
  };

  const submissions = mapCISDataToHMRC(cisData, taxYear);

  for (const submission of submissions) {
    try {
      const response = await createCISDeductions(userId, nino, taxYear, submission);
      result.submitted.push(response.submissionId);
    } catch (error) {
      result.errors.push({
        contractor: submission.contractorName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

// ============================================================================
// CIS Calculation Helpers
// ============================================================================

// Standard CIS deduction rates
export const CIS_DEDUCTION_RATES = {
  registered: 20, // Registered subcontractor
  unregistered: 30, // Unregistered subcontractor
  gross: 0, // Gross payment status
};

/**
 * Calculate CIS deduction amount
 */
export function calculateCISDeduction(
  grossPayment: number,
  materialsDeducted: number = 0,
  rate: 20 | 30 | 0 = 20
): {
  grossPayment: number;
  materials: number;
  labourCost: number;
  deductionRate: number;
  cisDeducted: number;
  netPayment: number;
} {
  const labourCost = grossPayment - materialsDeducted;
  const cisDeducted = (labourCost * rate) / 100;
  const netPayment = grossPayment - cisDeducted;

  return {
    grossPayment,
    materials: materialsDeducted,
    labourCost,
    deductionRate: rate,
    cisDeducted,
    netPayment,
  };
}

/**
 * Calculate total CIS summary for all contractors
 */
export function calculateCISSummary(cisData: CISData): {
  totalGrossPayments: number;
  totalMaterials: number;
  totalLabour: number;
  totalCISDeducted: number;
  totalNetPayments: number;
} {
  let totalGrossPayments = 0;
  let totalMaterials = 0;
  let totalCISDeducted = 0;

  if (cisData.contractors) {
    for (const contractor of cisData.contractors) {
      totalGrossPayments += contractor.grossPayments || 0;
      totalMaterials += contractor.materialsDeducted || 0;
      totalCISDeducted += contractor.cisDeductions || 0;
    }
  }

  const totalLabour = totalGrossPayments - totalMaterials;
  const totalNetPayments = totalGrossPayments - totalCISDeducted;

  return {
    totalGrossPayments,
    totalMaterials,
    totalLabour,
    totalCISDeducted,
    totalNetPayments,
  };
}
