import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCode, getAccounts } from '@/lib/truelayer/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';

export async function GET(request: NextRequest) {
  console.log('[TrueLayer Callback] Starting callback handler');
  console.log('[TrueLayer Callback] APP_URL:', APP_URL);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors from TrueLayer
  if (error) {
    console.error('TrueLayer OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${APP_URL}?bank_error=auth_failed`);
  }

  // Verify state
  const storedState = request.cookies.get('truelayer_oauth_state')?.value;
  if (!state || state !== storedState) {
    console.error('State mismatch:', { received: state, stored: storedState });
    return NextResponse.redirect(`${APP_URL}?bank_error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}?bank_error=no_code`);
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`);
  }

  try {
    // Exchange code for tokens (fast!)
    console.log('[TrueLayer Callback] Exchanging code for tokens...');
    console.log('[TrueLayer Callback] Code received:', code?.substring(0, 20) + '...');
    const tokens = await exchangeCode(code);

    if (tokens.error) {
      console.error('[TrueLayer Callback] Token exchange error:', tokens);
      return NextResponse.redirect(`${APP_URL}?bank_error=token_failed`);
    }

    console.log('[TrueLayer Callback] Tokens received successfully, fetching accounts...');

    // Get accounts (lightweight call)
    const accountsRes = await getAccounts(tokens.access_token);
    console.log('[TrueLayer Callback] Accounts response:', JSON.stringify(accountsRes).substring(0, 200));
    const accounts = accountsRes.results || [];

    console.log(`[TrueLayer Callback] Found ${accounts.length} accounts`);

    // Clear state cookie and redirect back with success
    const response = NextResponse.redirect(`${APP_URL}?bank_connected=true`);
    response.cookies.delete('truelayer_oauth_state');

    // Store bank connection data in cookie (tokens + accounts)
    // This is picked up by the client to enable transaction import
    response.cookies.set(
      'bank_connection',
      JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
        accounts: accounts.map((a: { account_id: string; display_name?: string; account_type?: string; provider?: { display_name?: string } }) => ({
          account_id: a.account_id,
          display_name: a.display_name || 'Account',
          account_type: a.account_type || 'TRANSACTION',
          provider_name: a.provider?.display_name || 'Bank',
        })),
        bankName: accounts[0]?.provider?.display_name || 'Connected Bank',
      }),
      {
        httpOnly: false, // Allow client to read for import
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      }
    );

    console.log('[TrueLayer Callback] Redirect with bank connection saved - fast callback complete!');
    console.log('[TrueLayer Callback] Redirecting to:', `${APP_URL}?bank_connected=true`);
    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[TrueLayer Callback] Error:', errorMessage, err);
    return NextResponse.redirect(`${APP_URL}?bank_error=connection_failed`);
  }
}
