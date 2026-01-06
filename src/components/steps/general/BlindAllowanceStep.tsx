'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { HelpCircle } from 'lucide-react';

export function BlindAllowanceStep() {
  const { data, updateData, goNext } = useWizard();
  const existing = data.general?.blindAllowance;

  const [form, setForm] = useState({
    registeredBlind: existing?.registeredBlind ?? true,
    localAuthority: existing?.localAuthority || '',
    registrationDate: existing?.registrationDate || '',
    surplusFromSpouse: existing?.surplusFromSpouse || 0,
  });

  const handleContinue = () => {
    updateData({
      general: {
        ...data.general,
        blindAllowance: form,
      },
    });
    goNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-[#00858c] bg-[#e6fafb] px-3 py-1 rounded-full">
          2024/25 Tax Year
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Blind Person&apos;s Allowance
      </h1>
      <p className="text-gray-600 mb-8">
        Claim an extra £3,070 tax-free allowance if you&apos;re registered as
        blind.
      </p>

      {/* Eligibility */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-8">
        <p className="text-sm text-[#00858c]">
          <strong>Eligibility:</strong> You must be registered as severely sight
          impaired with your local authority in England/Wales, or in
          Scotland/Northern Ireland, you must be unable to do work for which
          eyesight is essential.
        </p>
      </div>

      {/* Local Authority */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Local authority where registered
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </label>
        <Input
          value={form.localAuthority}
          onChange={(e) =>
            setForm({ ...form, localAuthority: e.target.value })
          }
          placeholder="e.g. Manchester City Council"
        />
      </div>

      {/* Registration Date */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Date of registration
        </label>
        <Input
          type="date"
          value={form.registrationDate}
          onChange={(e) =>
            setForm({ ...form, registrationDate: e.target.value })
          }
        />
      </div>

      {/* Surplus from Spouse */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Surplus allowance from spouse/civil partner
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </label>
        <p className="text-sm text-gray-500 mb-2">
          If your spouse is also blind and can&apos;t use all their allowance,
          they can transfer the surplus to you.
        </p>
        <div className="relative w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            £
          </span>
          <Input
            type="number"
            value={form.surplusFromSpouse || ''}
            onChange={(e) =>
              setForm({
                ...form,
                surplusFromSpouse: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      {/* Allowance Summary */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-6">
        <p className="text-sm text-[#006b70]">
          <strong>Your allowance:</strong> £3,070
          {form.surplusFromSpouse > 0 &&
            ` + £${form.surplusFromSpouse.toLocaleString()} surplus = £${(3070 + form.surplusFromSpouse).toLocaleString()}`}
        </p>
        <p className="text-sm text-[#00c4d4] mt-1">
          Tax saving: Up to £
          {((3070 + (form.surplusFromSpouse || 0)) * 0.2).toLocaleString()}
        </p>
      </div>

      <WizardNavigation canContinue={true} onContinue={handleContinue} />
    </div>
  );
}
