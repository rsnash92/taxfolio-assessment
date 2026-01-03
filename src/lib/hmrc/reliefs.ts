// HMRC Reliefs API Mapper
// Maps wizard reliefs data to HMRC Individuals Reliefs API
// API: https://api.service.hmrc.gov.uk/individuals/reliefs
// Maps to: SA100 + SA101

import { hmrcClient } from './client';
import {
  PensionReliefs,
  InvestmentReliefs,
  MarriageAllowance,
  GiftAidPayments,
  VCTSubscriptionItem,
  EISSubscriptionItem,
  SEISSubscriptionItem,
} from './types';
import { GeneralData } from '@/types/wizard';

const RELIEFS_API_BASE = '/individuals/reliefs';
const DISCLOSURES_API_BASE = '/individuals/disclosures';

// ============================================================================
// API Functions - Pension Reliefs
// ============================================================================

/**
 * Get pension reliefs for a tax year
 */
export async function getPensionReliefs(
  userId: string,
  nino: string,
  taxYear: string
): Promise<PensionReliefs> {
  return hmrcClient.get(
    userId,
    `${RELIEFS_API_BASE}/pensions/${nino}/${taxYear}`
  );
}

/**
 * Submit pension reliefs
 */
export async function submitPensionReliefs(
  userId: string,
  nino: string,
  taxYear: string,
  data: PensionReliefs
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${RELIEFS_API_BASE}/pensions/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete pension reliefs
 */
export async function deletePensionReliefs(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${RELIEFS_API_BASE}/pensions/${nino}/${taxYear}`
  );
}

// ============================================================================
// API Functions - Investment Reliefs (EIS/SEIS/VCT/Gift Aid)
// ============================================================================

/**
 * Get investment reliefs for a tax year
 */
export async function getInvestmentReliefs(
  userId: string,
  nino: string,
  taxYear: string
): Promise<InvestmentReliefs> {
  return hmrcClient.get(
    userId,
    `${RELIEFS_API_BASE}/investment/${nino}/${taxYear}`
  );
}

/**
 * Submit investment reliefs
 */
export async function submitInvestmentReliefs(
  userId: string,
  nino: string,
  taxYear: string,
  data: InvestmentReliefs
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${RELIEFS_API_BASE}/investment/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete investment reliefs
 */
export async function deleteInvestmentReliefs(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${RELIEFS_API_BASE}/investment/${nino}/${taxYear}`
  );
}

// ============================================================================
// API Functions - Marriage Allowance
// ============================================================================

/**
 * Get marriage allowance disclosures
 */
export async function getMarriageAllowance(
  userId: string,
  nino: string,
  taxYear: string
): Promise<MarriageAllowance> {
  return hmrcClient.get(
    userId,
    `${DISCLOSURES_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Submit marriage allowance
 */
export async function submitMarriageAllowance(
  userId: string,
  nino: string,
  taxYear: string,
  data: MarriageAllowance
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${DISCLOSURES_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

// ============================================================================
// Wizard Data Mapper - Pension Reliefs
// ============================================================================

/**
 * Map wizard pension contributions data to HMRC format
 */
export function mapPensionContributionsToHMRC(
  generalData: GeneralData
): PensionReliefs | null {
  const pensionData = generalData.pension;

  if (!pensionData) {
    return null;
  }

  const hasData =
    (pensionData.personalContributions && pensionData.personalContributions > 0) ||
    (pensionData.oneOffContributions && pensionData.oneOffContributions > 0) ||
    (pensionData.employerContributions && pensionData.employerContributions > 0);

  if (!hasData) {
    return null;
  }

  return {
    pensionReliefs: {
      regularPensionContributions: pensionData.personalContributions, // SA100 Box 1
      oneOffPensionContributionsPaid: pensionData.oneOffContributions, // SA100 Box 2
      paymentToEmployersSchemeNoTaxRelief: pensionData.employerContributions,
    },
  };
}

// ============================================================================
// Wizard Data Mapper - Investment Reliefs
// ============================================================================

/**
 * Map wizard charitable giving data to HMRC Gift Aid format
 */
function mapGiftAidToHMRC(generalData: GeneralData): GiftAidPayments | null {
  const charityData = generalData.charitable;

  if (!charityData) {
    return null;
  }

  const hasData =
    (charityData.giftAidDonations && charityData.giftAidDonations > 0) ||
    (charityData.giftAidTreatedAsPreviousYear && charityData.giftAidTreatedAsPreviousYear > 0);

  if (!hasData) {
    return null;
  }

  return {
    currentYear: charityData.giftAidDonations, // SA100 Box 5
    currentYearTreatedAsPreviousYear: charityData.giftAidTreatedAsPreviousYear, // SA100 Box 6
  };
}

/**
 * Map wizard venture capital data to HMRC format
 */
function mapVentureCapitalToHMRC(generalData: GeneralData): {
  vct?: VCTSubscriptionItem[];
  eis?: EISSubscriptionItem[];
  seis?: SEISSubscriptionItem[];
} | null {
  const vcData = generalData.ventureCapital;

  if (!vcData) {
    return null;
  }

  const result: {
    vct?: VCTSubscriptionItem[];
    eis?: EISSubscriptionItem[];
    seis?: SEISSubscriptionItem[];
  } = {};

  // VCT investments - check for detailed list first, then simple total
  if (vcData.vctInvestmentsList && vcData.vctInvestmentsList.length > 0) {
    result.vct = vcData.vctInvestmentsList.map((inv, index) => ({
      uniqueInvestmentRef: `VCT-${index + 1}`,
      name: inv.companyName,
      dateOfInvestment: inv.dateInvested,
      amountInvested: inv.amount, // SA101 Box 6
      reliefClaimed: (inv.amount * 30) / 100, // SA101 Box 7 - 30% relief
    }));
  } else if (vcData.vctInvestments && vcData.vctInvestments > 0) {
    // Use simple total
    result.vct = [
      {
        uniqueInvestmentRef: 'VCT-TOTAL',
        amountInvested: vcData.vctInvestments,
        reliefClaimed: vcData.vctReliefClaimed ?? (vcData.vctInvestments * 30) / 100, // 30% relief
      },
    ];
  } else if (vcData.totalVCT && vcData.totalVCT > 0) {
    result.vct = [
      {
        uniqueInvestmentRef: 'VCT-TOTAL',
        amountInvested: vcData.totalVCT,
        reliefClaimed: (vcData.totalVCT * 30) / 100, // 30% relief
      },
    ];
  }

  // EIS investments - check for detailed list first, then simple total
  if (vcData.eisInvestmentsList && vcData.eisInvestmentsList.length > 0) {
    result.eis = vcData.eisInvestmentsList.map((inv, index) => ({
      uniqueInvestmentRef: `EIS-${index + 1}`,
      name: inv.companyName,
      dateOfInvestment: inv.dateInvested,
      amountInvested: inv.amount, // SA101 Box 2
      reliefClaimed: (inv.amount * 30) / 100, // SA101 Box 3 - 30% relief
    }));
  } else if (vcData.eisInvestments && vcData.eisInvestments > 0) {
    // Use simple total
    result.eis = [
      {
        uniqueInvestmentRef: 'EIS-TOTAL',
        amountInvested: vcData.eisInvestments,
        reliefClaimed: vcData.eisReliefClaimed ?? (vcData.eisInvestments * 30) / 100, // 30% relief
      },
    ];
  } else if (vcData.totalEIS && vcData.totalEIS > 0) {
    result.eis = [
      {
        uniqueInvestmentRef: 'EIS-TOTAL',
        amountInvested: vcData.totalEIS,
        reliefClaimed: (vcData.totalEIS * 30) / 100, // 30% relief
      },
    ];
  }

  // SEIS investments - check for detailed list first, then simple total
  if (vcData.seisInvestmentsList && vcData.seisInvestmentsList.length > 0) {
    result.seis = vcData.seisInvestmentsList.map((inv, index) => ({
      uniqueInvestmentRef: `SEIS-${index + 1}`,
      name: inv.companyName,
      dateOfInvestment: inv.dateInvested,
      amountInvested: inv.amount, // SA101 Box 4
      reliefClaimed: (inv.amount * 50) / 100, // SA101 Box 5 - 50% relief
    }));
  } else if (vcData.seisInvestments && vcData.seisInvestments > 0) {
    // Use simple total
    result.seis = [
      {
        uniqueInvestmentRef: 'SEIS-TOTAL',
        amountInvested: vcData.seisInvestments,
        reliefClaimed: vcData.seisReliefClaimed ?? (vcData.seisInvestments * 50) / 100, // 50% relief
      },
    ];
  } else if (vcData.totalSEIS && vcData.totalSEIS > 0) {
    result.seis = [
      {
        uniqueInvestmentRef: 'SEIS-TOTAL',
        amountInvested: vcData.totalSEIS,
        reliefClaimed: (vcData.totalSEIS * 50) / 100, // 50% relief
      },
    ];
  }

  if (!result.vct && !result.eis && !result.seis) {
    return null;
  }

  return result;
}

/**
 * Map all investment reliefs to HMRC format
 */
export function mapInvestmentReliefsToHMRC(
  generalData: GeneralData
): InvestmentReliefs | null {
  const result: InvestmentReliefs = {};
  let hasData = false;

  // Gift Aid
  const giftAid = mapGiftAidToHMRC(generalData);
  if (giftAid) {
    result.giftAidPayments = giftAid;
    hasData = true;
  }

  // Gifts of shares/property to charity
  if (generalData.charitable?.giftOfShares) {
    result.giftsOfSharesOrSecurities = generalData.charitable.giftOfShares; // SA100 Box 7
    hasData = true;
  }
  if (generalData.charitable?.giftOfProperty) {
    result.giftsOfLandAndBuildings = generalData.charitable.giftOfProperty; // SA100 Box 8
    hasData = true;
  }

  // Venture Capital
  const vcReliefs = mapVentureCapitalToHMRC(generalData);
  if (vcReliefs) {
    if (vcReliefs.vct) {
      result.vctSubscription = vcReliefs.vct;
      hasData = true;
    }
    if (vcReliefs.eis) {
      result.eisSubscription = vcReliefs.eis;
      hasData = true;
    }
    if (vcReliefs.seis) {
      result.seedEnterpriseInvestment = vcReliefs.seis;
      hasData = true;
    }
  }

  return hasData ? result : null;
}

// ============================================================================
// Wizard Data Mapper - Marriage Allowance
// ============================================================================

/**
 * Map wizard marriage allowance data to HMRC format
 */
export function mapMarriageAllowanceToHMRC(
  generalData: GeneralData
): MarriageAllowance | null {
  const maData = generalData.marriageAllowance;

  // Check for type or transferType (supporting both field names)
  const transferType = maData?.transferType ?? maData?.type;
  if (!maData || !transferType) {
    return null;
  }

  const result: MarriageAllowance = {
    marriageAllowance: {},
  };

  // Marriage Allowance amount for 2024/25
  const MARRIAGE_ALLOWANCE_AMOUNT = 1260;

  // Parse spouse name into first/surname if only spouseName provided
  let firstName = maData.spouseFirstName;
  let surname = maData.spouseSurname;
  if (!firstName && !surname && maData.spouseName) {
    const nameParts = maData.spouseName.trim().split(/\s+/);
    firstName = nameParts[0];
    surname = nameParts.slice(1).join(' ') || nameParts[0];
  }

  // Use spouseDateOfBirth or spouseDob
  const dateOfBirth = maData.spouseDateOfBirth ?? maData.spouseDob;

  if (transferType === 'transfer') {
    // Transferring allowance to spouse
    result.marriageAllowance!.marriageAllowanceTransferOut = {
      partnerNino: maData.spouseNino,
      firstName,
      surname,
      dateOfBirth,
      amount: MARRIAGE_ALLOWANCE_AMOUNT,
    };
  } else if (transferType === 'receive') {
    // Receiving allowance from spouse
    result.marriageAllowance!.marriageAllowanceTransferIn = {
      partnerNino: maData.spouseNino,
      firstName,
      surname,
      dateOfBirth,
      amount: MARRIAGE_ALLOWANCE_AMOUNT,
    };
  }

  return result;
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all reliefs data for a user
 */
export async function submitAllReliefsData(
  userId: string,
  nino: string,
  taxYear: string,
  generalData: GeneralData
): Promise<{
  pensionReliefsSubmitted: boolean;
  investmentReliefsSubmitted: boolean;
  marriageAllowanceSubmitted: boolean;
  errors: string[];
}> {
  const result = {
    pensionReliefsSubmitted: false,
    investmentReliefsSubmitted: false,
    marriageAllowanceSubmitted: false,
    errors: [] as string[],
  };

  // Submit pension reliefs
  try {
    const pensionData = mapPensionContributionsToHMRC(generalData);
    if (pensionData) {
      await submitPensionReliefs(userId, nino, taxYear, pensionData);
      result.pensionReliefsSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Pension reliefs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Submit investment reliefs (Gift Aid, EIS, SEIS, VCT)
  try {
    const investmentData = mapInvestmentReliefsToHMRC(generalData);
    if (investmentData) {
      await submitInvestmentReliefs(userId, nino, taxYear, investmentData);
      result.investmentReliefsSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Investment reliefs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Submit marriage allowance
  try {
    const marriageData = mapMarriageAllowanceToHMRC(generalData);
    if (marriageData) {
      await submitMarriageAllowance(userId, nino, taxYear, marriageData);
      result.marriageAllowanceSubmitted = true;
    }
  } catch (error) {
    result.errors.push(
      `Marriage allowance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

// ============================================================================
// Relief Calculation Helpers
// ============================================================================

// 2024/25 Relief Limits
export const RELIEF_LIMITS = {
  marriageAllowance: 1260,
  blindPersonsAllowance: 3070,
  eisAnnualLimit: 1000000, // Can be increased to £2m for knowledge-intensive companies
  seisAnnualLimit: 200000, // Increased from £100,000 in 2023/24
  vctAnnualLimit: 200000,
  giftAidHigherRateRelief: 0.2, // Additional 20% for higher rate taxpayers
};

/**
 * Calculate Gift Aid tax relief
 */
export function calculateGiftAidRelief(
  giftAidAmount: number,
  isHigherRateTaxpayer: boolean
): {
  grossedUpAmount: number;
  basicRateRelief: number;
  higherRateRelief: number;
  totalRelief: number;
} {
  // Gift Aid donations are already grossed up
  // Charity claims 25% (basic rate) from HMRC
  const grossedUpAmount = giftAidAmount * 1.25;
  const basicRateRelief = giftAidAmount * 0.25; // Already claimed by charity

  // Higher rate taxpayers can claim additional 20%
  const higherRateRelief = isHigherRateTaxpayer
    ? giftAidAmount * RELIEF_LIMITS.giftAidHigherRateRelief
    : 0;

  return {
    grossedUpAmount,
    basicRateRelief,
    higherRateRelief,
    totalRelief: basicRateRelief + higherRateRelief,
  };
}

/**
 * Calculate venture capital scheme reliefs
 */
export function calculateVentureCapitalRelief(
  eisAmount: number,
  seisAmount: number,
  vctAmount: number
): {
  eisRelief: number;
  seisRelief: number;
  vctRelief: number;
  totalRelief: number;
  warnings: string[];
} {
  const warnings: string[] = [];

  // EIS: 30% relief on up to £1m (£2m for knowledge-intensive)
  const eisCapped = Math.min(eisAmount, RELIEF_LIMITS.eisAnnualLimit);
  if (eisAmount > RELIEF_LIMITS.eisAnnualLimit) {
    warnings.push(`EIS investment capped at £${RELIEF_LIMITS.eisAnnualLimit.toLocaleString()}`);
  }
  const eisRelief = eisCapped * 0.3;

  // SEIS: 50% relief on up to £200k
  const seisCapped = Math.min(seisAmount, RELIEF_LIMITS.seisAnnualLimit);
  if (seisAmount > RELIEF_LIMITS.seisAnnualLimit) {
    warnings.push(`SEIS investment capped at £${RELIEF_LIMITS.seisAnnualLimit.toLocaleString()}`);
  }
  const seisRelief = seisCapped * 0.5;

  // VCT: 30% relief on up to £200k
  const vctCapped = Math.min(vctAmount, RELIEF_LIMITS.vctAnnualLimit);
  if (vctAmount > RELIEF_LIMITS.vctAnnualLimit) {
    warnings.push(`VCT investment capped at £${RELIEF_LIMITS.vctAnnualLimit.toLocaleString()}`);
  }
  const vctRelief = vctCapped * 0.3;

  return {
    eisRelief,
    seisRelief,
    vctRelief,
    totalRelief: eisRelief + seisRelief + vctRelief,
    warnings,
  };
}
