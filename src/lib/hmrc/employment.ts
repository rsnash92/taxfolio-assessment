// HMRC Employment Income API Mapper
// Maps wizard employment data to HMRC Individuals Employments Income API
// API: https://api.service.hmrc.gov.uk/individuals/income-received/employments
// Maps to: SA102

import { hmrcClient } from './client';
import {
  EmploymentFinancialData,
  EmploymentSource,
} from './types';
import { EmploymentData } from '@/types/wizard';

const EMPLOYMENT_API_BASE = '/individuals/income-received/employments';

// ============================================================================
// API Functions
// ============================================================================

/**
 * List all employments for a tax year
 * Note: Employment data is pre-populated by HMRC from employer submissions
 */
export async function listEmployments(
  userId: string,
  nino: string,
  taxYear: string
): Promise<{ employments: EmploymentSource[] }> {
  return hmrcClient.get(
    userId,
    `${EMPLOYMENT_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Retrieve a specific employment
 */
export async function getEmployment(
  userId: string,
  nino: string,
  taxYear: string,
  employmentId: string
): Promise<{ employment: EmploymentSource; financialData?: EmploymentFinancialData }> {
  return hmrcClient.get(
    userId,
    `${EMPLOYMENT_API_BASE}/${nino}/${taxYear}/${employmentId}`
  );
}

/**
 * Create or amend custom employment financial data
 * Only use if customer disagrees with HMRC pre-populated data
 */
export async function submitEmploymentFinancialData(
  userId: string,
  nino: string,
  taxYear: string,
  employmentId: string,
  data: EmploymentFinancialData
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${EMPLOYMENT_API_BASE}/${nino}/${taxYear}/${employmentId}`,
    data
  );
}

/**
 * Ignore HMRC employment data (if customer disagrees entirely)
 */
export async function ignoreEmployment(
  userId: string,
  nino: string,
  taxYear: string,
  employmentId: string
): Promise<void> {
  await hmrcClient.post(
    userId,
    `${EMPLOYMENT_API_BASE}/${nino}/${taxYear}/${employmentId}/ignore`,
    {}
  );
}

/**
 * Delete custom employment (if previously submitted)
 */
export async function deleteCustomEmployment(
  userId: string,
  nino: string,
  taxYear: string,
  employmentId: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${EMPLOYMENT_API_BASE}/${nino}/${taxYear}/${employmentId}`
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard employment data to HMRC API format
 */
export function mapEmploymentDataToHMRC(
  wizardData: EmploymentData
): EmploymentFinancialData {
  const result: EmploymentFinancialData = {
    employment: {},
  };

  // Pay & Tax (from P60/P45)
  if (wizardData.payReceived !== undefined || wizardData.taxDeducted !== undefined) {
    result.employment.pay = {};

    if (wizardData.payReceived !== undefined) {
      result.employment.pay.taxablePayToDate = wizardData.payReceived; // SA102 Box 1
    }

    if (wizardData.taxDeducted !== undefined) {
      result.employment.pay.totalTaxToDate = wizardData.taxDeducted; // SA102 Box 2
    }

    if (wizardData.tipsReceived !== undefined && wizardData.tipsReceived > 0) {
      result.employment.pay.tipsAndOtherPayments = wizardData.tipsReceived; // SA102 Box 3
    }
  }

  // Student Loan Deductions
  if (wizardData.hasStudentLoan && wizardData.studentLoanDeducted) {
    result.employment.deductions = {
      studentLoans: {},
    };

    const planType = wizardData.studentLoanPlanType;
    const amount = wizardData.studentLoanDeducted;

    switch (planType) {
      case '1':
        result.employment.deductions.studentLoans!.uglDeductionAmount = amount;
        break;
      case '2':
        result.employment.deductions.studentLoans!.pglDeductionAmount = amount;
        break;
      case '4':
        result.employment.deductions.studentLoans!.plan4DeductionAmount = amount;
        break;
      case 'postgrad':
        result.employment.deductions.studentLoans!.postgraduateLoanDeductionAmount = amount;
        break;
    }
  }

  // Benefits in Kind (from P11D)
  if (wizardData.hasP11D) {
    result.employment.benefitsInKind = {};

    if (wizardData.companyCarBenefit !== undefined && wizardData.companyCarBenefit > 0) {
      result.employment.benefitsInKind.car = wizardData.companyCarBenefit; // SA102 Box 9
    }

    if (wizardData.fuelBenefit !== undefined && wizardData.fuelBenefit > 0) {
      result.employment.benefitsInKind.carFuel = wizardData.fuelBenefit; // SA102 Box 10
    }

    if (wizardData.medicalInsuranceBenefit !== undefined && wizardData.medicalInsuranceBenefit > 0) {
      result.employment.benefitsInKind.medicalInsurance = wizardData.medicalInsuranceBenefit; // SA102 Box 11
    }

    if (wizardData.otherBenefits !== undefined && wizardData.otherBenefits > 0) {
      result.employment.benefitsInKind.otherItems = wizardData.otherBenefits; // SA102 Box 12
    }
  }

  return result;
}

/**
 * Map HMRC employment data back to wizard format
 */
export function mapHMRCToEmploymentData(
  hmrcData: EmploymentFinancialData,
  source?: EmploymentSource
): Partial<EmploymentData> {
  const result: Partial<EmploymentData> = {};

  // Basic employer info
  if (source) {
    result.employerName = source.employerName;
    result.employerPAYERef = source.employerRef;
    result.startDate = source.startDate;
    result.endDate = source.cessationDate;
  }

  // Pay & Tax
  if (hmrcData.employment.pay) {
    result.payReceived = hmrcData.employment.pay.taxablePayToDate;
    result.taxDeducted = hmrcData.employment.pay.totalTaxToDate;
    result.tipsReceived = hmrcData.employment.pay.tipsAndOtherPayments;
  }

  // Student Loans
  if (hmrcData.employment.deductions?.studentLoans) {
    const loans = hmrcData.employment.deductions.studentLoans;

    if (loans.uglDeductionAmount) {
      result.hasStudentLoan = true;
      result.studentLoanDeducted = loans.uglDeductionAmount;
      result.studentLoanPlanType = '1';
    } else if (loans.pglDeductionAmount) {
      result.hasStudentLoan = true;
      result.studentLoanDeducted = loans.pglDeductionAmount;
      result.studentLoanPlanType = '2';
    } else if (loans.plan4DeductionAmount) {
      result.hasStudentLoan = true;
      result.studentLoanDeducted = loans.plan4DeductionAmount;
      result.studentLoanPlanType = '4';
    } else if (loans.postgraduateLoanDeductionAmount) {
      result.hasStudentLoan = true;
      result.studentLoanDeducted = loans.postgraduateLoanDeductionAmount;
      result.studentLoanPlanType = 'postgrad';
    }
  }

  // Benefits in Kind
  if (hmrcData.employment.benefitsInKind) {
    const bik = hmrcData.employment.benefitsInKind;
    const hasAnyBenefit =
      bik.car || bik.carFuel || bik.medicalInsurance || bik.otherItems;

    if (hasAnyBenefit) {
      result.hasP11D = true;
      result.companyCarBenefit = bik.car;
      result.fuelBenefit = bik.carFuel;
      result.medicalInsuranceBenefit = bik.medicalInsurance;
      result.otherBenefits = bik.otherItems;
    }
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all employment data for a user
 * Returns list of submitted employment IDs
 */
export async function submitAllEmploymentData(
  userId: string,
  nino: string,
  taxYear: string,
  employmentDataMap: Record<string, EmploymentData>
): Promise<{ submitted: string[]; errors: Array<{ employerId: string; error: string }> }> {
  const submitted: string[] = [];
  const errors: Array<{ employerId: string; error: string }> = [];

  for (const [employerId, data] of Object.entries(employmentDataMap)) {
    try {
      // Skip incomplete entries
      if (!data.employerName || !data.payReceived) {
        continue;
      }

      const hmrcData = mapEmploymentDataToHMRC(data);

      // Note: In a real scenario, we'd need to either:
      // 1. Use an existing employmentId from HMRC's pre-populated data, or
      // 2. Create a new custom employment
      // For now, we'll use the wizard's employer ID as a reference

      await submitEmploymentFinancialData(
        userId,
        nino,
        taxYear,
        employerId,
        hmrcData
      );

      submitted.push(employerId);
    } catch (error) {
      errors.push({
        employerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { submitted, errors };
}
