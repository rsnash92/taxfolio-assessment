'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Info, HelpCircle } from 'lucide-react';

const PSA_BASIC = 1000;
const PSA_HIGHER = 500;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function InterestStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const existing = data.interestData || {};
  const [form, setForm] = useState({
    untaxedUKInterest: existing.untaxedUKInterest || 0,
    untaxedForeignInterest: existing.untaxedForeignInterest || 0,
  });

  const totalInterest = form.untaxedUKInterest + form.untaxedForeignInterest;

  const handleContinue = () => {
    updateData({
      interestData: {
        ...form,
        totalInterest,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
            <Landmark className="h-5 w-5 text-cyan-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Interest Income</h1>
        </div>
        <p className="text-gray-600">
          Interest from bank accounts, building societies, and savings.
        </p>
      </div>

      {/* PSA Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Personal Savings Allowance 2024/25</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Basic rate taxpayers: first £{PSA_BASIC.toLocaleString()} tax-free</li>
            <li>Higher rate taxpayers: first £{PSA_HIGHER.toLocaleString()} tax-free</li>
            <li>Additional rate taxpayers: no allowance</li>
          </ul>
        </div>
      </div>

      {/* UK Interest */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">UK Interest</h3>

        <div className="grid gap-2">
          <Label htmlFor="untaxedUKInterest" className="flex items-center gap-2">
            UK interest received
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </Label>
          <p className="text-sm text-gray-500">
            Interest from UK banks, building societies, NS&I, etc.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="untaxedUKInterest"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={form.untaxedUKInterest || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  untaxedUKInterest: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Foreign Interest */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Foreign Interest</h3>

        <div className="grid gap-2">
          <Label htmlFor="untaxedForeignInterest" className="flex items-center gap-2">
            Foreign interest received
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </Label>
          <p className="text-sm text-gray-500">
            Interest from overseas accounts (converted to GBP)
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="untaxedForeignInterest"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={form.untaxedForeignInterest || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  untaxedForeignInterest: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {totalInterest > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total interest income</span>
            <span className="font-bold">{formatCurrency(totalInterest)}</span>
          </div>

          {totalInterest <= PSA_BASIC && (
            <p className="text-xs text-[#00c4d4] mt-3">
              Your interest is within the Personal Savings Allowance for basic
              rate taxpayers - likely no tax due on this income.
            </p>
          )}
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
            className="bg-[#00e3ec] hover:bg-[#00c4d4]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
