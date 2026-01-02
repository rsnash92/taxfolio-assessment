import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          if (typeof document === 'undefined') return undefined;
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          // Set cookie on parent domain so it works across subdomains
          const domain = process.env.NODE_ENV === 'production' ? '.taxfolio.io' : '';
          document.cookie = `${name}=${value}; ${domain ? `domain=${domain}; ` : ''}path=/; ${
            options.maxAge ? `max-age=${options.maxAge}; ` : ''
          }SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure' : ''}`;
        },
        remove(name) {
          if (typeof document === 'undefined') return;
          const domain = process.env.NODE_ENV === 'production' ? '.taxfolio.io' : '';
          document.cookie = `${name}=; ${domain ? `domain=${domain}; ` : ''}path=/; max-age=0`;
        },
      },
    }
  );
}
