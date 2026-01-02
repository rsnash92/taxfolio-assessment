'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  Plus,
  Briefcase,
  Home,
  Trash2,
  Building2,
  HardHat,
  Coins,
  PiggyBank,
  TrendingUp,
  Landmark,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const INCOME_TYPES = [
  {
    id: 'self-employment',
    label: 'Self-employed / Sole Trader',
    description: 'Freelance, sole trader, or contractor income',
    icon: Briefcase,
  },
  {
    id: 'employment',
    label: 'Employed (PAYE)',
    description: 'Salary or wages from an employer',
    icon: Building2,
  },
  {
    id: 'cis',
    label: 'Construction Worker (CIS)',
    description: 'Construction Industry Scheme income',
    icon: HardHat,
  },
  {
    id: 'rental',
    label: 'Rental Income',
    description: 'Income from property you rent out',
    icon: Home,
  },
  {
    id: 'dividends',
    label: 'Dividends',
    description: 'Income from company shares',
    icon: Coins,
  },
  {
    id: 'interest',
    label: 'Interest Income',
    description: 'Bank interest, bonds, or savings',
    icon: PiggyBank,
  },
  {
    id: 'capital-gains',
    label: 'Capital Gains / Losses',
    description: 'Profits from selling assets, crypto, or investments',
    icon: TrendingUp,
  },
  {
    id: 'pension',
    label: 'Pension Income',
    description: 'Private or workplace pension payments',
    icon: Landmark,
  },
  {
    id: 'state-benefits',
    label: 'State Benefits',
    description: 'Taxable state benefits (JSA, ESA, etc.)',
    icon: Gift,
  },
];

export function IncomeSourcesStep() {
  const { data, addIncomeSource, deleteIncomeSource, goNext } = useWizard();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddSource = (type: string) => {
    const incomeType = INCOME_TYPES.find((t) => t.id === type);
    if (incomeType) {
      addIncomeSource({
        type: incomeType.id,
        label: incomeType.label,
        data: {},
      });
    }
    setIsModalOpen(false);
  };

  const canContinue = data.incomeSources.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your income sources
        </h1>
        <p className="text-gray-600">
          Add every way you earned money (self-employed, rentals, etc.). Include
          as many as you need. You can always edit or add later.
        </p>
      </div>

      {/* Add Income Source Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full mb-8 p-4 border-2 border-dashed border-emerald-300 rounded-xl
                   text-emerald-600 font-medium hover:border-emerald-500 hover:bg-emerald-50
                   transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        Add Income Source
      </button>

      {/* List of Income Sources */}
      {data.incomeSources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Your Income Sources
          </h2>

          <div className="space-y-3">
            {data.incomeSources.map((source) => {
              const typeInfo = INCOME_TYPES.find((t) => t.id === source.type);
              const Icon = typeInfo?.icon || Briefcase;

              return (
                <div
                  key={source.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{source.label}</p>
                    <p className="text-sm text-gray-500">
                      {typeInfo?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteIncomeSource(source.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.incomeSources.length === 0 && (
        <div className="text-center py-8 text-gray-500 mb-8">
          <p>No income sources added yet.</p>
          <p className="text-sm">
            Click the button above to add your first income source.
          </p>
        </div>
      )}

      {/* Validation Message */}
      {!canContinue && (
        <p className="text-sm text-amber-600 mb-4">
          Please add at least one income source to continue.
        </p>
      )}

      <WizardNavigation canContinue={canContinue} />

      {/* Add Income Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Income Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 overflow-y-auto flex-1">
            {INCOME_TYPES.map((type) => {
              const Icon = type.icon;
              const isAdded = data.incomeSources.some(
                (s) => s.type === type.id
              );

              return (
                <button
                  key={type.id}
                  onClick={() => handleAddSource(type.id)}
                  disabled={isAdded}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                    isAdded
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                  )}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  {isAdded && (
                    <span className="text-xs text-gray-400">Added</span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
