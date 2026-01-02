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

export function calculateTaxLiability(data: WizardData): TaxCalculation {
  // Calculate total income by source
  let selfEmploymentIncome = 0;
  let rentalIncome = 0;
  let totalExpenses = 0;
  let capitalAllowances = 0;

  // Self-employment income and expenses (from all businesses)
  const selfEmploymentBusinesses = data.incomeSources.filter(
    (s) => s.type === 'self-employment'
  );

  for (const business of selfEmploymentBusinesses) {
    const businessData = data.selfEmploymentData[business.id];
    if (businessData) {
      selfEmploymentIncome += businessData.income?.total || 0;
      totalExpenses += businessData.expenses?.total || 0;
      capitalAllowances += businessData.capitalAllowances?.total || 0;
    }
  }

  // Rental income and expenses (from all properties)
  const rentalProperties = data.incomeSources.filter(
    (s) => s.type === 'rental'
  );

  for (const property of rentalProperties) {
    const propertyData = data.rentalData[property.id];
    if (propertyData) {
      rentalIncome += propertyData.income?.total || 0;
      totalExpenses += propertyData.expenses?.total || 0;
    }
  }

  // Other income
  const otherIncome =
    (data.otherIncome.interest || 0) +
    (data.otherIncome.dividends || 0) +
    (data.otherIncome.pension || 0) +
    (data.otherIncome.stateBenefits || 0) +
    (data.otherIncome.other || 0);

  const totalIncome = selfEmploymentIncome + rentalIncome + otherIncome;

  // Calculate reliefs
  const pensionRelief =
    (data.general?.pension?.personalContributions || 0) * 0.2;
  const giftAidRelief =
    (data.general?.charitable?.giftAidDonations || 0) * 0.25;
  const ventureCapitalRelief =
    (data.general?.ventureCapital?.eisInvestments || 0) * 0.3 +
    (data.general?.ventureCapital?.seisInvestments || 0) * 0.5 +
    (data.general?.ventureCapital?.vctInvestments || 0) * 0.3;

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

  // Total due after reliefs
  const totalDue = Math.max(
    0,
    totalTaxDue + totalNICDue - pensionRelief - giftAidRelief - ventureCapitalRelief
  );

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    selfEmploymentIncome: Math.round(selfEmploymentIncome * 100) / 100,
    employmentIncome: 0,
    rentalIncome: Math.round(rentalIncome * 100) / 100,
    otherIncome: Math.round(otherIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    allowableExpenses: Math.round(totalExpenses * 100) / 100,
    capitalAllowances: Math.round(capitalAllowances * 100) / 100,
    pensionRelief: Math.round(pensionRelief * 100) / 100,
    giftAidRelief: Math.round(giftAidRelief * 100) / 100,
    ventureCapitalRelief: Math.round(ventureCapitalRelief * 100) / 100,
    marriageAllowance: 0,
    blindAllowance: 0,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    personalAllowance: Math.round(personalAllowance * 100) / 100,
    taxableAfterAllowance: Math.round(taxableAfterAllowance * 100) / 100,
    basicRateTax: Math.round(basicRateTax * 100) / 100,
    higherRateTax: Math.round(higherRateTax * 100) / 100,
    additionalRateTax: Math.round(additionalRateTax * 100) / 100,
    class2NIC: Math.round(class2NIC * 100) / 100,
    class4NIC: Math.round(class4NIC * 100) / 100,
    totalTaxDue: Math.round(totalTaxDue * 100) / 100,
    totalNICDue: Math.round(totalNICDue * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
  };
}
