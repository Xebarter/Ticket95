import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

  let eventName = 'Ticket95 Verifier'
  try {
    const { data } = await supabaseAdmin
      .from('events')
      .select('name')
      .eq('verify_slug', safeSlug)
      .maybeSingle()
    if (data?.name) eventName = String(data.name)
  } catch {
    // Fall back to generic name
  }

  const shortName =
    eventName.length > 12 ? `${eventName.slice(0, 11).trim()}…` : eventName

  const manifest = {
    id: `/verify/${safeSlug}`,
    name: `${eventName} · Verifier`,
    short_name: shortName,
    description: 'Door ticket check-in for Ticket95',
    start_url: `/verify/${safeSlug}?source=pwa`,
    scope: '/verify/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
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
      'Cache-Control': 'public, max-age=300',
    },
  })
}
