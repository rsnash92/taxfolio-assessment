import { WizardData, TaxCalculation } from '@/types/wizard';

// UK Tax rates for 2024/25
const TAX_BANDS = {
  personalAllowance: 12570,
  basicRate: { threshold: 50270, rate: 0.2 },
  higherRate: { threshold: 125140, rate: 0.4 },
  additionalRate: { rate: 0.45 },
};

// National Insurance Class 4 rates for 2024/25
const NI_RATES = {
  lowerProfitsLimit: 12570,
  upperProfitsLimit: 50270,
  mainRate: 0.06, // 6% between LPL and UPL
  upperRate: 0.02, // 2% above UPL
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

  for (const property of rentalProperties) {
    const propertyData = data.rentalData[property.id];
    if (propertyData) {
      rentalIncome += toPounds(propertyData.income?.total || 0);
      totalExpenses += toPounds(propertyData.expenses?.total || 0);
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
  const capitalGainsIncome = toPounds(data.capitalGainsData?.taxableGains || 0);

  // Use new data stores if they have data, otherwise fall back to legacy otherIncome
  const finalInterest = interestIncome > 0 ? interestIncome : toPounds(data.otherIncome?.interest || 0);
  const finalDividends = dividendsIncome > 0 ? dividendsIncome : toPounds(data.otherIncome?.dividends || 0);
  const finalPension = pensionIncome > 0 ? pensionIncome : toPounds(data.otherIncome?.pension || 0);
  const finalStateBenefits = stateBenefitsIncome > 0 ? stateBenefitsIncome : toPounds(data.otherIncome?.stateBenefits || 0);
  const finalOther = toPounds(data.otherIncome?.other || 0);

  // Total other income
  const otherIncome = finalInterest + finalDividends + finalPension + finalStateBenefits + finalOther + cisIncome;

  const totalIncome = selfEmploymentIncome + employmentIncome + rentalIncome + otherIncome;

  // Calculate reliefs
  const pensionRelief =
    toPounds(data.general?.pension?.personalContributions || 0) * 0.2;
  const giftAidRelief =
    toPounds(data.general?.charitable?.giftAidDonations || 0) * 0.25;
  const ventureCapitalRelief =
    toPounds(data.general?.ventureCapital?.eisInvestments || 0) * 0.3 +
    toPounds(data.general?.ventureCapital?.seisInvestments || 0) * 0.5 +
    toPounds(data.general?.ventureCapital?.vctInvestments || 0) * 0.3;

  // Calculate taxable income
  const taxableIncome = Math.max(0, totalIncome - totalExpenses - capitalAllowances);

  // Personal allowance (reduced if income over 100k)
  let personalAllowance = TAX_BANDS.personalAllowance;
  if (taxableIncome > 100000) {
    personalAllowance = Math.max(
      0,
      TAX_BANDS.personalAllowance - (taxableIncome - 100000) / 2
    );
  }

  const taxableAfterAllowance = Math.max(0, taxableIncome - personalAllowance);

  // Calculate income tax by band
  let basicRateTax = 0;
  let higherRateTax = 0;
  let additionalRateTax = 0;
  let remainingTaxable = taxableAfterAllowance;

  // Basic rate (20%)
  if (remainingTaxable > 0) {
    const basicRateBand =
      TAX_BANDS.basicRate.threshold - TAX_BANDS.personalAllowance;
    const taxableAtBasicRate = Math.min(remainingTaxable, basicRateBand);
    basicRateTax = taxableAtBasicRate * TAX_BANDS.basicRate.rate;
    remainingTaxable -= taxableAtBasicRate;
  }

  // Higher rate (40%)
  if (remainingTaxable > 0) {
    const higherRateBand =
      TAX_BANDS.higherRate.threshold - TAX_BANDS.basicRate.threshold;
    const taxableAtHigherRate = Math.min(remainingTaxable, higherRateBand);
    higherRateTax = taxableAtHigherRate * TAX_BANDS.higherRate.rate;
    remainingTaxable -= taxableAtHigherRate;
  }

  // Additional rate (45%)
  if (remainingTaxable > 0) {
    additionalRateTax = remainingTaxable * TAX_BANDS.additionalRate.rate;
  }

  const totalTaxDue = basicRateTax + higherRateTax + additionalRateTax;

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

  // Total due after reliefs and tax already paid
  const grossTaxDue = totalTaxDue + totalNICDue - pensionRelief - giftAidRelief - ventureCapitalRelief;
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
    marriageAllowance: 0,
    blindAllowance: 0,
    taxableIncome: toPence(taxableIncome),
    personalAllowance: toPence(personalAllowance),
    taxableAfterAllowance: toPence(taxableAfterAllowance),
    basicRateTax: toPence(basicRateTax),
    higherRateTax: toPence(higherRateTax),
    additionalRateTax: toPence(additionalRateTax),
    class2NIC: toPence(class2NIC),
    class4NIC: toPence(class4NIC),
    totalTaxDue: toPence(totalTaxDue),
    totalNICDue: toPence(totalNICDue),
    totalDue: toPence(totalDue),
    refundDue: refundDue ? toPence(refundDue) : undefined,
  };
}
