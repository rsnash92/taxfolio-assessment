'use client';

import Link from 'next/link';
import { useWizard } from '@/providers/WizardProvider';
import { HelpCircle, Home, Save, Loader2 } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function WizardHeader() {
  const { data, isSaving } = useWizard();
  const { taxCalculation, taxYear } = data;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="https://app.taxfolio.io/dashboard"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TF</span>
          </div>
          <span className="text-xl font-bold text-gray-900">taxfolio</span>
        </Link>

        {/* Stats Bar */}
        <div className="hidden md:flex items-center gap-8">
          {/* Tax Liability */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tax liability:</span>
            <span
              className={`text-lg font-bold ${
                taxCalculation.totalTaxDue > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {formatCurrency(taxCalculation.totalTaxDue)}
            </span>
            <button className="text-gray-400 hover:text-gray-600">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Tax Year */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tax year:</span>
            <span className="text-sm font-semibold text-emerald-600">
              {taxYear}
            </span>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Back to Dashboard */}
        <Link
          href="https://app.taxfolio.io/dashboard"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </div>
    </header>
  );
}
