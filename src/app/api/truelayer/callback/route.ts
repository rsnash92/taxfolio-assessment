import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, getAccounts, getTransactions } from '@/lib/truelayer/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/connect?error=auth_failed', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connect?error=missing_params', request.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return NextResponse.redirect(new URL('/connect?error=token_failed', request.url));
    }

    // Get accounts
    const accountsRes = await getAccounts(tokens.access_token);
    const accounts = accountsRes.results || [];

    // Get tax year date range (2024-25)
    const fromDate = '2024-04-06';
    const toDate = '2025-04-05';

    // Get transactions for all accounts
    const allTransactions = [];
    for (const account of accounts) {
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

    // In production, store transactions in database and trigger AI categorisation
    // For now, redirect to transactions page
    console.log(`Imported ${allTransactions.length} transactions`);

    return NextResponse.redirect(new URL('/transactions', request.url));
  } catch (err) {
    console.error('TrueLayer callback error:', err);
    return NextResponse.redirect(new URL('/connect?error=import_failed', request.url));
  }
}
