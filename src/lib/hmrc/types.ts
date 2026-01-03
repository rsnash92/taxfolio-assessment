// HMRC MTD API Types for Self Assessment
// Based on HMRC Developer Hub API Documentation

// ============================================================================
// OAuth & Authentication Types
// ============================================================================

export interface HMRCTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface StoredHMRCTokens {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Self Employment Types (SA103)
// ============================================================================

export interface SelfEmploymentPeriodSummary {
  periodDates: {
    periodStartDate: string; // YYYY-MM-DD
    periodEndDate: string; // YYYY-MM-DD
  };
  periodIncome?: {
    turnover?: number; // SA103S Box 9 / SA103F Box 14
    other?: number; // SA103S Box 10 / SA103F Box 15
    taxTakenOffTradingIncome?: number; // CIS deductions
  };
  periodExpenses?: {
    consolidatedExpenses?: number;
    costOfGoods?: number; // SA103S Box 11 / SA103F Box 16
    paymentsToSubcontractors?: number;
    wagesAndStaffCosts?: number; // SA103S Box 13 / SA103F Box 18
    carVanTravelExpenses?: number; // SA103S Box 12 / SA103F Box 17
    premisesRunningCosts?: number; // SA103S Box 14 / SA103F Box 19
    maintenanceCosts?: number; // SA103S Box 15 / SA103F Box 20
    adminCosts?: number; // SA103S Box 18 / SA103F Box 24
    businessEntertainmentCosts?: number; // SA103F Box 22
    advertisingCosts?: number; // SA103F Box 21
    interestOnBankOtherLoans?: number; // SA103S Box 17 / SA103F Box 23
    financeCharges?: number; // SA103F Box 25
    irrecoverableDebts?: number; // SA103F Box 26
    professionalFees?: number; // SA103S Box 16 / SA103F Box 27
    depreciation?: number; // SA103F Box 28
    otherExpenses?: number; // SA103S Box 19 / SA103F Box 29
  };
  periodDisallowableExpenses?: {
    costOfGoodsDisallowable?: number;
    paymentsToSubcontractorsDisallowable?: number;
    wagesAndStaffCostsDisallowable?: number;
    carVanTravelExpensesDisallowable?: number;
    premisesRunningCostsDisallowable?: number;
    maintenanceCostsDisallowable?: number;
    adminCostsDisallowable?: number;
    businessEntertainmentCostsDisallowable?: number;
    advertisingCostsDisallowable?: number;
    interestOnBankOtherLoansDisallowable?: number;
    financeChargesDisallowable?: number;
    irrecoverableDebtsDisallowable?: number;
    professionalFeesDisallowable?: number;
    depreciationDisallowable?: number;
    otherExpensesDisallowable?: number;
  };
}

export interface SelfEmploymentAnnualSubmission {
  adjustments?: {
    includedNonTaxableProfits?: number; // SA103F Box 48
    basisAdjustment?: number; // SA103F Box 49
    overlapReliefUsed?: number; // SA103F Box 50
    accountingAdjustment?: number; // SA103F Box 51
    averagingAdjustment?: number; // SA103F Box 52
    outstandingBusinessIncome?: number; // SA103F Box 53
    balancingChargeBpra?: number; // SA103F Box 54
    balancingChargeOther?: number; // SA103F Box 55
    goodsAndServicesOwnUse?: number; // SA103F Box 56
  };
  allowances?: {
    annualInvestmentAllowance?: number; // SA103S Box 23 / SA103F Box 33
    capitalAllowanceMainPool?: number; // SA103F Box 34
    capitalAllowanceSpecialRatePool?: number; // SA103F Box 35
    zeroEmissionsGoodsVehicleAllowance?: number; // SA103S Box 24.1 / SA103F Box 36
    enhancedCapitalAllowance?: number; // SA103F Box 37
    allowanceOnSales?: number; // SA103F Box 38
    capitalAllowanceSingleAssetPool?: number; // SA103F Box 39
    tradingIncomeAllowance?: number; // SA103S Box 10.1
    structureAndBuildingAllowance?: number; // SA103F Box 41
  };
  nonFinancials?: {
    businessAccountingPeriod?: {
      startDate: string;
      endDate: string;
    };
    class4NicsExemptionReason?:
      | 'non-resident'
      | 'trustee'
      | 'diver'
      | 'ITTOIA-2005'
      | 'over-state-pension-age'
      | 'under-16';
  };
}

// ============================================================================
// Property Types (SA105)
// ============================================================================

export interface UKPropertyPeriodSummary {
  fromDate: string;
  toDate: string;
  ukProperty?: {
    income?: {
      premiumsOfLeaseGrant?: number; // SA105 Box 4
      reversePremiums?: number; // SA105 Box 5
      periodAmount?: number; // SA105 Box 5.1
      taxDeducted?: number; // SA105 Box 6
      otherIncome?: number; // SA105 Box 7
      rentARoom?: {
        rentsReceived?: number;
      };
    };
    expenses?: {
      consolidatedExpenses?: number;
      premisesRunningCosts?: number; // SA105 Box 8
      repairsAndMaintenance?: number; // SA105 Box 9
      financialCosts?: number; // SA105 Box 10
      professionalFees?: number; // SA105 Box 11
      costOfServices?: number; // SA105 Box 12
      other?: number; // SA105 Box 13
      residentialFinancialCost?: number; // SA105 Box 44
      broughtFwdResidentialFinancialCost?: number; // SA105 Box 45
      rentARoom?: {
        amountClaimed?: number;
      };
    };
  };
}

export interface UKPropertyAnnualSubmission {
  ukProperty?: {
    allowances?: {
      annualInvestmentAllowance?: number; // SA105 Box 24
      zeroEmissionsGoodsVehicleAllowance?: number; // SA105 Box 25
      businessPremisesRenovationAllowance?: number; // SA105 Box 26
      otherCapitalAllowance?: number; // SA105 Box 27
      costOfReplacingDomesticGoods?: number; // SA105 Box 28
      structuredBuildingAllowance?: number; // SA105 Box 29.1
      enhancedStructuredBuildingAllowance?: number; // SA105 Box 29.2
      zeroEmissionsCarAllowance?: number; // SA105 Box 30
      propertyIncomeAllowance?: number; // SA105 Box 14.1
    };
    adjustments?: {
      balancingCharge?: number; // SA105 Box 31
      privateUseAdjustment?: number; // SA105 Box 32
      businessPremisesRenovationAllowanceBalancingCharges?: number; // SA105 Box 33
      nonResidentLandlord?: boolean; // SA105 Box 37
      rentARoom?: {
        jointlyLet?: boolean;
        amountClaimed?: number;
      };
    };
  };
}

// ============================================================================
// Employment Types (SA102)
// ============================================================================

export interface EmploymentFinancialData {
  employment: {
    pay?: {
      taxablePayToDate?: number; // SA102 Box 1
      totalTaxToDate?: number; // SA102 Box 2
      tipsAndOtherPayments?: number; // SA102 Box 3
    };
    lumpSums?: {
      taxableLumpSumsAndCertainIncome?: {
        amount?: number; // SA102 Box 4
        taxPaid?: number;
      };
      benefitFromEmployerFinancedRetirementScheme?: {
        amount?: number; // SA102 Box 5
        exemptAmount?: number;
        taxPaid?: number;
      };
      redundancyCompensationPaymentsOverExemption?: {
        amount?: number; // SA102 Box 6
        taxPaid?: number;
      };
      redundancyCompensationPaymentsUnderExemption?: {
        amount?: number; // SA102 Box 7
      };
    };
    deductions?: {
      studentLoans?: {
        uglDeductionAmount?: number; // Plan 1
        pglDeductionAmount?: number; // Plan 2
        plan4DeductionAmount?: number; // Plan 4 (Scotland)
        postgraduateLoanDeductionAmount?: number; // Postgrad
      };
    };
    benefitsInKind?: {
      accommodation?: number;
      assets?: number;
      assetTransfer?: number;
      beneficialLoan?: number;
      car?: number; // SA102 Box 9
      carFuel?: number; // SA102 Box 10
      educationalServices?: number;
      entertaining?: number;
      expenses?: number;
      medicalInsurance?: number; // SA102 Box 11
      telephone?: number;
      service?: number;
      taxableExpenses?: number;
      van?: number;
      vanFuel?: number;
      mileage?: number;
      nonQualifyingRelocationExpenses?: number;
      nurseryPlaces?: number;
      otherItems?: number; // SA102 Box 12
      paymentsOnEmployeesBehalf?: number;
      personalIncidentalExpenses?: number;
      qualifyingRelocationExpenses?: number;
      employerProvidedProfessionalSubscriptions?: number;
      employerProvidedServices?: number;
      incomeTaxPaidByDirector?: number;
      travelAndSubsistence?: number;
      vouchersAndCreditCards?: number;
      nonCash?: number;
    };
  };
}

export interface EmploymentSource {
  employmentId: string;
  employerRef?: string;
  employerName: string;
  payrollId?: string;
  startDate?: string;
  cessationDate?: string;
  occupationalPension?: boolean;
}

// ============================================================================
// Dividends Types (SA100 Boxes 4-6)
// ============================================================================

export interface UKDividendsIncome {
  ukDividends?: number; // SA100 Box 4
  otherUkDividends?: number; // SA100 Box 5
}

export interface OtherDividendsIncome {
  stockDividend?: {
    customerReference?: string;
    grossAmount?: number; // SA101 Box 35
  };
  redeemableShares?: {
    customerReference?: string;
    grossAmount?: number; // SA101 Box 36
  };
  bonusIssuesOfSecurities?: {
    customerReference?: string;
    grossAmount?: number; // SA101 Box 37
  };
  closeCompanyLoansWrittenOff?: {
    customerReference?: string;
    grossAmount?: number; // SA101 Box 38
  };
}

export interface ForeignDividendItem {
  countryCode: string; // ISO 3166-1 alpha-3
  amountBeforeTax?: number;
  taxTakenOff?: number;
  specialWithholdingTax?: number;
  foreignTaxCreditRelief?: boolean;
  taxableAmount: number; // SA100 Box 6
}

export interface ForeignDividendsIncome {
  foreignDividend?: ForeignDividendItem[];
}

// ============================================================================
// Savings/Interest Types (SA100 Boxes 1-3)
// ============================================================================

export interface SecuritiesIncome {
  taxTakenOff?: number;
  grossAmount?: number; // SA100 Box 1 - Taxed UK interest
  netAmount?: number;
}

export interface ForeignInterestItem {
  countryCode: string;
  amountBeforeTax?: number;
  taxTakenOff?: number;
  specialWithholdingTax?: number;
  taxableAmount: number; // SA100 Box 3
  foreignTaxCreditRelief?: boolean;
}

export interface SavingsIncome {
  securities?: SecuritiesIncome;
  foreignInterest?: ForeignInterestItem[];
}

export interface SavingsAccountItem {
  savingsAccountId: string;
  accountName: string;
  grossAmount: number; // SA100 Box 2 - Untaxed UK interest
}

export interface UKSavingsAccountsIncome {
  savingsAccounts?: SavingsAccountItem[];
}

// ============================================================================
// CIS Deductions Types (SA100 Box 17)
// ============================================================================

export interface CISDeductionPeriod {
  deductionFromDate: string;
  deductionToDate: string;
  deductionAmount: number; // CIS deducted
  costOfMaterials?: number;
  grossAmountPaid: number;
}

export interface CISDeductionsSubmission {
  fromDate: string;
  toDate: string;
  contractorName: string;
  employerRef: string;
  periodData: CISDeductionPeriod[];
}

export interface CISDeductionsResponse {
  totalDeductionAmount?: number;
  totalCostOfMaterials?: number;
  totalGrossAmountPaid?: number;
  cisDeductions?: {
    fromDate: string;
    toDate: string;
    contractorName?: string;
    employerRef: string;
    totalDeductionAmount?: number;
    totalCostOfMaterials?: number;
    totalGrossAmountPaid?: number;
    periodData?: CISDeductionPeriod[];
  }[];
}

// ============================================================================
// State Benefits Types (SA100 Boxes 13-15)
// ============================================================================

export type StateBenefitType =
  | 'statePension' // SA100 Box 13
  | 'statePensionLumpSum' // SA100 Box 14
  | 'employmentSupportAllowance' // SA100 Box 15
  | 'jobSeekersAllowance' // SA100 Box 15
  | 'bereavementAllowance' // SA100 Box 15
  | 'otherStateBenefits'; // SA100 Box 15

export interface StateBenefitItem {
  benefitType: StateBenefitType;
  startDate: string;
  endDate?: string;
  amount?: number;
  taxPaid?: number;
}

export interface StateBenefitsSubmission {
  stateBenefits?: StateBenefitItem[];
}

// ============================================================================
// Pensions Income Types
// ============================================================================

export interface ForeignPensionItem {
  countryCode: string;
  amountBeforeTax?: number;
  taxTakenOff?: number;
  specialWithholdingTax?: number;
  foreignTaxCreditRelief?: boolean;
  taxableAmount: number;
}

export interface OverseasPensionContributionItem {
  customerReference?: string;
  exemptEmployersPensionContribs: number;
  migrantMemReliefQopsRefNo?: string;
  dblTaxationRelief?: number;
  dblTaxationCountryCode?: string;
  dblTaxationArticle?: string;
  dblTaxationTreaty?: string;
  sf74reference?: string;
}

export interface PensionsIncome {
  foreignPension?: ForeignPensionItem[];
  overseasPensionContributions?: OverseasPensionContributionItem[];
}

// ============================================================================
// Capital Gains Types (SA108)
// ============================================================================

export type CapitalGainsAssetType =
  | 'otherProperty' // Non-residential property
  | 'listedShares' // Listed shares
  | 'unlistedShares' // Unlisted shares
  | 'otherAsset'; // Other assets

export interface CapitalGainsDisposal {
  assetType: CapitalGainsAssetType;
  assetDescription: string;
  acquisitionDate: string;
  disposalDate: string;
  disposalProceeds: number; // SA108 Box 5
  allowableCosts: number; // SA108 Box 6
  gain?: number; // SA108 Box 7
  loss?: number; // SA108 Box 8
  claimOrElectionCodes?: string[];
  gainAfterRelief?: number;
  lossAfterRelief?: number;
}

export interface ResidentialPropertyDisposal {
  completionDate: string;
  disposalProceeds: number;
  acquisitionDate: string;
  acquisitionAmount: number;
  improvementCosts?: number;
  additionalCosts?: number;
  prfAmount?: number; // Private Residence Relief
  otherReliefs?: number;
}

export interface CapitalGainsLosses {
  broughtForwardLossesUsedInCurrentYear?: number; // SA108 Box 12
  setAgainstInYearGains?: number;
  setAgainstInYearGeneralIncome?: number;
  setAgainstEarlierYear?: number;
}

export interface CapitalGainsSubmission {
  disposals?: CapitalGainsDisposal[];
  residentialPropertyDisposalsInformation?: ResidentialPropertyDisposal;
  carriedInterest?: {
    gain: number;
  };
  losses?: CapitalGainsLosses;
  adjustments?: {
    annualExemptAmount?: number; // £3,000 for 2024/25
  };
}

// ============================================================================
// Reliefs Types (SA100 + SA101)
// ============================================================================

export interface PensionReliefs {
  pensionReliefs: {
    regularPensionContributions?: number; // SA100 Box 1
    oneOffPensionContributionsPaid?: number; // SA100 Box 2
    retirementAnnuityPayments?: number; // SA100 Box 3
    paymentToEmployersSchemeNoTaxRelief?: number;
    overseasPensionSchemeContributions?: number;
  };
}

export interface VCTSubscriptionItem {
  uniqueInvestmentRef: string;
  name?: string;
  dateOfInvestment?: string;
  amountInvested?: number; // SA101 Box 6
  reliefClaimed?: number; // SA101 Box 7
}

export interface EISSubscriptionItem {
  uniqueInvestmentRef: string;
  name?: string;
  knowledgeIntensive?: boolean;
  dateOfInvestment?: string;
  amountInvested?: number; // SA101 Box 2
  reliefClaimed?: number; // SA101 Box 3
}

export interface SEISSubscriptionItem {
  uniqueInvestmentRef: string;
  name?: string;
  dateOfInvestment?: string;
  amountInvested?: number; // SA101 Box 4
  reliefClaimed?: number; // SA101 Box 5
}

export interface GiftAidPayments {
  currentYear?: number; // SA100 Box 5
  oneOffCurrentYear?: number;
  currentYearTreatedAsPreviousYear?: number; // SA100 Box 6
  nextYearTreatedAsCurrentYear?: number;
  nonUkCharities?: number;
}

export interface InvestmentReliefs {
  vctSubscription?: VCTSubscriptionItem[];
  eisSubscription?: EISSubscriptionItem[];
  seedEnterpriseInvestment?: SEISSubscriptionItem[];
  giftAidPayments?: GiftAidPayments;
  giftsOfSharesOrSecurities?: number; // SA100 Box 7
  giftsOfLandAndBuildings?: number; // SA100 Box 8
}

// ============================================================================
// Marriage Allowance Types (SA100 Box 13)
// ============================================================================

export interface MarriageAllowanceTransfer {
  partnerNino?: string;
  firstName?: string;
  surname?: string;
  dateOfBirth?: string;
  amount?: number; // £1,260 for 2024/25
}

export interface MarriageAllowance {
  marriageAllowance?: {
    marriageAllowanceTransferOut?: MarriageAllowanceTransfer;
    marriageAllowanceTransferIn?: MarriageAllowanceTransfer;
  };
}

// ============================================================================
// Tax Calculation Types
// ============================================================================

export type CalculationType =
  | 'in-year'
  | 'intent-to-crystallise'
  | 'final-declaration'
  | 'intent-to-amend'
  | 'confirm-amendment';

export interface TaxBand {
  name: string; // "BRT", "HRT", "ART"
  rate: number; // 20, 40, 45
  bandLimit: number;
  apportionedBandLimit: number;
  income: number;
  taxAmount: number;
}

export interface NIC4Band {
  name: string;
  rate: number;
  threshold: number;
  income: number;
  amount: number;
}

export interface TaxCalculationResult {
  metadata: {
    calculationId: string;
    taxYear: string;
    requestedBy: string;
    requestedTimestamp: string;
    calculationReason: string;
    calculationTimestamp: string;
    calculationType: string;
    intentToSubmitFinalDeclaration: boolean;
    finalDeclaration: boolean;
    periodFrom: string;
    periodTo: string;
  };
  calculation: {
    totalIncomeReceived: number;
    totalAllowancesAndDeductions: number;
    totalTaxableIncome: number;
    incomeTax: {
      totalIncomeReceivedFromAllSources: number;
      totalAllowancesAndDeductions: number;
      totalTaxableIncome: number;
      payPensionsProfit: {
        incomeReceived: number;
        taxableIncome: number;
        incomeTaxAmount: number;
        taxBands: TaxBand[];
      };
      savingsAndGains?: {
        incomeReceived: number;
        taxableIncome: number;
        incomeTaxAmount: number;
        taxBands: TaxBand[];
      };
      dividends?: {
        incomeReceived: number;
        taxableIncome: number;
        incomeTaxAmount: number;
        taxBands: TaxBand[];
      };
    };
    nics?: {
      class2Nics?: {
        amount: number;
        weeklyRate: number;
        weeks: number;
        underSmallProfitsThreshold: boolean;
      };
      class4Nics?: {
        totalAmount: number;
        nic4Bands: NIC4Band[];
      };
    };
    totalIncomeTax: number;
    totalNicsDue: number;
    totalTaxDue: number;
    taxDeductedAtSource?: {
      payeEmployments: number;
      ukLandAndProperty: number;
      savings: number;
      cis: number;
    };
    incomeTaxAndNicsDue: number;
    totalTaxDeducted: number;
    taxDue?: number;
    taxOverpaid?: number;
  };
  messages?: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    text: string;
  }>;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface HMRCApiError {
  code: string;
  message: string;
  errors?: Array<{
    code: string;
    message: string;
    path?: string;
  }>;
}

// ============================================================================
// Obligations Types
// ============================================================================

export interface Obligation {
  periodKey: string;
  start: string;
  end: string;
  due: string;
  status: 'Open' | 'Fulfilled';
  received?: string;
}

export interface ObligationsResponse {
  obligations: Array<{
    typeOfBusiness: string;
    businessId: string;
    obligationDetails: Obligation[];
  }>;
}

// ============================================================================
// Test User Types
// ============================================================================

export interface HMRCTestUser {
  userId: string;
  password: string;
  userFullName: string;
  emailAddress: string;
  nino: string;
  mtdItId: string;
}
