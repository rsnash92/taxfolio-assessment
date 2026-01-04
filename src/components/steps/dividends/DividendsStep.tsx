'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Info, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const DIVIDEND_ALLOWANCE = 500; // 2024/25

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function DividendsStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const existing = data.dividendsData || {};
  const [form, setForm] = useState({
    ukDividends: existing.ukDividends || 0,
    foreignDividends: existing.foreignDividends || 0,
    foreignTaxPaid: existing.foreignTaxPaid || 0,
  });

  const [showForeign, setShowForeign] = useState((existing.foreignDividends || 0) > 0);

  const totalDividends = form.ukDividends + form.foreignDividends;
  const taxableDividends = Math.max(0, totalDividends - DIVIDEND_ALLOWANCE);

  const handleContinue = () => {
    updateData({
      dividendsData: {
        ...form,
        totalDividends,
        taxableDividends,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dividend Income</h1>
        </div>
        <p className="text-gray-600">
          Income from shares in UK or overseas companies.
        </p>
      </div>

      {/* Allowance Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Dividend Allowance 2024/25</p>
          <p>
            The first £{DIVIDEND_ALLOWANCE.toLocaleString()} of dividend income
            is tax-free. Above this, dividends are taxed at:
          </p>
          <ul className="list-disc list-inside mt-1">
            <li>8.75% (basic rate)</li>
            <li>33.75% (higher rate)</li>
            <li>39.35% (additional rate)</li>
          </ul>
        </div>
      </div>

      {/* UK Dividends */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">UK Dividends</h3>

        <div className="grid gap-2">
          <Label htmlFor="ukDividends" className="flex items-center gap-2">
            UK dividends received
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </Label>
          <p className="text-sm text-gray-500">
            Dividends from UK companies (check your dividend vouchers)
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="ukDividends"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={form.ukDividends || ''}
              onChange={(e) =>
                setForm({ ...form, ukDividends: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </div>

      {/* Foreign Dividends Toggle */}
      <button
        onClick={() => setShowForeign(!showForeign)}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
      >
        {showForeign ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {showForeign ? 'Hide' : 'Add'} foreign dividends
      </button>

      {showForeign && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Foreign Dividends</h3>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="foreignDividends">Foreign dividends received</Label>
              <p className="text-sm text-gray-500">
                Dividends from overseas companies (converted to GBP)
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="foreignDividends"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={form.foreignDividends || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      foreignDividends: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="foreignTaxPaid">Foreign tax already paid</Label>
              <p className="text-sm text-gray-500">
                For double taxation relief
              </p>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="foreignTaxPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={form.foreignTaxPaid || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      foreignTaxPaid: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {totalDividends > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total dividends</span>
              <span className="font-medium">{formatCurrency(totalDividends)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dividend allowance</span>
              <span className="text-[#00c4d4]">
                -{formatCurrency(Math.min(DIVIDEND_ALLOWANCE, totalDividends))}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Taxable dividends</span>
              <span className="font-bold">{formatCurrency(taxableDividends)}</span>
            </div>
          </div>

          {taxableDividends === 0 && (
            <p className="text-xs text-[#00c4d4] mt-3">
              Your dividends are within the tax-free allowance - no tax due on
              this income.
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
