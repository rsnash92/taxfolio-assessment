import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeCode,
  getAccounts,
  getTransactions,
} from '@/lib/truelayer/client';
import { categoriseTransactions } from '@/lib/categorisation/ai-categorise';

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

    // AI categorise transactions
    let categorisedTransactions;
    try {
      console.log('Starting AI categorisation...');
      categorisedTransactions = await categoriseTransactions(allTransactions);
      console.log('AI categorisation complete');
    } catch (err) {
      console.error('AI categorisation failed:', err);
      // Fallback - mark all as needs_review
      categorisedTransactions = allTransactions.map((t) => ({
        ...t,
        category: null,
        suggested_category: 'Other',
        is_business: false,
        confidence: 0.5,
      }));
    }

    // Transform transactions to wizard format
    const wizardTransactions = categorisedTransactions.map((t, index) => ({
      id: t.transaction_id || `tx-${index}-${Date.now()}`,
      date: t.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
      description: t.description || 'Unknown transaction',
      amount: Math.abs(t.amount),
      type: (t.transaction_type === 'CREDIT' ? 'income' : 'expense') as
        | 'income'
        | 'expense',
      category: t.category || null,
      suggested_category: t.suggested_category || null,
      status: (t.confidence > 0.8
        ? t.is_business
          ? 'business'
          : 'personal'
        : 'needs_review') as 'business' | 'personal' | 'needs_review',
      confidence: t.confidence,
    }));

    console.log(
      `Categorised: ${wizardTransactions.filter((t) => t.status === 'business').length} business, ` +
        `${wizardTransactions.filter((t) => t.status === 'personal').length} personal, ` +
        `${wizardTransactions.filter((t) => t.status === 'needs_review').length} needs review`
    );

    // Clear state cookie and redirect back to wizard with success flag
    const response = NextResponse.redirect(
      `${APP_URL}?bank_connected=true&tx_count=${allTransactions.length}`
    );
    response.cookies.delete('truelayer_oauth_state');

    // Store bank import data in cookie
    response.cookies.set(
      'bank_import_data',
      JSON.stringify({
        accountCount: accounts.length,
        transactionCount: allTransactions.length,
        bankName: accounts[0]?.provider?.display_name || 'Connected Bank',
      }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      }
    );

    // Store transactions in a separate cookie (will be chunked if large)
    // For dev purposes, we'll limit to first 100 transactions to avoid cookie size limits
    const transactionsToStore = wizardTransactions.slice(0, 100);
    response.cookies.set(
      'bank_transactions',
      JSON.stringify(transactionsToStore),
      {
        httpOnly: false,
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
