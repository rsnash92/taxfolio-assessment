import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HTTPS enforcement - tell browsers to only use HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Prevent clickjacking by denying framing
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS protection (legacy but still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy - disable sensitive features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              // Default to self only
              "default-src 'self'",
              // Scripts from self plus inline for Next.js hydration
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com",
              // Styles from self plus inline for styled-components/emotion
              "style-src 'self' 'unsafe-inline'",
              // Images from self, data URIs, and common CDNs
              "img-src 'self' data: https: blob:",
              // Fonts from self
              "font-src 'self'",
              // API connections
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://transaction-engine.tax.service.gov.uk https://test-transaction-engine.tax.service.gov.uk https://www.google-analytics.com https://region1.google-analytics.com https://challenges.cloudflare.com",
              // Frame sources for Cloudflare Turnstile
              "frame-src 'self' https://challenges.cloudflare.com",
              // No plugins
              "object-src 'none'",
              // No frame ancestors (clickjacking protection)
              "frame-ancestors 'none'",
              // Form submissions only to self
              "form-action 'self'",
              // Base URI restricted to self
              "base-uri 'self'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
            ].filter(Boolean).join('; '),
          },
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://assessment.taxfolio.io/:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
