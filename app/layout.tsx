import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/supabase-auth-context'
import './globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ticket95.com - Event Ticketing Platform',
  description: 'Buy and sell event tickets online. Create events, manage approvals, and discover amazing events.',
  generator: 'v0.app',
  applicationName: 'Ticket95.com',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    title: 'Ticket95',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Ticket95.com',
    description: 'Buy and sell event tickets online. Create events, manage approvals, and discover amazing events.',
    images: [{ url: '/web-app-manifest-512x512.png', width: 512, height: 512, alt: 'Ticket95.com' }],
  },
  twitter: {
    card: 'summary',
    title: 'Ticket95.com',
    description: 'Buy and sell event tickets online.',
    images: ['/web-app-manifest-512x512.png'],
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
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
