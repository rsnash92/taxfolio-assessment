'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Building2,
  Home,
  Briefcase,
  PiggyBank,
  TrendingUp,
  Calculator,
} from 'lucide-react';

interface HMRCStatus {
  connected: boolean;
  nino: string;
  taxYear: string;
  businesses: Array<{
    businessId: string;
    typeOfBusiness: string;
    tradingName?: string;
  }>;
  selfEmployment: Array<{
    businessId: string;
    tradingName?: string;
    periodData?: {
      periodIncome?: { turnover?: number };
      periodExpenses?: { consolidatedExpenses?: number };
    };
    error?: string;
  }>;
  property: {
    businessId: string;
    periodData?: unknown;
    error?: string;
  } | null;
  employment: Array<{
    employmentId: string;
    employerName: string;
    employerRef?: string;
  }>;
  dividends: unknown;
  interest: unknown;
  calculations: Array<{
    calculationId: string;
    calculationTimestamp: string;
    calculationType: string;
  }>;
  errors: string[];
  sandboxWarnings: string[];
}

export default function HMRCStatusPage() {
  const [nino, setNino] = useState('');
  const [taxYear, setTaxYear] = useState('2024-25');
  const [status, setStatus] = useState<HMRCStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load NINO from wizard progress on mount
  useEffect(() => {
    const loadNino = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: progress } = await supabase
            .from('wizard_progress')
            .select('wizard_data')
            .eq('user_id', user.id)
            .single();

          if (progress?.wizard_data?.personalInfo?.nino) {
            setNino(progress.wizard_data.personalInfo.nino);
          }
        }
      } catch {
        // Ignore errors loading NINO
      } finally {
        setInitialLoading(false);
      }
    };

    loadNino();
  }, []);

  const fetchStatus = async () => {
    if (!nino) {
      setError('Please enter your NINO');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/hmrc/status?nino=${encodeURIComponent(nino)}&taxYear=${taxYear}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch status');
        return;
      }

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '—';
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">HMRC Submission Status</h1>
        <p className="text-gray-600 mb-8">
          View what data has been submitted to HMRC for your Self Assessment.
        </p>

        {/* Query Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National Insurance Number
              </label>
              <input
                type="text"
                value={nino}
                onChange={(e) => setNino(e.target.value.toUpperCase())}
                placeholder="AB123456C"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Year
              </label>
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchStatus}
                disabled={loading || !nino}
                className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Check Status
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          )}
        </div>

        {/* Status Results */}
        {status && (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                {status.connected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <h2 className="text-lg font-semibold">
                  {status.connected ? 'Connected to HMRC' : 'Not Connected'}
                </h2>
              </div>

              {/* Real errors - shown prominently */}
              {status.errors && status.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  {status.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-red-700 text-sm bg-red-50 p-2 rounded">
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {/* Sandbox warnings - less prominent, collapsible */}
              {status.sandboxWarnings && status.sandboxWarnings.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {status.sandboxWarnings.length} sandbox limitation{status.sandboxWarnings.length !== 1 ? 's' : ''} (expected in test mode)
                  </summary>
                  <div className="mt-2 space-y-1 pl-6">
                    {status.sandboxWarnings.map((warn, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {warn}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Businesses */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-gray-400" />
                <h2 className="text-lg font-semibold">Registered Businesses</h2>
              </div>
              {!status.businesses || status.businesses.length === 0 ? (
                <p className="text-gray-500">No businesses registered with HMRC</p>
              ) : (
                <div className="space-y-3">
                  {status.businesses.map((biz) => (
                    <div
                      key={biz.businessId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{biz.tradingName || 'Unnamed Business'}</p>
                        <p className="text-sm text-gray-500">{biz.typeOfBusiness}</p>
                      </div>
                      <code className="text-xs text-gray-400">{biz.businessId}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Self-Employment */}
            {status.selfEmployment && status.selfEmployment.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                  <h2 className="text-lg font-semibold">Self-Employment (SA103)</h2>
                </div>
                <div className="space-y-4">
                  {status.selfEmployment.map((se) => (
                    <div key={se.businessId} className="p-4 bg-blue-50 rounded-lg">
                      <p className="font-medium mb-2">{se.tradingName || 'Unnamed Business'}</p>
                      {se.error ? (
                        <p className="text-red-600 text-sm">{se.error}</p>
                      ) : se.periodData ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Turnover</p>
                            <p className="font-medium">
                              {formatCurrency(se.periodData.periodIncome?.turnover)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Expenses</p>
                            <p className="font-medium">
                              {formatCurrency(se.periodData.periodExpenses?.consolidatedExpenses)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No period data submitted</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property */}
            {status.property && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Home className="h-6 w-6 text-green-500" />
                  <h2 className="text-lg font-semibold">UK Property (SA105)</h2>
                </div>
                {status.property.error ? (
                  <p className="text-red-600">{status.property.error}</p>
                ) : status.property.periodData ? (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Period data submitted</p>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(status.property.periodData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500">No property data submitted</p>
                )}
              </div>
            )}

            {/* Employment */}
            {status.employment && status.employment.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6 text-purple-500" />
                  <h2 className="text-lg font-semibold">Employment (SA102)</h2>
                </div>
                <div className="space-y-3">
                  {status.employment.map((emp) => (
                    <div
                      key={emp.employmentId}
                      className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{emp.employerName}</p>
                        {emp.employerRef && (
                          <p className="text-sm text-gray-500">PAYE: {emp.employerRef}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dividends & Interest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                  <h2 className="text-lg font-semibold">Dividends</h2>
                </div>
                {status.dividends ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(status.dividends, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500">No dividends submitted</p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <PiggyBank className="h-6 w-6 text-cyan-500" />
                  <h2 className="text-lg font-semibold">Interest/Savings</h2>
                </div>
                {status.interest ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(status.interest, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500">No interest submitted</p>
                )}
              </div>
            </div>

            {/* Tax Calculations */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="h-6 w-6 text-indigo-500" />
                <h2 className="text-lg font-semibold">Tax Calculations</h2>
              </div>
              {!status.calculations || status.calculations.length === 0 ? (
                <p className="text-gray-500">No calculations triggered</p>
              ) : (
                <div className="space-y-3">
                  {status.calculations.map((calc) => (
                    <div
                      key={calc.calculationId}
                      className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{calc.calculationType}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(calc.calculationTimestamp).toLocaleString()}
                        </p>
                      </div>
                      <code className="text-xs text-gray-400">{calc.calculationId?.slice(0, 8)}...</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
