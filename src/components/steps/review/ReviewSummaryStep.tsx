'use client';

import { useState } from 'react';
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
import { jsPDF } from 'jspdf';

export function ReviewSummaryStep() {
  const { data, goNext } = useWizard();
  // Use the taxCalculation from the provider directly - it's calculated automatically
  const calculation = data.taxCalculation;
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'income',
    'tax',
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleDownloadPDF = () => {
    if (!calculation) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 168, 176); // Brand color
    doc.text('TaxFolio', 20, y);
    doc.setFontSize(12);
    doc.setTextColor(128, 128, 128);
    doc.text('Tax Summary 2024/25', pageWidth - 20, y, { align: 'right' });
    y += 15;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    // Main result
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    const isRefund = (calculation.refundDue || 0) > 0;
    doc.text(isRefund ? 'Estimated Refund' : 'Estimated Tax Due', 20, y);
    doc.setFontSize(24);
    doc.setTextColor(isRefund ? 0 : 15, isRefund ? 168 : 23, isRefund ? 176 : 42);
    y += 12;
    doc.text(
      formatCurrency(isRefund ? calculation.refundDue || 0 : calculation.totalDue || 0),
      20,
      y
    );
    y += 20;

    // Breakdown section
    const addSection = (title: string, items: { label: string; value: number }[]) => {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);

      items.forEach((item) => {
        if (item.value > 0) {
          doc.text(item.label, 25, y);
          doc.text(formatCurrency(item.value), pageWidth - 25, y, { align: 'right' });
          y += 6;
        }
      });
      y += 8;
    };

    // Income
    addSection('Income', [
      { label: 'Employment income', value: calculation.employmentIncome || 0 },
      { label: 'Self-employment income', value: calculation.selfEmploymentIncome || 0 },
      { label: 'Rental income', value: calculation.rentalIncome || 0 },
      { label: 'Other income', value: calculation.otherIncome || 0 },
    ]);

    // Expenses
    if ((calculation.totalExpenses || 0) > 0) {
      addSection('Allowable Expenses', [
        { label: 'Business expenses', value: calculation.allowableExpenses || 0 },
        { label: 'Capital allowances', value: calculation.capitalAllowances || 0 },
      ]);
    }

    // Tax Reliefs
    const totalReliefs =
      (calculation.pensionRelief || 0) +
      (calculation.giftAidRelief || 0) +
      (calculation.ventureCapitalRelief || 0);
    if (totalReliefs > 0) {
      addSection('Tax Reliefs', [
        { label: 'Pension contributions', value: calculation.pensionRelief || 0 },
        { label: 'Gift Aid donations', value: calculation.giftAidRelief || 0 },
        { label: 'Venture capital relief', value: calculation.ventureCapitalRelief || 0 },
      ]);
    }

    // Tax Calculation
    addSection('Tax Calculation', [
      { label: 'Personal allowance', value: calculation.personalAllowance || 0 },
      { label: 'Basic rate tax (20%)', value: calculation.basicRateTax || 0 },
      { label: 'Higher rate tax (40%)', value: calculation.higherRateTax || 0 },
      { label: 'Additional rate tax (45%)', value: calculation.additionalRateTax || 0 },
    ]);

    // National Insurance
    if ((calculation.totalNICDue || 0) > 0) {
      addSection('National Insurance', [
        { label: 'Class 2 NIC', value: calculation.class2NIC || 0 },
        { label: 'Class 4 NIC', value: calculation.class4NIC || 0 },
      ]);
    }

    // Totals
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Total Income Tax', 20, y);
    doc.text(formatCurrency(calculation.totalTaxDue || 0), pageWidth - 25, y, { align: 'right' });
    y += 8;
    doc.text('Total National Insurance', 20, y);
    doc.text(formatCurrency(calculation.totalNICDue || 0), pageWidth - 25, y, { align: 'right' });
    y += 8;
    doc.text('Total Tax Reliefs', 20, y);
    doc.setTextColor(0, 168, 176);
    doc.text('-' + formatCurrency(totalReliefs), pageWidth - 25, y, { align: 'right' });
    y += 12;
    doc.setFontSize(14);
    doc.setTextColor(isRefund ? 0 : 15, isRefund ? 168 : 23, isRefund ? 176 : 42);
    doc.text(isRefund ? 'Total Refund Due' : 'Total Tax Due', 20, y);
    doc.text(
      formatCurrency(isRefund ? calculation.refundDue || 0 : calculation.totalDue || 0),
      pageWidth - 25,
      y,
      { align: 'right' }
    );

    // Footer
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by TaxFolio - This is an estimate only', pageWidth / 2, y, { align: 'center' });

    // Save the PDF
    doc.save('TaxFolio-Tax-Summary-2024-25.pdf');
  };

  if (!calculation) {
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
            : 'bg-gradient-to-r from-[#0f172a] to-[#1e293b]'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={cn(
                'text-sm font-medium mb-1',
                isRefund ? 'text-[#00c4d4]' : 'text-gray-400'
              )}
            >
              {isRefund ? 'Estimated Refund' : 'Estimated Tax Due'}
            </p>
            <p
              className={cn(
                'text-4xl font-bold',
                isRefund ? 'text-[#00a8b0]' : 'text-white'
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
              isRefund ? 'bg-[#ccf5f7]' : 'bg-white/10'
            )}
          >
            <FileText
              className={cn(
                'h-8 w-8',
                isRefund ? 'text-[#00c4d4]' : 'text-white/80'
              )}
            />
          </div>
        </div>

        {/* Breakdown Mini */}
        <div className={cn(
          'grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-dashed',
          isRefund ? 'border-current/20' : 'border-white/20'
        )}>
          <div>
            <p className={cn('text-xs', isRefund ? 'text-gray-500' : 'text-gray-400')}>Income Tax</p>
            <p className={cn('text-lg font-semibold', isRefund ? 'text-gray-900' : 'text-white')}>
              {formatCurrency(calculation?.totalTaxDue || 0)}
            </p>
          </div>
          <div>
            <p className={cn('text-xs', isRefund ? 'text-gray-500' : 'text-gray-400')}>National Insurance</p>
            <p className={cn('text-lg font-semibold', isRefund ? 'text-gray-900' : 'text-white')}>
              {formatCurrency(calculation?.totalNICDue || 0)}
            </p>
          </div>
          <div>
            <p className={cn('text-xs', isRefund ? 'text-gray-500' : 'text-gray-400')}>Tax Reliefs</p>
            <p className={cn('text-lg font-semibold', isRefund ? 'text-[#00c4d4]' : 'text-[#00e3ec]')}>
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
              label: 'Employment income',
              value: calculation?.employmentIncome || 0,
            },
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
        <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" />
          Download Tax Summary (PDF)
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#00c4d4] mt-0.5" />
          <div className="text-sm text-[#00858c]">
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
