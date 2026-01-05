import { NextRequest, NextResponse } from 'next/server';

// Get bank accounts from the connection cookie
export async function GET(request: NextRequest) {
  console.log('[TrueLayer Accounts] Fetching accounts...');
  const bankConnectionCookie = request.cookies.get('bank_connection')?.value;
  console.log('[TrueLayer Accounts] Cookie present:', !!bankConnectionCookie);
  console.log('[TrueLayer Accounts] All cookies:', request.cookies.getAll().map(c => c.name));

  if (!bankConnectionCookie) {
    return NextResponse.json({ accounts: [], connected: false });
  }

  try {
    const bankConnection = JSON.parse(bankConnectionCookie);

    // Check if token has expired
    if (bankConnection.expiresAt && Date.now() > bankConnection.expiresAt) {
      return NextResponse.json({
        accounts: [],
        connected: false,
        error: 'Token expired'
      });
    }

    return NextResponse.json({
      accounts: bankConnection.accounts || [],
      bankName: bankConnection.bankName || 'Connected Bank',
      connected: true,
    });
  } catch {
    return NextResponse.json({
      accounts: [],
      connected: false,
      error: 'Invalid connection data'
    });
  }
}
