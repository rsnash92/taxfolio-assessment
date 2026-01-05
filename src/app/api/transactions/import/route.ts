import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, TRUELAYER_CONFIG } from '@/lib/truelayer/client';
import type { Transaction } from '@/types/wizard';

interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: string[];
  merchant_name?: string;
}

// Import transactions from connected bank accounts
export async function POST(request: NextRequest) {
  const bankConnectionCookie = request.cookies.get('bank_connection')?.value;

  if (!bankConnectionCookie) {
    return NextResponse.json(
      { error: 'No bank connection found' },
      { status: 400 }
    );
  }

  let bankConnection;
  try {
    bankConnection = JSON.parse(bankConnectionCookie);
  } catch {
    return NextResponse.json(
      { error: 'Invalid bank connection data' },
      { status: 400 }
    );
  }

  // Check if token has expired
  if (bankConnection.expiresAt && Date.now() > bankConnection.expiresAt) {
    return NextResponse.json(
      { error: 'Bank connection expired. Please reconnect your bank.' },
      { status: 401 }
    );
  }

  const { account_ids } = await request.json().catch(() => ({ account_ids: null }));

  // Use provided account IDs or all accounts
  const accountsToImport = account_ids
    ? bankConnection.accounts.filter((a: { account_id: string }) =>
        account_ids.includes(a.account_id)
      )
    : bankConnection.accounts;

  if (!accountsToImport || accountsToImport.length === 0) {
    return NextResponse.json(
      { error: 'No accounts to import from' },
      { status: 400 }
    );
  }

  // Calculate date range for tax year (6 April 2024 to 5 April 2025 for 2024-25)
  const taxYearStart = '2024-04-06';
  const taxYearEnd = '2025-04-05';

  console.log('[import] Importing transactions from', accountsToImport.length, 'accounts');
  console.log('[import] Date range:', taxYearStart, 'to', taxYearEnd);

  const allTransactions: Transaction[] = [];
  const errors: string[] = [];

  for (const account of accountsToImport) {
    console.log('[import] Fetching transactions for account:', account.account_id);

    try {
      const response = await getTransactions(
        bankConnection.accessToken,
        account.account_id,
        taxYearStart,
        taxYearEnd
      );

      if (response.error) {
        console.error('[import] Error fetching account:', account.account_id, response.error);
        errors.push(`${account.display_name}: ${response.error}`);
        continue;
      }

      const transactions = response.results || [];
      console.log('[import] Got', transactions.length, 'transactions for', account.display_name);

      // Transform to our Transaction format
      const transformed = transactions.map((tx: TrueLayerTransaction) => {
        const isIncome = tx.transaction_type === 'CREDIT';
        return {
          id: tx.transaction_id,
          date: tx.timestamp.split('T')[0],
          description: tx.description || tx.merchant_name || 'Transaction',
          amount: Math.abs(tx.amount),
          type: isIncome ? 'income' : 'expense',
          category: null,
          suggested_category: null,
          status: 'needs_review',
          confidence: 0,
          accountId: account.account_id,
        } as Transaction;
      });

      allTransactions.push(...transformed);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[import] Failed to fetch account:', account.account_id, errorMsg);
      errors.push(`${account.display_name}: ${errorMsg}`);
    }
  }

  console.log('[import] Total transactions imported:', allTransactions.length);

  // Sort by date descending
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    transactions: allTransactions,
    count: allTransactions.length,
    accountCount: accountsToImport.length,
    errors: errors.length > 0 ? errors : undefined,
    bankName: bankConnection.bankName,
  });
}
