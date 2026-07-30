import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/supabase-auth-context'
import { EventSearchProvider } from '@/lib/event-search-context'
import { VerifierSwCleanup } from '@/components/verify/verifier-sw-cleanup'
import { JsonLd } from '@/components/seo/json-ld'
import { BRAND_ICON_PATHS, brandAssetUrl } from '@/lib/brand-assets'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  META_KEYWORDS,
  SITE_NAME,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from '@/lib/seo'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: META_KEYWORDS,
  authors: [{ name: SITE_NAME, url: getSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: brandAssetUrl(BRAND_ICON_PATHS.ico), sizes: 'any' },
      { url: brandAssetUrl(BRAND_ICON_PATHS.svg), type: 'image/svg+xml' },
      { url: brandAssetUrl(BRAND_ICON_PATHS.png96), sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      {
        url: brandAssetUrl(BRAND_ICON_PATHS.apple),
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: [brandAssetUrl(BRAND_ICON_PATHS.ico)],
  },
  appleWebApp: {
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_UG',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: getSiteUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'entertainment',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="font-sans antialiased">
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        <VerifierSwCleanup />
        <AuthProvider>
          <EventSearchProvider>
            {children}
          </EventSearchProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
