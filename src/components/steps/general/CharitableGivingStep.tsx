'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { HelpCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

export function CharitableGivingStep() {
  const { data, updateData, goNext } = useWizard();
  const existing = data.general?.charitable;

  const [form, setForm] = useState({
    giftAidDonations: existing?.giftAidDonations || 0,
    giftAidTreatedAsPreviousYear: existing?.giftAidTreatedAsPreviousYear || 0,
    giftOfShares: existing?.giftOfShares || 0,
    giftOfProperty: existing?.giftOfProperty || 0,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate relief
  const totalGiftAid = form.giftAidDonations;
  const grossedUpDonation = totalGiftAid * 1.25; // What charity receives
  const higherRateRelief = totalGiftAid * 0.25; // Higher rate taxpayer gets this back

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleContinue = () => {
    updateData({
      general: {
        ...data.general,
        charitable: form,
      },
    });
    goNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          2024/25 Tax Year
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Charitable Giving
      </h1>
      <p className="text-gray-600 mb-8">
        Donations to UK charities made through Gift Aid.
      </p>

      {/* How Gift Aid Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Gift Aid works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Charity claims 25p for every £1 you donate</li>
              <li>
                Higher rate taxpayers claim an extra 25p via Self Assessment
              </li>
              <li>You must pay enough UK tax to cover the Gift Aid claimed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gift Aid Donations */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Total Gift Aid donations
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Enter the total amount YOU paid (not the grossed-up amount)
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            £
          </span>
          <Input
            type="number"
            value={form.giftAidDonations || ''}
            onChange={(e) =>
              setForm({
                ...form,
                giftAidDonations: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      {/* Relief Summary */}
      {form.giftAidDonations > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-emerald-800 mb-2">
            Gift Aid breakdown:
          </p>
          <div className="space-y-1 text-sm text-emerald-700">
            <div className="flex justify-between">
              <span>You donated:</span>
              <span>{formatCurrency(totalGiftAid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Charity receives (grossed up):</span>
              <span>{formatCurrency(grossedUpDonation)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Your higher rate relief:</span>
              <span>{formatCurrency(higherRateRelief)}</span>
            </div>
          </div>
          <p className="text-xs text-emerald-600 mt-2">
            *Higher rate relief only applies if you&apos;re a higher rate
            taxpayer
          </p>
        </div>
      )}

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        Advanced options (shares, property, carry back)
      </button>

      {showAdvanced && (
        <div className="space-y-6 p-4 bg-gray-50 rounded-xl mb-6">
          {/* Treat as Previous Year */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Donations to treat as previous year (2023/24)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Gift Aid paid before 31 Jan 2025 can be treated as 2023/24
            </p>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.giftAidTreatedAsPreviousYear || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    giftAidTreatedAsPreviousYear:
                      parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {/* Gift of Shares */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Gift of shares or securities to charity
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Market value of shares gifted
            </p>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.giftOfShares || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    giftOfShares: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {/* Gift of Property */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Gift of land or property to charity
            </label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.giftOfProperty || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    giftOfProperty: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>
        </div>
      )}

      <WizardNavigation canContinue={true} onContinue={handleContinue} />
    </div>
  );
}
