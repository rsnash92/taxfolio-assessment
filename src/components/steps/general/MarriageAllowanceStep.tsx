'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MarriageAllowanceStep() {
  const { data, updateData, goNext } = useWizard();
  const existing = data.general?.marriageAllowance;

  const [form, setForm] = useState({
    type: existing?.type || (null as 'transfer' | 'receive' | null),
    spouseNino: existing?.spouseNino || '',
    spouseName: existing?.spouseName || '',
    spouseDob: existing?.spouseDob || '',
  });

  const handleContinue = () => {
    updateData({
      general: {
        ...data.general,
        marriageAllowance: form,
      },
    });
    goNext();
  };

  const isValid = form.type && form.spouseName;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tax Year Badge */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-[#00858c] bg-[#e6fafb] px-3 py-1 rounded-full">
          2024/25 Tax Year
        </span>
        <span className="text-sm text-red-500">* Required</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Marriage Allowance
      </h1>
      <p className="text-gray-600 mb-8">
        Transfer £1,260 of your Personal Allowance to your spouse or civil
        partner.
      </p>

      {/* Eligibility Info */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-8">
        <p className="text-sm text-[#00858c]">
          <strong>Eligibility:</strong> You can transfer allowance if you earn
          less than £12,570 and your partner pays tax at the basic rate (earns
          between £12,571 and £50,270).
        </p>
      </div>

      {/* Transfer Direction */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          Are you transferring or receiving?
          <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setForm({ ...form, type: 'transfer' })}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              form.type === 'transfer'
                ? 'border-[#00e3ec] bg-[#e6fafb]'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <ArrowRight
              className={cn(
                'h-6 w-6 mb-2',
                form.type === 'transfer' ? 'text-[#00c4d4]' : 'text-gray-400'
              )}
            />
            <p className="font-medium text-gray-900">Transfer to spouse</p>
            <p className="text-sm text-gray-500">
              I&apos;m giving £1,260 to my partner
            </p>
          </button>

          <button
            onClick={() => setForm({ ...form, type: 'receive' })}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              form.type === 'receive'
                ? 'border-[#00e3ec] bg-[#e6fafb]'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <ArrowLeft
              className={cn(
                'h-6 w-6 mb-2',
                form.type === 'receive' ? 'text-[#00c4d4]' : 'text-gray-400'
              )}
            />
            <p className="font-medium text-gray-900">Receive from spouse</p>
            <p className="text-sm text-gray-500">
              I&apos;m receiving £1,260 from my partner
            </p>
          </button>
        </div>
      </div>

      {/* Spouse Details */}
      {form.type && (
        <>
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              Spouse/civil partner&apos;s full name
              <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.spouseName}
              onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
              placeholder="e.g. Jane Smith"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              Spouse/civil partner&apos;s National Insurance number
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Optional but helps HMRC process faster
            </p>
            <Input
              value={form.spouseNino}
              onChange={(e) =>
                setForm({ ...form, spouseNino: e.target.value.toUpperCase() })
              }
              placeholder="e.g. QQ 12 34 56 C"
              className="uppercase"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              Spouse/civil partner&apos;s date of birth
            </label>
            <Input
              type="date"
              value={form.spouseDob}
              onChange={(e) => setForm({ ...form, spouseDob: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Tax Saving Info */}
      {form.type === 'receive' && (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-6">
          <p className="text-sm text-[#006b70]">
            <strong>Potential saving:</strong> Up to £252 off your tax bill for
            2024/25.
          </p>
        </div>
      )}

      <WizardNavigation canContinue={!!isValid} onContinue={handleContinue} />
    </div>
  );
}
