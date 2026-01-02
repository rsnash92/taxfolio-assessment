const TRUELAYER_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID!;
const TRUELAYER_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET!;
const TRUELAYER_REDIRECT_URI = process.env.TRUELAYER_REDIRECT_URI!;

export function getAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TRUELAYER_CLIENT_ID,
    redirect_uri: TRUELAYER_REDIRECT_URI,
    scope: 'info accounts balance transactions',
    state,
    providers: 'uk-ob-all uk-oauth-all',
  });

  return `https://auth.truelayer.com/?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const response = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TRUELAYER_CLIENT_ID,
      client_secret: TRUELAYER_CLIENT_SECRET,
      redirect_uri: TRUELAYER_REDIRECT_URI,
      code,
    }),
  });

  return response.json();
}

export async function getAccounts(accessToken: string) {
  const response = await fetch('https://api.truelayer.com/data/v1/accounts', {
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
    `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions?from=${from}&to=${to}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.json();
}
