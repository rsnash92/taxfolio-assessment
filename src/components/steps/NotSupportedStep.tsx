'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard } from '@/providers/WizardProvider';

export function NotSupportedStep() {
  const { goToStep } = useWizard();

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        TaxFolio isn&apos;t the right fit for your situation
      </h1>

      <p className="text-gray-600 max-w-md mx-auto mb-4">
        If you lived abroad, moved to/from the UK, or received foreign income
        during the tax year, you may need to file form SA109 (Residence).
      </p>

      <p className="text-gray-600 max-w-md mx-auto mb-8">
        We recommend using HMRC&apos;s official service or speaking to an
        accountant who can help with your specific situation.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={() => goToStep('residency')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>

        <Link
          href="https://www.gov.uk/self-assessment-tax-returns"
          target="_blank"
        >
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Visit HMRC
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
