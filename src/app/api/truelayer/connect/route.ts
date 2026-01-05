import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl, TRUELAYER_CONFIG } from '@/lib/truelayer/client';

export async function POST() {
  console.log('[TrueLayer Connect] Starting connection...');
  console.log('[TrueLayer Connect] Config:', {
    clientId: TRUELAYER_CONFIG.clientId?.substring(0, 10) + '...',
    redirectUri: TRUELAYER_CONFIG.redirectUri,
    isSandbox: TRUELAYER_CONFIG.isSandbox,
  });
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate state for CSRF protection
  const state = randomUUID();

  // Generate the auth URL
  const authUrl = getAuthUrl(state);

  // Log for debugging
  console.log('TrueLayer connect:', {
    redirectUri: TRUELAYER_CONFIG.redirectUri,
    isSandbox: TRUELAYER_CONFIG.isSandbox,
  });

  // Return the auth URL and set state in cookie
  const response = NextResponse.json({ authUrl });
  response.cookies.set('truelayer_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}

// Also support GET for direct redirect
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  const state = randomUUID();
  const authUrl = getAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('truelayer_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}
