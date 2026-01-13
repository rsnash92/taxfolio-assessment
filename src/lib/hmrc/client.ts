// HMRC API Client
// Handles authentication and API requests to HMRC MTD APIs
//
// Supports two authentication types:
// 1. User-Restricted: OAuth tokens for accessing user data (most APIs)
// 2. Application-Restricted: Client credentials for sandbox/test APIs
//
// Usage:
//   import { hmrcClient, hmrcAppClient } from '@/lib/hmrc';
//
//   // User-restricted (needs userId to get their OAuth token)
//   await hmrcClient.get(userId, '/individuals/income-received/...', options);
//
//   // Application-restricted (no user needed)
//   await hmrcAppClient.post('/individuals/self-assessment-test-support/...', body, options);

import { createClient } from '@/lib/supabase/server';
import { HMRCApiError } from './types';

const HMRC_API_BASE_URL =
  process.env.HMRC_API_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const HMRC_CLIENT_ID = process.env.HMRC_CLIENT_ID!;
const HMRC_CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET!;

// Detect sandbox mode from URL or explicit env var
const IS_SANDBOX =
  process.env.HMRC_SANDBOX_MODE === 'true' ||
  (process.env.HMRC_SANDBOX_MODE !== 'false' &&
    HMRC_API_BASE_URL.includes('test-api'));

interface HMRCRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  govTestScenario?: string;
  headers?: Record<string, string>;
}

interface AppRequestOptions {
  govTestScenario?: string;
}

interface StoredHMRCTokens {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string;
}

interface HMRCTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface AppTokenCache {
  token: string;
  expiresAt: number;
}

// Cache for application-restricted token (valid for 4 hours)
let appTokenCache: AppTokenCache | null = null;

/**
 * Get stored HMRC tokens for a user from Supabase
 */
export async function getHMRCTokens(userId: string): Promise<StoredHMRCTokens | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('hmrc_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Store HMRC tokens for a user in Supabase
 */
export async function storeHMRCTokens(userId: string, tokens: HMRCTokens): Promise<void> {
  const supabase = await createClient();

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase.from('hmrc_tokens').upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: expiresAt,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error) throw new Error(`Failed to store tokens: ${error.message}`);
}

/**
 * Refresh expired tokens
 */
export async function refreshHMRCTokens(refreshToken: string): Promise<HMRCTokens> {
  const response = await fetch(`${HMRC_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: HMRC_CLIENT_ID,
      client_secret: HMRC_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Get valid access token (refreshing if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getHMRCTokens(userId);

  if (!tokens) {
    throw new Error('HMRC_NOT_CONNECTED');
  }

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();

  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const newTokens = await refreshHMRCTokens(tokens.refresh_token);
    await storeHMRCTokens(userId, newTokens);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

/**
 * Check if user has valid HMRC connection
 */
export async function isHMRCConnected(userId: string): Promise<boolean> {
  try {
    await getValidAccessToken(userId);
    return true;
  } catch {
    return false;
  }
}

// Custom error class for HMRC API errors
export class HMRCError extends Error {
  code: string;
  statusCode: number;
  errors?: Array<{ code: string; message: string; path?: string }>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    errors?: Array<{ code: string; message: string; path?: string }>
  ) {
    super(message);
    this.name = 'HMRCError';
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class HMRCApiClient {
  private baseUrl: string;
  private isSandbox: boolean;

  constructor() {
    this.baseUrl = HMRC_API_BASE_URL;
    this.isSandbox = IS_SANDBOX;
  }

  async request<T>(
    userId: string,
    endpoint: string,
    options: HMRCRequestOptions = {}
  ): Promise<T> {
    const accessToken = await getValidAccessToken(userId);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.hmrc.2.0+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Gov-Test-Scenario header for sandbox testing
    if (this.isSandbox && options.govTestScenario) {
      headers['Gov-Test-Scenario'] = options.govTestScenario;
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle 204 No Content (e.g., successful final declaration)
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as HMRCApiError;
      throw new HMRCError(
        error.message || 'HMRC API request failed',
        error.code || 'UNKNOWN_ERROR',
        response.status,
        error.errors
      );
    }

    return data as T;
  }

  // Convenience methods
  async get<T>(
    userId: string,
    endpoint: string,
    options?: Omit<HMRCRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(userId, endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    userId: string,
    endpoint: string,
    body: unknown,
    options?: Omit<HMRCRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(userId, endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(
    userId: string,
    endpoint: string,
    body: unknown,
    options?: Omit<HMRCRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(userId, endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T>(
    userId: string,
    endpoint: string,
    options?: Omit<HMRCRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(userId, endpoint, { ...options, method: 'DELETE' });
  }

  get sandbox(): boolean {
    return this.isSandbox;
  }
}

// Singleton instance
export const hmrcClient = new HMRCApiClient();

// Legacy function for compatibility
export async function hmrcRequest<T>(
  userId: string,
  endpoint: string,
  options?: HMRCRequestOptions
): Promise<T> {
  return hmrcClient.request<T>(userId, endpoint, options);
}

// =============================================================================
// Application-Restricted Authentication (Client Credentials Grant)
// Used for: Self Assessment Test Support API, other app-level endpoints
// =============================================================================

/**
 * Get an application-restricted access token using client credentials grant.
 * Tokens are cached and reused until they expire.
 */
async function getApplicationToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 300000) {
    return appTokenCache.token;
  }

  console.log('[HMRC] Requesting new application-restricted token...');

  const response = await fetch(`${HMRC_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: HMRC_CLIENT_ID,
      client_secret: HMRC_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'write:self-assessment',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[HMRC] Application token error:', errorText);
    throw new Error(`Failed to get application token: ${errorText}`);
  }

  const data = await response.json();

  // Cache the token
  appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log('[HMRC] Application token obtained, expires in', data.expires_in, 'seconds');

  return data.access_token;
}

/**
 * Make an application-restricted API request.
 * Uses client credentials instead of user OAuth token.
 */
async function appRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown,
  options: AppRequestOptions = {}
): Promise<T> {
  const token = await getApplicationToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.hmrc.1.0+json',
    'Content-Type': 'application/json',
  };

  if (options.govTestScenario) {
    headers['Gov-Test-Scenario'] = options.govTestScenario;
  }

  const url = `${HMRC_API_BASE_URL}${endpoint}`;

  console.log(`[HMRC App] ${method} ${endpoint}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const responseData = await response.json();

  if (!response.ok) {
    const error = responseData as HMRCApiError;
    console.error(`[HMRC App] Error ${response.status}:`, responseData);
    throw new HMRCError(
      error.message || 'HMRC API Error',
      error.code || 'UNKNOWN_ERROR',
      response.status,
      error.errors
    );
  }

  return responseData as T;
}

/**
 * Application-restricted API client.
 * Use for Test Support APIs and other app-level endpoints.
 * Does NOT require a userId - uses client credentials.
 */
export const hmrcAppClient = {
  get: <T>(endpoint: string, options?: AppRequestOptions) =>
    appRequest<T>('GET', endpoint, undefined, options),

  post: <T>(endpoint: string, body: unknown, options?: AppRequestOptions) =>
    appRequest<T>('POST', endpoint, body, options),

  put: <T>(endpoint: string, body: unknown, options?: AppRequestOptions) =>
    appRequest<T>('PUT', endpoint, body, options),

  delete: <T>(endpoint: string, options?: AppRequestOptions) =>
    appRequest<T>('DELETE', endpoint, undefined, options),
};
