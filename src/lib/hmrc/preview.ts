// HMRC Submission Preview / Dry Run
// Validates and previews what would be submitted without actually calling HMRC APIs

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
} from '@/types/wizard';
import { mapEmploymentDataToHMRC } from './employment';
import { calculateSelfEmploymentSummary } from './self-employment';
import { calculatePropertySummary } from './property';
import { calculateCISSummary } from './cis';
import { calculateDisposalsSummary } from './capital-gains';

// ============================================================================
// Types
// ============================================================================

export interface PreviewItem {
  name: string;
  status: 'ready' | 'warning' | 'error' | 'skipped';
  summary: string;
  details?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
}

export interface SubmissionPreview {
  isValid: boolean;
  totalIncome: number;
  estimatedTax?: number;
  items: PreviewItem[];
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validateNINO(nino?: string): string[] {
  const errors: string[] = [];
  if (!nino) {
    errors.push('National Insurance Number is required');
  } else {
    const cleanNino = nino.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{6}[A-Z]$/.test(cleanNino)) {
      errors.push('Invalid National Insurance Number format');
    }
  }
  return errors;
}

function validateUTR(utr?: string): string[] {
  const errors: string[] = [];
  if (utr) {
    const cleanUtr = utr.replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleanUtr)) {
      errors.push('Invalid UTR format (should be 10 digits)');
    }
  }
  return errors;
}

// ============================================================================
// Preview Functions
// ============================================================================

/**
 * Preview employment data
 */
function previewEmployment(employmentData?: Record<string, Partial<EmploymentData>>): PreviewItem {
  if (!employmentData || Object.keys(employmentData).length === 0) {
    return {
      name: 'Employment Income (SA102)',
      status: 'skipped',
      summary: 'No employment data provided',
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  let totalPay = 0;
  let totalTax = 0;
  const employments: string[] = [];

  for (const [, emp] of Object.entries(employmentData)) {
    if (emp.employerName) {
      employments.push(emp.employerName);
    }
    totalPay += emp.payReceived || 0;
    totalTax += emp.taxDeducted || 0;

    // Validation
    if (!emp.employerName) {
      warnings.push('An employment is missing employer name');
    }
    if (!emp.payReceived || emp.payReceived <= 0) {
      warnings.push(`${emp.employerName || 'An employment'} has no pay recorded`);
    }
  }

  // Try mapping to HMRC format to catch any issues
  try {
    for (const [, emp] of Object.entries(employmentData)) {
      if (emp.employerName) {
        mapEmploymentDataToHMRC(emp as EmploymentData);
      }
    }
  } catch (e) {
    errors.push(`Data mapping error: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return {
    name: 'Employment Income (SA102)',
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready',
    summary: `${employments.length} employment(s): £${totalPay.toLocaleString()} gross, £${totalTax.toLocaleString()} tax deducted`,
    details: {
      employers: employments,
      payReceived: totalPay,
      taxDeducted: totalTax,
    },
    warnings,
    errors,
  };
}

/**
 * Preview self-employment data
 */
function previewSelfEmployment(
  selfEmploymentData?: Record<string, Partial<SelfEmploymentBusiness>>
): PreviewItem {
  if (!selfEmploymentData || Object.keys(selfEmploymentData).length === 0) {
    return {
      name: 'Self-Employment Income (SA103)',
      status: 'skipped',
      summary: 'No self-employment data provided',
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  const summary = calculateSelfEmploymentSummary(selfEmploymentData);
  const businesses: string[] = [];

  for (const [, biz] of Object.entries(selfEmploymentData)) {
    if (biz.businessName) {
      businesses.push(biz.businessName);
    }

    // Validation
    if (!biz.businessName) {
      warnings.push('A business is missing a name');
    }
    if (!biz.income?.total || biz.income.total <= 0) {
      warnings.push(`${biz.businessName || 'A business'} has no income`);
    }
  }

  return {
    name: 'Self-Employment Income (SA103)',
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready',
    summary: `${businesses.length} business(es): £${summary.totalIncome.toLocaleString()} turnover, £${summary.totalExpenses.toLocaleString()} expenses, £${summary.totalProfit.toLocaleString()} profit`,
    details: {
      businesses,
      ...summary,
    },
    warnings,
    errors,
  };
}

/**
 * Preview rental property data
 */
function previewProperty(rentalData?: Record<string, Partial<RentalProperty>>): PreviewItem {
  if (!rentalData || Object.keys(rentalData).length === 0) {
    return {
      name: 'Rental Income (SA105)',
      status: 'skipped',
      summary: 'No rental property data provided',
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  const summary = calculatePropertySummary(rentalData);
  const properties: string[] = [];

  for (const [, prop] of Object.entries(rentalData)) {
    if (prop.address) {
      properties.push(prop.address);
    }

    // Validation
    if (!prop.address) {
      warnings.push('A property is missing an address');
    }
    if (!prop.income?.total || prop.income.total <= 0) {
      warnings.push(`${prop.address || 'A property'} has no rental income`);
    }
  }

  return {
    name: 'Rental Income (SA105)',
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready',
    summary: `${summary.propertyCount} property(ies): £${summary.totalIncome.toLocaleString()} income, £${summary.totalExpenses.toLocaleString()} expenses, £${summary.totalProfit.toLocaleString()} profit`,
    details: {
      properties,
      ...summary,
    },
    warnings,
    errors,
  };
}

/**
 * Preview dividends data
 */
function previewDividends(dividendsData?: Partial<DividendsData>): PreviewItem {
  if (!dividendsData || dividendsData.ukDividends === undefined) {
    return {
      name: 'Dividends Income',
      status: 'skipped',
      summary: 'No dividends data provided',
    };
  }

  const warnings: string[] = [];
  const total =
    (dividendsData.ukDividends || 0) +
    (dividendsData.foreignDividends || 0) +
    (dividendsData.stockDividends || 0);

  // Dividend allowance warning
  const DIVIDEND_ALLOWANCE = 500; // 2024-25
  if (total > DIVIDEND_ALLOWANCE) {
    warnings.push(
      `Total dividends (£${total.toLocaleString()}) exceed the £${DIVIDEND_ALLOWANCE} allowance - tax may be due`
    );
  }

  return {
    name: 'Dividends Income',
    status: warnings.length > 0 ? 'warning' : 'ready',
    summary: `£${total.toLocaleString()} total dividends`,
    details: {
      ukDividends: dividendsData.ukDividends,
      foreignDividends: dividendsData.foreignDividends,
      stockDividends: dividendsData.stockDividends,
    },
    warnings,
  };
}

/**
 * Preview interest/savings data
 */
function previewInterest(interestData?: Partial<InterestData>): PreviewItem {
  if (!interestData || interestData.untaxedUKInterest === undefined) {
    return {
      name: 'Interest/Savings Income',
      status: 'skipped',
      summary: 'No interest data provided',
    };
  }

  const total =
    (interestData.untaxedUKInterest || 0) +
    (interestData.taxedUKInterest || 0) +
    (interestData.foreignInterest || 0);

  return {
    name: 'Interest/Savings Income',
    status: 'ready',
    summary: `£${total.toLocaleString()} total interest`,
    details: {
      untaxedUKInterest: interestData.untaxedUKInterest,
      taxedUKInterest: interestData.taxedUKInterest,
      foreignInterest: interestData.foreignInterest,
    },
  };
}

/**
 * Preview CIS data
 */
function previewCIS(cisData?: Partial<CISData>): PreviewItem {
  if (!cisData?.contractors || cisData.contractors.length === 0) {
    return {
      name: 'CIS Deductions',
      status: 'skipped',
      summary: 'No CIS data provided',
    };
  }

  const summary = calculateCISSummary(cisData as CISData);

  return {
    name: 'CIS Deductions',
    status: 'ready',
    summary: `${cisData.contractors.length} contractor(s): £${summary.totalCISDeducted.toLocaleString()} deductions to reclaim`,
    details: summary,
  };
}

/**
 * Preview state benefits data
 */
function previewStateBenefits(stateBenefitsData?: Partial<StateBenefitsData>): PreviewItem {
  if (!stateBenefitsData || stateBenefitsData.totalTaxableBenefits === undefined) {
    return {
      name: 'State Benefits',
      status: 'skipped',
      summary: 'No state benefits data provided',
    };
  }

  return {
    name: 'State Benefits',
    status: 'ready',
    summary: `£${(stateBenefitsData.totalTaxableBenefits || 0).toLocaleString()} taxable benefits`,
    details: {
      jobseekersAllowance: stateBenefitsData.jobseekersAllowance,
      employmentSupportAllowance: stateBenefitsData.employmentSupportAllowance,
      carersAllowance: stateBenefitsData.carersAllowance,
      totalTaxableBenefits: stateBenefitsData.totalTaxableBenefits,
    },
  };
}

/**
 * Preview pension income data
 */
function previewPensionIncome(pensionIncomeData?: Partial<PensionIncomeData>): PreviewItem {
  if (!pensionIncomeData || !pensionIncomeData.privatePensions || pensionIncomeData.privatePensions.length === 0) {
    return {
      name: 'Pension Income',
      status: 'skipped',
      summary: 'No pension income data provided',
    };
  }

  // Sum up private pensions
  const privatePensionTotal = pensionIncomeData.privatePensions.reduce(
    (sum, p) => sum + (p.grossAmount || 0),
    0
  );

  // Sum up foreign pensions if any
  const foreignPensionTotal = pensionIncomeData.foreignPensions?.reduce(
    (sum, p) => sum + (p.pensionAmount || 0),
    0
  ) || 0;

  const total = privatePensionTotal + foreignPensionTotal + (pensionIncomeData.statePension || 0);

  return {
    name: 'Pension Income',
    status: 'ready',
    summary: `£${total.toLocaleString()} pension income`,
    details: {
      privatePensionCount: pensionIncomeData.privatePensions.length,
      privatePensionTotal,
      foreignPensionTotal,
      statePension: pensionIncomeData.statePension,
    },
  };
}

/**
 * Preview capital gains data
 */
function previewCapitalGains(capitalGainsData?: Partial<CapitalGainsData>): PreviewItem {
  if (!capitalGainsData?.disposals || capitalGainsData.disposals.length === 0) {
    return {
      name: 'Capital Gains (SA108)',
      status: 'skipped',
      summary: 'No capital gains data provided',
    };
  }

  const warnings: string[] = [];
  const summary = calculateDisposalsSummary(capitalGainsData.disposals);

  // CGT allowance warning
  const CGT_ALLOWANCE = 3000; // 2024-25
  if (summary.totalGains > CGT_ALLOWANCE) {
    warnings.push(
      `Total gains (£${summary.totalGains.toLocaleString()}) exceed the £${CGT_ALLOWANCE} annual exempt amount - CGT may be due`
    );
  }

  return {
    name: 'Capital Gains (SA108)',
    status: warnings.length > 0 ? 'warning' : 'ready',
    summary: `${capitalGainsData.disposals.length} disposal(s): £${summary.totalGains.toLocaleString()} total gains`,
    details: summary,
    warnings,
  };
}

// ============================================================================
// Main Preview Function
// ============================================================================

/**
 * Generate a complete preview of what would be submitted to HMRC
 */
export function generateSubmissionPreview(wizardData: Partial<WizardData>): SubmissionPreview {
  const items: PreviewItem[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate personal info
  const ninoErrors = validateNINO(wizardData.personalInfo?.nino);
  const utrErrors = validateUTR(wizardData.personalInfo?.utr);
  errors.push(...ninoErrors, ...utrErrors);

  // Preview each income type
  items.push(
    previewEmployment(wizardData.employmentData as Record<string, Partial<EmploymentData>>)
  );
  items.push(
    previewSelfEmployment(
      wizardData.selfEmploymentData as Record<string, Partial<SelfEmploymentBusiness>>
    )
  );
  items.push(previewProperty(wizardData.rentalData as Record<string, Partial<RentalProperty>>));
  items.push(previewDividends(wizardData.dividendsData as Partial<DividendsData>));
  items.push(previewInterest(wizardData.interestData as Partial<InterestData>));
  items.push(previewCIS(wizardData.cisData as Partial<CISData>));
  items.push(previewStateBenefits(wizardData.stateBenefitsData as Partial<StateBenefitsData>));
  items.push(previewPensionIncome(wizardData.pensionIncomeData as Partial<PensionIncomeData>));
  items.push(previewCapitalGains(wizardData.capitalGainsData as Partial<CapitalGainsData>));

  // Collect all warnings and errors from items
  for (const item of items) {
    if (item.warnings) {
      warnings.push(...item.warnings.map((w) => `${item.name}: ${w}`));
    }
    if (item.errors) {
      errors.push(...item.errors.map((e) => `${item.name}: ${e}`));
    }
  }

  // Calculate total income
  let totalIncome = 0;
  for (const item of items) {
    if (item.status !== 'skipped' && item.details) {
      // Add up various income types
      if ('payReceived' in item.details) totalIncome += (item.details.payReceived as number) || 0;
      if ('totalIncome' in item.details) totalIncome += (item.details.totalIncome as number) || 0;
      if ('ukDividends' in item.details) {
        totalIncome +=
          ((item.details.ukDividends as number) || 0) +
          ((item.details.foreignDividends as number) || 0);
      }
      if ('untaxedUKInterest' in item.details) {
        totalIncome +=
          ((item.details.untaxedUKInterest as number) || 0) +
          ((item.details.taxedUKInterest as number) || 0);
      }
      if ('totalTaxableBenefits' in item.details)
        totalIncome += (item.details.totalTaxableBenefits as number) || 0;
      if ('privatePensions' in item.details)
        totalIncome += (item.details.privatePensions as number) || 0;
    }
  }

  // Check if at least one income type has data
  const hasData = items.some((item) => item.status !== 'skipped');
  if (!hasData) {
    warnings.push('No income data provided - nothing will be submitted');
  }

  const isValid = errors.length === 0 && hasData;

  return {
    isValid,
    totalIncome,
    items,
    warnings,
    errors,
  };
}
