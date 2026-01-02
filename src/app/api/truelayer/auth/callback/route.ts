import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeCode,
  getAccounts,
  getTransactions,
} from '@/lib/truelayer/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';

export async function GET(request: NextRequest) {
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
    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCode(code);

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return NextResponse.redirect(`${APP_URL}?bank_error=token_failed`);
    }

    console.log('Tokens received, fetching accounts...');

    // Get accounts
    const accountsRes = await getAccounts(tokens.access_token);
    const accounts = accountsRes.results || [];

    console.log(`Found ${accounts.length} accounts`);

    // Get tax year date range (2024-25)
    const fromDate = '2024-04-06';
    const toDate = '2025-04-05';

    // Get transactions for all accounts
    const allTransactions: Array<{
      transaction_id: string;
      timestamp: string;
      description: string;
      transaction_type: 'DEBIT' | 'CREDIT';
      amount: number;
      currency: string;
      transaction_category?: string;
      merchant_name?: string;
    }> = [];

    for (const account of accounts) {
      console.log(`Fetching transactions for account ${account.account_id}...`);
      const txRes = await getTransactions(
        tokens.access_token,
        account.account_id,
        fromDate,
        toDate
      );
      if (txRes.results) {
        allTransactions.push(...txRes.results);
      }
    }

    console.log(`Imported ${allTransactions.length} transactions total`);

    // Store transactions in localStorage via query param
    // In production, store in Supabase
    // For now, we'll encode transactions count and redirect

    // Clear state cookie and redirect back to wizard with success flag
    const response = NextResponse.redirect(
      `${APP_URL}?bank_connected=true&tx_count=${allTransactions.length}`
    );
    response.cookies.delete('truelayer_oauth_state');

    // Store tokens and transactions info in a session cookie for the wizard to pick up
    response.cookies.set(
      'bank_import_data',
      JSON.stringify({
        accountCount: accounts.length,
        transactionCount: allTransactions.length,
        bankName:
          accounts[0]?.provider?.display_name || 'Connected Bank',
        accessToken: tokens.access_token, // For fetching more data if needed
      }),
      {
        httpOnly: false, // Allow client to read
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      }
    );

    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('TrueLayer callback error:', errorMessage, err);
    return NextResponse.redirect(`${APP_URL}?bank_error=import_failed`);
  }
}
