import type { MetadataRoute } from 'next'
import { BRAND_ICON_PATHS, brandAssetUrl } from '@/lib/brand-assets'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ticket95.com',
    short_name: 'Ticket95',
    description:
      'Buy and sell event tickets online. Create events, manage approvals, and discover amazing events.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: brandAssetUrl(BRAND_ICON_PATHS.manifest192),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: brandAssetUrl(BRAND_ICON_PATHS.manifest512),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
