// HMRC API Client
// Handles authentication and API requests to HMRC MTD APIs

import { HMRCApiError } from './types';

const HMRC_API_BASE_URL =
  process.env.HMRC_API_BASE_URL || 'https://test-api.service.hmrc.gov.uk';

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

interface TokenStore {
  getTokens(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  } | null>;
  refreshTokens?(
    userId: string,
    refreshToken: string
  ): Promise<{ access_token: string; expires_at: string }>;
}

let tokenStore: TokenStore | null = null;

export function setTokenStore(store: TokenStore) {
  tokenStore = store;
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
    if (!tokenStore) {
      throw new Error('Token store not configured');
    }

    const tokens = await tokenStore.getTokens(userId);
    if (!tokens) {
      throw new Error('No HMRC tokens found for user');
    }

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(tokens.expires_at);
    if (expiresAt <= new Date() && tokenStore.refreshTokens) {
      const newTokens = await tokenStore.refreshTokens(
        userId,
        tokens.refresh_token
      );
      tokens.access_token = newTokens.access_token;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/vnd.hmrc.1.0+json',
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
