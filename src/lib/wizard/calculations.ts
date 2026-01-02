import { WizardData } from '@/types/wizard';

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

export function calculateTaxLiability(data: WizardData): WizardData['taxCalculation'] {
  // Calculate total income
  let totalIncome = 0;

  // Self-employment income
  if (data.incomeSources.some((s) => s.type === 'self-employment')) {
    totalIncome += data.selfEmployment.businessIncome;
    totalIncome += data.selfEmployment.otherIncome;
  }

  // Rental income
  if (data.incomeSources.some((s) => s.type === 'rental')) {
    for (const property of data.rental.properties) {
      totalIncome += property.income;
    }
  }

  // Calculate total expenses
  let totalExpenses = 0;

  // Self-employment expenses
  if (data.incomeSources.some((s) => s.type === 'self-employment')) {
    totalExpenses += Object.values(data.selfEmployment.businessExpenses).reduce(
      (sum, val) => sum + val,
      0
    );
  }

  // Rental expenses
  if (data.incomeSources.some((s) => s.type === 'rental')) {
    for (const property of data.rental.properties) {
      totalExpenses += Object.values(property.expenses).reduce(
        (sum, val) => sum + val,
        0
      );
    }
  }

  // Calculate total deductions
  const totalDeductions =
    data.deductions.mileage.total + data.deductions.homeOffice.amount;

  // Calculate taxable profit
  const taxableProfit = Math.max(
    0,
    totalIncome - totalExpenses - totalDeductions
  );

  // Calculate income tax
  let incomeTax = 0;
  let remainingProfit = taxableProfit;

  // Personal allowance (reduced if income over 100k)
  let personalAllowance = TAX_BANDS.personalAllowance;
  if (taxableProfit > 100000) {
    personalAllowance = Math.max(
      0,
      TAX_BANDS.personalAllowance - (taxableProfit - 100000) / 2
    );
  }
  remainingProfit = Math.max(0, remainingProfit - personalAllowance);

  // Basic rate (20%)
  if (remainingProfit > 0) {
    const basicRateBand =
      TAX_BANDS.basicRate.threshold - TAX_BANDS.personalAllowance;
    const taxableAtBasicRate = Math.min(remainingProfit, basicRateBand);
    incomeTax += taxableAtBasicRate * TAX_BANDS.basicRate.rate;
    remainingProfit -= taxableAtBasicRate;
  }

  // Higher rate (40%)
  if (remainingProfit > 0) {
    const higherRateBand =
      TAX_BANDS.higherRate.threshold - TAX_BANDS.basicRate.threshold;
    const taxableAtHigherRate = Math.min(remainingProfit, higherRateBand);
    incomeTax += taxableAtHigherRate * TAX_BANDS.higherRate.rate;
    remainingProfit -= taxableAtHigherRate;
  }

  // Additional rate (45%)
  if (remainingProfit > 0) {
    incomeTax += remainingProfit * TAX_BANDS.additionalRate.rate;
  }

  // Calculate National Insurance (Class 4)
  let nationalInsurance = 0;
  const profitForNI = taxableProfit;

  if (profitForNI > NI_RATES.lowerProfitsLimit) {
    // Main rate (6%)
    const profitInMainBand = Math.min(
      profitForNI - NI_RATES.lowerProfitsLimit,
      NI_RATES.upperProfitsLimit - NI_RATES.lowerProfitsLimit
    );
    nationalInsurance += profitInMainBand * NI_RATES.mainRate;

    // Upper rate (2%)
    if (profitForNI > NI_RATES.upperProfitsLimit) {
      const profitAboveUpper = profitForNI - NI_RATES.upperProfitsLimit;
      nationalInsurance += profitAboveUpper * NI_RATES.upperRate;
    }
  }

  // Total tax due
  const totalTaxDue = incomeTax + nationalInsurance;

  return {
    totalIncome,
    totalExpenses,
    totalDeductions,
    taxableProfit,
    incomeTax: Math.round(incomeTax * 100) / 100,
    nationalInsurance: Math.round(nationalInsurance * 100) / 100,
    totalTaxDue: Math.round(totalTaxDue * 100) / 100,
  };
}
