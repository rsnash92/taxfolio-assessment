// HMRC Capital Gains API Mapper
// Maps wizard capital gains data to HMRC Individuals Capital Gains API
// API: https://api.service.hmrc.gov.uk/individuals/income-received/other/capital-gains
// Maps to: SA108

import { hmrcClient } from './client';
import {
  CapitalGainsSubmission,
  CapitalGainsDisposal,
  CapitalGainsAssetType,
  CapitalGainsLosses,
  ResidentialPropertyDisposal,
} from './types';
import { CapitalGainsData, CapitalGainsDisposal as WizardDisposal, CapitalGainsAssetType as WizardAssetType } from '@/types/wizard';

const CAPITAL_GAINS_API_BASE = '/individuals/income-received/other/capital-gains';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get capital gains for a tax year
 */
export async function getCapitalGains(
  userId: string,
  nino: string,
  taxYear: string
): Promise<CapitalGainsSubmission> {
  return hmrcClient.get(
    userId,
    `${CAPITAL_GAINS_API_BASE}/${nino}/${taxYear}`
  );
}

/**
 * Create or amend capital gains submission
 */
export async function submitCapitalGains(
  userId: string,
  nino: string,
  taxYear: string,
  data: CapitalGainsSubmission
): Promise<void> {
  await hmrcClient.put(
    userId,
    `${CAPITAL_GAINS_API_BASE}/${nino}/${taxYear}`,
    data
  );
}

/**
 * Delete capital gains submission
 */
export async function deleteCapitalGains(
  userId: string,
  nino: string,
  taxYear: string
): Promise<void> {
  await hmrcClient.delete(
    userId,
    `${CAPITAL_GAINS_API_BASE}/${nino}/${taxYear}`
  );
}

// ============================================================================
// Wizard Data Mapper
// ============================================================================

/**
 * Map wizard asset type to HMRC asset type
 */
function mapAssetType(wizardType: string): CapitalGainsAssetType {
  switch (wizardType) {
    case 'listed-shares':
    case 'shares':
      return 'listedShares';
    case 'unlisted-shares':
      return 'unlistedShares';
    case 'property':
    case 'other-property':
      return 'otherProperty';
    case 'crypto':
    case 'other':
    default:
      return 'otherAsset';
  }
}

/**
 * Map a single wizard disposal to HMRC format
 */
function mapDisposalToHMRC(disposal: WizardDisposal): CapitalGainsDisposal {
  const gain = (disposal.proceedsAmount || 0) - (disposal.acquisitionCost || 0);

  return {
    assetType: mapAssetType(disposal.assetType),
    assetDescription: disposal.assetDescription || `${disposal.assetType} disposal`,
    acquisitionDate: disposal.dateAcquired || '2020-01-01', // Default if not provided
    disposalDate: disposal.dateSold,
    disposalProceeds: disposal.proceedsAmount || 0, // SA108 Box 5
    allowableCosts: disposal.acquisitionCost || 0, // SA108 Box 6
    gain: gain > 0 ? gain : undefined, // SA108 Box 7
    loss: gain < 0 ? Math.abs(gain) : undefined, // SA108 Box 8
    gainAfterRelief: disposal.reliefClaimed
      ? Math.max(0, gain - (disposal.reliefAmount || 0))
      : undefined,
  };
}

/**
 * Map wizard capital gains data to HMRC submission format
 */
export function mapCapitalGainsToHMRC(
  wizardData: CapitalGainsData
): CapitalGainsSubmission | null {
  const result: CapitalGainsSubmission = {};
  let hasData = false;

  // Map disposals
  if (wizardData.disposals && wizardData.disposals.length > 0) {
    const disposals: CapitalGainsDisposal[] = [];
    const residentialDisposals: ResidentialPropertyDisposal[] = [];

    for (const disposal of wizardData.disposals) {
      // Separate residential property (different tax rates apply)
      if (disposal.assetType === 'residential-property') {
        residentialDisposals.push({
          completionDate: disposal.dateSold,
          disposalProceeds: disposal.proceedsAmount || 0,
          acquisitionDate: disposal.dateAcquired || '2020-01-01',
          acquisitionAmount: disposal.acquisitionCost || 0,
          improvementCosts: disposal.improvementCosts,
          additionalCosts: disposal.additionalCosts,
          prfAmount: disposal.privateResidenceRelief,
          otherReliefs: disposal.reliefAmount,
        });
      } else {
        disposals.push(mapDisposalToHMRC(disposal));
      }
    }

    if (disposals.length > 0) {
      result.disposals = disposals;
      hasData = true;
    }

    if (residentialDisposals.length > 0) {
      // Take the first residential disposal (API may only support one)
      result.residentialPropertyDisposalsInformation = residentialDisposals[0];
      hasData = true;
    }
  }

  // Losses
  if (wizardData.lossesFromPreviousYears || wizardData.lossesThisYear) {
    result.losses = {};

    if (wizardData.lossesFromPreviousYears) {
      result.losses.broughtForwardLossesUsedInCurrentYear =
        wizardData.lossesFromPreviousYears; // SA108 Box 12
    }

    if (wizardData.lossesThisYear) {
      result.losses.setAgainstInYearGains = wizardData.lossesThisYear;
    }

    hasData = true;
  }

  // Annual exempt amount
  if (wizardData.annualExemptAmount !== undefined) {
    result.adjustments = {
      annualExemptAmount: wizardData.annualExemptAmount,
    };
    hasData = true;
  }

  return hasData ? result : null;
}

/**
 * Map HMRC capital gains data back to wizard format
 */
export function mapHMRCToCapitalGainsData(
  hmrcData: CapitalGainsSubmission
): Partial<CapitalGainsData> {
  const result: Partial<CapitalGainsData> = {
    disposals: [],
  };

  // Map disposals
  if (hmrcData.disposals) {
    for (const disposal of hmrcData.disposals) {
      result.disposals!.push({
        id: `disposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        assetType: mapHMRCAssetType(disposal.assetType),
        assetDescription: disposal.assetDescription,
        dateAcquired: disposal.acquisitionDate,
        dateSold: disposal.disposalDate,
        proceedsAmount: disposal.disposalProceeds,
        acquisitionCost: disposal.allowableCosts,
        gain: disposal.gain ?? 0,
        loss: disposal.loss ?? 0,
      });
    }
  }

  // Map residential property disposal
  if (hmrcData.residentialPropertyDisposalsInformation) {
    const rp = hmrcData.residentialPropertyDisposalsInformation;
    const totalCosts = (rp.acquisitionAmount || 0) + (rp.improvementCosts || 0) + (rp.additionalCosts || 0);
    const gainOrLoss = (rp.disposalProceeds || 0) - totalCosts;
    result.disposals!.push({
      id: `residential-${Date.now()}`,
      assetType: 'residential-property',
      assetDescription: 'Residential Property',
      dateAcquired: rp.acquisitionDate,
      dateSold: rp.completionDate,
      proceedsAmount: rp.disposalProceeds,
      acquisitionCost: rp.acquisitionAmount,
      improvementCosts: rp.improvementCosts,
      additionalCosts: rp.additionalCosts,
      privateResidenceRelief: rp.prfAmount,
      reliefAmount: rp.otherReliefs,
      gain: gainOrLoss > 0 ? gainOrLoss : 0,
      loss: gainOrLoss < 0 ? Math.abs(gainOrLoss) : 0,
    });
  }

  // Losses
  if (hmrcData.losses) {
    result.lossesFromPreviousYears = hmrcData.losses.broughtForwardLossesUsedInCurrentYear;
    result.lossesThisYear = hmrcData.losses.setAgainstInYearGains;
  }

  // Annual exempt amount
  if (hmrcData.adjustments?.annualExemptAmount) {
    result.annualExemptAmount = hmrcData.adjustments.annualExemptAmount;
  }

  return result;
}

/**
 * Map HMRC asset type back to wizard format
 */
function mapHMRCAssetType(hmrcType: CapitalGainsAssetType): WizardAssetType {
  switch (hmrcType) {
    case 'listedShares':
      return 'listed-shares';
    case 'unlistedShares':
      return 'unlisted-shares';
    case 'otherProperty':
      return 'property';
    case 'otherAsset':
    default:
      return 'other';
  }
}

// ============================================================================
// Submission Helper
// ============================================================================

/**
 * Submit all capital gains data for a user
 */
export async function submitAllCapitalGainsData(
  userId: string,
  nino: string,
  taxYear: string,
  capitalGainsData: CapitalGainsData
): Promise<{
  submitted: boolean;
  error?: string;
}> {
  try {
    const hmrcData = mapCapitalGainsToHMRC(capitalGainsData);

    if (!hmrcData) {
      return { submitted: false }; // No data to submit
    }

    await submitCapitalGains(userId, nino, taxYear, hmrcData);
    return { submitted: true };
  } catch (error) {
    return {
      submitted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// CGT Calculation Helpers
// ============================================================================

// 2024/25 CGT rates and thresholds
export const CGT_ANNUAL_EXEMPT_AMOUNT_2024_25 = 3000;

export const CGT_RATES = {
  // Basic rate taxpayer
  basic: {
    standard: 10,
    residential: 18,
  },
  // Higher/additional rate taxpayer
  higher: {
    standard: 20,
    residential: 24,
  },
};

/**
 * Calculate capital gains tax
 */
export function calculateCGT(
  totalGains: number,
  totalLosses: number,
  lossesFromPreviousYears: number,
  isHigherRateTaxpayer: boolean,
  isResidentialProperty: boolean = false,
  annualExemptAmount: number = CGT_ANNUAL_EXEMPT_AMOUNT_2024_25
): {
  totalGains: number;
  totalLosses: number;
  lossesUsed: number;
  gainsAfterLosses: number;
  annualExemptAmountUsed: number;
  taxableGains: number;
  cgtRate: number;
  cgtDue: number;
} {
  // Apply current year losses
  const gainsAfterCurrentLosses = Math.max(0, totalGains - totalLosses);

  // Apply brought forward losses (only enough to reduce to AEA)
  const lossesFromPrevNeeded = Math.max(0, gainsAfterCurrentLosses - annualExemptAmount);
  const lossesFromPrevUsed = Math.min(lossesFromPreviousYears, lossesFromPrevNeeded);
  const gainsAfterLosses = gainsAfterCurrentLosses - lossesFromPrevUsed;

  // Apply annual exempt amount
  const annualExemptAmountUsed = Math.min(annualExemptAmount, gainsAfterLosses);
  const taxableGains = Math.max(0, gainsAfterLosses - annualExemptAmountUsed);

  // Determine rate
  const rates = isHigherRateTaxpayer ? CGT_RATES.higher : CGT_RATES.basic;
  const cgtRate = isResidentialProperty ? rates.residential : rates.standard;

  // Calculate tax
  const cgtDue = (taxableGains * cgtRate) / 100;

  return {
    totalGains,
    totalLosses,
    lossesUsed: totalLosses + lossesFromPrevUsed,
    gainsAfterLosses,
    annualExemptAmountUsed,
    taxableGains,
    cgtRate,
    cgtDue,
  };
}

/**
 * Calculate total gains and losses from disposals
 */
export function calculateDisposalsSummary(
  disposals: WizardDisposal[]
): {
  totalProceeds: number;
  totalCosts: number;
  totalGains: number;
  totalLosses: number;
  netGainOrLoss: number;
  numberOfDisposals: number;
} {
  let totalProceeds = 0;
  let totalCosts = 0;
  let totalGains = 0;
  let totalLosses = 0;

  for (const disposal of disposals) {
    const proceeds = disposal.proceedsAmount || 0;
    const costs = (disposal.acquisitionCost || 0) +
      (disposal.improvementCosts || 0) +
      (disposal.additionalCosts || 0);

    totalProceeds += proceeds;
    totalCosts += costs;

    const gainOrLoss = proceeds - costs;
    if (gainOrLoss > 0) {
      totalGains += gainOrLoss;
    } else {
      totalLosses += Math.abs(gainOrLoss);
    }
  }

  return {
    totalProceeds,
    totalCosts,
    totalGains,
    totalLosses,
    netGainOrLoss: totalGains - totalLosses,
    numberOfDisposals: disposals.length,
  };
}
