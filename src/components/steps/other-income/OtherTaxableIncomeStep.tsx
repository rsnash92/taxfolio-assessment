'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Coins, Info, HelpCircle } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function OtherTaxableIncomeStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const existing = data.otherTaxableIncomeData || {};
  const [form, setForm] = useState({
    grossIncome: existing.grossIncome || 0,
    allowableExpenses: existing.allowableExpenses || 0,
    taxDeducted: existing.taxDeducted || 0,
    description: existing.description || '',
    preOwnedAssetsBenefit: existing.preOwnedAssetsBenefit || 0,
  });

  const netIncome = Math.max(0, form.grossIncome - form.allowableExpenses);

  const handleContinue = () => {
    // Only save if there's actually data
    if (form.grossIncome > 0 || form.preOwnedAssetsBenefit > 0) {
      updateData({
        otherTaxableIncomeData: {
          grossIncome: form.grossIncome || undefined,
          allowableExpenses: form.allowableExpenses || undefined,
          taxDeducted: form.taxDeducted || undefined,
          description: form.description || undefined,
          preOwnedAssetsBenefit: form.preOwnedAssetsBenefit || undefined,
        },
      });
    } else {
      // Clear the data if nothing entered
      updateData({
        otherTaxableIncomeData: undefined,
      });
    }
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <Coins className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Other Taxable Income</h1>
        </div>
        <p className="text-gray-600">
          Income that doesn&apos;t fit into other categories on your tax return.
        </p>
      </div>

      {/* Info */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#00c4d4] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#00858c]">
          <p className="font-medium mb-1">What counts as other income?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Casual earnings (e.g. one-off jobs)</li>
            <li>Commission payments not from employment</li>
            <li>Freelance income below £1,000 trading allowance</li>
            <li>Taxable grants or awards</li>
            <li>Income from letting property casually</li>
          </ul>
        </div>
      </div>

      {/* Gross Income */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Income Details</h3>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="grossIncome" className="flex items-center gap-2">
              Gross income before expenses
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-sm text-gray-500">
              Total amount received before deducting any expenses (Box 17)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="grossIncome"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="pl-8"
                value={form.grossIncome || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    grossIncome: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="allowableExpenses" className="flex items-center gap-2">
              Allowable expenses
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-sm text-gray-500">
              Expenses wholly and exclusively for earning this income (Box 18)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="allowableExpenses"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="pl-8"
                value={form.allowableExpenses || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    allowableExpenses: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taxDeducted" className="flex items-center gap-2">
              Tax already deducted
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-sm text-gray-500">
              If tax was withheld at source from this income (Box 19)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="taxDeducted"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="pl-8"
                value={form.taxDeducted || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    taxDeducted: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description of income
            </Label>
            <p className="text-sm text-gray-500">
              Briefly describe the source of this income (Box 21)
            </p>
            <Textarea
              id="description"
              placeholder="e.g. Freelance graphic design work, casual tutoring"
              className="resize-none"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Pre-Owned Assets - Advanced/rare field */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pre-Owned Assets</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Rare</span>
        </div>
        <p className="text-sm text-gray-500">
          Only complete this if you&apos;ve given away assets but continue to benefit from them (Box 20).
          This applies to the Pre-Owned Assets Tax (POAT) regime.
        </p>

        <div className="grid gap-2">
          <Label htmlFor="preOwnedAssetsBenefit">
            Benefit from pre-owned assets
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="preOwnedAssetsBenefit"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="pl-8"
              value={form.preOwnedAssetsBenefit || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  preOwnedAssetsBenefit: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {(form.grossIncome > 0 || form.preOwnedAssetsBenefit > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross income</span>
              <span>{formatCurrency(form.grossIncome)}</span>
            </div>
            {form.allowableExpenses > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Less: Allowable expenses</span>
                <span>- {formatCurrency(form.allowableExpenses)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-medium">Net taxable income</span>
              <span className="font-bold">{formatCurrency(netIncome)}</span>
            </div>
            {form.taxDeducted > 0 && (
              <div className="flex justify-between text-[#00c4d4]">
                <span>Tax already paid</span>
                <span>{formatCurrency(form.taxDeducted)}</span>
              </div>
            )}
            {form.preOwnedAssetsBenefit > 0 && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Pre-owned assets benefit</span>
                <span>{formatCurrency(form.preOwnedAssetsBenefit)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        {canGoBack && (
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
