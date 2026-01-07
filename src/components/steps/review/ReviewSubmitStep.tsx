'use client';

import { useState, useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Shield,
  FileCheck,
  Link2,
  ExternalLink,
  Eye,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface PreviewItem {
  name: string;
  status: 'ready' | 'warning' | 'error' | 'skipped';
  summary: string;
  details?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
}

interface SubmissionPreview {
  isValid: boolean;
  totalIncome: number;
  items: PreviewItem[];
  warnings: string[];
  errors: string[];
}

export function ReviewSubmitStep() {
  const { data, updateData, goNext } = useWizard();
  const searchParams = useSearchParams();
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isHmrcConnected, setIsHmrcConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SubmissionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

  // Check HMRC connection status on mount and after OAuth callback
  useEffect(() => {
    const checkHmrcConnection = async () => {
      setIsCheckingConnection(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsHmrcConnected(false);
          return;
        }

        // Check if user has HMRC tokens
        const { data: tokens } = await supabase
          .from('hmrc_tokens')
          .select('expires_at')
          .eq('user_id', user.id)
          .single();

        setIsHmrcConnected(!!tokens);
      } catch {
        setIsHmrcConnected(false);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkHmrcConnection();

    // Check for OAuth callback params
    const hmrcConnected = searchParams.get('hmrc_connected');
    const hmrcError = searchParams.get('hmrc_error');

    if (hmrcConnected === 'true') {
      setIsHmrcConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (hmrcError) {
      setError(`HMRC connection failed: ${hmrcError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // Load preview when HMRC is connected
  useEffect(() => {
    if (isHmrcConnected && !preview && !isLoadingPreview) {
      loadPreview();
    }
  }, [isHmrcConnected]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/hmrc/preview', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        setPreview(data);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConnectHmrc = () => {
    // Redirect to HMRC OAuth flow
    window.location.href = '/api/hmrc/auth';
  };

  const handleSubmit = async () => {
    if (!declarationAccepted) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get user ID
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to submit.');
        return;
      }

      // Call the HMRC submission API
      const response = await fetch('/api/hmrc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          nino: data.personalInfo?.nino,
          taxYear: data.taxYear || '2024-25',
          wizardData: data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if it's a connection error
        if (result.error?.includes('HMRC not connected')) {
          setIsHmrcConnected(false);
        }
        // Show detailed errors if available
        const errorMessage = result.errors?.length > 0
          ? result.errors.join(', ')
          : result.error || 'Submission failed. Please try again.';
        setError(errorMessage);
        console.error('Submission failed:', result);
        return;
      }

      if (result.success) {
        const referenceNumber = result.hmrcReferenceNumber || result.calculationId || `TF${Date.now()}`;
        console.log('Submission successful, reference:', referenceNumber);

        await updateData({
          submission: {
            status: 'submitted',
            submittedAt: new Date().toISOString(),
            hmrcReferenceNumber: referenceNumber,
            calculationId: result.calculationId,
            declarationAccepted: true,
            declarationTimestamp: new Date().toISOString(),
          },
        });

        // Small delay to ensure data is persisted
        await new Promise(resolve => setTimeout(resolve, 100));

        goNext();
      } else {
        const errorMessage = result.errors?.join(', ') || 'Submission failed';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10 max-w-lg mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-xs text-[#00c4d4] mt-1">Paid</span>
        </div>
        <div className="flex-1 h-px bg-[#00e3ec] mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-xs text-[#00c4d4] mt-1">Reviewed</span>
        </div>
        <div className="flex-1 h-px bg-[#00e3ec] mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center text-sm font-medium">
            3
          </div>
          <span className="text-xs text-gray-600 mt-1">Submit to HMRC</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#ccf5f7] rounded-full flex items-center justify-center mx-auto mb-4">
          <FileCheck className="h-8 w-8 text-[#00c4d4]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ready to Submit
        </h1>
        <p className="text-gray-600">
          Your tax return is ready to be submitted to HMRC.
        </p>
      </div>

      {/* HMRC Connection Status */}
      {isCheckingConnection ? (
        <div className="bg-gray-50 rounded-xl p-6 mb-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Checking HMRC connection...</span>
        </div>
      ) : !isHmrcConnected ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Link2 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                Connect Your HMRC Account
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                To submit your tax return, you need to connect your HMRC Government Gateway account.
                This allows us to submit your return directly to HMRC on your behalf.
              </p>
              <Button
                onClick={handleConnectHmrc}
                className="bg-[#00703c] hover:bg-[#005a30] text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect to HMRC
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              HMRC account connected
            </span>
          </div>
        </div>
      )}

      {/* Submission Preview */}
      {isLoadingPreview ? (
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-gray-600">Validating submission data...</span>
          </div>
        </div>
      ) : preview && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Submission Preview</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreviewDetails(!showPreviewDetails)}
              className="text-gray-500"
            >
              {showPreviewDetails ? (
                <>Hide Details <ChevronUp className="h-4 w-4 ml-1" /></>
              ) : (
                <>Show Details <ChevronDown className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>

          {/* Preview Status */}
          <div className={cn(
            'rounded-lg p-3 mb-4',
            preview.isValid ? 'bg-green-50' : 'bg-red-50'
          )}>
            <div className="flex items-center gap-2">
              {preview.isValid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Data validated - ready to submit
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800 font-medium">
                    {preview.errors.length} error(s) found - please fix before submitting
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Preview Warnings */}
          {preview.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">{preview.warnings.length} warning(s):</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {preview.warnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {preview.warnings.length > 3 && (
                      <li className="text-amber-600">...and {preview.warnings.length - 3} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview Errors */}
          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Errors that must be fixed:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {preview.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Preview Items */}
          {showPreviewDetails && (
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
              {preview.items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg text-sm',
                    item.status === 'ready' && 'bg-green-50',
                    item.status === 'warning' && 'bg-amber-50',
                    item.status === 'error' && 'bg-red-50',
                    item.status === 'skipped' && 'bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.status === 'ready' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {item.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    {item.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                    {item.status === 'skipped' && <div className="h-4 w-4 rounded-full bg-gray-300" />}
                    <span className={cn(
                      'font-medium',
                      item.status === 'skipped' && 'text-gray-500'
                    )}>
                      {item.name}
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs',
                    item.status === 'skipped' ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {item.summary}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Submission Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Year</span>
            <span className="text-gray-900 font-medium">2024/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Income Sources</span>
            <span className="text-gray-900 font-medium">
              {data.incomeSources?.length || 0} sources
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Income</span>
            <span className="text-gray-900 font-medium">
              £
              {((data.taxCalculation?.totalIncome || 0) / 100).toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Due</span>
            <span className="text-gray-900 font-medium">
              £
              {((data.taxCalculation?.totalDue || 0) / 100).toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Declaration</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <p className="text-sm text-amber-800">
              Please read the declaration carefully before submitting.
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-6 space-y-3">
          <p>
            I declare that the information I have given on this tax return and
            any supplementary pages is correct and complete to the best of my
            knowledge and belief.
          </p>
          <p>
            I understand that I may have to pay financial penalties and face
            prosecution if I give false information.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={declarationAccepted}
            onChange={(e) => setDeclarationAccepted(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#00e3ec] focus:ring-[#00e3ec] mt-0.5"
          />
          <span className="text-sm text-gray-900">
            I confirm that I have read and agree to the above declaration, and
            that the information provided is correct and complete.
          </span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!declarationAccepted || isSubmitting || !isHmrcConnected}
        className={cn(
          'w-full py-6 text-lg font-medium',
          declarationAccepted && isHmrcConnected
            ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]'
            : 'bg-gray-300 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting to
            HMRC...
          </>
        ) : (
          <>
            <Send className="h-5 w-5 mr-2" /> Submit to HMRC
          </>
        )}
      </Button>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
        <Shield className="h-4 w-4" />
        <span>Your data is encrypted and securely transmitted to HMRC</span>
      </div>
    </div>
  );
}
