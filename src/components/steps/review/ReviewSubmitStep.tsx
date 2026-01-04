'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Shield,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewSubmitStep() {
  const { data, updateData, goNext } = useWizard();
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!declarationAccepted) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate HMRC submission
      // In production, this would call the HMRC API via our backend
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Generate a mock reference number
      const referenceNumber = `TF${Date.now().toString().slice(-10)}`;

      updateData({
        submission: {
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          hmrcReferenceNumber: referenceNumber,
          declarationAccepted: true,
          declarationTimestamp: new Date().toISOString(),
        },
      });

      goNext();
    } catch {
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
              {(data.taxCalculation?.totalIncome || 0).toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Due</span>
            <span className="text-gray-900 font-medium">
              £
              {(data.taxCalculation?.totalDue || 0).toLocaleString('en-GB', {
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
            className="w-5 h-5 rounded border-gray-300 text-[#00e3ec] focus:ring-#00e3ec mt-0.5"
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
        disabled={!declarationAccepted || isSubmitting}
        className={cn(
          'w-full py-6 text-lg font-medium',
          declarationAccepted
            ? 'bg-[#00e3ec] hover:bg-[#00c4d4]'
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
