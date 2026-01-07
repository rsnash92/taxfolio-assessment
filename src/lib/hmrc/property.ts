// HMRC Property Income Submission Handler (SA105)
// Handles submission of UK rental property income and expenses

import { hmrcClient } from './client';
import { RentalProperty } from '@/types/wizard';

// MTD ITSA UK Property Business API base
const PROPERTY_API_BASE = '/individuals/business/property/uk';

// ============================================================================
// Types
// ============================================================================

interface BusinessDetails {
  businessId: string;
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  tradingName?: string;
  accountingPeriods?: { start: string; end: string }[];
}

interface ListBusinessesResponse {
  listOfBusinesses: BusinessDetails[];
}

interface UKPropertyPeriodIncome {
  premisesRunningCosts?: number;
  repairsAndMaintenance?: number;
  financialCosts?: number;
  professionalFees?: number;
  costOfServices?: number;
  other?: number;
  consolidatedExpenses?: number;
  residentialFinancialCost?: number;
  residentialFinancialCostsCarriedForward?: number;
  travelCosts?: number;
  ukOtherPropertyIncome?: number;
  ukRentARoom?: number;
  rarJointLettingAmount?: number;
  premiumsOfLeaseGrant?: number;
  reversePremiums?: number;
  periodAmount?: number;
  taxDeducted?: number;
  ukOtherProperty?: {
    income?: {
      premiumsOfLeaseGrant?: number;
      reversePremiums?: number;
      periodAmount?: number;
      taxDeducted?: number;
      otherIncome?: number;
      rentARoom?: {
        amountClaimed?: number;
      };
    };
    expenses?: {
      premisesRunningCosts?: number;
      repairsAndMaintenance?: number;
      financialCosts?: number;
      professionalFees?: number;
      costOfServices?: number;
      other?: number;
      consolidatedExpenses?: number;
      residentialFinancialCost?: number;
      residentialFinancialCostsCarriedForward?: number;
      travelCosts?: number;
    };
  };
}

interface UKPropertyPeriodSubmission {
  fromDate: string;
  toDate: string;
  ukOtherProperty?: {
    income?: {
      premiumsOfLeaseGrant?: number;
      reversePremiums?: number;
      periodAmount?: number;
      taxDeducted?: number;
      otherIncome?: number;
      rentARoom?: {
        amountClaimed?: number;
      };
    };
    expenses?: {
      premisesRunningCosts?: number;
      repairsAndMaintenance?: number;
      financialCosts?: number;
      professionalFees?: number;
      costOfServices?: number;
      other?: number;
      consolidatedExpenses?: number;
      residentialFinancialCost?: number;
      residentialFinancialCostsCarriedForward?: number;
      travelCosts?: number;
    };
  };
}

interface UKPropertyAnnualSummary {
  ukOtherProperty?: {
    adjustments?: {
      privateUseAdjustment?: number;
      balancingCharge?: number;
      periodOfGraceAdjustment?: boolean;
      businessPremisesRenovationAllowanceBalancingCharges?: number;
      nonResidentLandlord?: boolean;
      rentARoom?: {
        jointlyLet?: boolean;
      };
    };
    allowances?: {
      annualInvestmentAllowance?: number;
      zeroEmissionsGoodsVehicleAllowance?: number;
      businessPremisesRenovationAllowance?: number;
      otherCapitalAllowance?: number;
      costOfReplacingDomesticGoods?: number;
      propertyIncomeAllowance?: number;
      electricChargePointAllowance?: number;
      structuredBuildingAllowance?: number;
      zeroEmissionsCarAllowance?: number;
    };
  };
}

export interface PropertySubmissionResult {
  submitted: { propertyId: string; address: string }[];
  errors: { propertyId: string; address: string; error: string }[];
}

// ============================================================================
// Business Management Functions
// ============================================================================

/**
 * List all businesses for a user (MTD ITSA Business Details API)
 */
async function listAllBusinesses(
  userId: string,
  nino: string
): Promise<ListBusinessesResponse> {
  return hmrcClient.get(
    userId,
    `/individuals/business/details/${nino}/list`,
    { govTestScenario: 'STATEFUL' }
  );
}

/**
 * Get UK property business for a user
 */
export async function getPropertyBusiness(
  userId: string,
  nino: string
): Promise<{ businessId?: string }> {
  try {
    const response = await listAllBusinesses(userId, nino);
    const propertyBusiness = response.listOfBusinesses?.find(
      (b) => b.typeOfBusiness === 'uk-property'
    );
    return { businessId: propertyBusiness?.businessId };
  } catch {
    return {};
  }
}

/**
 * Create UK property business
 */
export async function createPropertyBusiness(
  userId: string,
  nino: string,
  taxYear: string
): Promise<{ businessId: string }> {
  const [startYear] = taxYear.split('-').map(Number);

  return hmrcClient.post(
    userId,
    `${PROPERTY_API_BASE}/${nino}`,
    {
      accountingPeriodStartDate: `${startYear}-04-06`,
      accountingPeriodEndDate: `${startYear + 1}-04-05`,
    },
    { govTestScenario: 'STATEFUL' }
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map wizard expense categories to HMRC expense fields
 */
function mapPropertyExpensesToHMRC(
  byCategory: Record<string, number>,
  mortgageInterest?: number,
  otherFinanceCosts?: number
): UKPropertyPeriodSubmission['ukOtherProperty'] {
  // Calculate total financial costs (Section 24 restricted)
  const financialCosts = (mortgageInterest || 0) + (otherFinanceCosts || 0);

  return {
    expenses: {
      premisesRunningCosts: byCategory['utilities'] || byCategory['council-tax'] || undefined,
      repairsAndMaintenance: byCategory['repairs'] || byCategory['maintenance'] || undefined,
      financialCosts: financialCosts > 0 ? financialCosts : undefined,
      professionalFees: byCategory['professional-fees'] || byCategory['accountancy'] || undefined,
      costOfServices: byCategory['services'] || byCategory['cleaning'] || undefined,
      travelCosts: byCategory['travel'] || undefined,
      other: byCategory['other'] || undefined,
      // For residential property, finance costs go here (Section 24)
      residentialFinancialCost: financialCosts > 0 ? financialCosts : undefined,
    },
  };
}

/**
 * Aggregate all properties into a single submission
 * HMRC expects one period submission per property business, not per property
 */
function aggregatePropertyData(
  rentalData: Record<string, Partial<RentalProperty>>
): {
  totalIncome: number;
  totalExpenses: number;
  totalFinanceCosts: number;
  expenses: UKPropertyPeriodSubmission['ukOtherProperty'];
} {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFinanceCosts = 0;

  // Aggregate expense categories
  const aggregatedExpenses: Record<string, number> = {};

  for (const property of Object.values(rentalData)) {
    // Sum income
    totalIncome += property.income?.total || 0;
    totalExpenses += property.expenses?.total || 0;

    // Sum finance costs
    totalFinanceCosts += (property.mortgageInterest || 0) + (property.otherFinanceCosts || 0);

    // Aggregate by category
    if (property.expenses?.byCategory) {
      for (const [category, amount] of Object.entries(property.expenses.byCategory)) {
        aggregatedExpenses[category] = (aggregatedExpenses[category] || 0) + amount;
      }
    }
  }

  return {
    totalIncome,
    totalExpenses,
    totalFinanceCosts,
    expenses: mapPropertyExpensesToHMRC(aggregatedExpenses, totalFinanceCosts, 0),
  };
}

// ============================================================================
// Submission Functions
// ============================================================================

/**
 * Submit UK property period data
 */
export async function submitPropertyPeriod(
  userId: string,
  nino: string,
  businessId: string,
  taxYear: string,
  rentalData: Record<string, Partial<RentalProperty>>
): Promise<{ periodId?: string }> {
  const [startYear] = taxYear.split('-').map(Number);

  // Aggregate all properties
  const { totalIncome, expenses, totalFinanceCosts } = aggregatePropertyData(rentalData);

  const periodSubmission: UKPropertyPeriodSubmission = {
    fromDate: `${startYear}-04-06`,
    toDate: `${startYear + 1}-04-05`,
    ukOtherProperty: {
      income: {
        periodAmount: totalIncome,
      },
      expenses: expenses?.expenses,
    },
  };

  // If residential, add finance cost restriction
  if (totalFinanceCosts > 0 && periodSubmission.ukOtherProperty?.expenses) {
    periodSubmission.ukOtherProperty.expenses.residentialFinancialCost = totalFinanceCosts;
  }

  return hmrcClient.post(
    userId,
    `${PROPERTY_API_BASE}/${nino}/${businessId}/period/${taxYear}`,
    periodSubmission,
    { govTestScenario: 'STATEFUL' }
  );
}

/**
 * Submit UK property annual summary
 */
export async function submitPropertyAnnualSummary(
  userId: string,
  nino: string,
  businessId: string,
  taxYear: string,
  _rentalData: Record<string, Partial<RentalProperty>>
): Promise<void> {
  // For now, we don't have capital allowances in the wizard for property
  // This is here for future expansion
  const summary: UKPropertyAnnualSummary = {
    ukOtherProperty: {
      allowances: {
        // Property income allowance (£1,000) - only if income < £1,000
        // propertyIncomeAllowance: 1000,
      },
    },
  };

  // Only submit if we have meaningful data
  const hasData =
    summary.ukOtherProperty?.adjustments ||
    (summary.ukOtherProperty?.allowances &&
      Object.values(summary.ukOtherProperty.allowances).some((v) => v !== undefined));

  if (hasData) {
    await hmrcClient.put(
      userId,
      `${PROPERTY_API_BASE}/${nino}/${businessId}/annual/${taxYear}`,
      summary
    );
  }
}

// ============================================================================
// Main Submission Function
// ============================================================================

/**
 * Submit all rental property data
 */
export async function submitAllPropertyData(
  userId: string,
  nino: string,
  taxYear: string,
  rentalData: Record<string, Partial<RentalProperty>>
): Promise<PropertySubmissionResult> {
  const result: PropertySubmissionResult = {
    submitted: [],
    errors: [],
  };

  // Check if there's any rental data
  const properties = Object.entries(rentalData).filter(
    ([, prop]) => prop.address || prop.income?.total
  );

  if (properties.length === 0) {
    return result;
  }

  try {
    // Get or create property business
    let { businessId } = await getPropertyBusiness(userId, nino);

    if (!businessId) {
      const createResult = await createPropertyBusiness(userId, nino, taxYear);
      businessId = createResult.businessId;
    }

    // Submit aggregated period data
    await submitPropertyPeriod(userId, nino, businessId, taxYear, rentalData);

    // Submit annual summary
    await submitPropertyAnnualSummary(userId, nino, businessId, taxYear, rentalData);

    // Mark all properties as submitted
    for (const [propertyId, property] of properties) {
      result.submitted.push({
        propertyId,
        address: property.address || 'Unknown address',
      });
    }
  } catch (error) {
    // If submission fails, mark all properties as errored
    for (const [propertyId, property] of properties) {
      result.errors.push({
        propertyId,
        address: property.address || 'Unknown address',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Calculate summary of rental property data for display
 */
export function calculatePropertySummary(
  rentalData: Record<string, Partial<RentalProperty>>
): {
  totalIncome: number;
  totalExpenses: number;
  totalFinanceCosts: number;
  totalProfit: number;
  propertyCount: number;
} {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalFinanceCosts = 0;
  let totalProfit = 0;
  let propertyCount = 0;

  for (const property of Object.values(rentalData)) {
    if (property.address || property.income?.total) {
      propertyCount++;
      totalIncome += property.income?.total || 0;
      totalExpenses += property.expenses?.total || 0;
      totalFinanceCosts += (property.mortgageInterest || 0) + (property.otherFinanceCosts || 0);
      totalProfit += property.profit || 0;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    totalFinanceCosts,
    totalProfit,
    propertyCount,
  };
}
