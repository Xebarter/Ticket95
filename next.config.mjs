import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const BRAND_PUBLIC_FILES = [
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
]

function brandAssetVersion() {
  const hash = createHash('sha256')
  for (const file of BRAND_PUBLIC_FILES) {
    const fullPath = join(process.cwd(), 'public', file)
    hash.update(file)
    if (existsSync(fullPath)) {
      hash.update(readFileSync(fullPath))
    }
  }
  return hash.digest('hex').slice(0, 12)
}

const brandVersion = brandAssetVersion()

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BRAND_ASSET_VERSION: brandVersion,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source:
          '/:asset(favicon.ico|favicon.svg|favicon-96x96.png|apple-touch-icon.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
