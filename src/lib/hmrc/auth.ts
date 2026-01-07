const HMRC_BASE_URL = process.env.HMRC_API_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const HMRC_CLIENT_ID = process.env.HMRC_CLIENT_ID!;
const HMRC_CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Required scopes for TaxFolio Assessment
 */
export const HMRC_SCOPES = ['read:self-assessment', 'write:self-assessment'].join(' ');

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: HMRC_CLIENT_ID,
    scope: HMRC_SCOPES,
    state: state,
    redirect_uri: `${APP_URL}/api/hmrc/auth/callback`,
  });

  return `${HMRC_BASE_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}> {
  const response = await fetch(`${HMRC_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HMRC_CLIENT_ID,
      client_secret: HMRC_CLIENT_SECRET,
      code: code,
      redirect_uri: `${APP_URL}/api/hmrc/auth/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  return response.json();
}
