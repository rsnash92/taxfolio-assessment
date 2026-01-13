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
import { Loader2, Check } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Optimised for sole traders',
    'Clear guidance all the way',
    'Submit directly to HMRC with a click',
    'Built by experienced accountants',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Logo - Mobile only */}
        <div className="p-6 md:hidden">
          <Image
            src="/taxfolio.png"
            alt="TaxFolio"
            width={140}
            height={35}
            className="h-9 w-auto"
          />
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left side - Marketing copy */}
          <div className="md:w-5/12 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 md:p-10">
            {/* Logo - Desktop */}
            <div className="hidden md:block mb-10">
              <Image
                src="/taxfolio.png"
                alt="TaxFolio"
                width={140}
                height={35}
                className="h-9 w-auto"
              />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Simple and Speedy Tax Returns with{' '}
              <span className="text-[#00c4d4]">TaxFolio</span>
            </h1>

            <p className="text-gray-600 mb-6">
              A streamlined Self Assessment designed for sole traders, with built-in HMRC submission.
            </p>

            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00c4d4]/20 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-[#00c4d4]" />
                  </span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - Login form */}
          <div className="md:w-7/12 p-8 md:p-10">
            <div className="max-w-sm mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Sign in to continue your tax return
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-[#00c4d4] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
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
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#00c4d4] hover:underline font-medium">
                  Create one
                </Link>
              </div>

              {/* Footer */}
              <p className="text-center text-xs text-gray-400 mt-6">
                By signing in, you agree to our{' '}
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
        </div>
      </div>
    </div>
  );
}
