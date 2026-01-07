# HMRC MTD API Reference for TaxFolio Assessment Wizard

## Overview

This document provides a comprehensive mapping between TaxFolio's assessment wizard fields and the HMRC Making Tax Digital (MTD) APIs. Use this as the definitive reference when building, validating, or submitting Self Assessment data.

**Key Resources:**
- HMRC Developer Hub: https://developer.service.hmrc.gov.uk/api-documentation/docs/api
- API Changelog: https://github.com/hmrc/income-tax-mtd-changelog
- Field Mapping CSVs: https://github.com/hmrc/income-tax-mtd-changelog/tree/main/mapping
- Service Guide: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/

---

## API Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HMRC MTD API ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BUSINESS INCOME                    PERSONAL INCOME                         │
│  ───────────────                    ───────────────                         │
│  ├── Self Employment Business API   ├── Individuals Employments Income API  │
│  ├── Property Business API          ├── Individuals Dividends Income API    │
│  └── CIS Deductions API             ├── Individuals Savings Income API      │
│                                     ├── Individuals Other Income API        │
│                                     ├── Individuals State Benefits API      │
│  CALCULATIONS & SUBMISSION          ├── Individuals Pensions Income API     │
│  ────────────────────────           └── Individuals Capital Gains API       │
│  ├── Individual Calculations API                                            │
│  ├── Business Income Source Summary                                         │
│  ├── Business Source Adjustable Summary                                     │
│  └── Self Assessment Accounts API                                           │
│                                                                             │
│  SUPPORTING APIS                                                            │
│  ──────────────                                                             │
│  ├── Business Details API                                                   │
│  ├── Obligations API                                                        │
│  ├── Individual Losses API                                                  │
│  ├── Individuals Reliefs API                                                │
│  └── Individuals Disclosures API                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Submission Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ANNUAL SUBMISSION FLOW                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. QUARTERLY UPDATES (Optional for 2024/25, Mandatory from April 2026)      │
│     ├── Self Employment Period Summary (quarterly income/expenses)           │
│     └── Property Period Summary (quarterly income/expenses)                  │
│                                                                              │
│  2. ANNUAL SUBMISSIONS (End of Tax Year)                                     │
│     ├── Self Employment Annual Submission                                    │
│     ├── Property Annual Submission                                           │
│     ├── Employment Income (create/amend if differs from HMRC data)           │
│     ├── Dividends Income                                                     │
│     ├── Savings Income                                                       │
│     ├── CIS Deductions (if applicable)                                       │
│     ├── Pension Income                                                       │
│     ├── State Benefits                                                       │
│     ├── Capital Gains                                                        │
│     └── Reliefs & Allowances                                                 │
│                                                                              │
│  3. TRIGGER CALCULATION                                                      │
│     └── Individual Calculations API → Trigger Tax Calculation                │
│                                                                              │
│  4. RETRIEVE & DISPLAY CALCULATION                                           │
│     └── Individual Calculations API → Retrieve Calculation                   │
│                                                                              │
│  5. FINAL DECLARATION                                                        │
│     └── Individual Calculations API → Submit Final Declaration               │
│         (calculationType: 'final-declaration')                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Self Employment Business API

**API Version:** 4.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/business/self-employment`
**Maps to:** SA103S (Short) / SA103F (Full)

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{nino}/{businessId}/annual/{taxYear}` | PUT | Create/Amend Annual Submission |
| `/{nino}/{businessId}/annual/{taxYear}` | GET | Retrieve Annual Submission |
| `/{nino}/{businessId}/annual/{taxYear}` | DELETE | Delete Annual Submission |
| `/{nino}/{businessId}/period/{taxYear}` | POST | Create Period Summary |
| `/{nino}/{businessId}/period/{taxYear}/{periodId}` | PUT | Amend Period Summary |

### Annual Submission Schema

```typescript
interface SelfEmploymentAnnualSubmission {
  adjustments?: {
    includedNonTaxableProfits?: number;        // SA103F Box 48
    basisAdjustment?: number;                  // SA103F Box 49
    overlapReliefUsed?: number;                // SA103F Box 50
    accountingAdjustment?: number;             // SA103F Box 51
    averagingAdjustment?: number;              // SA103F Box 52
    outstandingBusinessIncome?: number;        // SA103F Box 53
    balancingChargeBpra?: number;              // SA103F Box 54
    balancingChargeOther?: number;             // SA103F Box 55
    goodsAndServicesOwnUse?: number;           // SA103F Box 56
  };

  allowances?: {
    annualInvestmentAllowance?: number;        // SA103S Box 23 / SA103F Box 33
    capitalAllowanceMainPool?: number;         // SA103F Box 34
    capitalAllowanceSpecialRatePool?: number;  // SA103F Box 35
    zeroEmissionsGoodsVehicleAllowance?: number; // SA103S Box 24.1 / SA103F Box 36
    enhancedCapitalAllowance?: number;         // SA103F Box 37
    allowanceOnSales?: number;                 // SA103F Box 38
    capitalAllowanceSingleAssetPool?: number;  // SA103F Box 39
    tradingIncomeAllowance?: number;           // SA103S Box 10.1
    structureAndBuildingAllowance?: number;    // SA103F Box 41
    // electricChargePointAllowance - REMOVED for tax year 2025-26 onwards
  };

  nonFinancials?: {
    businessAccountingPeriod?: {
      startDate: string;  // YYYY-MM-DD
      endDate: string;    // YYYY-MM-DD
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
```

### Period Summary Schema (Quarterly Updates)

```typescript
interface SelfEmploymentPeriodSummary {
  periodDates: {
    periodStartDate: string;  // YYYY-MM-DD
    periodEndDate: string;    // YYYY-MM-DD
  };

  periodIncome?: {
    turnover?: number;                    // SA103S Box 9 / SA103F Box 14
    other?: number;                       // SA103S Box 10 / SA103F Box 15
    taxTakenOffTradingIncome?: number;    // CIS deductions taken off
  };

  periodExpenses?: {
    consolidatedExpenses?: number;        // Use EITHER this OR individual expenses
    costOfGoods?: number;                 // SA103S Box 11 / SA103F Box 16
    paymentsToSubcontractors?: number;    // CIS payments to subcontractors
    wagesAndStaffCosts?: number;          // SA103S Box 13 / SA103F Box 18
    carVanTravelExpenses?: number;        // SA103S Box 12 / SA103F Box 17
    premisesRunningCosts?: number;        // SA103S Box 14 / SA103F Box 19
    maintenanceCosts?: number;            // SA103S Box 15 / SA103F Box 20
    adminCosts?: number;                  // SA103S Box 18 / SA103F Box 24
    businessEntertainmentCosts?: number;  // SA103F Box 22
    advertisingCosts?: number;            // SA103F Box 21
    interestOnBankOtherLoans?: number;    // SA103S Box 17 / SA103F Box 23
    financeCharges?: number;              // SA103F Box 25
    irrecoverableDebts?: number;          // SA103F Box 26
    professionalFees?: number;            // SA103S Box 16 / SA103F Box 27
    depreciation?: number;                // SA103F Box 28
    otherExpenses?: number;               // SA103S Box 19 / SA103F Box 29
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
```

### TaxFolio Wizard → API Mapping (Self Employment)

```typescript
const SELF_EMPLOYMENT_MAPPING = {
  // Income
  'wizard.selfEmployment.businessIncome': 'periodIncome.turnover',           // Box 9/14
  'wizard.selfEmployment.otherBusinessIncome': 'periodIncome.other',         // Box 10/15

  // Expenses (SA103S Short Form)
  'wizard.expenses.costOfGoods': 'periodExpenses.costOfGoods',               // Box 11/16
  'wizard.expenses.travel': 'periodExpenses.carVanTravelExpenses',           // Box 12/17
  'wizard.expenses.staffCosts': 'periodExpenses.wagesAndStaffCosts',         // Box 13/18
  'wizard.expenses.premises': 'periodExpenses.premisesRunningCosts',         // Box 14/19
  'wizard.expenses.repairs': 'periodExpenses.maintenanceCosts',              // Box 15/20
  'wizard.expenses.professional': 'periodExpenses.professionalFees',         // Box 16/27
  'wizard.expenses.bankCharges': 'periodExpenses.interestOnBankOtherLoans',  // Box 17/23
  'wizard.expenses.office': 'periodExpenses.adminCosts',                     // Box 18/24
  'wizard.expenses.other': 'periodExpenses.otherExpenses',                   // Box 19/29

  // Capital Allowances
  'wizard.capitalAllowances.aia': 'allowances.annualInvestmentAllowance',    // Box 23/33
  'wizard.capitalAllowances.zeroEmission': 'allowances.zeroEmissionsGoodsVehicleAllowance', // Box 24.1/36
  'wizard.capitalAllowances.mainPool': 'allowances.capitalAllowanceMainPool', // Box 34

  // Class 4 NIC
  'wizard.selfEmployment.class4Exempt': 'nonFinancials.class4NicsExemptionReason',
};
```

---

## 2. Property Business API

**API Version:** 6.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/business/property`
**Maps to:** SA105

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/uk/{nino}/{businessId}/annual/{taxYear}` | PUT | Create/Amend UK Property Annual |
| `/uk/{nino}/{businessId}/period/{taxYear}` | POST | Create UK Property Period Summary |
| `/foreign/{nino}/{businessId}/annual/{taxYear}` | PUT | Create/Amend Foreign Property |

### UK Property Annual Submission Schema

```typescript
interface UKPropertyAnnualSubmission {
  ukProperty?: {
    allowances?: {
      annualInvestmentAllowance?: number;              // SA105 Box 24
      zeroEmissionsGoodsVehicleAllowance?: number;    // SA105 Box 25
      businessPremisesRenovationAllowance?: number;   // SA105 Box 26
      otherCapitalAllowance?: number;                 // SA105 Box 27
      costOfReplacingDomesticGoods?: number;          // SA105 Box 28
      // electricChargePointAllowance - REMOVED for 2025-26+
      structuredBuildingAllowance?: number;           // SA105 Box 29.1
      enhancedStructuredBuildingAllowance?: number;   // SA105 Box 29.2
      zeroEmissionsCarAllowance?: number;             // SA105 Box 30
      propertyIncomeAllowance?: number;               // SA105 Box 14.1
    };
    adjustments?: {
      balancingCharge?: number;                       // SA105 Box 31
      privateUseAdjustment?: number;                  // SA105 Box 32
      businessPremisesRenovationAllowanceBalancingCharges?: number; // Box 33
      nonResidentLandlord?: boolean;                  // SA105 Box 37
      rentARoom?: {
        jointlyLet?: boolean;
        amountClaimed?: number;                       // Rent-a-room relief
      };
    };
  };
}
```

### UK Property Period Summary Schema

```typescript
interface UKPropertyPeriodSummary {
  fromDate: string;  // YYYY-MM-DD
  toDate: string;    // YYYY-MM-DD

  ukProperty?: {
    income?: {
      premiumsOfLeaseGrant?: number;                  // SA105 Box 4
      reversePremiums?: number;                       // SA105 Box 5
      periodAmount?: number;                          // SA105 Box 5.1 (Rent received)
      taxDeducted?: number;                           // SA105 Box 6 (Tax deducted)
      otherIncome?: number;                           // SA105 Box 7
      rentARoom?: {
        rentsReceived?: number;                       // Rent-a-room gross receipts
      };
    };
    expenses?: {
      consolidatedExpenses?: number;                  // Use EITHER this OR individual
      premisesRunningCosts?: number;                  // SA105 Box 8
      repairsAndMaintenance?: number;                 // SA105 Box 9
      financialCosts?: number;                        // SA105 Box 10
      professionalFees?: number;                      // SA105 Box 11
      costOfServices?: number;                        // SA105 Box 12
      other?: number;                                 // SA105 Box 13
      residentialFinancialCost?: number;              // SA105 Box 44 (Finance costs restriction)
      broughtFwdResidentialFinancialCost?: number;    // SA105 Box 45
      rentARoom?: {
        amountClaimed?: number;
      };
    };
  };
}
```

### TaxFolio Wizard → API Mapping (Property)

```typescript
const PROPERTY_MAPPING = {
  // Income
  'wizard.rental.rentReceived': 'ukProperty.income.periodAmount',            // Box 5.1
  'wizard.rental.premiums': 'ukProperty.income.premiumsOfLeaseGrant',        // Box 4
  'wizard.rental.otherIncome': 'ukProperty.income.otherIncome',              // Box 7
  'wizard.rental.taxDeducted': 'ukProperty.income.taxDeducted',              // Box 6

  // Expenses
  'wizard.rental.expenses.premises': 'ukProperty.expenses.premisesRunningCosts',  // Box 8
  'wizard.rental.expenses.repairs': 'ukProperty.expenses.repairsAndMaintenance',  // Box 9
  'wizard.rental.expenses.finance': 'ukProperty.expenses.financialCosts',         // Box 10
  'wizard.rental.expenses.legal': 'ukProperty.expenses.professionalFees',         // Box 11
  'wizard.rental.expenses.services': 'ukProperty.expenses.costOfServices',        // Box 12
  'wizard.rental.expenses.other': 'ukProperty.expenses.other',                    // Box 13

  // Finance costs restriction (post-2017 rules)
  'wizard.rental.residentialFinanceCost': 'ukProperty.expenses.residentialFinancialCost', // Box 44

  // Allowances
  'wizard.rental.allowances.aia': 'ukProperty.allowances.annualInvestmentAllowance',      // Box 24
  'wizard.rental.allowances.replacement': 'ukProperty.allowances.costOfReplacingDomesticGoods', // Box 28
};
```

---

## 3. Individuals Employments Income API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/income-received/employments`
**Maps to:** SA102

### Key Points
- Employment data is **pre-populated** by HMRC from employer submissions
- Software should **retrieve** existing data first
- Only **create/amend** if customer disagrees with HMRC data

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{nino}/{taxYear}` | GET | List all employments |
| `/{nino}/{taxYear}/{employmentId}` | GET | Retrieve employment |
| `/{nino}/{taxYear}/{employmentId}` | PUT | Create/amend custom employment |
| `/{nino}/{taxYear}/{employmentId}/ignore` | POST | Ignore HMRC employment data |

### Employment Financial Data Schema

```typescript
interface EmploymentFinancialData {
  employment: {
    pay?: {
      taxablePayToDate?: number;           // SA102 Box 1 - Total pay
      totalTaxToDate?: number;             // SA102 Box 2 - Tax deducted
      studentLoansRepaymentsMade?: {
        studentLoansRepaymentsMade?: number;  // Student loan deducted
        repaymentsMadeOnThisPlan?: number;
      };
    };
    lumpSums?: {
      taxableLumpSumsAndCertainIncome?: {
        amount?: number;                   // SA102 Box 4
        taxPaid?: number;
      };
      benefitFromEmployerFinancedRetirementScheme?: {
        amount?: number;                   // SA102 Box 5
        exemptAmount?: number;
        taxPaid?: number;
      };
      redundancyCompensationPaymentsOverExemption?: {
        amount?: number;                   // SA102 Box 6
        taxPaid?: number;
      };
      redundancyCompensationPaymentsUnderExemption?: {
        amount?: number;                   // SA102 Box 7
      };
    };
    deductions?: {
      studentLoans?: {
        uglDeductionAmount?: number;       // Plan 1
        pglDeductionAmount?: number;       // Plan 2
        plan4DeductionAmount?: number;     // Plan 4 (Scotland)
        postgraduateLoanDeductionAmount?: number; // Postgrad
      };
    };
    benefitsInKind?: {
      accommodation?: number;              // P11D - Accommodation benefit
      assets?: number;                     // P11D - Assets
      assetTransfer?: number;              // P11D - Asset transfer
      beneficialLoan?: number;             // P11D - Beneficial loans
      car?: number;                        // SA102 Box 9 - Company car
      carFuel?: number;                    // SA102 Box 10 - Car fuel
      educationalServices?: number;
      entertaining?: number;
      expenses?: number;
      medicalInsurance?: number;           // SA102 Box 11 - Medical insurance
      telephone?: number;
      service?: number;
      taxableExpenses?: number;
      van?: number;                        // Van benefit
      vanFuel?: number;                    // Van fuel benefit
      mileage?: number;
      nonQualifyingRelocationExpenses?: number;
      nurseryPlaces?: number;
      otherItems?: number;                 // SA102 Box 12 - Other benefits
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
```

### TaxFolio Wizard → API Mapping (Employment)

```typescript
const EMPLOYMENT_MAPPING = {
  // Pay & Tax (from P60/P45)
  'wizard.employment.payReceived': 'employment.pay.taxablePayToDate',        // Box 1
  'wizard.employment.taxDeducted': 'employment.pay.totalTaxToDate',          // Box 2

  // Tips (if applicable)
  'wizard.employment.tips': 'employment.pay.tipsAndOtherPayments',           // Box 3

  // Benefits in Kind (from P11D)
  'wizard.employment.benefits.companyCar': 'employment.benefitsInKind.car',  // Box 9
  'wizard.employment.benefits.carFuel': 'employment.benefitsInKind.carFuel', // Box 10
  'wizard.employment.benefits.medical': 'employment.benefitsInKind.medicalInsurance', // Box 11
  'wizard.employment.benefits.other': 'employment.benefitsInKind.otherItems', // Box 12

  // Student Loan
  'wizard.employment.studentLoan.plan1': 'employment.deductions.studentLoans.uglDeductionAmount',
  'wizard.employment.studentLoan.plan2': 'employment.deductions.studentLoans.pglDeductionAmount',
  'wizard.employment.studentLoan.plan4': 'employment.deductions.studentLoans.plan4DeductionAmount',
  'wizard.employment.studentLoan.postgrad': 'employment.deductions.studentLoans.postgraduateLoanDeductionAmount',
};
```

---

## 4. Individuals Dividends Income API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/income-received/dividends`
**Maps to:** SA100 Boxes 4-6

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{nino}/{taxYear}` | PUT | Create/Amend UK Dividends |
| `/{nino}/{taxYear}` | GET | Retrieve UK Dividends |
| `/{nino}/{taxYear}` | DELETE | Delete UK Dividends |
| `/{nino}/{taxYear}/other` | PUT | Create/Amend Other Dividends |

### Dividends Schema

```typescript
interface UKDividendsIncome {
  ukDividends?: number;                    // SA100 Box 4 - UK dividends
  otherUkDividends?: number;               // SA100 Box 5 - Other UK dividends (unit trusts etc)
}

interface OtherDividendsIncome {
  stockDividend?: {
    customerReference?: string;
    grossAmount?: number;                  // SA101 Box 35 - Stock dividends
  };
  redeemableShares?: {
    customerReference?: string;
    grossAmount?: number;                  // SA101 Box 36 - Redeemable shares
  };
  bonusIssuesOfSecurities?: {
    customerReference?: string;
    grossAmount?: number;                  // SA101 Box 37 - Bonus issues
  };
  closeCompanyLoansWrittenOff?: {
    customerReference?: string;
    grossAmount?: number;                  // SA101 Box 38 - Close company loans
  };
}

interface ForeignDividendsIncome {
  foreignDividend?: Array<{
    countryCode: string;                   // ISO 3166-1 alpha-3
    amountBeforeTax?: number;
    taxTakenOff?: number;                  // Foreign tax paid (for relief)
    specialWithholdingTax?: number;
    foreignTaxCreditRelief?: boolean;
    taxableAmount: number;                 // SA100 Box 6 - Foreign dividends
  }>;
}
```

### TaxFolio Wizard → API Mapping (Dividends)

```typescript
const DIVIDENDS_MAPPING = {
  'wizard.dividends.ukDividends': 'ukDividends',                             // Box 4
  'wizard.dividends.ukDividendsFromUnitTrusts': 'otherUkDividends',          // Box 5
  'wizard.dividends.foreignDividends': 'foreignDividend[].taxableAmount',    // Box 6
  'wizard.dividends.foreignTaxPaid': 'foreignDividend[].taxTakenOff',        // For relief
};
```

---

## 5. Individuals Savings Income API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/income-received/savings`
**Maps to:** SA100 Boxes 1-3

### Schema

```typescript
interface SavingsIncome {
  securities?: {
    taxTakenOff?: number;                  // Tax deducted at source
    grossAmount?: number;                  // SA100 Box 1 - Taxed UK interest
    netAmount?: number;
  };
  foreignInterest?: Array<{
    countryCode: string;
    amountBeforeTax?: number;
    taxTakenOff?: number;                  // Foreign tax paid
    specialWithholdingTax?: number;
    taxableAmount: number;                 // SA100 Box 3 - Foreign interest
    foreignTaxCreditRelief?: boolean;
  }>;
}

// Untaxed interest (banks/building societies - most common now)
interface UKSavingsAccountsIncome {
  savingsAccounts?: Array<{
    savingsAccountId: string;
    accountName: string;
    grossAmount: number;                   // SA100 Box 2 - Untaxed UK interest
  }>;
}
```

### TaxFolio Wizard → API Mapping (Savings)

```typescript
const SAVINGS_MAPPING = {
  'wizard.interest.untaxedUKInterest': 'savingsAccounts[].grossAmount',      // Box 2
  'wizard.interest.taxedUKInterest': 'securities.grossAmount',               // Box 1
  'wizard.interest.taxDeducted': 'securities.taxTakenOff',
  'wizard.interest.foreignInterest': 'foreignInterest[].taxableAmount',      // Box 3
};
```

---

## 6. CIS Deductions API

**API Version:** 2.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/deductions/cis`
**Maps to:** SA100 Box 17 (CIS deductions)

### Key Points
- CIS deductions are **pre-populated** from contractor submissions
- Subcontractor can **override** if they disagree
- Must be submitted **before** final declaration

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{nino}/current-position` | GET | View CIS deductions from contractors |
| `/{nino}/amendments/{taxYear}` | POST | Create CIS deductions (if disagreeing) |
| `/{nino}/amendments/{taxYear}/{submissionId}` | PUT | Amend CIS deductions |
| `/{nino}/amendments/{taxYear}/{submissionId}` | DELETE | Delete CIS deductions |

### Schema

```typescript
interface CISDeductionsCreate {
  fromDate: string;                        // Start of period YYYY-MM-DD
  toDate: string;                          // End of period YYYY-MM-DD
  contractorName: string;                  // Contractor's name
  employerRef: string;                     // Contractor's employer reference
  periodData: Array<{
    deductionFromDate: string;             // YYYY-MM-DD
    deductionToDate: string;               // YYYY-MM-DD
    deductionAmount: number;               // CIS deducted (usually 20% or 30%)
    costOfMaterials?: number;              // Materials cost if applicable
    grossAmountPaid: number;               // Total gross payment
  }>;
}
```

### TaxFolio Wizard → API Mapping (CIS)

```typescript
const CIS_MAPPING = {
  'wizard.cis[].contractorName': 'contractorName',
  'wizard.cis[].grossPayments': 'periodData[].grossAmountPaid',
  'wizard.cis[].cisDeductions': 'periodData[].deductionAmount',              // → SA100 Box 17
  'wizard.cis[].materialsDeducted': 'periodData[].costOfMaterials',
};
```

---

## 7. Individuals State Benefits API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/state-benefits`
**Maps to:** SA100 Boxes 13-15

### Taxable Benefits

| Benefit Type | API Value | SA100 Box |
|--------------|-----------|-----------|
| State Pension | `statePension` | Box 13 |
| State Pension Lump Sum | `statePensionLumpSum` | Box 14 |
| JSA (contribution-based) | `jobSeekersAllowance` | Box 15 |
| ESA (contribution-based) | `employmentAndSupportAllowance` | Box 15 |
| Bereavement Allowance | `bereavementAllowance` | Box 15 |
| Carer's Allowance | - | Box 15 |

### Schema

```typescript
interface StateBenefits {
  stateBenefits?: Array<{
    benefitType:
      | 'statePension'
      | 'statePensionLumpSum'
      | 'employmentSupportAllowance'
      | 'jobSeekersAllowance'
      | 'bereavementAllowance'
      | 'otherStateBenefits';
    startDate: string;
    endDate?: string;
    amount?: number;                       // Amount received
    taxPaid?: number;                      // Tax deducted
  }>;
}
```

### TaxFolio Wizard → API Mapping (State Benefits)

```typescript
const STATE_BENEFITS_MAPPING = {
  'wizard.stateBenefits.statePension': { benefitType: 'statePension', amount },        // Box 13
  'wizard.stateBenefits.jobseekersAllowance': { benefitType: 'jobSeekersAllowance', amount }, // Box 15
  'wizard.stateBenefits.employmentSupportAllowance': { benefitType: 'employmentSupportAllowance', amount },
  'wizard.stateBenefits.bereavementAllowance': { benefitType: 'bereavementAllowance', amount },
};
```

---

## 8. Individuals Pensions Income API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/income-received/pensions`
**Maps to:** SA100 Boxes 8-12

### Schema

```typescript
interface PensionsIncome {
  foreignPension?: Array<{
    countryCode: string;
    amountBeforeTax?: number;
    taxTakenOff?: number;
    specialWithholdingTax?: number;
    foreignTaxCreditRelief?: boolean;
    taxableAmount: number;
  }>;

  overseasPensionContributions?: Array<{
    customerReference?: string;
    exemptEmployersPensionContribs: number;
    migrantMemReliefQopsRefNo?: string;
    dblTaxationRelief?: number;
    dblTaxationCountryCode?: string;
    dblTaxationArticle?: string;
    dblTaxationTreaty?: string;
    sf74reference?: string;
  }>;
}

// UK Pension income goes via State Benefits API for State Pension
// or via Employments API if company pension
```

### TaxFolio Wizard → API Mapping (Pensions)

```typescript
const PENSIONS_MAPPING = {
  // State Pension - use State Benefits API
  'wizard.pension.statePension': 'stateBenefits[].amount where benefitType=statePension',

  // Private/Occupational Pensions - often pre-populated like employment
  'wizard.pension.privatePensions[].grossAmount': 'employment.pay.taxablePayToDate',
  'wizard.pension.privatePensions[].taxDeducted': 'employment.pay.totalTaxToDate',

  // Foreign Pensions
  'wizard.pension.foreignPensions[].amount': 'foreignPension[].taxableAmount',
  'wizard.pension.foreignPensions[].taxPaid': 'foreignPension[].taxTakenOff',
};
```

---

## 9. Individuals Capital Gains API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/income-received/other/capital-gains`
**Maps to:** SA108

### Schema

```typescript
interface CapitalGainsSubmission {
  disposals?: Array<{
    assetType:
      | 'otherProperty'           // Non-residential property
      | 'listedShares'            // Listed shares
      | 'unlistedShares'          // Unlisted shares
      | 'otherAsset';             // Other assets
    assetDescription: string;
    acquisitionDate: string;       // YYYY-MM-DD
    disposalDate: string;          // YYYY-MM-DD
    disposalProceeds: number;      // SA108 Box 5 - Sale proceeds
    allowableCosts: number;        // SA108 Box 6 - Acquisition + improvement costs
    gain?: number;                 // SA108 Box 7 - Gain
    loss?: number;                 // SA108 Box 8 - Loss
    claimOrElectionCodes?: string[];
    gainAfterRelief?: number;
    lossAfterRelief?: number;
  }>;

  // Residential Property (different tax rates)
  residentialPropertyDisposalsInformation?: {
    completionDate: string;
    disposalProceeds: number;
    acquisitionDate: string;
    acquisitionAmount: number;
    improvementCosts?: number;
    additionalCosts?: number;
    prfAmount?: number;            // Private Residence Relief
    otherReliefs?: number;
  };

  // Carried interest (fund managers)
  carriedInterest?: {
    gain: number;
  };

  // Losses
  losses?: {
    broughtForwardLossesUsedInCurrentYear?: number;  // SA108 Box 12
    setAgainstInYearGains?: number;
    setAgainstInYearGeneralIncome?: number;
    setAgainstEarlierYear?: number;
  };

  // Annual exempt amount
  adjustments?: {
    annualExemptAmount?: number;   // £3,000 for 2024/25
  };
}
```

### TaxFolio Wizard → API Mapping (Capital Gains)

```typescript
const CAPITAL_GAINS_MAPPING = {
  // Per disposal
  'wizard.capitalGains.disposals[].assetType': 'disposals[].assetType',
  'wizard.capitalGains.disposals[].assetDescription': 'disposals[].assetDescription',
  'wizard.capitalGains.disposals[].dateSold': 'disposals[].disposalDate',
  'wizard.capitalGains.disposals[].proceedsAmount': 'disposals[].disposalProceeds',   // Box 5
  'wizard.capitalGains.disposals[].acquisitionCost': 'disposals[].allowableCosts',    // Box 6
  'wizard.capitalGains.disposals[].gain': 'disposals[].gain',                          // Box 7
  'wizard.capitalGains.disposals[].loss': 'disposals[].loss',                          // Box 8

  // Losses brought forward
  'wizard.capitalGains.lossesFromPreviousYears': 'losses.broughtForwardLossesUsedInCurrentYear', // Box 12
};
```

---

## 10. Individuals Reliefs API

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/reliefs`
**Maps to:** SA100 + SA101

### Relief Types

| Relief | API Endpoint | SA Form |
|--------|--------------|---------|
| Pension Contributions | `/pensions` | SA100 Box 1-2 |
| Gift Aid | `/investment` | SA100 Box 5-8 |
| EIS/SEIS/VCT | `/investment` | SA101 Box 2-7 |
| Maintenance Payments | `/other` | SA100 Box 10 |
| Blind Person's Allowance | `/other` | SA100 Box 15 |

### Pension Contributions Schema

```typescript
interface PensionReliefs {
  pensionReliefs: {
    regularPensionContributions?: number;      // SA100 Box 1 - Regular contributions
    oneOffPensionContributionsPaid?: number;   // SA100 Box 2 - One-off contributions
    retirementAnnuityPayments?: number;        // SA100 Box 3
    paymentToEmployersSchemeNoTaxRelief?: number;
    overseasPensionSchemeContributions?: number;
  };
}
```

### Investment Reliefs Schema (EIS/SEIS/VCT/Gift Aid)

```typescript
interface InvestmentReliefs {
  // Venture Capital Schemes
  vctSubscription?: Array<{
    uniqueInvestmentRef: string;
    name?: string;
    dateOfInvestment?: string;
    amountInvested?: number;                   // SA101 Box 6 - VCT subscriptions
    reliefClaimed?: number;                    // SA101 Box 7 - VCT relief
  }>;

  eisSubscription?: Array<{
    uniqueInvestmentRef: string;
    name?: string;
    knowledgeIntensive?: boolean;
    dateOfInvestment?: string;
    amountInvested?: number;                   // SA101 Box 2 - EIS subscriptions
    reliefClaimed?: number;                    // SA101 Box 3 - EIS relief
  }>;

  seedEnterpriseInvestment?: Array<{
    uniqueInvestmentRef: string;
    name?: string;
    dateOfInvestment?: string;
    amountInvested?: number;                   // SA101 Box 4 - SEIS subscriptions
    reliefClaimed?: number;                    // SA101 Box 5 - SEIS relief
  }>;

  // Gift Aid
  giftAidPayments?: {
    currentYear?: number;                      // SA100 Box 5 - Gift Aid donations
    oneOffCurrentYear?: number;
    currentYearTreatedAsPreviousYear?: number; // SA100 Box 6
    nextYearTreatedAsCurrentYear?: number;
    nonUkCharities?: number;
  };

  // Gifts of shares/property to charity
  giftsOfSharesOrSecurities?: number;          // SA100 Box 7
  giftsOfLandAndBuildings?: number;            // SA100 Box 8
}
```

### TaxFolio Wizard → API Mapping (Reliefs)

```typescript
const RELIEFS_MAPPING = {
  // Pensions
  'wizard.general.pension.personalContributions': 'pensionReliefs.regularPensionContributions',   // Box 1
  'wizard.general.pension.oneOffContributions': 'pensionReliefs.oneOffPensionContributionsPaid',  // Box 2

  // Gift Aid
  'wizard.general.charitable.giftAidDonations': 'giftAidPayments.currentYear',                    // Box 5
  'wizard.general.charitable.giftAidTreatedAsPreviousYear': 'giftAidPayments.currentYearTreatedAsPreviousYear', // Box 6
  'wizard.general.charitable.giftOfShares': 'giftsOfSharesOrSecurities',                          // Box 7
  'wizard.general.charitable.giftOfProperty': 'giftsOfLandAndBuildings',                          // Box 8

  // Venture Capital
  'wizard.general.ventureCapital.eisInvestments': 'eisSubscription[].amountInvested',             // Box 2
  'wizard.general.ventureCapital.eisReliefClaimed': 'eisSubscription[].reliefClaimed',            // Box 3
  'wizard.general.ventureCapital.seisInvestments': 'seedEnterpriseInvestment[].amountInvested',   // Box 4
  'wizard.general.ventureCapital.seisReliefClaimed': 'seedEnterpriseInvestment[].reliefClaimed',  // Box 5
  'wizard.general.ventureCapital.vctInvestments': 'vctSubscription[].amountInvested',             // Box 6
  'wizard.general.ventureCapital.vctReliefClaimed': 'vctSubscription[].reliefClaimed',            // Box 7
};
```

---

## 11. Individuals Disclosures API (Marriage Allowance)

**API Version:** 1.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/disclosures`
**Maps to:** SA100 Box 13

### Marriage Allowance Schema

```typescript
interface MarriageAllowance {
  marriageAllowance?: {
    marriageAllowanceTransferOut?: {
      partnerNino?: string;                    // Spouse's NINO
      firstName?: string;
      surname?: string;
      dateOfBirth?: string;
      amount?: number;                         // £1,260 for 2024/25
    };
    marriageAllowanceTransferIn?: {
      partnerNino?: string;
      firstName?: string;
      surname?: string;
      dateOfBirth?: string;
      amount?: number;
    };
  };
}
```

### TaxFolio Wizard → API Mapping (Marriage Allowance)

```typescript
const MARRIAGE_ALLOWANCE_MAPPING = {
  // Transfer OUT (giving allowance to spouse)
  'wizard.general.marriageAllowance.type === "transfer"': {
    endpoint: 'marriageAllowanceTransferOut',
    'wizard.general.marriageAllowance.spouseNino': 'partnerNino',
    'wizard.general.marriageAllowance.spouseName': ['firstName', 'surname'],
  },

  // Transfer IN (receiving allowance from spouse)
  'wizard.general.marriageAllowance.type === "receive"': {
    endpoint: 'marriageAllowanceTransferIn',
    'wizard.general.marriageAllowance.spouseNino': 'partnerNino',
    'wizard.general.marriageAllowance.spouseName': ['firstName', 'surname'],
  },
};
```

---

## 12. Individual Calculations API (Tax Calculation & Final Declaration)

**API Version:** 7.0
**Base URL:** `https://api.service.hmrc.gov.uk/individuals/calculations/self-assessment`
**Purpose:** Trigger calculations and submit final declaration

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{nino}/{taxYear}/{calculationType}` | POST | Trigger calculation |
| `/{nino}/self-assessment/{taxYear}/{calculationId}` | GET | Retrieve calculation |
| `/{nino}/self-assessment/{taxYear}/{calculationId}/final-declaration` | POST | Submit final declaration |

### Calculation Types

```typescript
type CalculationType =
  | 'in-year'              // Mid-year estimate
  | 'intent-to-crystallise' // Pre-final check (deprecated name)
  | 'final-declaration'    // Final submission
  | 'intent-to-amend'      // For amendments (2025-26+)
  | 'confirm-amendment';   // Confirm amendment (2025-26+)
```

### Trigger Calculation Request

```typescript
// POST /individuals/calculations/self-assessment/{nino}/{taxYear}/{calculationType}

// Response includes:
interface CalculationResponse {
  calculationId: string;  // Use this to retrieve full calculation
}
```

### Retrieve Calculation Response (Summary)

```typescript
interface TaxCalculation {
  metadata: {
    calculationId: string;
    taxYear: string;               // "2024-25"
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

        taxBands: Array<{
          name: string;              // "BRT", "HRT", "ART"
          rate: number;              // 20, 40, 45
          bandLimit: number;
          apportionedBandLimit: number;
          income: number;
          taxAmount: number;
        }>;
      };

      savingsAndGains?: {
        incomeReceived: number;
        taxableIncome: number;
        incomeTaxAmount: number;
        taxBands: Array<{...}>;
      };

      dividends?: {
        incomeReceived: number;
        taxableIncome: number;
        incomeTaxAmount: number;
        taxBands: Array<{...}>;
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
        nic4Bands: Array<{
          name: string;
          rate: number;
          threshold: number;
          income: number;
          amount: number;
        }>;
      };
    };

    totalIncomeTax: number;
    totalNicsDue: number;
    totalTaxDue: number;

    taxDeductedAtSource?: {
      payeEmployments: number;
      ukLandAndProperty: number;
      savings: number;
      cis: number;                    // CIS deductions offset
    };

    // What customer owes/is owed
    incomeTaxAndNicsDue: number;
    totalTaxDeducted: number;

    // Final liability
    taxDue?: number;
    taxOverpaid?: number;
  };

  messages?: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    text: string;
  }>;
}
```

### Final Declaration Submission

```typescript
// POST /individuals/calculations/self-assessment/{nino}/{taxYear}/{calculationId}/final-declaration

// Request body: Empty (declaration is implicit)
// Headers must include:
// - Authorization: Bearer {token}
// - Content-Type: application/json
// - Gov-Test-Scenario: (in sandbox)

// Successful response: 204 No Content
```

---

## Complete Submission Checklist

### Pre-Submission Validation

```typescript
interface SubmissionValidation {
  // 1. Business Income Sources
  selfEmployment: {
    hasBusinessId: boolean;              // Must register business first
    periodSummariesSubmitted: boolean;   // At least 1 period
    annualSubmissionComplete: boolean;
    expensesCategorised: boolean;        // All expenses mapped to API fields
  };

  property: {
    hasBusinessId: boolean;
    periodSummariesSubmitted: boolean;
    annualSubmissionComplete: boolean;
    financeCostsRestrictionApplied: boolean; // For residential property
  };

  // 2. Personal Income
  employment: {
    hmrcDataReviewed: boolean;           // User confirmed HMRC data
    customAmendmentsSubmitted: boolean;  // If disagreeing
  };

  dividends: {
    ukDividendsSubmitted: boolean;
    foreignDividendsSubmitted: boolean;
    withinAllowance: boolean;            // £500 allowance
  };

  savings: {
    untaxedInterestSubmitted: boolean;
    taxedInterestSubmitted: boolean;
    withinPSA: boolean;                  // Personal Savings Allowance
  };

  cis: {
    deductionsReviewed: boolean;
    amendmentsSubmitted: boolean;        // If disagreeing with contractor data
  };

  // 3. Reliefs & Allowances
  reliefs: {
    pensionContributionsSubmitted: boolean;
    giftAidSubmitted: boolean;
    ventureCapitalSubmitted: boolean;
    marriageAllowanceSubmitted: boolean;
  };

  // 4. Capital Gains (if applicable)
  capitalGains: {
    allDisposalsSubmitted: boolean;
    annualExemptApplied: boolean;        // £3,000
    lossesClaimedCorrectly: boolean;
  };

  // 5. Final Steps
  calculation: {
    calculationTriggered: boolean;
    calculationRetrieved: boolean;
    noBlockingErrors: boolean;
    userReviewedCalculation: boolean;
  };

  declaration: {
    declarationAccepted: boolean;
    timestamp: string;
  };
}
```

### API Call Sequence

```typescript
async function submitSelfAssessment(wizardData: WizardData) {
  const { nino, taxYear } = wizardData.user;

  // 1. Submit Self Employment (if applicable)
  if (wizardData.selfEmployment) {
    for (const business of wizardData.selfEmployment.businesses) {
      // Period summary
      await submitSelfEmploymentPeriod(nino, business.businessId, taxYear, {
        periodIncome: transformIncomeData(business),
        periodExpenses: transformExpenseData(business),
      });

      // Annual submission
      await submitSelfEmploymentAnnual(nino, business.businessId, taxYear, {
        allowances: transformAllowances(business),
        adjustments: transformAdjustments(business),
      });
    }
  }

  // 2. Submit Property Income (if applicable)
  if (wizardData.rental) {
    for (const property of wizardData.rental.properties) {
      await submitPropertyPeriod(nino, property.businessId, taxYear, {...});
      await submitPropertyAnnual(nino, property.businessId, taxYear, {...});
    }
  }

  // 3. Submit Employment (only if amending HMRC data)
  if (wizardData.employment?.hasAmendments) {
    for (const job of wizardData.employment.jobs) {
      await submitEmploymentFinancialData(nino, taxYear, job.employmentId, {...});
    }
  }

  // 4. Submit Dividends
  if (wizardData.dividends?.ukDividends > 0) {
    await submitUKDividends(nino, taxYear, {
      ukDividends: wizardData.dividends.ukDividends,
      otherUkDividends: wizardData.dividends.otherUkDividends,
    });
  }

  // 5. Submit Savings Interest
  if (wizardData.interest) {
    await submitSavingsIncome(nino, taxYear, {...});
  }

  // 6. Submit CIS (if amending)
  if (wizardData.cis?.hasAmendments) {
    await submitCISDeductions(nino, taxYear, {...});
  }

  // 7. Submit State Benefits (if taxable)
  if (wizardData.stateBenefits) {
    await submitStateBenefits(nino, taxYear, {...});
  }

  // 8. Submit Capital Gains
  if (wizardData.capitalGains?.disposals?.length > 0) {
    await submitCapitalGains(nino, taxYear, {...});
  }

  // 9. Submit Reliefs
  if (wizardData.general) {
    if (wizardData.general.pension) {
      await submitPensionReliefs(nino, taxYear, {...});
    }
    if (wizardData.general.charitable) {
      await submitInvestmentReliefs(nino, taxYear, {...});
    }
    if (wizardData.general.marriageAllowance) {
      await submitMarriageAllowance(nino, taxYear, {...});
    }
  }

  // 10. Trigger Calculation
  const { calculationId } = await triggerCalculation(nino, taxYear, 'final-declaration');

  // 11. Retrieve & Display Calculation
  const calculation = await retrieveCalculation(nino, taxYear, calculationId);

  // 12. User Reviews Calculation
  // ... show calculation to user ...

  // 13. Submit Final Declaration
  if (userAcceptsDeclaration) {
    await submitFinalDeclaration(nino, taxYear, calculationId);
    return { success: true, calculationId };
  }
}
```

---

## Error Handling

### Common API Errors

| Error Code | Meaning | Resolution |
|------------|---------|------------|
| `RULE_TAX_YEAR_NOT_SUPPORTED` | Tax year not valid | Check tax year format (2024-25) |
| `RULE_TAX_YEAR_RANGE_INVALID` | Tax year out of range | Current or previous 4 years only |
| `MATCHING_RESOURCE_NOT_FOUND` | Business/employment not found | Register business first |
| `RULE_ALREADY_EXISTS` | Submission already exists | Use PUT to amend |
| `RULE_INCORRECT_OR_EMPTY_BODY_SUBMITTED` | Invalid request body | Validate all fields |
| `FORMAT_VALUE` | Value format invalid | Check decimal places (max 2) |
| `RULE_OUTSIDE_AMENDMENT_WINDOW` | Too late to amend | Contact HMRC directly |
| `RULE_FINAL_DECLARATION_RECEIVED` | Already submitted | Cannot resubmit |

### Field Validation Rules

```typescript
const VALIDATION_RULES = {
  // Monetary values
  monetaryField: {
    min: -99999999999.99,
    max: 99999999999.99,
    decimalPlaces: 2,
  },

  // Positive-only monetary (most expenses)
  positiveMonetary: {
    min: 0,
    max: 99999999999.99,
    decimalPlaces: 2,
  },

  // Dates
  dateField: {
    format: 'YYYY-MM-DD',
    minYear: 2017,  // MTD started
    maxYear: currentTaxYear,
  },

  // Tax year
  taxYear: {
    format: 'YYYY-YY',  // e.g., "2024-25"
    supported: ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'],
  },

  // NINO
  nino: {
    pattern: /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/,
  },

  // Business ID
  businessId: {
    pattern: /^X[A-Z0-9]{14}$/,  // e.g., "XAIS12345678901"
  },
};
```

---

## Testing

**Official HMRC Testing Docs:** https://developer.service.hmrc.gov.uk/api-documentation/docs/testing

### Sandbox Environment

```
Base URL: https://test-api.service.hmrc.gov.uk
```

### Stateful vs Dynamic (Stateless) Testing

The HMRC Sandbox has two types of behaviour:

#### Dynamic (Stateless) Scenarios
- Respond based on submitted parameters (NINO, tax year)
- Data is **NOT stored** for future requests
- Does not affect the behaviour of other endpoints
- Use `Gov-Test-Scenario` headers to trigger specific responses

#### Stateful Scenarios
- Data **persists for 7 days** after submission
- Allows testing complete workflows across related APIs
- Must create test data before it can be retrieved
- Use `Gov-Test-Scenario: STATEFUL` header to enable

**Important:** Many "resource not found" errors in sandbox occur because:
1. The test user has no pre-registered businesses
2. You haven't submitted data to the stateful endpoint first
3. The test data expired (7-day limit)

### Setting Up Test Data for Full Workflow

To test a complete Self-Employment or Property submission journey:

```
1. Create Test User (generates NINO, UTR automatically)
   ↓
2. Register a Business (Self-Employment or Property)
   POST /individuals/business/details/{nino}
   with Gov-Test-Scenario: STATEFUL
   ↓
3. Submit Period Summaries (quarterly)
   POST /individuals/business/self-employment/{nino}/{businessId}/period/{taxYear}
   ↓
4. Submit Annual Submission
   PUT /individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}
   ↓
5. Trigger Tax Calculation
   POST /individuals/calculations/self-assessment/{nino}/{taxYear}/final-declaration
   ↓
6. Retrieve Calculation (use returned calculationId)
   GET /individuals/calculations/self-assessment/{nino}/self-assessment/{taxYear}/{calculationId}
   ↓
7. Submit Final Declaration
   POST /individuals/calculations/self-assessment/{nino}/{taxYear}/{calculationId}/final-declaration
```

### Gov-Test-Scenario Headers

Pass via HTTP header: `Gov-Test-Scenario: <SCENARIO_NAME>`

```typescript
const GOV_TEST_SCENARIOS = {
  // Stateful mode (data persists)
  'STATEFUL': 'Enable stateful mode - data persists for 7 days',

  // Self Employment
  'SELF_EMPLOYMENT': 'Default self-employment data',
  'SELF_EMPLOYMENT_MULTIPLE': 'Multiple self-employments',

  // Property
  'UK_PROPERTY': 'UK property data',
  'FOREIGN_PROPERTY': 'Foreign property data',

  // Business Details - use specific NINOs for pre-seeded data
  'DYNAMIC': 'Uses the submitted data (stateless)',

  // Calculations
  'TAX_CALCULATION': 'Full calculation response',
  'TAX_CALCULATION_ERROR': 'Calculation with errors',
  'TAX_CALCULATION_UNCONFIRMED': 'Unconfirmed calculation',

  // Final Declaration
  'FINAL_DECLARATION_ACCEPTED': 'Successful submission',
  'FINAL_DECLARATION_TAX_YEAR_NOT_ENDED': 'Tax year not ended error',

  // Error scenarios
  'NOT_FOUND': 'Resource not found (404)',
  'TAX_YEAR_NOT_SUPPORTED': 'Tax year not valid',
  'RULE_INCORRECT_GOV_TEST_SCENARIO': 'Invalid scenario header',
};
```

### Test Users

**Create test users via:** https://developer.service.hmrc.gov.uk/api-test-user

Or use the **Create Test User API** for automated testing.

Required enrolments:
- `MTD Income Tax (Self Assessment)`

**Important notes:**
- Test users inactive for **3 months** are automatically deleted
- Tax identifiers (NINO, UTR) are auto-generated - cannot be customized
- Each test user starts with no pre-existing data
- To "reset" test data, create a new test user

### Common Sandbox Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `MATCHING_RESOURCE_NOT_FOUND` | No business registered | Register business first with POST to business details API |
| `NOT_FOUND` (404) | No data submitted | Submit period/annual data before retrieving |
| `NOT_SUBSCRIBED` | Missing API subscription | Subscribe app to required APIs in Developer Hub |
| `RULE_TAX_YEAR_NOT_SUPPORTED` | Tax year out of range | Use current or recent tax years (2021-22 onwards) |
| `INVALID_NINO` | Wrong NINO format | Use test user's generated NINO exactly |

### Sandbox vs Production Differences

| Aspect | Sandbox | Production |
|--------|---------|------------|
| Base URL | test-api.service.hmrc.gov.uk | api.service.hmrc.gov.uk |
| Data persistence | 7 days | Permanent |
| Pre-populated data | None (must create) | Real taxpayer data |
| 2-step verification | Skipped | Required |
| Identity checks | Skipped | Required |
| Rate limiting | Relaxed | Strict |

---

## Key Tax Year Values (2024/25)

| Allowance/Threshold | Amount |
|---------------------|--------|
| Personal Allowance | £12,570 |
| Basic Rate Band | £12,571 - £50,270 |
| Higher Rate Band | £50,271 - £125,140 |
| Additional Rate | Over £125,140 |
| Personal Allowance Taper | £100,000 income |
| Dividend Allowance | £500 |
| Personal Savings Allowance (Basic) | £1,000 |
| Personal Savings Allowance (Higher) | £500 |
| Capital Gains Annual Exempt | £3,000 |
| Trading Allowance | £1,000 |
| Property Allowance | £1,000 |
| Marriage Allowance Transfer | £1,260 |
| Blind Person's Allowance | £3,070 |
| Class 2 NIC Weekly | £3.45 |
| Class 2 Small Profits Threshold | £6,725 |
| Class 4 NIC Lower Threshold | £12,570 |
| Class 4 NIC Upper Threshold | £50,270 |
| Class 4 NIC Rate (Lower) | 6% |
| Class 4 NIC Rate (Upper) | 2% |

---

## Quick Reference: Wizard Field → API Field → SA Box

### Self Employment

| Wizard Field | API Field | SA103S Box | SA103F Box |
|--------------|-----------|------------|------------|
| businessIncome | turnover | 9 | 14 |
| otherIncome | other | 10 | 15 |
| costOfGoods | costOfGoods | 11 | 16 |
| travel | carVanTravelExpenses | 12 | 17 |
| staffCosts | wagesAndStaffCosts | 13 | 18 |
| premises | premisesRunningCosts | 14 | 19 |
| repairs | maintenanceCosts | 15 | 20 |
| professional | professionalFees | 16 | 27 |
| bankCharges | interestOnBankOtherLoans | 17 | 23 |
| office | adminCosts | 18 | 24 |
| other | otherExpenses | 19 | 29 |
| aia | annualInvestmentAllowance | 23 | 33 |
| zeroEmission | zeroEmissionsGoodsVehicleAllowance | 24.1 | 36 |

### Property (SA105)

| Wizard Field | API Field | SA105 Box |
|--------------|-----------|-----------|
| rentReceived | periodAmount | 5.1 |
| premiums | premiumsOfLeaseGrant | 4 |
| taxDeducted | taxDeducted | 6 |
| otherIncome | otherIncome | 7 |
| premises | premisesRunningCosts | 8 |
| repairs | repairsAndMaintenance | 9 |
| finance | financialCosts | 10 |
| legal | professionalFees | 11 |
| services | costOfServices | 12 |
| other | other | 13 |

### Employment (SA102)

| Wizard Field | API Field | SA102 Box |
|--------------|-----------|-----------|
| payReceived | taxablePayToDate | 1 |
| taxDeducted | totalTaxToDate | 2 |
| tips | tips | 3 |
| companyCar | car | 9 |
| carFuel | carFuel | 10 |
| medicalInsurance | medicalInsurance | 11 |
| otherBenefits | otherItems | 12 |

### Main Return (SA100)

| Wizard Field | API Field | SA100 Box |
|--------------|-----------|-----------|
| taxedInterest | securities.grossAmount | 1 |
| untaxedInterest | savingsAccounts[].grossAmount | 2 |
| foreignInterest | foreignInterest[].taxableAmount | 3 |
| ukDividends | ukDividends | 4 |
| otherDividends | otherUkDividends | 5 |
| foreignDividends | foreignDividend[].taxableAmount | 6 |
| statePension | stateBenefits[].amount | 13 |
| statePensionLumpSum | stateBenefits[].amount | 14 |
| otherBenefits | stateBenefits[].amount | 15 |
| cisDeductions | periodData[].deductionAmount | 17 |

### Capital Gains (SA108)

| Wizard Field | API Field | SA108 Box |
|--------------|-----------|-----------|
| disposalProceeds | disposalProceeds | 5 |
| acquisitionCost | allowableCosts | 6 |
| gain | gain | 7 |
| loss | loss | 8 |
| lossesUsed | broughtForwardLossesUsedInCurrentYear | 12 |

### Reliefs (SA100)

| Wizard Field | API Field | SA100 Box |
|--------------|-----------|-----------|
| regularPension | regularPensionContributions | 1 |
| oneOffPension | oneOffPensionContributionsPaid | 2 |
| giftAid | giftAidPayments.currentYear | 5 |
| giftAidPrevYear | giftAidPayments.currentYearTreatedAsPreviousYear | 6 |
| giftOfShares | giftsOfSharesOrSecurities | 7 |
| giftOfProperty | giftsOfLandAndBuildings | 8 |

---

## Implementation Status

### Currently Implemented
- [x] Self Employment Business API (basic)
- [x] Property Business API (basic)
- [ ] Employment Income API
- [ ] Dividends Income API
- [ ] Savings Income API
- [ ] CIS Deductions API
- [ ] State Benefits API
- [ ] Pensions Income API
- [ ] Capital Gains API
- [ ] Reliefs API
- [ ] Disclosures API (Marriage Allowance)
- [ ] Individual Calculations API (Final Declaration)

### Priority for Implementation
1. Individual Calculations API (required for final submission)
2. Employment Income API (most common income type)
3. Dividends Income API
4. Savings Income API
5. Capital Gains API
6. Reliefs API
7. State Benefits API
8. CIS Deductions API
9. Pensions Income API
