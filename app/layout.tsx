import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/supabase-auth-context'
import { EventSearchProvider } from '@/lib/event-search-context'
import { VerifierSwCleanup } from '@/components/verify/verifier-sw-cleanup'
import { BRAND_ICON_PATHS, brandAssetUrl } from '@/lib/brand-assets'
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
  title: 'Ticket95.com - Event Ticketing Platform',
  description: 'Buy and sell event tickets online. Create events, manage approvals, and discover amazing events.',
  generator: 'v0.app',
  applicationName: 'Ticket95.com',
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
    title: 'Ticket95',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Ticket95.com',
    description: 'Buy and sell event tickets online. Create events, manage approvals, and discover amazing events.',
    images: [
      {
        url: brandAssetUrl(BRAND_ICON_PATHS.manifest512),
        width: 512,
        height: 512,
        alt: 'Ticket95.com',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Ticket95.com',
    description: 'Buy and sell event tickets online.',
    images: [brandAssetUrl(BRAND_ICON_PATHS.manifest512)],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="font-sans antialiased">
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
