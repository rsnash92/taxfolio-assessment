'use client';

import { useEffect, useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { CheckCircle, Building2, FileText, Loader2 } from 'lucide-react';

export function ImportingStep() {
  const { data, goNext } = useWizard();
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get import data from wizard state (persisted in localStorage)
  const importData = data.bankImportData;

  useEffect(() => {
    // Show loading animation briefly, then reveal success
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        setShowSuccess(true);
      }, 300);
    }, 1500);

    return () => clearTimeout(loadingTimer);
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Importing your data...
        </h1>
        <p className="text-gray-500">
          Please wait while we process your bank transactions.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center py-8">
        <div
          className={`w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center transition-all duration-500 ${
            showSuccess ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Import Complete!
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          We&apos;ve successfully imported your bank data. Here&apos;s what we found:
        </p>
      </div>

      {/* Import Summary */}
      <div className="max-w-md mx-auto mt-8 space-y-4">
        {/* Bank Connected */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {importData?.bankName || 'Bank Connected'}
            </p>
            <p className="text-sm text-gray-500">
              {importData?.accountCount || 1} account{(importData?.accountCount || 1) !== 1 ? 's' : ''} linked
            </p>
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>

        {/* Transactions */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {importData?.transactionCount?.toLocaleString() || '0'} Transactions
            </p>
            <p className="text-sm text-gray-500">
              Tax year 2024-25
            </p>
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Next step:</strong> We&apos;ll help you review and categorize your
            transactions to identify income and expenses for your tax return.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <WizardNavigation
          canContinue={showSuccess}
          continueLabel="Review Transactions"
          onContinue={goNext}
        />
      </div>
    </div>
  );
}
