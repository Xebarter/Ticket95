import type { MetadataRoute } from 'next'
import { BRAND_ICON_PATHS } from '@/lib/brand-assets'

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
        src: BRAND_ICON_PATHS.png48,
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: BRAND_ICON_PATHS.png96,
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: BRAND_ICON_PATHS.manifest192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: BRAND_ICON_PATHS.manifest512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
