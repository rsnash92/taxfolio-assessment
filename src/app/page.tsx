'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WizardProvider } from '@/providers/WizardProvider';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { createClient } from '@/lib/supabase/client';

export default function AssessmentPage() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [initialTaxYear, setInitialTaxYear] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Read tax year from URL params
    const taxYearParam = searchParams.get('tax_year');
    if (taxYearParam) {
      setInitialTaxYear(taxYearParam);
    }

    const supabase = createClient();

    // Get user on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e3ec]"></div>
      </div>
    );
  }

  return (
    <WizardProvider userId={userId} initialTaxYear={initialTaxYear}>
      <WizardContainer />
    </WizardProvider>
  );
}
