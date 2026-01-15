'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GatewayCredentialsModal } from '@/components/submission/gateway-credentials-modal';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Shield,
  FileCheck,
  ExternalLink,
  Copy,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// Validate UTR format (10 digits)
function isValidUTR(utr: string): boolean {
  const utrClean = utr.replace(/\s/g, '');
  return /^\d{10}$/.test(utrClean);
}

export function ReviewSubmitStep() {
  const { data, updateData, goNext } = useWizard();
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIrmark, setCopiedIrmark] = useState(false);
  const [utrInput, setUtrInput] = useState(data.personalInfo?.utr || '');
  const [utrError, setUtrError] = useState<string | null>(null);

  // Check if UTR is missing or invalid
  const hasValidUTR = data.personalInfo?.utr && isValidUTR(data.personalInfo.utr);

  const handleSaveUTR = async () => {
    const cleanUtr = utrInput.replace(/\s/g, '');
    if (!isValidUTR(cleanUtr)) {
      setUtrError('Please enter a valid 10-digit UTR number');
      return;
    }
    setUtrError(null);
    await updateData({
      personalInfo: {
        ...data.personalInfo,
        utr: cleanUtr,
      },
    });
  };

  const handleSubmitClick = () => {
    if (!declarationAccepted) {
      setError('Please accept the declaration before submitting');
      return;
    }
    setError(null);
    setShowCredentialsModal(true);
  };

  const handleSubmitToHMRC = async (credentials: { userId: string; password: string }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to submit.');
        setIsSubmitting(false);
        return;
      }

      // Get or create the declaration
      let declarationId = data.declarationId;

      if (!declarationId) {
        // Create a new declaration record
        const { data: declaration, error: declError } = await supabase
          .from('declarations')
          .upsert({
            user_id: user.id,
            tax_year: data.taxYear || '2024-25',
            status: 'paid', // Assuming payment was already completed
            return_data: data,
            wizard_completed: true,
          }, {
            onConflict: 'user_id,tax_year',
          })
          .select()
          .single();

        if (declError || !declaration) {
          throw new Error('Failed to create declaration record');
        }

        declarationId = declaration.id;
        await updateData({ declarationId });
      }

      // Call the submission API
      const response = await fetch(`/api/declarations/${declarationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayUserId: credentials.userId,
          gatewayPassword: credentials.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      // Success - update wizard data and go to confirmation
      await updateData({
        submission: {
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          correlationId: result.correlationId,
          irmark: result.irmark,
          declarationAccepted: true,
          declarationTimestamp: new Date().toISOString(),
          sandbox: result.sandbox,
        },
      });

      setShowCredentialsModal(false);
      goNext();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyIrmark = async () => {
    if (data.submission?.irmark) {
      await navigator.clipboard.writeText(data.submission.irmark);
      setCopiedIrmark(true);
      setTimeout(() => setCopiedIrmark(false), 2000);
    }
  };

  // If already submitted, show success
  if (data.submission?.status === 'submitted') {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tax Return Submitted!
          </h1>
          <p className="text-gray-600">
            Your Self Assessment for {data.taxYear || '2024-25'} has been successfully submitted to HMRC.
          </p>
          {data.submission.sandbox && (
            <p className="text-sm text-amber-600 mt-2">
              (Sandbox mode - not a real submission)
            </p>
          )}
        </div>

        {/* Submission Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h3 className="font-medium text-gray-900 mb-4">Submission Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Submitted</span>
              <span className="font-medium">
                {data.submission.submittedAt && new Date(data.submission.submittedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {data.submission.correlationId && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Reference</span>
                <span className="font-mono text-sm">{data.submission.correlationId}</span>
              </div>
            )}
            {data.submission.irmark && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">IRmark</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {data.submission.irmark.substring(0, 20)}...
                  </code>
                  <button
                    onClick={copyIrmark}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy IRmark"
                  >
                    {copiedIrmark ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="font-medium text-gray-900 mb-4">What happens next?</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00e3ec]/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-[#00c4d4]">1</span>
              </div>
              <p>HMRC will process your return and calculate your final tax liability</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00e3ec]/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-[#00c4d4]">2</span>
              </div>
              <p>Your submission will appear in your HMRC online account within 72 hours</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00e3ec]/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-[#00c4d4]">3</span>
              </div>
              <p>If tax is owed, ensure payment is made by 31 January to avoid penalties</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            asChild
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
          >
            <a
              href="https://www.gov.uk/personal-tax-account"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on HMRC
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

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

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Submission Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Year</span>
            <span className="text-gray-900 font-medium">{data.taxYear || '2024/25'}</span>
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

      {/* UTR Required Section */}
      {!hasValidUTR && (
        <div className="bg-white border-2 border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <FileText className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">
                Unique Taxpayer Reference (UTR) Required
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Your 10-digit UTR is required to submit to HMRC. You can find it on previous
                tax returns or letters from HMRC about Self Assessment.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Input
                type="text"
                placeholder="e.g. 1234567890"
                value={utrInput}
                onChange={(e) => {
                  setUtrInput(e.target.value);
                  setUtrError(null);
                }}
                className={cn(
                  'font-mono',
                  utrError && 'border-red-300 focus:ring-red-500'
                )}
                maxLength={12}
              />
              {utrError && (
                <p className="text-sm text-red-600 mt-1">{utrError}</p>
              )}
            </div>
            <Button
              onClick={handleSaveUTR}
              variant="outline"
              className="w-full"
            >
              Save UTR
            </Button>
          </div>
        </div>
      )}

      {/* UTR Confirmed - show if valid */}
      {hasValidUTR && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-sm font-medium text-green-800">UTR Confirmed</span>
              <span className="text-sm text-green-700 ml-2 font-mono">
                {data.personalInfo?.utr}
              </span>
            </div>
          </div>
        </div>
      )}

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
        onClick={handleSubmitClick}
        disabled={!declarationAccepted || isSubmitting || !hasValidUTR}
        className={cn(
          'w-full py-6 text-lg font-medium',
          declarationAccepted && hasValidUTR
            ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]'
            : 'bg-gray-300 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting to HMRC...
          </>
        ) : !hasValidUTR ? (
          <>
            <AlertTriangle className="h-5 w-5 mr-2" /> Enter UTR to Submit
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

      {/* Gateway Credentials Modal */}
      <GatewayCredentialsModal
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
        onSubmit={handleSubmitToHMRC}
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
}
