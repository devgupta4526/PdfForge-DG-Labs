import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { APP_NAME, APP_URL, SITE_DESCRIPTION } from '@/lib/constants';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Fast, private PDF tools`,
    template: `%s | ${APP_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ['pdf', 'merge pdf', 'split pdf', 'compress pdf', 'pdf tools', 'privacy'],
  authors: [{ name: 'PDF Forge' }],
  openGraph: {
    type: 'website',
    title: APP_NAME,
    description: SITE_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AuthProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </body>
      </html>
    </AuthProvider>
  );
}
