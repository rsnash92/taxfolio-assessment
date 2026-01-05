'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes of inactivity before showing modal
const LOGOUT_COUNTDOWN = 60; // 60 seconds countdown before auto-logout

export function InactivityModal() {
  const router = useRouter();
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(LOGOUT_COUNTDOWN);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    // Clear timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Don't reset if modal is showing
    if (showModal) return;

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      setShowModal(true);
      setCountdown(LOGOUT_COUNTDOWN);
    }, INACTIVITY_TIMEOUT);
  }, [showModal]);

  const handleStayLoggedIn = useCallback(() => {
    // Clear countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    setShowModal(false);
    setCountdown(LOGOUT_COUNTDOWN);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Setup activity listeners
  useEffect(() => {
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      if (!showModal) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [resetInactivityTimer, showModal]);

  // Countdown timer when modal is shown
  useEffect(() => {
    if (showModal) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showModal, handleLogout]);

  // Format countdown as M:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showModal} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Are you still there?</DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            You will automatically be logged out in:
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="text-center mb-6">
            <span className="text-4xl font-semibold text-amber-500">
              {formatCountdown(countdown)}
            </span>
          </div>

          <div className="space-y-4 text-gray-600">
            <p>
              At TaxFolio we take your security seriously. For your protection,
              we will log you out after a period of inactivity.
            </p>
            <p>
              This is to ensure that no one else can access your account if
              you leave your device unattended.
            </p>
            <p>
              If you wish to continue your session, please click &quot;Stay Logged In&quot; below.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="px-6"
          >
            Log out
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            className="px-6 bg-[#00e3ec] hover:bg-[#00c4d4] text-black font-semibold"
          >
            Stay Logged In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
