'use client';

import { Turnstile as TurnstileWidget, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useImperativeHandle, forwardRef } from 'react';

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export interface TurnstileRef {
  reset: () => void;
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ onSuccess, onError, onExpire }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
    }));

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
        ref={turnstileRef}
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
