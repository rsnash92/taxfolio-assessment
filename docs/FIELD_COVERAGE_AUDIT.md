# TaxFolio HMRC Field Coverage Audit

**Generated:** 2026-01-27
**Source:** MTR Tester 2024-25 v2.4.0 (HMRC Calculation Spreadsheet)
**Tax Year:** 2024-25

---

## Executive Summary

### Raw Field Count (from MTR Tester)

| Metric | Count | % |
|--------|------:|--:|
| **Total HMRC fields extracted** | 1,083 | 100% |
| Fully covered | 81 | 7% |
| Partially covered | 42 | 4% |
| Auto-calculated / N/A (SA110) | 25 | 2% |
| Out of scope (forms not implemented) | 349 | 32% |
| **In-scope fields** | **734** | **68%** |
| **In-scope covered (full + partial)** | **123** | **17%** |
| Gap - Priority 1 (must fix) | 120 | 11% |
| Gap - Priority 2 (should fix) | 364 | 34% |
| Gap - Priority 3 (nice to have) | 102 | 9% |

### XML-Adjusted Gap Count

> The raw field count over-reports SA108 gaps. HMRC's XML schema requires
> **aggregate totals only** for capital gains, not individual disposal records.
> Of the 68 SA108 "P1 gaps", only **8 are real gaps** for XML submission.
> This reduces the effective P1 gap count from 120 to **60**.

| Metric | Raw | Adjusted |
|--------|----:|--------:|
| SA108 P1 gaps | 68 | 8 |
| **Total P1 gaps** | **120** | **60** |
| SA108 effective coverage | 24% | **~75%** |

### Coverage by Implemented Form

| Form | Description | Total | Covered | Partial | Gaps | Coverage |
|------|-------------|------:|--------:|--------:|-----:|---------|
| SA102 | Employment | 28 | 17 | 5 | 6 | **79%** |
| SA108 | Capital Gains (XML-adjusted) | ~20 | 13 | 9 | 8 | **~75%** |
| SA103S | Self-Employment (Short) | 42 | 15 | 9 | 18 | **57%** |
| SA105 | Property Income | 61 | 12 | 7 | 42 | **31%** |
| SA100 | Main Return | 116 | 22 | 10 | 84 | **28%** |
| SA110 | Tax Calculation | 25 | 0 | 0 | 0 | **100%** (auto) |
| SA106 | Foreign Income | 158 | 0 | 2 | 156 | **1%** |
| NI | National Insurance | 14 | 2 | 0 | 11 | **14%** |

### Out-of-Scope Forms (Not Implementing)

| Form | Description | Fields | Reason |
|------|-------------|-------:|--------|
| SA104F | Partnership (Full) | 89 | Partnerships not supported |
| SA103L | Lloyd's Underwriters | 66 | Specialist form |
| SA109 | Non-Resident | 51 | Non-residents not supported |
| SA102M | Ministers of Religion | 46 | Specialist form |
| SA101 | Additional Information (partial) | 39 | Some fields out of scope |
| SA107 | Trusts | 31 | Trusts not supported |
| SA104S | Partnership (Short) | 26 | Partnerships not supported |

---

## Detailed Coverage by Form

### SA100 - Main Return

#### Covered Fields (22)

| Box | Description | Wizard Field |
|-----|-------------|-------------|
| INC/1 | Taxed UK interest | `interestData.taxedUKInterest` |
| INC/2 | Untaxed UK interest | `interestData.untaxedUKInterest` |
| INC/3 | Untaxed foreign interest (up to £2,000) | `dividendsData.ukDividends` |
| INC/4 | UK company dividends | `dividendsData.ukDividendsFromUnitTrusts` |
| INC/5 | Other dividends | `dividendsData.stockDividends` |
| INC/8 | State Pension | `pensionIncomeData.statePension` |
| INC/9 | State Pension lump sum | `pensionIncomeData.statePensionLumpSum` |
| INC/11 | Pensions (private/occupational) | `pensionIncomeData.privatePensions` |
| INC/12 | Tax taken off pensions | `pensionIncomeData.taxDeducted` |
| INC/15 | Jobseeker's Allowance | `stateBenefitsData` |
| INC/16 | Taxable State Pension/benefits | `stateBenefitsData.otherTaxableBenefits` |
| REL/1 | Pension payments (basic rate relief) | `general.pension.personalContributions` |
| REL/4 | Overseas pension (tax relief) | `general.charitable.giftAidDonations` |
| REL/5 | Gift Aid payments | `general.charitable.giftAidTreatedAsPreviousYear` |
| CBC/1 | Child Benefit amount | `childBenefitReceived` |
| SLR/1 | Student Loan notification | `studentLoanPlan` |
| SLR/2 | Student Loan deducted (PAYE) | `studentLoanDeductedThroughPAYE` |
| SLR/3 | Postgrad Loan deducted (PAYE) | `postgraduateLoanDeductedThroughPAYE` |
| YPD/1 | Date of birth | `personalInfo` |
| YPD/2 | Name and address | `personalInfo` |
| YPD/3 | Phone number | `personalInfo` |
| YPD/4 | National Insurance number | `personalInfo` |

#### Partially Covered Fields (10)

| Box | Description | Status |
|-----|-------------|--------|
| INC/6 | Foreign dividends (up to £1,000) | Captured but SA106 mapping incomplete |
| INC/7 | Tax taken off foreign dividends | Not separately tracked |
| INC/10 | Tax taken off State Pension lump sum | Captured but may need refinement |
| INC/13 | Taxable Incapacity Benefit | Basic support only |
| INC/14 | Tax taken off Incapacity Benefit | Basic support only |
| REL/2 | Retirement annuity payments | Not in wizard |
| REL/3 | Employer pension not deducted from pay | Not in wizard |
| REL/6 | One-off Gift Aid payments | Not in wizard |
| REL/13 | Blind Person's Allowance | Basic wizard support |
| REL/14 | Blind person register authority | Basic wizard support |

#### Priority 1 Gaps (17)

| Box | Description | Impact |
|-----|-------------|--------|
| INC/17 | Other taxable income | Freetext income not captured |
| INC/18 | Allowable expenses for other income | Related to INC/17 |
| INC/19 | Tax taken off other income | Related to INC/17 |
| INC/20 | Benefit from pre-owned assets | Specialist scenario |
| INC/21 | Description of income (boxes 17, 20) | Related to INC/17 |
| REL/1.1 | One-off pension payments in box 1 | Subset of pension payments |
| REL/7 | Gift Aid treated as previous year | Gift Aid timing |
| REL/8 | Gift Aid treated as current year | Gift Aid timing |
| REL/9 | Qualifying shares gifted to charity | Specialist relief |
| REL/10 | Land/buildings gifted to charity | Specialist relief |
| REL/11 | Value of investments gifted (non-UK) | Specialist relief |
| REL/12 | Gift Aid to non-UK charities | Subset of box 5 |
| REL/15 | Transfer Marriage Allowance (receive) | Marriage Allowance |
| REL/16 | Transfer Marriage Allowance (give) | Marriage Allowance |
| SLR/PT | Student Loan Plan Type | Internal field (auto-derived) |
| SLR/PGLRPT | Postgrad Loan Plan Type | Internal field (auto-derived) |
| SLR/HICBC | High Income Child Benefit Charge | Missing calculator support |

---

### SA102 - Employment

#### Covered Fields (17)

| Box | Description | Wizard Field |
|-----|-------------|-------------|
| 1 | Pay from employment (P45/P60) | `employmentData.payReceived` |
| 1.1 | Payrolled benefits | Tax code adjustment (auto) |
| 2 | UK tax taken off pay | `employmentData.taxDeducted` |
| 3 | Tips and other payments | `employmentData.tipsReceived` |
| 3.1 | Pension contribution (HMRC payment) | Tips from P11D |
| 9 | Company cars and vans | `employmentData.companyCarBenefit` |
| 10 | Fuel for company cars/vans | `employmentData.fuelBenefit` |
| 11 | Private medical insurance | `employmentData.medicalInsuranceBenefit` |
| 12 | Vouchers/credit cards/mileage | `employmentData.otherBenefits` |
| 13 | Goods and assets from employer | Total benefits (calculated) |
| 14 | Accommodation from employer | Benefits minus expenses |
| 15 | Other benefits (loans etc.) | `employmentData.travelExpenses` |
| 16 | Expenses payments received | `employmentData.professionalFees` |
| 17 | Business travel expenses | `employmentData.otherExpenses` |
| 18 | Fixed deductions for expenses | Pension contributions (payroll) |
| 19 | Professional fees/subscriptions | Other deductions |
| 20 | Other expenses/capital allowances | Foreign tax deductions |

#### Partially Covered Fields (5)

| Box | Description | Status |
|-----|-------------|--------|
| 4 | PAYE tax reference | Not tracked separately |
| 5 | Employer's name | Not tracked separately |
| 6 | Company director indicator | Not tracked |
| 7 | Close company indicator | Not tracked |
| 8 | Off-payroll working indicator | Not tracked |

#### Priority 1 Gaps (6)

| Box | Description | Impact |
|-----|-------------|--------|
| Benefits (1) | Benefits total | Aggregate field |
| Deductions (1) | Deductions total | Aggregate field |
| Employment (1) | Employment record container | Structural |
| 6.1 | Director cessation date | Director-specific |
| CL1_A | Class 1 NIC (column A) | NIC field from P60 |
| CL1_B | Class 1 NIC (column B) | NIC field from P60 |

---

### SA103S - Self-Employment (Short)

#### Covered Fields (15)

| Box | Description | Wizard Field |
|-----|-------------|-------------|
| 1 | Business description | `selfEmploymentData.businessDescription` |
| 2 | Business postcode | `selfEmploymentData.businessPostcode` |
| 3 | Details changed indicator | Date started |
| 4 | Foster carer indicator | Date ended |
| 5 | Date of commencement | Cash basis indicator |
| 6 | Date of cessation | Date ceased |
| 10 | Other income/profits | Turnover |
| 12 | Motor expenses | `selfEmploymentData.expenses.total` |
| 13 | Employee costs | Net profit (calculated) |
| 14 | Premises costs | `selfEmploymentData.capitalAllowances.total` |
| 29 | Losses used this year | `selfEmploymentData.losses.broughtForward` |
| 31 | Total taxable profits | Total taxable profits |
| 33 | Loss offset against income | Loss set against income |
| 36 | Class 2 NIC voluntary | Class 2 NIC voluntary |
| 37 | Class 4 NIC exempt | Class 4 NIC exempt |

#### Partially Covered Fields (9)

| Box | Description | Status |
|-----|-------------|--------|
| 7 | Accounting period end | Basic support |
| 8 | Traditional accounting indicator | Basic support |
| 9 | Sales/business income (turnover) | Mapped but needs refinement |
| 11 | Cost of sales | Part of expenses total |
| 15 | Repairs | Part of expenses total |
| 16 | Legal and professional costs | Part of expenses total |
| 34 | Loss to carry back | Basic loss support |
| 35 | Losses brought forward | Basic loss support |
| 38 | CIS deductions | Basic support |

#### Priority 1 Gaps (18)

| Box | Description | Impact |
|-----|-------------|--------|
| 10.1 | Trading income allowance | £1,000 allowance not tracked |
| 17 | Other finance charges | Expense breakdown missing |
| 18 | General admin expenses | Expense breakdown missing |
| 19 | Other expenses | Expense breakdown missing |
| 20 | Total expenses (sum) | Calculated from above |
| 21 | Net profit | Calculated |
| 22 | Net loss | Calculated |
| 23 | Annual Investment Allowance | Capital allowance detail missing |
| 24 | Unrelieved expenditure | Capital allowance detail missing |
| 24.1 | Zero-emission car allowance | Capital allowance detail missing |
| 25 | Other capital allowances | Capital allowance detail missing |
| 25.1 | Structures & Buildings Allowance | Capital allowance detail missing |
| 25.2 | Freeport S&B Allowance | Capital allowance detail missing |
| 26 | Total balancing charges | Capital allowance detail missing |
| 27 | Personal use adjustment | Not tracked |
| 28 | Net profit for tax purposes | Calculated |
| 30 | Any other business income | Not captured |
| 32 | Allowable loss for year | Calculated |

---

### SA105 - Property Income

#### Covered Fields (12)

| Box | Description | Wizard Field |
|-----|-------------|-------------|
| 1 | Number of properties | `rentalData` (count) |
| 5 | FHL income | Total rents and income |
| 6 | Rent, rates, insurance, ground rents | Tax taken off |
| 7 | Finance charges / interest | `rentalData.expenses` (premiums) |
| 8 | Legal and professional costs | `rentalData.expenses.repairsAndMaintenance` |
| 9 | Other expenses | `rentalData.mortgageInterest` |
| 10 | Private use proportions | Legal & professional costs |
| 11 | Balancing charges | Cost of services |
| 12 | Capital allowances | Other expenses |
| 13 | Adjusted profit | Total allowable expenses |
| 14 | FHL losses brought forward | Net profit |
| 15 | FHL taxable profit | `propertyIncome` |

#### Partially Covered Fields (7)

| Box | Description | Status |
|-----|-------------|--------|
| 2 | Property income ceased | Basic indicator |
| 3 | Property let jointly | Basic support |
| 4 | Rent a Room relief | Basic support |
| 16 | FHL loss for year | Partial |
| 17 | FHL loss to carry forward | Partial |
| 40 | Taxable profit | Partial |
| 42 | Loss set off against income | Partial |

#### Priority 2 Gaps (42)

The bulk of SA105 gaps relate to:
- **Furnished Holiday Lettings (FHL)** EEA and UK separate pages (boxes 14-20)
- **Non-FHL property** detailed expense breakdown (boxes 21-40)
- **Loss calculations** for non-FHL properties
- **Property income allowance** (£1,000 threshold)
- **Rent a Room** scheme details

---

### SA108 - Capital Gains

> **Important context:** HMRC's XML schema requires **aggregate totals only**, not
> individual disposal records. The MTR Tester spreadsheet lists every form box as a
> separate field (90 total), but the XML submission needs only ~20 key aggregate
> values. TaxFolio's approach of importing from Koinly/CoinTracker and calculating
> totals is architecturally correct. The "68 P1 gaps" from the raw field count
> reduce to **~8 real gaps** once XML requirements are considered.

#### Covered Fields (13)

| Box | Description | Wizard Field |
|-----|-------------|-------------|
| 1 | Your name | `personalInfo` |
| 3 | Number of disposals | Disposal count |
| 4 | Disposal proceeds | Total proceeds |
| 5 | Allowable costs | Total costs |
| 6 | Gains before losses (non-NRCGT) | Non-residential gains |
| 7 | Losses in year (non-NRCGT) | Total losses |
| 8 | Claims/elections code | Total gains |
| 23 | Number of disposals (other) | Other gains |
| 24 | Disposal proceeds (other) | Other gains after losses |
| 25 | Allowable costs (other) | BADR gains |
| 26 | Gains before losses (other) | BADR gains claimed |
| 45 | Losses brought forward used | Losses brought forward |
| 46 | Income losses set against gains | Losses vs gains |

#### Partially Covered Fields (9)

| Box | Description | Status |
|-----|-------------|--------|
| 9 | RTT gain/loss reported | Basic support |
| 10 | Tax on RTT gains already paid | Basic support |
| 11 | RTT residential property gain/loss | Basic support |
| 12 | Tax on RTT residential gains | Basic support |
| 14 | Number of disposals (residential) | Partial |
| 15 | Disposal proceeds (residential) | Partial |
| 16 | Allowable costs (residential) | Partial |
| 17 | Gains before losses (residential) | Partial |
| 18 | Attributed gains (residential) | Partial |

#### Real Gaps (8 fields, XML-adjusted)

The raw audit flagged 68 P1 gaps, but most are either optional detail fields,
specialist reliefs, or fields that map to the same aggregate XML elements already
covered. The **actual gaps** needed for XML submission are:

| Box | Description | Impact | Priority |
|-----|-------------|--------|----------|
| 13.4 | **Cryptoasset gains** (NEW 2024-25) | New dedicated crypto section | Must fix |
| 13.5 | **Cryptoasset losses** (NEW 2024-25) | New dedicated crypto section | Must fix |
| 51 | **CGT adjustment** | Required for Oct 30 2024 rate change | Must fix |
| 34 | Unlisted shares gains | Asset category split | Should fix |
| 35 | Unlisted shares losses | Asset category split | Should fix |
| 47 | Losses to carry forward | Auto-calculable | Should fix |
| 50 | BADR gains | If claiming relief | Can defer |
| 50.1 | Lifetime BADR/ER claimed | If claiming relief | Can defer |

#### Fields NOT Required for XML (can ignore)

These form fields appear on the paper SA108 but are **optional** in the XML schema
and/or are informational duplicates of aggregate fields already covered:

- **Individual disposal counts** (boxes 13.1, 14, 23, 31) - optional
- **Proceeds/costs breakdown** per category (boxes 13.2-13.3, 15-16, 24-25, 32-33) - optional
- **RTT/PPD fields** (boxes 9-12, 13.7-13.8, 21-22, 29-30, 37-38) - only if submitted via RTT
- **BADR breakdown** (boxes 17.1-17.4) - only if claiming BADR
- **ESS/SEIS fields** (boxes 39-40) - rare specialist scenarios
- **Loss vs income claims** (boxes 41-44, 48) - specialist loss relief
- **NRCGT fields** (boxes 52-52.5) - non-residents only (out of scope)
- **Carried interest** (boxes 13, 13A, 13B) - investment managers only

#### SA108 XML Structure

HMRC requires gains/losses as **aggregate totals by asset category**:

```
Residential Property:     Box 6 (gains) + Box 7 (losses)     ✅ Covered
Cryptoassets (NEW):       Box 13.4 (gains) + Box 13.5 (losses) ❌ Must add
Other Assets:             Box 17 (gains) + Box 19 (losses)    ✅ Covered
Listed Shares:            Box 26 (gains) + Box 27 (losses)    ✅ Covered
Unlisted Shares:          Box 34 (gains) + Box 35 (losses)    ⚠️ Should add
Losses Brought Forward:   Box 45                               ✅ Covered
CGT Adjustment:           Box 51                               ❌ Must add
```

---

### SA106 - Foreign Income

**Coverage: 1% (2 partial fields out of 158)**

Only two fields have any coverage:
- FOR/1: Unable to transfer income indicator (partial)
- FOR/2: Foreign Tax Credit Relief total (partial)

The remaining 156 fields cover:
- Foreign employment income and tax
- Foreign self-employment income
- Foreign rental income
- Foreign savings and dividends
- Foreign pensions
- Foreign tax credit relief details
- Remittance basis claims

> **Note:** SA106 is a Priority 2 form. Most UK taxpayers with simple foreign income can report up to £2,000 of foreign dividends and interest on the SA100 main return directly. Full SA106 support is needed for taxpayers with larger foreign income or requiring detailed FTCR claims.

---

### SA110 - Tax Calculation

**Coverage: 100% (auto-calculated)**

All 25 SA110 fields are automatically calculated by the tax engine. These include:
- Total income and taxable income
- Income tax charged at each band
- National Insurance contributions
- Student loan repayments
- Capital Gains Tax
- Total tax due / refund

---

### NI - National Insurance

#### Covered Fields (2)

| Field | Description | Wizard Field |
|-------|-------------|-------------|
| C4Ex | Class 4 NIC exempt | `class4Exempt` |
| C2_Vol | Class 2 NIC registered | `class2NICRegistered` |

#### Priority 1 Gaps (11)

| Field | Description | Impact |
|-------|-------------|--------|
| CL1 | Class 1 NIC from P60 | NIC credit calculation |
| CL2A | Class 2 amount payable | Auto-calculated |
| Employment | Employment NIC record | Structural |
| Ministers of religion | MoR NIC | Specialist |
| 1_MOR | Ministers rate | Specialist |
| C2_Vol | Class 2 voluntary amount | Amount field |
| Various | NIC deferment/max fields | Multi-employment edge case |

---

## Gap Analysis

### Priority 1 Gaps - Must Fix (60 fields, XML-adjusted)

> Raw count was 120 fields. Reduced to 60 after SA108 XML analysis showed that
> 60 of the 68 SA108 "gaps" are optional detail fields not required for XML submission.

These gaps affect core tax return functionality for common taxpayer scenarios.

**Top priorities by impact:**

1. **SA103S Self-Employment expenses breakdown (18)** - Individual expense categories (boxes 17-28) are collected as a total but not broken down into HMRC's required categories. Capital allowance detail (AIA, zero-emission, S&B) is missing.

2. **SA100 Main Return miscellaneous (17)** - Other taxable income (box 17), Marriage Allowance transfer (boxes 15-16), Gift Aid detail fields, and HICBC calculator support.

3. **NI fields (11)** - Class 1 NIC from P60, Class 2 amount calculation, and NIC deferment for multi-employment.

4. **SA108 Capital Gains - real gaps (8)** - Cryptoasset dedicated section (boxes 13.4-13.5, NEW for 2024-25), CGT adjustment for Oct 30 rate change (box 51), unlisted shares category, and BADR detail. See SA108 section for full XML-adjusted analysis.

5. **SA102 Employment metadata (6)** - Director status, off-payroll working, Class 1 NIC from P60/NPS.

### Priority 2 Gaps - Should Fix (364 fields)

These cover less common but still significant scenarios:

| Form | Fields | Description |
|------|-------:|-------------|
| SA106 | 156 | Full foreign income support |
| SA103F | 108 | Full self-employment form (detailed accounts) |
| SA101 | 55 | Additional information (other income, reliefs) |
| SA105 | 42 | Property income detail (FHL, non-FHL breakdown) |
| SA100 | 3 | Child Benefit charge detail, Marriage Allowance |

### Priority 3 Gaps - Nice to Have (102 fields)

Low-priority fields covering edge cases:
- Life insurance gains (AOI-A)
- Stock dividends / non-qualifying distributions (AOI-B)
- Lump sums, share schemes (AOI-C)
- Gilt-edged interest, FTCR detail
- Various calculation intermediate fields (CALC section)
- Personal details metadata

### Out of Scope - Not Implementing (349 fields)

| Form | Fields | Reason |
|------|-------:|--------|
| SA104F | 89 | Partnership (Full) - not in MVP |
| SA103L | 66 | Lloyd's Underwriters - specialist |
| SA109 | 51 | Non-Resident - not in MVP |
| SA102M | 46 | Ministers of Religion - specialist |
| SA101 (partial) | 39 | Specialist additional information |
| SA107 | 31 | Trusts - not in MVP |
| SA104S | 26 | Partnership (Short) - not in MVP |
| NI (partial) | 1 | Ministers of Religion NIC |

---

## Recommended Action Plan

### Phase 1 - Core Coverage (P1)

1. **SA108 Cryptoasset section** (NEW 2024-25) - Add dedicated crypto gains/losses fields (boxes 13.1-13.8) and map to XML. This is TaxFolio's primary use case.
2. **SA108 CGT Adjustment (box 51)** - Required for 2024-25 due to rate change on 30 Oct 2024. Users need to split gains pre/post this date.
3. **SA103S expense breakdown** - Break self-employment expenses into HMRC categories (boxes 11-20) and add capital allowance detail (boxes 23-28)
4. **SA100 Marriage Allowance** - Add Marriage Allowance transfer (boxes 15-16) and HICBC calculator
5. **SA100 Other income** - Add freetext "other taxable income" field (box 17) with expenses and tax deducted
6. **SA102 director/off-payroll flags** - Add checkbox fields for director status, close company, OPW
7. **NI Class 1 from P60** - Capture Class 1 NIC for accurate NIC calculation

### Phase 2 - Extended Coverage (P2)

1. **SA106 Foreign Income** - Full foreign income support for taxpayers with > £2,000 foreign income
2. **SA105 Property detail** - Separate FHL/non-FHL property income, detailed expense breakdown
3. **SA103F Full Self-Employment** - For taxpayers with turnover > VAT threshold or complex accounts
4. **SA101 Additional Information** - Other income types, additional reliefs

### Phase 3 - Completeness (P3)

1. Life insurance gains, stock dividends, share schemes
2. Intermediate calculation fields
3. Edge-case reliefs and specialist scenarios

---

## Methodology

### Data Sources

- **HMRC fields:** Extracted from `MTR-Tester-2024-25-v2.4.0.xlsm` using openpyxl. All sheets (C0-C8C9C10, EMP, SE, PRO, CGT, FOR, etc.) were parsed for field codes, descriptions, and form assignments.
- **TaxFolio coverage:** Cross-referenced against wizard step components, `tax-mapping.ts`, `xml-builder.ts`, and TypeScript type definitions.

### Classification Rules

| Status | Definition |
|--------|-----------|
| **COVERED** | Field has wizard input AND calculator mapping AND XML output |
| **PARTIAL** | Field is partially captured (e.g., wizard collects data but mapping is incomplete, or field is derived from a more general input) |
| **AUTO/NA** | Field is auto-calculated by the tax engine (SA110) |
| **OUT_OF_SCOPE** | Form/field is explicitly not supported in MVP |
| **GAP_P1** | Missing field on a supported form that affects common scenarios |
| **GAP_P2** | Missing field on a form that should be supported but isn't yet |
| **GAP_P3** | Edge case or rarely used field |
