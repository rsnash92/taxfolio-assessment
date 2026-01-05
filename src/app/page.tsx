'use client';

import { useEffect, useState } from 'react';
import { WizardProvider } from '@/providers/WizardProvider';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { createClient } from '@/lib/supabase/client';

export default function AssessmentPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    <WizardProvider userId={userId}>
      <WizardContainer />
    </WizardProvider>
  );
}
