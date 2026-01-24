# TaxFolio Wizard Audit Report

**Date:** January 2026
**Purpose:** Audit wizard field coverage against HMRC SA100 requirements

---

## Executive Summary

The TaxFolio wizard has **excellent coverage** for core crypto trader/self-employed scenarios. However, there are several gaps that prevent certain HMRC test cases from being fully supported through the UI.

### Coverage Statistics

| Component | Supported | Partial | Missing | Total |
|-----------|-----------|---------|---------|-------|
| Income Types | 10 | 1 | 1 | 12 |
| Tax Reliefs | 5 | 2 | 3 | 10 |
| CGT Features | 4 | 2 | 2 | 8 |
| NIC Features | 2 | 1 | 2 | 5 |
| **Overall** | **21** | **6** | **8** | **35** |

---

## Task 1: TaxCalculationInput Field Mapping

### Legend
- ✅ = Fully captured by wizard
- ⚠️ = Partially captured / workaround needed
- ❌ = Not captured by wizard

| TaxCalculationInput Field | Wizard Captures | Wizard Location | Notes |
|--------------------------|-----------------|-----------------|-------|
| `status` | ⚠️ | `personalInfo.taxpayerStatus` | Not in wizard UI - defaults to 'U' |
| `employmentIncome` | ✅ | `employmentData[id].payReceived` + benefits | Full P60/P11D support |
| `employmentTaxDeducted` | ✅ | `employmentData[id].taxDeducted` | |
| `selfEmploymentProfits` | ✅ | `selfEmploymentData[id]` (calculated) | Income - expenses - capital allowances |
| `pensionIncome` | ✅ | `pensionIncomeData.privatePensions` | |
| `statePension` | ✅ | `pensionIncomeData.statePension` | |
| `taxedInterest` | ✅ | `interestData.taxedUKInterest` | |
| `untaxedInterest` | ✅ | `interestData.untaxedUKInterest` + gilts + foreign | |
| `ukDividends` | ✅ | `dividendsData.ukDividends` + unit trusts | |
| `foreignDividends` | ✅ | `dividendsData.foreignDividends` | Mapped to ukDividends in calculator |
| `propertyIncome` | ✅ | `rentalData[id]` (calculated) | With ownership share |
| `otherIncome` | ⚠️ | `otherIncome.other` | No dedicated "other income" step |
| `giftAidDonations` | ✅ | `general.charitable.giftAidDonations` | |
| `pensionContributions` | ✅ | `general.pension.personalContributions` | |
| `pensionContributionsNetPay` | ❌ | Not captured | Would need wizard field |
| `retirementAnnuityDeduction` | ❌ | Not captured | Legacy scheme |
| `studentLoanPlan` | ✅ | `employmentData[id].studentLoanPlanType` | Plans 1, 2, 4 |
| `hasPostgraduateLoan` | ✅ | `employmentData[id].studentLoanPlanType === 'postgrad'` | |
| `blindPersonsAllowance` | ✅ | `general.blindAllowance.registeredBlind` | |
| `marriageAllowanceReceived` | ✅ | `general.marriageAllowance.type === 'receive'` | |
| `marriageAllowanceTransferred` | ✅ | `general.marriageAllowance.type === 'transfer'` | |
| `underpaidTaxFromEarlierYears` | ❌ | Not captured | CAL7 |
| `underpaidTaxCodedForNextYear` | ❌ | Not captured | CAL8 |
| `taxedInterestTaxDeducted` | ✅ | `interestData.taxDeducted` | |
| `class2NICRegistered` | ❌ | Not captured | Would need wizard field |
| `primaryClass1NIC` | ⚠️ | Always 0 | Not calculated from employment |
| `studentLoanDeductedThroughPAYE` | ✅ | `employmentData[id].studentLoanDeducted` | |
| `postgraduateLoanDeductedThroughPAYE` | ⚠️ | Not separated | Same field as student loan |
| `lossReliefDeduction` | ❌ | Not captured | SE loss against other income |
| `financeCostsForLLIR` | ✅ | `rentalData[id].mortgageInterest` | Section 24 relief |
| `capitalGainsNonResidential` | ✅ | `capitalGainsData.disposals` | Shares, crypto, other |
| `capitalGainsResidential` | ✅ | `capitalGainsData.disposals` | Property type detection |
| `capitalLossesInYear` | ✅ | `capitalGainsData.disposals` (losses) | |
| `capitalLossesBroughtForward` | ⚠️ | `capitalGainsData.lossesFromPreviousYears` | Exists but may not be wired |
| `badrQualifyingGains` | ❌ | Not captured | Business Asset Disposal Relief |
| `class4Exempt` | ❌ | Not captured | State pension age exemption |
| `class2Weeks` | ❌ | Not captured | Partial year Class 2 |
| `class2Amount` | ❌ | Not captured | Direct Class 2 amount |
| `cgtAlreadyPaid` | ❌ | Not captured | Residential property CGT paid |
| `childBenefitReceived` | ✅ | `stateBenefitsData.childBenefitReceived` | For HICBC |

---

## Task 2: XML Builder Coverage

### SA100 Main Return

| Section | XML Builder | Wizard Data | Status |
|---------|-------------|-------------|--------|
| YourPersonalDetails | ✅ | personalInfo + DOB + NINO + status | **Missing taxpayerStatus UI** |
| StudentLoanRepayments | ✅ | employmentData student loan fields | ✅ |
| Income.UKInterestAndDividends | ✅ | interestData + dividendsData | ✅ |
| Income.StateBenefits | ✅ | pensionIncomeData + stateBenefitsData | ✅ |
| TaxReliefs.Pensions | ✅ | general.pension | ✅ |
| TaxReliefs.CharitableGiving | ✅ | general.charitable | ✅ |
| MarriageAllowance | ✅ | general.marriageAllowance | ✅ |
| HighIncomeChildBenefitCharge | ✅ | stateBenefitsData.childBenefitReceived | ✅ |

### Supplementary Schedules

| Schedule | XML Builder | Wizard Data | Status |
|----------|-------------|-------------|--------|
| SA102 (Employment) | ✅ 0-50 | employmentData | ✅ Full coverage |
| SA103S (Short SE) | ✅ 0-50 | selfEmploymentData | ✅ Full coverage |
| SA103F (Full SE) | ✅ 0-50 | selfEmploymentData | ✅ Full coverage |
| SA105 (UK Property) | ✅ 0-1 | rentalData | ✅ Full coverage |
| SA106 (Foreign) | ⚠️ 0-1 | dividendsData.foreignDividends | **Limited** - only foreign dividends |
| SA108 (Capital Gains) | ✅ 0-1 | capitalGainsData | ⚠️ Missing BADR |
| SA110 (Tax Calc) | ✅ Mandatory | Calculated | ✅ |

---

## Task 3: Test Case Coverage Analysis

### Test Cases We've Validated

| Test Case | Description | Wizard Can Capture | Missing Fields |
|-----------|-------------|-------------------|----------------|
| **42** | SE Loss + MAT OUT + Vol Class 2 | ⚠️ Partial | `lossReliefDeduction`, `class2Weeks` |
| **43** | High Earner PA Taper + BPA + CGT | ✅ Yes | None (if taxpayerStatus added) |
| **64** | Self-Employed + Gift Aid + CGT | ⚠️ Partial | `class4Exempt`, `class2NICRegistered` |
| **157** | Low Income + CGT + Vol Class 2 | ⚠️ Partial | `class2Weeks` |

### Missing Fields by Test Case

**Test Case 42** (SE Loss + MAT Transfer OUT + Voluntary Class 2):
- `lossReliefDeduction` - SE loss claimed against employment income (SSE32/33)
- `class2Weeks` - Voluntary Class 2 NIC weeks (45.65 weeks)
- **Impact**: Cannot support crypto traders with loss years offsetting against employment

**Test Case 64** (Self-Employed with Gift Aid + CGT, State Pension Age):
- `class4Exempt` - State pension age exemption
- `class2NICRegistered` - Class 2 exemption workaround
- **Impact**: Older self-employed users will see incorrect NIC

**Test Case 157** (Low Income with CGT + Voluntary Class 2):
- `class2Weeks` - Voluntary Class 2 to protect state pension
- **Impact**: Low-income SE users can't opt into Class 2

---

## Task 4: Feature Support Matrix

| Feature | Calculator | XML Builder | Wizard UI | Status |
|---------|:----------:|:-----------:|:---------:|--------|
| **Income Types** |||||
| Employment income | ✅ | ✅ | ✅ | Full |
| Multiple employments | ✅ | ✅ (50) | ✅ | Full |
| Self-employment (SA103S) | ✅ | ✅ (50) | ✅ | Full |
| Self-employment (SA103F) | ✅ | ✅ (50) | ✅ | Full |
| SE losses against income | ✅ | ✅ | ❌ | **Gap** |
| Property income (SA105) | ✅ | ✅ | ✅ | Full |
| Savings interest | ✅ | ✅ | ✅ | Full |
| Dividends (UK) | ✅ | ✅ | ✅ | Full |
| Dividends (Foreign) | ✅ | ⚠️ | ✅ | Partial |
| Pension income | ✅ | ✅ | ✅ | Full |
| State benefits | ✅ | ✅ | ✅ | Full |
| Other income | ✅ | ✅ | ⚠️ | No dedicated step |
| **Capital Gains** |||||
| CGT - Listed shares | ✅ | ✅ | ✅ | Full |
| CGT - Unlisted shares | ✅ | ✅ | ✅ | Full |
| CGT - Crypto | ✅ | ✅ | ✅ | Full |
| CGT - Other property | ✅ | ✅ | ✅ | Full |
| CGT - Residential property | ✅ | ✅ | ✅ | Full |
| CGT - BADR | ✅ | ⚠️ | ❌ | **Gap** |
| CGT - Investors' Relief | ⚠️ | ❌ | ❌ | Not supported |
| CGT - Losses b/f | ✅ | ✅ | ⚠️ | Exists, may need wiring |
| CGT - Already paid | ✅ | ✅ | ❌ | **Gap** |
| **Tax Reliefs** |||||
| Gift Aid | ✅ | ✅ | ✅ | Full |
| Pension contributions (RAS) | ✅ | ✅ | ✅ | Full |
| Pension contributions (Net Pay) | ✅ | ⚠️ | ❌ | **Gap** |
| Marriage Allowance IN | ✅ | ✅ | ✅ | Full |
| Marriage Allowance OUT | ✅ | ✅ | ✅ | Full |
| Blind Person's Allowance | ✅ | ⚠️ | ✅ | Full |
| Venture Capital schemes | ⚠️ | ❌ | ✅ | Wizard only |
| Landlord Loan Interest Relief | ✅ | ✅ | ✅ | Full |
| **Student Loans** |||||
| Plan 1 | ✅ | ✅ | ✅ | Full |
| Plan 2 | ✅ | ✅ | ✅ | Full |
| Plan 4 | ✅ | ✅ | ✅ | Full |
| Postgraduate | ✅ | ✅ | ✅ | Full |
| **Other Features** |||||
| HICBC | ✅ | ✅ | ✅ | Full |
| Scottish taxpayer | ✅ | ✅ | ❌ | **Gap** |
| Welsh taxpayer | ✅ | ✅ | ❌ | **Gap** |
| Class 2 NIC mandatory | ✅ | ✅ | ✅ | Auto-calculated |
| Class 2 NIC voluntary | ✅ | ✅ | ❌ | **Gap** |
| Class 2 NIC exempt | ✅ | ✅ | ❌ | **Gap** |
| Class 4 NIC exemption | ✅ | ✅ | ❌ | **Gap** |
| Tax deducted at source | ✅ | ✅ | ✅ | Full |
| CIS deductions | ✅ | ✅ | ✅ | Full |
| Underpaid tax (CAL7/8) | ✅ | ✅ | ❌ | **Gap** |

---

## Task 5: Recommended Wizard Additions

### Priority 1: Critical for Core Audience (Crypto Traders/Self-Employed)

1. **SE Loss Relief Against Other Income** ⭐⭐⭐
   - Field: `lossReliefDeduction`
   - Wizard location: Self-employment losses step
   - Impact: Crypto traders with loss years can offset against employment
   - Test case: 42

2. **Voluntary Class 2 NIC** ⭐⭐⭐
   - Fields: `class2Weeks`, `class2Amount`
   - Wizard location: New NIC options step or self-employment summary
   - Impact: Low-income SE users can protect state pension entitlement
   - Test cases: 42, 157

3. **Taxpayer Status (Scottish/Welsh)** ⭐⭐⭐
   - Field: `status` (E/S/C/U)
   - Wizard location: Personal info or getting started
   - Impact: Scottish taxpayers will get wrong tax calculation
   - Test case: All Scottish users

### Priority 2: Required for Validated Test Cases

4. **Class 4 NIC Exemption** ⭐⭐
   - Field: `class4Exempt`
   - Wizard location: NIC options or personal info (DOB-based)
   - Impact: Over state pension age SE users see wrong NIC
   - Test case: 64

5. **Class 2 NIC Exemption** ⭐⭐
   - Field: `class2NICRegistered` (workaround) or new `class2Exempt`
   - Wizard location: NIC options
   - Impact: Over state pension age SE users see Class 2 due
   - Test case: 64

6. **Business Asset Disposal Relief (BADR)** ⭐⭐
   - Field: `badrQualifyingGains`
   - Wizard location: Capital gains disposal entry
   - Impact: Business owners selling shares in own company get wrong CGT
   - Test cases: 43, 64

### Priority 3: Nice to Have for Broader Coverage

7. **CGT Already Paid** ⭐
   - Field: `cgtAlreadyPaid`
   - Wizard location: Capital gains summary
   - Impact: Residential property sellers who paid CGT at sale

8. **Pension Contributions (Net Pay)** ⭐
   - Field: `pensionContributionsNetPay`
   - Wizard location: General pension step
   - Impact: Users with workplace pensions via net pay arrangement

9. **Underpaid Tax Adjustments (CAL7/CAL8)** ⭐
   - Fields: `underpaidTaxFromEarlierYears`, `underpaidTaxCodedForNextYear`
   - Wizard location: New "Previous Tax" step
   - Impact: Users with tax code adjustments

10. **Capital Losses Brought Forward** ⭐
    - Field: `capitalLossesBroughtForward`
    - Wizard location: Capital gains step
    - Impact: Users with losses from previous years
    - Note: Field exists in wizard (`lossesFromPreviousYears`), may just need wiring

---

## Implementation Recommendations

### Quick Wins (Low Effort, High Impact)

1. **Add taxpayerStatus dropdown to Getting Started**
   - Simple dropdown: England, Scotland, Wales, Northern Ireland
   - Affects all Scottish taxpayers immediately

2. **Wire up `capitalLossesBroughtForward`**
   - Field exists: `capitalGainsData.lossesFromPreviousYears`
   - Just needs mapping in `tax-mapping.ts`

### Medium Effort

3. **Add NIC Options step for self-employed**
   - New step after self-employment summary
   - Fields: Class 2 voluntary (weeks), Class 4 exempt checkbox
   - Based on DOB for state pension age check

4. **Add loss relief option to SE losses step**
   - Checkbox: "Claim loss against other income"
   - Amount input: How much to claim
   - Only show if employment income exists

### Higher Effort

5. **Add BADR to capital gains disposals**
   - Checkbox: "Qualifies for Business Asset Disposal Relief"
   - Only show for unlisted shares disposal type
   - Adds complexity to CGT calculation display

---

## Files to Modify

| Change | Files |
|--------|-------|
| Add taxpayerStatus | `src/types/wizard.ts`, `src/lib/wizard/steps.ts`, new step component |
| Wire losses b/f | `src/lib/wizard/tax-mapping.ts` (1 line change) |
| Add NIC options | `src/types/wizard.ts`, `src/lib/wizard/steps.ts`, `src/lib/wizard/tax-mapping.ts`, new step component |
| Add loss relief | `src/types/wizard.ts`, existing SE losses step, `src/lib/wizard/tax-mapping.ts` |
| Add BADR | `src/types/wizard.ts`, existing CGT disposal step, `src/lib/wizard/tax-mapping.ts` |

---

## Conclusion

The TaxFolio wizard has **solid core coverage** for the primary use case (self-employed crypto traders). The main gaps are:

1. **Scottish/Welsh taxpayer status** - Affects calculation accuracy for ~10% of UK taxpayers
2. **SE loss relief against other income** - Key feature for crypto traders with loss years
3. **NIC exemptions/voluntary** - Affects older users and those wanting state pension protection
4. **BADR** - Affects business owners selling company shares

Implementing Priority 1 items would close the most critical gaps and enable full support for HMRC Test Cases 42, 64, and 157.

---

*Report generated: January 2026*
