/**
 * Brand files live in `public/` under fixed names. URLs are versioned from a
 * content hash (set in next.config) so replacements show up after rebuild/restart.
 */
export const BRAND_ASSET_VERSION =
  process.env.NEXT_PUBLIC_BRAND_ASSET_VERSION ?? '0'

export const BRAND_LOGO_SRC = '/apple-touch-icon.png'
export const BRAND_LOGO_FALLBACK_SRC = '/favicon-96x96.png'

export const BRAND_ICON_PATHS = {
  ico: '/favicon.ico',
  svg: '/favicon.svg',
  png96: '/favicon-96x96.png',
  apple: '/apple-touch-icon.png',
  manifest192: '/web-app-manifest-192x192.png',
  manifest512: '/web-app-manifest-512x512.png',
} as const

export function brandAssetUrl(src: string): string {
  return `${src}?v=${BRAND_ASSET_VERSION}`
}
