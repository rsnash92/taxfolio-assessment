'use client';

import { useState, useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/config/pricing';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaxCalculation } from '@/types/wizard';

export function ReviewSummaryStep() {
  const { data, updateData, goNext, goBack } = useWizard();
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'income',
    'tax',
  ]);

  useEffect(() => {
    calculateTax();
  }, []);

  const calculateTax = () => {
    // Calculate tax based on wizard data
    // This is a simplified calculation - in production would use full HMRC rules

    // Sum up self-employment income
    let selfEmploymentIncome = 0;
    let selfEmploymentExpenses = 0;
    Object.values(data.selfEmploymentData || {}).forEach((business) => {
      selfEmploymentIncome += business.income?.total || 0;
      selfEmploymentExpenses += business.expenses?.total || 0;
    });

    // Sum up rental income
    let rentalIncome = 0;
    let rentalExpenses = 0;
    Object.values(data.rentalData || {}).forEach((property) => {
      rentalIncome += property.income?.total || 0;
      rentalExpenses += property.expenses?.total || 0;
    });

    // Other income
    const otherIncome =
      (data.otherIncome?.interest || 0) +
      (data.otherIncome?.dividends || 0) +
      (data.otherIncome?.pension || 0) +
      (data.otherIncome?.other || 0);

    const totalIncome = selfEmploymentIncome + rentalIncome + otherIncome;
    const totalExpenses = selfEmploymentExpenses + rentalExpenses;

    // Reliefs
    const pensionRelief =
      (data.general?.pension?.personalContributions || 0) * 0.2;
    const giftAidRelief =
      (data.general?.charitable?.giftAidDonations || 0) * 0.25;
    const ventureCapitalRelief =
      (data.general?.ventureCapital?.eisInvestments || 0) * 0.3 +
      (data.general?.ventureCapital?.seisInvestments || 0) * 0.5 +
      (data.general?.ventureCapital?.vctInvestments || 0) * 0.3;

    // Personal allowance (2024/25)
    const personalAllowance = 12570;

    // Taxable income
    const taxableIncome = Math.max(0, totalIncome - totalExpenses);
    const taxableAfterAllowance = Math.max(0, taxableIncome - personalAllowance);

    // Tax bands (2024/25)
    let basicRateTax = 0;
    let higherRateTax = 0;
    let additionalRateTax = 0;

    if (taxableAfterAllowance > 0) {
      const basicRateBand = Math.min(taxableAfterAllowance, 37700);
      basicRateTax = basicRateBand * 0.2;

      if (taxableAfterAllowance > 37700) {
        const higherRateBand = Math.min(taxableAfterAllowance - 37700, 87430);
        higherRateTax = higherRateBand * 0.4;
      }

      if (taxableAfterAllowance > 125140) {
        const additionalRateBand = taxableAfterAllowance - 125140;
        additionalRateTax = additionalRateBand * 0.45;
      }
    }

    const totalTaxDue = basicRateTax + higherRateTax + additionalRateTax;

    // National Insurance (Class 2 and 4 for self-employed)
    const selfEmploymentProfit = selfEmploymentIncome - selfEmploymentExpenses;
    let class2NIC = 0;
    let class4NIC = 0;

    if (selfEmploymentProfit > 6725) {
      class2NIC = 52 * 3.45; // £3.45/week for 52 weeks
    }

    if (selfEmploymentProfit > 12570) {
      const class4Band1 = Math.min(selfEmploymentProfit - 12570, 37700);
      class4NIC = class4Band1 * 0.09;

      if (selfEmploymentProfit > 50270) {
        const class4Band2 = selfEmploymentProfit - 50270;
        class4NIC += class4Band2 * 0.02;
      }
    }

    const totalNICDue = class2NIC + class4NIC;
    const totalDue =
      totalTaxDue +
      totalNICDue -
      pensionRelief -
      giftAidRelief -
      ventureCapitalRelief;

    const calc: TaxCalculation = {
      totalIncome,
      selfEmploymentIncome,
      employmentIncome: 0,
      rentalIncome,
      otherIncome,
      totalExpenses,
      allowableExpenses: totalExpenses,
      capitalAllowances: 0,
      pensionRelief,
      giftAidRelief,
      ventureCapitalRelief,
      marriageAllowance: 0,
      blindAllowance: 0,
      taxableIncome,
      personalAllowance,
      taxableAfterAllowance,
      basicRateTax,
      higherRateTax,
      additionalRateTax,
      class2NIC,
      class4NIC,
      totalTaxDue,
      totalNICDue,
      totalDue: Math.max(0, totalDue),
      refundDue: totalDue < 0 ? Math.abs(totalDue) : undefined,
    };

    setCalculation(calc);
    updateData({ taxCalculation: calc });
    setIsLoading(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e3ec]" />
        <span className="ml-3 text-gray-600">Calculating your tax...</span>
      </div>
    );
  }

  const isRefund = (calculation?.refundDue || 0) > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10 max-w-lg">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-xs text-[#00c4d4] mt-1">Paid</span>
        </div>
        <div className="flex-1 h-px bg-[#00e3ec] mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center text-sm font-medium">
            2
          </div>
          <span className="text-xs text-gray-600 mt-1">Review summary</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
            3
          </div>
          <span className="text-xs text-gray-500 mt-1">Submit to HMRC</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your Tax Summary
        </h1>
        <p className="text-gray-600">
          Review your tax calculation below. Make sure everything looks correct
          before submitting.
        </p>
      </div>

      {/* Main Tax Result Card */}
      <div
        className={cn(
          'rounded-2xl p-6 mb-8',
          isRefund
            ? 'bg-[#e6fafb] border-2 border-[#99ebef]'
            : 'bg-amber-50 border-2 border-amber-200'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={cn(
                'text-sm font-medium mb-1',
                isRefund ? 'text-[#00c4d4]' : 'text-amber-600'
              )}
            >
              {isRefund ? 'Estimated Refund' : 'Estimated Tax Due'}
            </p>
            <p
              className={cn(
                'text-4xl font-bold',
                isRefund ? 'text-[#00a8b0]' : 'text-amber-700'
              )}
            >
              {formatCurrency(
                (isRefund
                  ? calculation?.refundDue
                  : calculation?.totalDue) || 0
              )}
            </p>
          </div>
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isRefund ? 'bg-[#ccf5f7]' : 'bg-amber-100'
            )}
          >
            <FileText
              className={cn(
                'h-8 w-8',
                isRefund ? 'text-[#00c4d4]' : 'text-amber-600'
              )}
            />
          </div>
        </div>

        {/* Breakdown Mini */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-dashed border-current/20">
          <div>
            <p className="text-xs text-gray-500">Income Tax</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(calculation?.totalTaxDue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">National Insurance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(calculation?.totalNICDue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tax Reliefs</p>
            <p className="text-lg font-semibold text-[#00c4d4]">
              -
              {formatCurrency(
                (calculation?.pensionRelief || 0) +
                  (calculation?.giftAidRelief || 0) +
                  (calculation?.ventureCapitalRelief || 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4 mb-8">
        {/* Income Section */}
        <SummarySection
          title="Income"
          total={calculation?.totalIncome || 0}
          isExpanded={expandedSections.includes('income')}
          onToggle={() => toggleSection('income')}
          items={[
            {
              label: 'Self-employment income',
              value: calculation?.selfEmploymentIncome || 0,
            },
            {
              label: 'Rental income',
              value: calculation?.rentalIncome || 0,
            },
            { label: 'Other income', value: calculation?.otherIncome || 0 },
          ].filter((i) => i.value > 0)}
        />

        {/* Expenses Section */}
        {(calculation?.totalExpenses || 0) > 0 && (
          <SummarySection
            title="Allowable Expenses"
            total={calculation?.totalExpenses || 0}
            isExpanded={expandedSections.includes('expenses')}
            onToggle={() => toggleSection('expenses')}
            isDeduction
            items={[
              {
                label: 'Business expenses',
                value: calculation?.allowableExpenses || 0,
              },
              {
                label: 'Capital allowances',
                value: calculation?.capitalAllowances || 0,
              },
            ].filter((i) => i.value > 0)}
          />
        )}

        {/* Reliefs Section */}
        {((calculation?.pensionRelief || 0) > 0 ||
          (calculation?.giftAidRelief || 0) > 0 ||
          (calculation?.ventureCapitalRelief || 0) > 0) && (
          <SummarySection
            title="Tax Reliefs"
            total={
              (calculation?.pensionRelief || 0) +
              (calculation?.giftAidRelief || 0) +
              (calculation?.ventureCapitalRelief || 0)
            }
            isExpanded={expandedSections.includes('reliefs')}
            onToggle={() => toggleSection('reliefs')}
            isDeduction
            items={[
              {
                label: 'Pension contributions',
                value: calculation?.pensionRelief || 0,
              },
              {
                label: 'Gift Aid donations',
                value: calculation?.giftAidRelief || 0,
              },
              {
                label: 'Venture capital relief',
                value: calculation?.ventureCapitalRelief || 0,
              },
            ].filter((i) => i.value > 0)}
          />
        )}

        {/* Tax Calculation Section */}
        <SummarySection
          title="Tax Calculation"
          total={calculation?.totalTaxDue || 0}
          isExpanded={expandedSections.includes('tax')}
          onToggle={() => toggleSection('tax')}
          items={[
            {
              label: 'Taxable income',
              value: calculation?.taxableIncome || 0,
              isInfo: true,
            },
            {
              label: 'Personal allowance',
              value: calculation?.personalAllowance || 0,
              isDeduction: true,
            },
            {
              label: 'Basic rate tax (20%)',
              value: calculation?.basicRateTax || 0,
            },
            {
              label: 'Higher rate tax (40%)',
              value: calculation?.higherRateTax || 0,
            },
            {
              label: 'Additional rate tax (45%)',
              value: calculation?.additionalRateTax || 0,
            },
          ].filter((i) => i.value > 0 || i.isInfo)}
        />

        {/* NIC Section */}
        {(calculation?.totalNICDue || 0) > 0 && (
          <SummarySection
            title="National Insurance"
            total={calculation?.totalNICDue || 0}
            isExpanded={expandedSections.includes('nic')}
            onToggle={() => toggleSection('nic')}
            items={[
              { label: 'Class 2 NIC', value: calculation?.class2NIC || 0 },
              { label: 'Class 4 NIC', value: calculation?.class4NIC || 0 },
            ].filter((i) => i.value > 0)}
          />
        )}
      </div>

      {/* Download Button */}
      <div className="flex justify-center mb-8">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Tax Summary (PDF)
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Please review carefully</p>
            <p>
              Once submitted, you cannot make changes without filing an
              amendment. Make sure all figures are correct.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        canContinue={true}
        continueLabel="Continue to Submit"
        onContinue={goNext}
      />
    </div>
  );
}

// Summary Section Component
function SummarySection({
  title,
  total,
  items,
  isExpanded,
  onToggle,
  isDeduction = false,
}: {
  title: string;
  total: number;
  items: Array<{
    label: string;
    value: number;
    isInfo?: boolean;
    isDeduction?: boolean;
  }>;
  isExpanded: boolean;
  onToggle: () => void;
  isDeduction?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'font-semibold',
              isDeduction ? 'text-red-600' : 'text-gray-900'
            )}
          >
            {isDeduction && '-'}
            {formatCurrency(total)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && items.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span
                  className={cn(item.isDeduction ? 'text-red-600' : 'text-gray-900')}
                >
                  {item.isDeduction && '-'}
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
