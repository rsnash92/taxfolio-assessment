import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Self Assessment | TaxFolio',
  description: 'Complete your UK self-assessment tax return',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics - Cross-subdomain tracking */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EBEZRRW7GY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EBEZRRW7GY', {
              cookie_domain: 'taxfolio.io',
              cookie_flags: 'SameSite=None;Secure',
              linker: {
                domains: ['taxfolio.io', 'app.taxfolio.io', 'intro.taxfolio.io', 'assessment.taxfolio.io']
              }
            });
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
