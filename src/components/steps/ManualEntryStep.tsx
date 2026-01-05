'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  FileText,
  Briefcase,
  Home,
  Building2,
  Landmark,
  PiggyBank,
  TrendingUp,
  Receipt,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const INCOME_TYPE_INFO = {
  'self-employment': {
    icon: Briefcase,
    label: 'Self-Employment',
    description: 'Business income, expenses, and capital allowances',
  },
  rental: {
    icon: Home,
    label: 'Rental Income',
    description: 'Property income and related expenses',
  },
  employment: {
    icon: Building2,
    label: 'Employment',
    description: 'PAYE income from your employer',
  },
  cis: {
    icon: Receipt,
    label: 'CIS Income',
    description: 'Construction Industry Scheme payments',
  },
  dividends: {
    icon: TrendingUp,
    label: 'Dividends',
    description: 'Income from shares and investments',
  },
  interest: {
    icon: Landmark,
    label: 'Interest',
    description: 'Bank and savings interest',
  },
  'capital-gains': {
    icon: TrendingUp,
    label: 'Capital Gains',
    description: 'Profits from selling assets',
  },
  pension: {
    icon: PiggyBank,
    label: 'Pension Income',
    description: 'Private and state pension payments',
  },
  'state-benefits': {
    icon: FileText,
    label: 'State Benefits',
    description: 'Taxable benefits like JSA',
  },
  other: {
    icon: FileText,
    label: 'Other Income',
    description: 'Any other taxable income',
  },
} as const;

export function ManualEntryStep() {
  const { data, goNext } = useWizard();

  // Get the income sources the user selected
  const selectedSources = data.incomeSources || [];

  const handleContinue = () => {
    goNext();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Manual Entry
        </h1>
        <p className="text-gray-600">
          You&apos;ll enter your income and expenses manually for each category.
          We&apos;ll guide you through each section step by step.
        </p>
      </div>

      {/* What to prepare */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">What you&apos;ll need</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Bank statements or records of your income</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Receipts or records of business expenses</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>P60 or P45 from your employer (if employed)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Any relevant tax documents (P11D, dividend vouchers, etc.)</span>
          </li>
        </ul>
      </div>

      {/* Sections to complete */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">
          Sections you&apos;ll complete
        </h3>
        <div className="space-y-3">
          {selectedSources.map((source) => {
            const info = INCOME_TYPE_INFO[source.type as keyof typeof INCOME_TYPE_INFO];
            if (!info) return null;

            const Icon = info.icon;
            return (
              <div
                key={source.id}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-[#e6fafb] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-[#00c4d4]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{info.label}</p>
                  <p className="text-sm text-gray-500">{info.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            );
          })}

          {/* Always show Tax Reliefs */}
          <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-[#e6fafb] flex items-center justify-center flex-shrink-0">
              <Receipt className="h-5 w-5 text-[#00c4d4]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Tax Reliefs & Allowances</p>
              <p className="text-sm text-gray-500">Pension contributions, charitable giving, etc.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <p className="text-sm text-amber-800">
          <strong>Tip:</strong> You can save your progress at any time and come back later.
          Your data is automatically saved as you go.
        </p>
      </div>

      <WizardNavigation
        canContinue={true}
        onContinue={handleContinue}
        continueLabel="Start entering data"
      />
    </div>
  );
}
