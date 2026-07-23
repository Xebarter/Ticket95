import type { Metadata } from 'next'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params
  const safeSlug = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32)

  return {
    title: 'Ticket95 Verifier',
    description: 'Door ticket check-in',
    manifest: `/api/verify/manifest/${safeSlug}`,
    appleWebApp: {
      capable: true,
      title: 'Ticket95 Verifier',
      statusBarStyle: 'black-translucent',
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  }
}

export default function VerifySlugLayout({ children }: { children: React.ReactNode }) {
  return children
}
