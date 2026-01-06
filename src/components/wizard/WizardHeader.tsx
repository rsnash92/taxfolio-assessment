'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWizard } from '@/providers/WizardProvider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/config/pricing';
import { HelpCircle, Save, Loader2, LogOut, Menu } from 'lucide-react';
import { TaxYearSelector } from './TaxYearSelector';

interface WizardHeaderProps {
  onMenuClick?: () => void;
}

export function WizardHeader({ onMenuClick }: WizardHeaderProps) {
  const { data, updateData, isSaving } = useWizard();
  const { taxCalculation, taxYear } = data;

  const handleTaxYearChange = (newTaxYear: string) => {
    updateData({ taxYear: newTaxYear });
  };
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    // Clear wizard data from localStorage to prevent data leaking to other users
    localStorage.removeItem('wizard-data');
    localStorage.removeItem('wizard-step');
    localStorage.removeItem('wizard-business-id');
    localStorage.removeItem('wizard-property-id');
    localStorage.removeItem('taxfolio-chat-messages');

    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
        {/* Logo and Stats Bar - grouped on left */}
        <div className="flex items-center gap-3 sm:gap-8">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="https://app.taxfolio.io/dashboard"
            className="flex items-center"
          >
            <Image
              src="/taxfolio.png"
              alt="TaxFolio"
              width={120}
              height={30}
              className="h-6 sm:h-7 w-auto"
            />
          </Link>

          {/* Stats Bar */}
          <div className="hidden md:flex items-center gap-8">
            {/* Tax Liability / Refund */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {(taxCalculation?.refundDue || 0) > 0 ? 'Refund due:' : 'Tax liability:'}
              </span>
              <span
                className={`text-lg font-bold ${
                  (taxCalculation?.refundDue || 0) > 0
                    ? 'text-[#00c4d4]'
                    : (taxCalculation?.totalDue || 0) > 0
                    ? 'text-amber-600'
                    : 'text-[#00c4d4]'
                }`}
              >
                {formatCurrency(
                  (taxCalculation?.refundDue || 0) > 0
                    ? taxCalculation?.refundDue || 0
                    : taxCalculation?.totalDue || 0
                )}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Tax Year Selector */}
            <TaxYearSelector
              currentTaxYear={taxYear}
              onTaxYearChange={handleTaxYearChange}
            />

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
