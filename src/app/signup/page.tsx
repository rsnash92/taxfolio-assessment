'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get the current origin for the email redirect
      const origin = window.location.origin;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

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
          <p className="text-gray-600 mt-2">Self Assessment</p>
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
