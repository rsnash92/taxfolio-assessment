// HMRC Submission Orchestrator
// Coordinates the submission of all wizard data to HMRC APIs
// Handles the complete submission flow including calculation and final declaration

import { hmrcClient } from './client';
import { submitAllEmploymentData, mapEmploymentDataToHMRC } from './employment';
import { submitAllSelfEmploymentData, calculateSelfEmploymentSummary } from './self-employment';
import { submitAllPropertyData, calculatePropertySummary } from './property';
import { submitAllDividendsData } from './dividends';
import { submitAllInterestData } from './savings';
import { submitAllCISData, calculateCISSummary } from './cis';
import { submitAllStateBenefitsData } from './state-benefits';
import { submitAllPensionIncomeData } from './pensions';
import { submitAllCapitalGainsData, calculateDisposalsSummary } from './capital-gains';
import { submitAllReliefsData } from './reliefs';
import { TaxCalculationResult, CalculationType } from './types';
import { createSubmissionLogger, SubmissionLogger } from './submission-logger';
import {
  WizardData,
  EmploymentData,
  SelfEmploymentBusiness,
  RentalProperty,
  DividendsData,
  InterestData,
  CISData,
  StateBenefitsData,
  PensionIncomeData,
  CapitalGainsData,
  GeneralData,
} from '@/types/wizard';

const CALCULATIONS_API_BASE = '/individuals/calculations/self-assessment';

// ============================================================================
// Tax Calculation API Functions
// ============================================================================

/**
 * Trigger a tax calculation
 */
export async function triggerCalculation(
  userId: string,
  nino: string,
  taxYear: string,
  calculationType: CalculationType = 'final-declaration'
): Promise<{ calculationId: string }> {
  return hmrcClient.post(
    userId,
    `${CALCULATIONS_API_BASE}/${nino}/${taxYear}/${calculationType}`,
    {}
  );
}

/**
 * Retrieve a tax calculation
 */
export async function retrieveCalculation(
  userId: string,
  nino: string,
  taxYear: string,
  calculationId: string
): Promise<TaxCalculationResult> {
  return hmrcClient.get(
    userId,
    `${CALCULATIONS_API_BASE}/${nino}/self-assessment/${taxYear}/${calculationId}`
  );
}

/**
 * Submit final declaration
 */
export async function submitFinalDeclaration(
  userId: string,
  nino: string,
  taxYear: string,
  calculationId: string
): Promise<void> {
  await hmrcClient.post(
    userId,
    `${CALCULATIONS_API_BASE}/${nino}/self-assessment/${taxYear}/${calculationId}/final-declaration`,
    {}
  );
}

// ============================================================================
// Submission Status Types
// ============================================================================

export interface SubmissionStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error';
  message?: string;
  data?: unknown;
}

export interface SubmissionResult {
  success: boolean;
  submissionId: string;
  steps: SubmissionStep[];
  calculationId?: string;
  calculation?: TaxCalculationResult;
  hmrcReferenceNumber?: string;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Submission Orchestrator
// ============================================================================

/**
 * Submit all wizard data to HMRC
 * This is the main entry point for the complete submission flow
 */
export async function submitSelfAssessment(
  userId: string,
  nino: string,
  taxYear: string,
  wizardData: WizardData,
  options: {
    skipCalculation?: boolean;
    skipFinalDeclaration?: boolean;
  } = {}
): Promise<SubmissionResult> {
  // Create logger for this submission
  const logger = createSubmissionLogger(userId, taxYear);

  const result: SubmissionResult = {
    success: false,
    submissionId: logger.submissionId,
    steps: [],
    errors: [],
    warnings: [],
  };

  const addStep = async (
    name: string,
    status: SubmissionStep['status'],
    message?: string,
    data?: unknown
  ) => {
    result.steps.push({ name, status, message, data });

    // Log to database (async, don't await to avoid blocking)
    if (status === 'skipped') {
      logger.skipStep(name, message || 'Skipped').catch(console.error);
    }
  };

  // Helper to execute and log a step
  const executeStep = async <T>(
    stepName: string,
    fn: () => Promise<T>
  ): Promise<{ success: true; data: T } | { success: false; error: Error }> => {
    const { stepNumber, startTime } = await logger.startStep(stepName);
    try {
      const data = await fn();
      await logger.completeStep(stepName, stepNumber, startTime, 200, data);
      return { success: true, data };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await logger.errorStep(stepName, stepNumber, startTime, err);
      return { success: false, error: err };
    }
  };

  try {
    // =========================================================================
    // Step 1: Submit Employment Income (SA102)
    // =========================================================================
    if (wizardData.employmentData && Object.keys(wizardData.employmentData).length > 0) {
      const stepResult = await executeStep('Employment Income', () =>
        submitAllEmploymentData(
          userId,
          nino,
          taxYear,
          wizardData.employmentData as Record<string, EmploymentData>
        )
      );
      if (stepResult.success) {
        const employmentResult = stepResult.data;
        if (employmentResult.errors.length > 0) {
          result.warnings.push(
            ...employmentResult.errors.map((e) => `Employment (${e.employerId}): ${e.error}`)
          );
        }
        result.steps.push({
          name: 'Employment Income',
          status: 'completed',
          message: `${employmentResult.submitted.length} employers submitted`,
        });
      } else {
        result.steps.push({
          name: 'Employment Income',
          status: 'error',
          message: stepResult.error.message,
        });
        result.errors.push(`Employment: ${stepResult.error.message}`);
      }
    } else {
      await addStep('Employment Income', 'skipped', 'No employment data');
    }

    // =========================================================================
    // Step 2: Submit Self-Employment Income (SA103)
    // =========================================================================
    if (wizardData.selfEmploymentData && Object.keys(wizardData.selfEmploymentData).length > 0) {
      addStep('Self-Employment Income', 'in_progress');
      try {
        const selfEmploymentResult = await submitAllSelfEmploymentData(
          userId,
          nino,
          taxYear,
          wizardData.selfEmploymentData as Record<string, Partial<SelfEmploymentBusiness>>
        );
        if (selfEmploymentResult.errors.length > 0) {
          result.warnings.push(
            ...selfEmploymentResult.errors.map((e) => `Self-Employment (${e.businessName}): ${e.error}`)
          );
        }
        const summary = calculateSelfEmploymentSummary(
          wizardData.selfEmploymentData as Record<string, Partial<SelfEmploymentBusiness>>
        );
        addStep(
          'Self-Employment Income',
          selfEmploymentResult.submitted.length > 0 ? 'completed' : 'error',
          `${selfEmploymentResult.submitted.length} business(es), £${summary.totalProfit.toFixed(2)} profit`,
          summary
        );
      } catch (error) {
        addStep('Self-Employment Income', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Self-Employment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Self-Employment Income', 'skipped', 'No self-employment data');
    }

    // =========================================================================
    // Step 3: Submit Rental Income (SA105)
    // =========================================================================
    if (wizardData.rentalData && Object.keys(wizardData.rentalData).length > 0) {
      addStep('Rental Income', 'in_progress');
      try {
        const propertyResult = await submitAllPropertyData(
          userId,
          nino,
          taxYear,
          wizardData.rentalData as Record<string, Partial<RentalProperty>>
        );
        if (propertyResult.errors.length > 0) {
          result.warnings.push(
            ...propertyResult.errors.map((e) => `Property (${e.address}): ${e.error}`)
          );
        }
        const summary = calculatePropertySummary(
          wizardData.rentalData as Record<string, Partial<RentalProperty>>
        );
        addStep(
          'Rental Income',
          propertyResult.submitted.length > 0 ? 'completed' : 'error',
          `${propertyResult.submitted.length} property(ies), £${summary.totalProfit.toFixed(2)} profit`,
          summary
        );
      } catch (error) {
        addStep('Rental Income', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Rental Income: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Rental Income', 'skipped', 'No rental data');
    }

    // =========================================================================
    // Step 4: Submit Dividends Income
    // =========================================================================
    if (wizardData.dividendsData && wizardData.dividendsData.ukDividends !== undefined) {
      addStep('Dividends Income', 'in_progress');
      try {
        const dividendsResult = await submitAllDividendsData(
          userId,
          nino,
          taxYear,
          wizardData.dividendsData as DividendsData
        );
        if (dividendsResult.errors.length > 0) {
          result.warnings.push(...dividendsResult.errors.map((e) => `Dividends: ${e}`));
        }
        const submitted = [
          dividendsResult.ukSubmitted && 'UK',
          dividendsResult.foreignSubmitted && 'Foreign',
          dividendsResult.otherSubmitted && 'Other',
        ].filter(Boolean);
        addStep('Dividends Income', 'completed', submitted.length > 0 ? submitted.join(', ') : 'No data');
      } catch (error) {
        addStep('Dividends Income', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Dividends: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Dividends Income', 'skipped', 'No dividends data');
    }

    // =========================================================================
    // Step 5: Submit Interest/Savings Income
    // =========================================================================
    if (wizardData.interestData && wizardData.interestData.untaxedUKInterest !== undefined) {
      addStep('Interest Income', 'in_progress');
      try {
        const interestResult = await submitAllInterestData(
          userId,
          nino,
          taxYear,
          wizardData.interestData as InterestData
        );
        if (interestResult.errors.length > 0) {
          result.warnings.push(...interestResult.errors.map((e) => `Interest: ${e}`));
        }
        addStep('Interest Income', 'completed');
      } catch (error) {
        addStep('Interest Income', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Interest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Interest Income', 'skipped', 'No interest data');
    }

    // =========================================================================
    // Step 6: Submit CIS Deductions
    // =========================================================================
    if (wizardData.cisData && wizardData.cisData.contractors && wizardData.cisData.contractors.length > 0) {
      addStep('CIS Deductions', 'in_progress');
      try {
        const cisDataTyped = wizardData.cisData as CISData;
        const cisResult = await submitAllCISData(
          userId,
          nino,
          taxYear,
          cisDataTyped
        );
        if (cisResult.errors.length > 0) {
          result.warnings.push(
            ...cisResult.errors.map((e) => `CIS (${e.contractor}): ${e.error}`)
          );
        }
        const summary = calculateCISSummary(cisDataTyped);
        addStep('CIS Deductions', 'completed', `£${summary.totalCISDeducted.toFixed(2)} deductions`, summary);
      } catch (error) {
        addStep('CIS Deductions', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`CIS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('CIS Deductions', 'skipped', 'No CIS data');
    }

    // =========================================================================
    // Step 7: Submit State Benefits
    // =========================================================================
    if (wizardData.stateBenefitsData && wizardData.stateBenefitsData.totalTaxableBenefits !== undefined) {
      addStep('State Benefits', 'in_progress');
      try {
        const benefitsResult = await submitAllStateBenefitsData(
          userId,
          nino,
          taxYear,
          wizardData.stateBenefitsData as StateBenefitsData
        );
        if (benefitsResult.error) {
          result.warnings.push(`State Benefits: ${benefitsResult.error}`);
        }
        addStep('State Benefits', benefitsResult.submitted ? 'completed' : 'skipped');
      } catch (error) {
        addStep('State Benefits', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`State Benefits: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('State Benefits', 'skipped', 'No state benefits data');
    }

    // =========================================================================
    // Step 8: Submit Pension Income
    // =========================================================================
    if (wizardData.pensionIncomeData && wizardData.pensionIncomeData.privatePensions !== undefined) {
      addStep('Pension Income', 'in_progress');
      try {
        const pensionResult = await submitAllPensionIncomeData(
          userId,
          nino,
          taxYear,
          wizardData.pensionIncomeData as PensionIncomeData
        );
        if (pensionResult.error) {
          result.warnings.push(`Pension Income: ${pensionResult.error}`);
        }
        addStep('Pension Income', pensionResult.submitted ? 'completed' : 'skipped');
      } catch (error) {
        addStep('Pension Income', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Pension Income: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Pension Income', 'skipped', 'No pension income data');
    }

    // =========================================================================
    // Step 9: Submit Capital Gains (SA108)
    // =========================================================================
    if (wizardData.capitalGainsData && wizardData.capitalGainsData.disposals && wizardData.capitalGainsData.disposals.length > 0) {
      addStep('Capital Gains', 'in_progress');
      try {
        const cgtResult = await submitAllCapitalGainsData(
          userId,
          nino,
          taxYear,
          wizardData.capitalGainsData as CapitalGainsData
        );
        if (cgtResult.error) {
          result.warnings.push(`Capital Gains: ${cgtResult.error}`);
        }
        const summary = calculateDisposalsSummary(wizardData.capitalGainsData.disposals);
        addStep('Capital Gains', cgtResult.submitted ? 'completed' : 'skipped',
          `${summary.numberOfDisposals} disposals`, summary);
      } catch (error) {
        addStep('Capital Gains', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Capital Gains: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Capital Gains', 'skipped', 'No capital gains data');
    }

    // =========================================================================
    // Step 10: Submit Reliefs & Allowances
    // =========================================================================
    if (wizardData.general && wizardData.general.selectedReliefs !== undefined) {
      addStep('Reliefs & Allowances', 'in_progress');
      try {
        const reliefsResult = await submitAllReliefsData(
          userId,
          nino,
          taxYear,
          wizardData.general as GeneralData
        );
        if (reliefsResult.errors.length > 0) {
          result.warnings.push(...reliefsResult.errors);
        }
        const submitted = [
          reliefsResult.pensionReliefsSubmitted && 'Pension',
          reliefsResult.investmentReliefsSubmitted && 'Investment',
          reliefsResult.marriageAllowanceSubmitted && 'Marriage Allowance',
        ].filter(Boolean);
        addStep('Reliefs & Allowances', submitted.length > 0 ? 'completed' : 'skipped',
          submitted.length > 0 ? submitted.join(', ') : 'No reliefs data');
      } catch (error) {
        addStep('Reliefs & Allowances', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Reliefs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Reliefs & Allowances', 'skipped', 'No reliefs data');
    }

    // =========================================================================
    // Step 11: Trigger Tax Calculation
    // =========================================================================
    if (!options.skipCalculation) {
      addStep('Tax Calculation', 'in_progress');
      try {
        const { calculationId } = await triggerCalculation(
          userId,
          nino,
          taxYear,
          options.skipFinalDeclaration ? 'in-year' : 'final-declaration'
        );
        result.calculationId = calculationId;

        // Retrieve the calculation
        const calculation = await retrieveCalculation(userId, nino, taxYear, calculationId);
        result.calculation = calculation;

        // Check for calculation errors
        if (calculation.messages) {
          for (const msg of calculation.messages) {
            if (msg.type === 'error') {
              result.errors.push(`Calculation: ${msg.text}`);
            } else if (msg.type === 'warning') {
              result.warnings.push(`Calculation: ${msg.text}`);
            }
          }
        }

        addStep('Tax Calculation', 'completed', `Tax due: £${calculation.calculation?.taxDue?.toFixed(2) || '0.00'}`, {
          calculationId,
          taxDue: calculation.calculation?.taxDue,
          totalIncome: calculation.calculation?.totalIncomeReceived,
        });
      } catch (error) {
        addStep('Tax Calculation', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      addStep('Tax Calculation', 'skipped', 'Calculation skipped');
    }

    // =========================================================================
    // Step 12: Submit Final Declaration
    // =========================================================================
    if (!options.skipFinalDeclaration && result.calculationId) {
      addStep('Final Declaration', 'in_progress');
      try {
        await submitFinalDeclaration(userId, nino, taxYear, result.calculationId);

        // Generate reference number
        result.hmrcReferenceNumber = `TF${Date.now().toString().slice(-10)}`;

        addStep('Final Declaration', 'completed', `Reference: ${result.hmrcReferenceNumber}`);
        result.success = true;
      } catch (error) {
        addStep('Final Declaration', 'error', error instanceof Error ? error.message : 'Unknown error');
        result.errors.push(`Final Declaration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (options.skipFinalDeclaration) {
      addStep('Final Declaration', 'skipped', 'Declaration skipped (preview mode)');
      result.success = true; // Still mark as success if just previewing
    }

    return result;
  } catch (error) {
    result.errors.push(`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sections: {
    name: string;
    isComplete: boolean;
    message?: string;
  }[];
}

/**
 * Validate wizard data before submission
 */
export function validateForSubmission(wizardData: WizardData): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    sections: [],
  };

  // Check for income sources
  if (!wizardData.incomeSources || wizardData.incomeSources.length === 0) {
    result.errors.push('No income sources selected');
    result.isValid = false;
  }

  // Validate each section based on selected income sources
  const hasEmployment = wizardData.incomeSources?.some((s) => s.type === 'employment');
  if (hasEmployment) {
    const employmentComplete =
      wizardData.employmentData &&
      Object.values(wizardData.employmentData).some((e) => e.employerName && e.payReceived);
    result.sections.push({
      name: 'Employment',
      isComplete: !!employmentComplete,
      message: employmentComplete ? undefined : 'Missing employer details',
    });
    if (!employmentComplete) {
      result.warnings.push('Employment section incomplete');
    }
  }

  const hasSelfEmployment = wizardData.incomeSources?.some((s) => s.type === 'self-employment');
  if (hasSelfEmployment) {
    const selfEmploymentComplete = wizardData.selfEmploymentData && Object.keys(wizardData.selfEmploymentData).length > 0;
    result.sections.push({
      name: 'Self Employment',
      isComplete: !!selfEmploymentComplete,
    });
  }

  const hasRental = wizardData.incomeSources?.some((s) => s.type === 'rental');
  if (hasRental) {
    const rentalComplete = wizardData.rentalData && Object.keys(wizardData.rentalData).length > 0;
    result.sections.push({
      name: 'Rental Income',
      isComplete: !!rentalComplete,
    });
  }

  const hasDividends = wizardData.incomeSources?.some((s) => s.type === 'dividends');
  if (hasDividends) {
    const dividendsComplete =
      wizardData.dividendsData &&
      (wizardData.dividendsData.ukDividends || wizardData.dividendsData.foreignDividends);
    result.sections.push({
      name: 'Dividends',
      isComplete: !!dividendsComplete,
    });
  }

  const hasInterest = wizardData.incomeSources?.some((s) => s.type === 'interest');
  if (hasInterest) {
    const interestComplete =
      wizardData.interestData &&
      (wizardData.interestData.untaxedUKInterest || wizardData.interestData.taxedUKInterest);
    result.sections.push({
      name: 'Interest',
      isComplete: !!interestComplete,
    });
  }

  const hasCIS = wizardData.incomeSources?.some((s) => s.type === 'cis');
  if (hasCIS) {
    const cisComplete =
      wizardData.cisData?.contractors && wizardData.cisData.contractors.length > 0;
    result.sections.push({
      name: 'CIS',
      isComplete: !!cisComplete,
    });
  }

  const hasCapitalGains = wizardData.incomeSources?.some((s) => s.type === 'capital-gains');
  if (hasCapitalGains) {
    const cgtComplete =
      wizardData.capitalGainsData?.disposals && wizardData.capitalGainsData.disposals.length > 0;
    result.sections.push({
      name: 'Capital Gains',
      isComplete: !!cgtComplete,
    });
  }

  return result;
}
