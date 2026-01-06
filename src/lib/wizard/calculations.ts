import { WizardData, TaxCalculation } from '@/types/wizard';

// UK Tax rates for 2024/25
const TAX_BANDS = {
  personalAllowance: 12570,
  basicRate: { threshold: 50270, rate: 0.2 },
  higherRate: { threshold: 125140, rate: 0.4 },
  additionalRate: { rate: 0.45 },
};

// Dividend tax rates for 2024/25
const DIVIDEND_RATES = {
  allowance: 500, // £500 dividend allowance
  basicRate: 0.0875, // 8.75%
  higherRate: 0.3375, // 33.75%
  additionalRate: 0.3935, // 39.35%
};

// Personal Savings Allowance (PSA) for 2024/25
// The allowance depends on the taxpayer's marginal rate
const SAVINGS_ALLOWANCE = {
  basicRate: 1000, // £1,000 for basic rate taxpayers
  higherRate: 500, // £500 for higher rate taxpayers
  additionalRate: 0, // £0 for additional rate taxpayers
};

// National Insurance Class 4 rates for 2024/25
const NI_RATES = {
  lowerProfitsLimit: 12570,
  upperProfitsLimit: 50270,
  mainRate: 0.06, // 6% between LPL and UPL
  upperRate: 0.02, // 2% above UPL
};

// Capital Gains Tax rates for 2024/25
const CGT_RATES = {
  annualExemptAmount: 3000, // £3,000 for 2024/25
  basicRate: 0.10, // 10% for gains within basic rate band
  higherRate: 0.20, // 20% for gains above basic rate band
  // Residential property rates (higher)
  residentialBasicRate: 0.18, // 18% for residential property in basic band
  residentialHigherRate: 0.24, // 24% for residential property above basic band
};

// Student Loan thresholds for 2024/25
// Repayment is 9% of income over the threshold (except postgrad which is 6%)
const STUDENT_LOAN_THRESHOLDS: Record<string, { threshold: number; rate: number }> = {
  '1': { threshold: 24990, rate: 0.09 }, // Plan 1 (pre-2012 England/Wales, Scotland, NI)
  '2': { threshold: 27295, rate: 0.09 }, // Plan 2 (post-2012 England/Wales)
  '4': { threshold: 31395, rate: 0.09 }, // Plan 4 (Scotland post-2012)
  'postgrad': { threshold: 21000, rate: 0.06 }, // Postgraduate loan
};

// Note: All monetary values from form inputs are stored in pounds (not pence)
// The toPounds helper is a no-op since values are already in pounds
const toPounds = (pounds: number): number => pounds;

export function calculateTaxLiability(data: WizardData): TaxCalculation {
  // Calculate total income by source
  // All values from forms are already in pounds
  let selfEmploymentIncome = 0;
  let employmentIncome = 0;
  let rentalIncome = 0;
  let totalExpenses = 0;
  let capitalAllowances = 0;
  let taxAlreadyPaid = 0; // Track tax already deducted at source

  // Self-employment income and expenses (from all businesses)
  const selfEmploymentBusinesses = data.incomeSources.filter(
    (s) => s.type === 'self-employment'
  );

  for (const business of selfEmploymentBusinesses) {
    const businessData = data.selfEmploymentData[business.id];
    if (businessData) {
      selfEmploymentIncome += toPounds(businessData.income?.total || 0);
      totalExpenses += toPounds(businessData.expenses?.total || 0);
      capitalAllowances += toPounds(businessData.capitalAllowances?.total || 0);
    }
  }

  // Employment income (PAYE)
  const employmentSources = data.incomeSources.filter(
    (s) => s.type === 'employment'
  );

  for (const employer of employmentSources) {
    const employerData = data.employmentData[employer.id];
    if (employerData) {
      employmentIncome += toPounds(employerData.payReceived || 0);
      // Add benefits in kind
      employmentIncome += toPounds(employerData.companyCarBenefit || 0);
      employmentIncome += toPounds(employerData.fuelBenefit || 0);
      employmentIncome += toPounds(employerData.medicalInsuranceBenefit || 0);
      employmentIncome += toPounds(employerData.otherBenefits || 0);
      employmentIncome += toPounds(employerData.tipsReceived || 0);
      // Track tax already paid via PAYE
      taxAlreadyPaid += toPounds(employerData.taxDeducted || 0);
      // Employment expenses
      if (employerData.claimingExpenses) {
        totalExpenses += toPounds(employerData.travelExpenses || 0);
        totalExpenses += toPounds(employerData.professionalFees || 0);
        totalExpenses += toPounds(employerData.workingFromHome || 0);
        totalExpenses += toPounds(employerData.otherExpenses || 0);
      }
    }
  }

  // Rental income and expenses (from all properties)
  const rentalProperties = data.incomeSources.filter(
    (s) => s.type === 'rental'
  );

  let totalFinanceCosts = 0; // Track Section 24 finance costs for tax credit

  for (const property of rentalProperties) {
    const propertyData = data.rentalData[property.id];
    if (propertyData) {
      const ownershipShare = (propertyData.ownershipShare || 100) / 100;
      rentalIncome += toPounds(propertyData.income?.total || 0);
      totalExpenses += toPounds(propertyData.expenses?.total || 0);
      // Section 24: Mortgage interest and finance costs are no longer deductible as expenses
      // Instead, landlords get a 20% tax credit on these costs
      const propertyFinanceCosts =
        (toPounds(propertyData.mortgageInterest || 0) +
         toPounds(propertyData.otherFinanceCosts || 0)) * ownershipShare;
      totalFinanceCosts += propertyFinanceCosts;
    }
  }

  // CIS Income (Construction Industry Scheme)
  const cisIncome = toPounds(data.cisData?.totalGross || data.cisData?.totalGrossPayments || 0);
  const cisDeductions = toPounds(data.cisData?.totalDeductions || data.cisData?.totalCISDeductions || 0);
  taxAlreadyPaid += cisDeductions;

  // Dividends (from dedicated data store)
  const dividendsIncome = toPounds(data.dividendsData?.totalDividends ||
    ((data.dividendsData?.ukDividends || 0) +
    (data.dividendsData?.foreignDividends || 0) +
    (data.dividendsData?.stockDividends || 0)));

  // Interest (from dedicated data store)
  const interestIncome = toPounds(data.interestData?.totalInterest ||
    ((data.interestData?.untaxedUKInterest || 0) +
    (data.interestData?.untaxedForeignInterest || 0) +
    (data.interestData?.taxedUKInterest || 0) +
    (data.interestData?.giltsInterest || 0)));
  taxAlreadyPaid += toPounds(data.interestData?.taxDeducted || data.interestData?.taxDeductedFromInterest || 0);

  // Pension Income (from dedicated data store)
  const pensionIncome = toPounds(data.pensionIncomeData?.totalPensionIncome ||
    ((data.pensionIncomeData?.statePension || 0) +
    (data.pensionIncomeData?.statePensionLumpSum || 0) +
    (data.pensionIncomeData?.privatePensions?.reduce((sum, p) => sum + (p.pensionAmount || 0), 0) || 0)));
  taxAlreadyPaid += toPounds(data.pensionIncomeData?.totalTaxDeducted || 0);

  // State Benefits (from dedicated data store)
  const stateBenefitsIncome = toPounds(data.stateBenefitsData?.totalTaxableBenefits ||
    ((data.stateBenefitsData?.jobseekersAllowance || 0) +
    (data.stateBenefitsData?.employmentSupportAllowance || 0) +
    (data.stateBenefitsData?.carersAllowance || 0) +
    (data.stateBenefitsData?.bereavementAllowance || 0) +
    (data.stateBenefitsData?.incapacityBenefit || 0) +
    (data.stateBenefitsData?.statePension || 0) +
    (data.stateBenefitsData?.otherTaxableBenefits || 0)));

  // Capital Gains (not included in income tax but tracked separately for display)
  // Use totalGains, not taxableGains - the AEA is applied in the CGT calculation section below
  const capitalGainsIncome = toPounds(data.capitalGainsData?.totalGains || 0);

  // Use new data stores if they have data, otherwise fall back to legacy otherIncome
  const finalInterest = interestIncome > 0 ? interestIncome : toPounds(data.otherIncome?.interest || 0);
  const finalDividends = dividendsIncome > 0 ? dividendsIncome : toPounds(data.otherIncome?.dividends || 0);
  const finalPension = pensionIncome > 0 ? pensionIncome : toPounds(data.otherIncome?.pension || 0);
  const finalStateBenefits = stateBenefitsIncome > 0 ? stateBenefitsIncome : toPounds(data.otherIncome?.stateBenefits || 0);
  const finalOther = toPounds(data.otherIncome?.other || 0);

  // Total other income (excluding dividends and interest - they have special treatment)
  const otherIncomeExcludingDividendsAndInterest = finalPension + finalStateBenefits + finalOther + cisIncome;
  const otherIncomeExcludingDividends = finalInterest + otherIncomeExcludingDividendsAndInterest;
  const otherIncome = otherIncomeExcludingDividends + finalDividends;

  // Non-savings, non-dividend income (taxed first at standard rates)
  const nonSavingsIncome = selfEmploymentIncome + employmentIncome + rentalIncome + otherIncomeExcludingDividendsAndInterest;
  // Non-dividend income includes savings interest
  const nonDividendIncome = nonSavingsIncome + finalInterest;
  const totalIncome = nonDividendIncome + finalDividends;

  // Calculate taxable income (before reliefs, needed for pension relief calculation)
  const taxableIncome = Math.max(0, totalIncome - totalExpenses - capitalAllowances);
  // Non-dividend taxable income (expenses apply to non-dividend income)
  const nonDividendTaxable = Math.max(0, nonDividendIncome - totalExpenses - capitalAllowances);
  // Non-savings taxable income (expenses typically apply to earned income)
  const nonSavingsTaxable = Math.max(0, nonSavingsIncome - totalExpenses - capitalAllowances);
  // Savings interest is added on top (no expenses to deduct from interest)
  const savingsInterestTaxable = finalInterest;

  // Personal allowance (reduced if income over 100k)
  // Personal allowance is applied against non-dividend income first
  let personalAllowance = TAX_BANDS.personalAllowance;
  if (taxableIncome > 100000) {
    personalAllowance = Math.max(
      0,
      TAX_BANDS.personalAllowance - (taxableIncome - 100000) / 2
    );
  }

  // Apply personal allowance to non-savings income first, then savings, then dividends
  const nonSavingsAfterAllowance = Math.max(0, nonSavingsTaxable - personalAllowance);
  const allowanceUsedByNonSavings = Math.min(personalAllowance, nonSavingsTaxable);
  const allowanceRemainingForSavings = personalAllowance - allowanceUsedByNonSavings;
  const savingsAfterAllowance = Math.max(0, savingsInterestTaxable - allowanceRemainingForSavings);
  const allowanceUsedBySavings = Math.min(allowanceRemainingForSavings, savingsInterestTaxable);
  const allowanceRemainingForDividends = allowanceRemainingForSavings - allowanceUsedBySavings;

  // Non-dividend income after allowance
  const nonDividendAfterAllowance = nonSavingsAfterAllowance + savingsAfterAllowance;
  // Any unused allowance can reduce dividends
  const unusedAllowance = allowanceRemainingForDividends;
  const dividendsAfterAllowance = Math.max(0, finalDividends - unusedAllowance);

  const taxableAfterAllowance = nonDividendAfterAllowance + dividendsAfterAllowance;

  // Calculate pension relief
  // Pension contributions get 20% relief at source (basic rate relief)
  // Higher/additional rate taxpayers can claim additional relief through self-assessment
  // The relief is the ADDITIONAL 20% (or 25% for additional rate) on contributions
  // that pushed income out of those higher bands
  const grossPensionContribution = toPounds(data.general?.pension?.personalContributions || 0);

  // Calculate how much income is in higher rate band (above basic rate threshold)
  // Basic rate band ends at £50,270 for 2024/25, but we need taxable income (after allowance)
  const basicRateBand = TAX_BANDS.basicRate.threshold - TAX_BANDS.personalAllowance; // £37,700
  const higherRateIncome = Math.max(0, taxableAfterAllowance - basicRateBand);

  // Pension relief is 20% additional on contributions that reduce higher rate income
  // Cap the relief at the actual higher rate income (can't get relief on more than you have)
  const effectivePensionContribution = Math.min(grossPensionContribution, higherRateIncome);
  const pensionRelief = effectivePensionContribution * 0.2;

  // Marriage Allowance
  // If receiving from spouse: £1,260 transfer = £252 tax reduction (at 20%)
  // Marriage Allowance is a tax reducer, not an increase to personal allowance
  const marriageAllowanceType = data.general?.marriageAllowance?.type || data.general?.marriageAllowance?.transferType;
  const marriageAllowanceAmount = marriageAllowanceType === 'receive' ? 1260 : 0;
  const marriageAllowanceRelief = marriageAllowanceAmount * 0.2; // £252 when receiving

  // Other reliefs
  const giftAidRelief =
    toPounds(data.general?.charitable?.giftAidDonations || 0) * 0.25;
  const ventureCapitalRelief =
    toPounds(data.general?.ventureCapital?.eisInvestments || 0) * 0.3 +
    toPounds(data.general?.ventureCapital?.seisInvestments || 0) * 0.5 +
    toPounds(data.general?.ventureCapital?.vctInvestments || 0) * 0.3;

  // Determine taxpayer's marginal rate for PSA calculation
  // Based on total taxable income (including dividends) to determine which band they're in
  const totalTaxableForPSA = taxableAfterAllowance;
  const basicRateBandForPSA = TAX_BANDS.basicRate.threshold - TAX_BANDS.personalAllowance; // £37,700

  let personalSavingsAllowance = 0;
  if (totalTaxableForPSA <= 0) {
    // No taxable income - full PSA
    personalSavingsAllowance = SAVINGS_ALLOWANCE.basicRate;
  } else if (totalTaxableForPSA <= basicRateBandForPSA) {
    // Basic rate taxpayer
    personalSavingsAllowance = SAVINGS_ALLOWANCE.basicRate;
  } else if (totalTaxableForPSA <= TAX_BANDS.higherRate.threshold - TAX_BANDS.personalAllowance) {
    // Higher rate taxpayer
    personalSavingsAllowance = SAVINGS_ALLOWANCE.higherRate;
  } else {
    // Additional rate taxpayer
    personalSavingsAllowance = SAVINGS_ALLOWANCE.additionalRate;
  }

  // Apply PSA to savings interest (after personal allowance)
  const savingsInterestTaxableAfterPSA = Math.max(0, savingsAfterAllowance - personalSavingsAllowance);

  // Calculate income tax by band
  // Order of taxation: non-savings income first, then savings interest (with PSA), then dividends
  let basicRateTax = 0;
  let higherRateTax = 0;
  let additionalRateTax = 0;
  let dividendTax = 0;
  let savingsInterestTax = 0;

  // Tax band boundaries
  // basicRateBand is £37,700 (£50,270 - £12,570), already calculated above
  // The higher rate band extends from basic rate threshold to additional rate threshold
  // When PA is reduced, the higher rate band EXPANDS because more income is taxable
  // Additional rate only applies to income above £125,140 GROSS (not taxable)
  // So the higher rate band = £125,140 - £50,270 = £74,870 for standard PA
  // But when PA is reduced, taxable income at higher rate = gross income - PA - basic rate band
  // The key insight: additional rate threshold is GROSS £125,140, not relative to PA
  const higherRateBandEnd = TAX_BANDS.higherRate.threshold - personalAllowance; // Taxable amount where additional rate starts
  const higherRateBandSize = Math.max(0, higherRateBandEnd - basicRateBand); // Size of higher rate band

  // First, tax non-savings income at standard rates
  let remainingNonSavings = nonSavingsAfterAllowance;
  let bandUsedByNonSavings = 0;

  // Basic rate (20%) on non-savings income
  if (remainingNonSavings > 0) {
    const taxableAtBasicRate = Math.min(remainingNonSavings, basicRateBand);
    basicRateTax = taxableAtBasicRate * TAX_BANDS.basicRate.rate;
    bandUsedByNonSavings = taxableAtBasicRate;
    remainingNonSavings -= taxableAtBasicRate;
  }

  // Higher rate (40%) on non-savings income
  // Higher rate applies from end of basic rate band up to additional rate threshold
  if (remainingNonSavings > 0) {
    const taxableAtHigherRate = Math.min(remainingNonSavings, higherRateBandSize);
    higherRateTax = taxableAtHigherRate * TAX_BANDS.higherRate.rate;
    bandUsedByNonSavings += taxableAtHigherRate;
    remainingNonSavings -= taxableAtHigherRate;
  }

  // Additional rate (45%) on non-savings income
  // Only applies to gross income above £125,140
  if (remainingNonSavings > 0) {
    additionalRateTax = remainingNonSavings * TAX_BANDS.additionalRate.rate;
    bandUsedByNonSavings += remainingNonSavings;
  }

  // Now tax savings interest (after PSA) at standard rates
  // Savings interest fills up remaining band space after non-savings income
  let remainingSavings = savingsInterestTaxableAfterPSA;
  let bandUsedByNonDividend = bandUsedByNonSavings;

  // Basic rate band remaining for savings
  const basicBandRemainingForSavings = Math.max(0, basicRateBand - bandUsedByNonSavings);
  if (remainingSavings > 0 && basicBandRemainingForSavings > 0) {
    const savingsInBasicBand = Math.min(remainingSavings, basicBandRemainingForSavings);
    savingsInterestTax += savingsInBasicBand * TAX_BANDS.basicRate.rate;
    bandUsedByNonDividend += savingsInBasicBand;
    remainingSavings -= savingsInBasicBand;
  }

  // Higher rate band for savings
  const nonSavingsInHigherBand = Math.max(0, nonSavingsAfterAllowance - basicRateBand);
  const higherBandRemainingForSavings = Math.max(0, higherRateBandSize - nonSavingsInHigherBand);
  if (remainingSavings > 0 && higherBandRemainingForSavings > 0) {
    const savingsInHigherBand = Math.min(remainingSavings, higherBandRemainingForSavings);
    savingsInterestTax += savingsInHigherBand * TAX_BANDS.higherRate.rate;
    bandUsedByNonDividend += savingsInHigherBand;
    remainingSavings -= savingsInHigherBand;
  }

  // Additional rate for any remaining savings
  if (remainingSavings > 0) {
    savingsInterestTax += remainingSavings * TAX_BANDS.additionalRate.rate;
    bandUsedByNonDividend += remainingSavings;
  }

  // Now tax dividends at dividend rates
  // Dividends are taxed after non-dividend income, so they fill up remaining band space
  if (dividendsAfterAllowance > 0) {
    // Apply dividend allowance (£500)
    const taxableDividends = Math.max(0, dividendsAfterAllowance - DIVIDEND_RATES.allowance);

    // Determine which bands dividends fall into based on how much non-dividend income used
    let remainingDividends = taxableDividends;

    // Basic rate band remaining for dividends
    const basicBandRemaining = Math.max(0, basicRateBand - bandUsedByNonDividend);
    if (remainingDividends > 0 && basicBandRemaining > 0) {
      const dividendsInBasicBand = Math.min(remainingDividends, basicBandRemaining);
      dividendTax += dividendsInBasicBand * DIVIDEND_RATES.basicRate;
      remainingDividends -= dividendsInBasicBand;
    }

    // Higher rate band for dividends
    // If non-dividend income exceeded basic rate, dividends start in higher band
    // Use the corrected higher rate band size based on actual PA
    const nonDividendInHigherBand = Math.max(0, nonDividendAfterAllowance - basicRateBand);
    const higherBandRemaining = Math.max(0, higherRateBandSize - nonDividendInHigherBand);
    if (remainingDividends > 0 && higherBandRemaining > 0) {
      const dividendsInHigherBand = Math.min(remainingDividends, higherBandRemaining);
      dividendTax += dividendsInHigherBand * DIVIDEND_RATES.higherRate;
      remainingDividends -= dividendsInHigherBand;
    }

    // Additional rate for any remaining dividends
    if (remainingDividends > 0) {
      dividendTax += remainingDividends * DIVIDEND_RATES.additionalRate;
    }
  }

  const totalTaxBeforeCredits = basicRateTax + higherRateTax + additionalRateTax + savingsInterestTax + dividendTax;

  // Section 24 Finance Costs Tax Credit (20% of mortgage interest and finance costs)
  // This is a tax reducer, not a deduction from income
  // The credit is capped at the total income tax liability (can't create a refund from this alone)
  const section24TaxCredit = totalFinanceCosts * 0.2;
  const section24Applied = Math.min(section24TaxCredit, totalTaxBeforeCredits);

  const totalTaxDue = totalTaxBeforeCredits - section24Applied;

  // Calculate National Insurance (Class 2 and 4)
  let class2NIC = 0;
  let class4NIC = 0;
  const selfEmploymentProfit = selfEmploymentIncome - totalExpenses;

  // Class 2 NIC (if profit > small profits threshold)
  if (selfEmploymentProfit > 6725) {
    class2NIC = 52 * 3.45; // £3.45/week for 52 weeks
  }

  // Class 4 NIC
  if (selfEmploymentProfit > NI_RATES.lowerProfitsLimit) {
    const profitInMainBand = Math.min(
      selfEmploymentProfit - NI_RATES.lowerProfitsLimit,
      NI_RATES.upperProfitsLimit - NI_RATES.lowerProfitsLimit
    );
    class4NIC += profitInMainBand * NI_RATES.mainRate;

    if (selfEmploymentProfit > NI_RATES.upperProfitsLimit) {
      const profitAboveUpper = selfEmploymentProfit - NI_RATES.upperProfitsLimit;
      class4NIC += profitAboveUpper * NI_RATES.upperRate;
    }
  }

  const totalNICDue = class2NIC + class4NIC;

  // Calculate Capital Gains Tax
  // CGT is separate from income tax but uses remaining basic rate band
  let capitalGainsTax = 0;
  let cgtBasicRateTax = 0;
  let cgtHigherRateTax = 0;

  if (capitalGainsIncome > 0) {
    // Apply annual exempt amount (£3,000 for 2024/25)
    const taxableGains = Math.max(0, capitalGainsIncome - CGT_RATES.annualExemptAmount);

    if (taxableGains > 0) {
      // Determine remaining basic rate band after income
      // Income uses up the basic rate band first, then CGT fills remaining space
      const incomeUsingBasicBand = Math.min(taxableAfterAllowance, basicRateBand);
      const basicRateBandRemainingForCGT = Math.max(0, basicRateBand - incomeUsingBasicBand);

      // Check if this includes residential property gains (higher rates)
      const residentialGains = toPounds(data.capitalGainsData?.residentialPropertyGains || 0);
      const otherGains = taxableGains - Math.min(residentialGains, taxableGains);

      // Calculate CGT on other gains (shares, crypto, etc.) at 10%/20%
      if (otherGains > 0) {
        // Gains within remaining basic rate band at 10%
        const otherGainsInBasicBand = Math.min(otherGains, basicRateBandRemainingForCGT);
        cgtBasicRateTax += otherGainsInBasicBand * CGT_RATES.basicRate;

        // Gains above basic rate band at 20%
        const otherGainsAboveBasicBand = Math.max(0, otherGains - basicRateBandRemainingForCGT);
        cgtHigherRateTax += otherGainsAboveBasicBand * CGT_RATES.higherRate;
      }

      // Calculate CGT on residential property gains at 18%/24%
      if (residentialGains > 0) {
        const taxableResidentialGains = Math.min(residentialGains, taxableGains);
        // Remaining basic band after other gains
        const basicBandAfterOtherGains = Math.max(0, basicRateBandRemainingForCGT - otherGains);

        // Residential gains within remaining basic rate band at 18%
        const residentialInBasicBand = Math.min(taxableResidentialGains, basicBandAfterOtherGains);
        cgtBasicRateTax += residentialInBasicBand * CGT_RATES.residentialBasicRate;

        // Residential gains above basic rate band at 24%
        const residentialAboveBasicBand = Math.max(0, taxableResidentialGains - basicBandAfterOtherGains);
        cgtHigherRateTax += residentialAboveBasicBand * CGT_RATES.residentialHigherRate;
      }

      capitalGainsTax = cgtBasicRateTax + cgtHigherRateTax;
    }
  }

  const totalCGTDue = capitalGainsTax;

  // Calculate Student Loan repayment
  // Student loan is calculated on gross income (employment + self-employment)
  // The income used is before tax but after expenses for self-employment
  let studentLoanDue = 0;
  let studentLoanDeducted = 0;
  let studentLoanPlanType: '1' | '2' | '4' | 'postgrad' | undefined;

  // Collect student loan data from all employment sources
  for (const employer of employmentSources) {
    const employerData = data.employmentData[employer.id];
    if (employerData?.hasStudentLoan && employerData.studentLoanPlanType) {
      studentLoanPlanType = employerData.studentLoanPlanType;
      studentLoanDeducted += toPounds(employerData.studentLoanDeducted || 0);
    }
  }

  // Calculate repayment if there's a student loan
  if (studentLoanPlanType) {
    const loanConfig = STUDENT_LOAN_THRESHOLDS[studentLoanPlanType];
    if (loanConfig) {
      // Student loan is based on gross earned income (employment + self-employment profit)
      const grossEarnedIncome = employmentIncome + Math.max(0, selfEmploymentIncome - totalExpenses);
      const incomeOverThreshold = Math.max(0, grossEarnedIncome - loanConfig.threshold);
      studentLoanDue = incomeOverThreshold * loanConfig.rate;
    }
  }

  const studentLoanToPay = Math.max(0, studentLoanDue - studentLoanDeducted);

  // Total due after reliefs and tax already paid
  const grossTaxDue = totalTaxDue + totalNICDue + totalCGTDue + studentLoanToPay - pensionRelief - giftAidRelief - ventureCapitalRelief - marriageAllowanceRelief;
  const netTaxDue = grossTaxDue - taxAlreadyPaid;
  const totalDue = Math.max(0, netTaxDue);
  const refundDue = netTaxDue < 0 ? Math.abs(netTaxDue) : undefined;

  // Convert all values back to pence for display (formatCurrency expects pence)
  // Round to nearest penny (multiply by 100 to convert £ to pence, then round)
  const toPence = (pounds: number): number => Math.round(pounds * 100);

  return {
    totalIncome: toPence(totalIncome),
    selfEmploymentIncome: toPence(selfEmploymentIncome),
    employmentIncome: toPence(employmentIncome),
    rentalIncome: toPence(rentalIncome),
    otherIncome: toPence(otherIncome),
    // Detailed income breakdowns
    cisIncome: toPence(cisIncome),
    dividendsIncome: toPence(finalDividends),
    interestIncome: toPence(finalInterest),
    pensionIncome: toPence(finalPension),
    stateBenefitsIncome: toPence(finalStateBenefits),
    capitalGainsIncome: toPence(capitalGainsIncome),
    totalExpenses: toPence(totalExpenses),
    allowableExpenses: toPence(totalExpenses),
    capitalAllowances: toPence(capitalAllowances),
    pensionRelief: toPence(pensionRelief),
    giftAidRelief: toPence(giftAidRelief),
    ventureCapitalRelief: toPence(ventureCapitalRelief),
    marriageAllowance: toPence(marriageAllowanceRelief),
    blindAllowance: 0,
    personalSavingsAllowance: toPence(personalSavingsAllowance),
    section24Relief: toPence(section24Applied),
    taxableIncome: toPence(taxableIncome),
    personalAllowance: toPence(personalAllowance),
    taxableAfterAllowance: toPence(taxableAfterAllowance),
    basicRateTax: toPence(basicRateTax),
    higherRateTax: toPence(higherRateTax),
    additionalRateTax: toPence(additionalRateTax),
    savingsInterestTax: toPence(savingsInterestTax),
    dividendTax: toPence(dividendTax),
    class2NIC: toPence(class2NIC),
    class4NIC: toPence(class4NIC),
    // Capital Gains Tax
    cgtBasicRateTax: toPence(cgtBasicRateTax),
    cgtHigherRateTax: toPence(cgtHigherRateTax),
    totalCGTDue: toPence(totalCGTDue),
    // Student Loan
    studentLoanDue: toPence(studentLoanDue),
    studentLoanDeducted: toPence(studentLoanDeducted),
    studentLoanToPay: toPence(studentLoanToPay),
    studentLoanPlanType,
    // Final totals
    totalTaxDue: toPence(totalTaxDue),
    totalNICDue: toPence(totalNICDue),
    totalDue: toPence(totalDue),
    refundDue: refundDue ? toPence(refundDue) : undefined,
  };
}
