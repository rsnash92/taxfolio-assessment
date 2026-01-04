'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWizard } from '@/providers/WizardProvider';
import { createClient } from '@/lib/supabase/client';
import { HelpCircle, Save, Loader2, LogOut } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function WizardHeader() {
  const { data, isSaving } = useWizard();
  const { taxCalculation, taxYear } = data;
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Stats Bar - grouped on left */}
        <div className="flex items-center gap-8">
          <Link
            href="https://app.taxfolio.io/dashboard"
            className="flex items-center"
          >
            <Image
              src="/taxfolio.png"
              alt="TaxFolio"
              width={120}
              height={30}
              className="h-7 w-auto"
            />
          </Link>

          {/* Stats Bar */}
          <div className="hidden md:flex items-center gap-8">
            {/* Tax Liability */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tax liability:</span>
              <span
                className={`text-lg font-bold ${
                  (taxCalculation?.totalTaxDue || 0) > 0
                    ? 'text-amber-600'
                    : 'text-[#00c4d4]'
                }`}
              >
                {formatCurrency(taxCalculation?.totalTaxDue || 0)}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Tax Year */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tax year:</span>
              <span className="text-sm font-semibold text-[#00c4d4]">
                {taxYear}
              </span>
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <Link
            href="https://app.taxfolio.io/dashboard"
            className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>Back to Dashboard</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
