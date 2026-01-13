'use client';

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { forwardRef } from 'react';

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const Turnstile = forwardRef<{ reset: () => void }, TurnstileProps>(
  ({ onSuccess, onError, onExpire }, ref) => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      // In development without keys, auto-pass
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <span>Turnstile disabled (no site key)</span>
          </div>
        );
      }
      return null;
    }

    return (
      <TurnstileWidget
        ref={ref}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    );
  }
);

Turnstile.displayName = 'Turnstile';

export { Turnstile };
