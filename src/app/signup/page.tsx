'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Turnstile, type TurnstileRef } from '@/components/ui/turnstile';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Verify Turnstile token if site key is configured
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Please complete the security check');
      setLoading(false);
      return;
    }

    // Verify token server-side if we have one
    if (turnstileToken) {
      try {
        const verifyResponse = await fetch('/api/turnstile/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyResult = await verifyResponse.json();
        if (!verifyResult.success) {
          setError('Security verification failed. Please try again.');
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          setLoading(false);
          return;
        }
      } catch {
        setError('Security verification failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // If we got a session, user is auto-confirmed - redirect to wizard
      if (data.session) {
        router.push('/');
        router.refresh();
        return;
      }

      // Otherwise, email confirmation is required
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-[#ccf5f7] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#00e3ec]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-500 mb-6">
              We&apos;ve sent a verification link to{' '}
              <span className="font-medium text-gray-900">{email}</span>
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-11 bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white font-medium"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/taxfolio.png"
            alt="TaxFolio"
            width={160}
            height={40}
            className="h-10 w-auto mx-auto"
          />
        </div>

        {/* Sign Up Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Create your account
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Start your self-assessment tax return
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="h-11"
              />
              <p className="text-xs text-gray-500">
                Must be at least 6 characters
              </p>
            </div>

            {/* Cloudflare Turnstile */}
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00c4d4] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By signing up, you agree to our{' '}
          <a href="https://taxfolio.io/terms" className="underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="https://taxfolio.io/privacy" className="underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
