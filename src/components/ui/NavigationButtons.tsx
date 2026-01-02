'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavigationButtonsProps {
  backHref?: string;
  continueHref?: string;
  continueLabel?: string;
  onContinue?: () => void | Promise<void>;
  canContinue?: boolean;
  loading?: boolean;
}

export function NavigationButtons({
  backHref,
  continueHref,
  continueLabel = 'Continue',
  onContinue,
  canContinue = true,
  loading = false,
}: NavigationButtonsProps) {
  const router = useRouter();

  const handleContinue = async () => {
    if (onContinue) {
      await onContinue();
    }
    if (continueHref) {
      router.push(continueHref);
    }
  };

  return (
    <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
      {backHref ? (
        <Link href={backHref}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      ) : (
        <div />
      )}

      {(continueHref || onContinue) && (
        <Button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className={cn(
            'gap-2 bg-emerald-500 hover:bg-emerald-600',
            !canContinue && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {continueLabel}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
