'use client';

import { useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Download,
  Calendar,
  Copy,
  ExternalLink,
} from 'lucide-react';

export function ReviewConfirmationStep() {
  const { data } = useWizard();

  useEffect(() => {
    // Trigger confetti effect on mount
    const triggerConfetti = async () => {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti not available, that's fine
      }
    };
    triggerConfetti();
  }, []);

  const copyReference = () => {
    navigator.clipboard.writeText(data.submission?.hmrcReferenceNumber || '');
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-[#ccf5f7] rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="h-10 w-10 text-[#00c4d4]" />
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Tax Return Submitted!
      </h1>
      <p className="text-gray-600 mb-8">
        Your 2024/25 Self Assessment has been successfully submitted to HMRC.
      </p>

      {/* Reference Number */}
      <div className="bg-[#e6fafb] border-2 border-[#99ebef] rounded-2xl p-6 mb-8">
        <p className="text-sm text-[#00c4d4] mb-2">HMRC Reference Number</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl font-mono font-bold text-[#00a8b0]">
            {data.submission?.hmrcReferenceNumber || 'XXXXXXXXXXXXXX'}
          </span>
          <button
            onClick={copyReference}
            className="p-2 hover:bg-[#ccf5f7] rounded-lg transition-colors"
            title="Copy reference"
          >
            <Copy className="h-5 w-5 text-[#00c4d4]" />
          </button>
        </div>
        <p className="text-xs text-[#00c4d4] mt-2">
          Keep this reference safe for your records
        </p>
      </div>

      {/* What's Next */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 text-left">
        <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-blue-600">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                HMRC will process your return
              </p>
              <p className="text-sm text-gray-600">
                This usually takes a few days. You&apos;ll receive a
                confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-blue-600">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Pay any tax owed</p>
              <p className="text-sm text-gray-600">
                Payment deadline is <strong>31 January 2026</strong>. You can
                pay via bank transfer, debit card, or Direct Debit.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-blue-600">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Keep your records</p>
              <p className="text-sm text-gray-600">
                Keep your records for at least 5 years in case HMRC asks to see
                them.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Deadline Reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <div className="flex items-center justify-center gap-2 text-amber-800">
          <Calendar className="h-5 w-5" />
          <span className="font-medium">Payment deadline: 31 January 2026</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button className="bg-[#00e3ec] hover:bg-[#00c4d4] gap-2">
          <Download className="h-4 w-4" />
          Download Tax Return (PDF)
        </Button>

        <Button variant="outline" className="gap-2" asChild>
          <a
            href="https://www.gov.uk/pay-self-assessment-tax-bill"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay Your Tax Bill
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Return to Dashboard */}
      <div className="mt-8">
        <a
          href="/dashboard"
          className="text-sm text-[#00c4d4] hover:text-[#00a8b0]"
        >
          Return to Dashboard →
        </a>
      </div>
    </div>
  );
}
