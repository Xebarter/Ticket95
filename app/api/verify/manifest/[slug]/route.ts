import { NextRequest, NextResponse } from 'next/server'
import { BRAND_ICON_PATHS, brandAssetUrl } from '@/lib/brand-assets'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const safeSlug = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32)

  const manifest = {
    name: 'Ticket95 Verifier',
    short_name: 'Verifier',
    description: 'Fast door ticket check-in for Ticket95 events',
    start_url: `/verify/${safeSlug}`,
    scope: '/verify/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0e1a',
    theme_color: '#0a0e1a',
    icons: [
      {
        src: brandAssetUrl(BRAND_ICON_PATHS.manifest192),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: brandAssetUrl(BRAND_ICON_PATHS.manifest512),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
