import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[Auth Callback] Processing auth callback');
  console.log('[Auth Callback] Code present:', !!code);
  console.log('[Auth Callback] Error:', error, errorDescription);

  // Handle errors from Supabase
  if (error) {
    console.error('[Auth Callback] Auth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    console.log('[Auth Callback] Successfully exchanged code for session');

    // Redirect to the main wizard page after successful auth
    return NextResponse.redirect(`${requestUrl.origin}/`);
  }

  // No code provided, redirect to login
  console.log('[Auth Callback] No code provided, redirecting to login');
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
