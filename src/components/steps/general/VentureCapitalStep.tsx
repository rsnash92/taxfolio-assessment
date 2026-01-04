'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { Info, TrendingUp } from 'lucide-react';

export function VentureCapitalStep() {
  const { data, updateData, goNext } = useWizard();
  const existing = data.general?.ventureCapital;

  const [form, setForm] = useState({
    eisInvestments: existing?.eisInvestments || 0,
    eisCarryBack: existing?.eisCarryBack || false,
    seisInvestments: existing?.seisInvestments || 0,
    seisCarryBack: existing?.seisCarryBack || false,
    vctInvestments: existing?.vctInvestments || 0,
  });

  // Calculate total relief
  const eisRelief = form.eisInvestments * 0.3;
  const seisRelief = form.seisInvestments * 0.5;
  const vctRelief = form.vctInvestments * 0.3;
  const totalRelief = eisRelief + seisRelief + vctRelief;

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
        ventureCapital: {
          ...form,
          eisReliefClaimed: eisRelief,
          seisReliefClaimed: seisRelief,
          vctReliefClaimed: vctRelief,
        },
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
        Venture Capital Schemes
      </h1>
      <p className="text-gray-600 mb-8">
        Tax relief on investments in qualifying startups and venture capital
        trusts.
      </p>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tax relief rates:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>EIS: 30% relief (up to £1m invested)</li>
              <li>SEIS: 50% relief (up to £200k invested)</li>
              <li>VCT: 30% relief (up to £200k invested)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schemes */}
      <div className="space-y-6 mb-8">
        {/* EIS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#00c4d4] bg-[#ccf5f7] px-2 py-0.5 rounded">
                  30% relief
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mt-2">
                EIS - Enterprise Investment Scheme
              </h3>
              <p className="text-sm text-gray-500">
                Investments in early-stage companies
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Total EIS investments in 2024/25
            </label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.eisInvestments || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eisInvestments: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {form.eisInvestments > 0 && (
            <>
              <div className="text-sm text-[#00c4d4] mb-3">
                Tax relief: {formatCurrency(eisRelief)}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.eisCarryBack}
                  onChange={(e) =>
                    setForm({ ...form, eisCarryBack: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-[#00e3ec]"
                />
                <span className="text-sm text-gray-700">
                  Carry back to previous year (2023/24)
                </span>
              </label>
            </>
          )}
        </div>

        {/* SEIS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                  50% relief
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mt-2">
                SEIS - Seed Enterprise Investment Scheme
              </h3>
              <p className="text-sm text-gray-500">
                Investments in very early-stage startups
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Total SEIS investments in 2024/25
            </label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.seisInvestments || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seisInvestments: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {form.seisInvestments > 0 && (
            <>
              <div className="text-sm text-purple-600 mb-3">
                Tax relief: {formatCurrency(seisRelief)}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.seisCarryBack}
                  onChange={(e) =>
                    setForm({ ...form, seisCarryBack: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-[#00e3ec]"
                />
                <span className="text-sm text-gray-700">
                  Carry back to previous year (2023/24)
                </span>
              </label>
            </>
          )}
        </div>

        {/* VCT */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  30% relief
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mt-2">
                VCT - Venture Capital Trust
              </h3>
              <p className="text-sm text-gray-500">
                Investments in venture capital trusts
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Total VCT investments in 2024/25
            </label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.vctInvestments || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vctInvestments: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {form.vctInvestments > 0 && (
            <div className="text-sm text-blue-600">
              Tax relief: {formatCurrency(vctRelief)}
            </div>
          )}
        </div>
      </div>

      {/* Total Relief Summary */}
      {totalRelief > 0 && (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#00c4d4]">
                Total venture capital tax relief
              </p>
              <p className="text-2xl font-bold text-[#00a8b0]">
                {formatCurrency(totalRelief)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#00e3ec]" />
          </div>
        </div>
      )}

      <WizardNavigation canContinue={true} onContinue={handleContinue} />
    </div>
  );
}
