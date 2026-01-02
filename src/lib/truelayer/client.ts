const ENV = process.env.TRUELAYER_ENV || 'sandbox';

export const TRUELAYER_CONFIG = {
  clientId: process.env.TRUELAYER_CLIENT_ID!,
  clientSecret: process.env.TRUELAYER_CLIENT_SECRET!,

  // URLs based on environment
  authUrl:
    ENV === 'sandbox'
      ? 'https://auth.truelayer-sandbox.com'
      : 'https://auth.truelayer.com',

  apiUrl:
    ENV === 'sandbox'
      ? 'https://api.truelayer-sandbox.com'
      : 'https://api.truelayer.com',

  // Redirect URI - must match TrueLayer console settings
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/truelayer/auth/callback`,

  // Scopes we need
  scopes: ['info', 'accounts', 'balance', 'transactions', 'offline_access'],

  // Environment
  isSandbox: ENV === 'sandbox',
};

export function getAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TRUELAYER_CONFIG.clientId,
    redirect_uri: TRUELAYER_CONFIG.redirectUri,
    scope: TRUELAYER_CONFIG.scopes.join(' '),
    state,
  });

  // Set providers based on environment
  if (TRUELAYER_CONFIG.isSandbox) {
    params.set('providers', 'mock');
  } else {
    params.set('providers', 'uk-ob-all uk-oauth-all');
  }

  return `${TRUELAYER_CONFIG.authUrl}/?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const response = await fetch(`${TRUELAYER_CONFIG.authUrl}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TRUELAYER_CONFIG.clientId,
      client_secret: TRUELAYER_CONFIG.clientSecret,
      redirect_uri: TRUELAYER_CONFIG.redirectUri,
      code,
    }),
  });

  return response.json();
}

export async function getAccounts(accessToken: string) {
  const response = await fetch(`${TRUELAYER_CONFIG.apiUrl}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.json();
}

export async function getTransactions(
  accessToken: string,
  accountId: string,
  from: string,
  to: string
) {
  const response = await fetch(
    `${TRUELAYER_CONFIG.apiUrl}/data/v1/accounts/${accountId}/transactions?from=${from}&to=${to}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.json();
}
