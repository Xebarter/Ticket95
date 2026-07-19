'use client'

import Link from 'next/link'
import {
  BRAND_LOGO_FALLBACK_SRC,
  BRAND_LOGO_SRC,
  brandAssetUrl,
} from '@/lib/brand-assets'
import { cn } from '@/lib/utils'

export { BRAND_LOGO_FALLBACK_SRC, BRAND_LOGO_SRC }

/**
 * Brand mark from `public/`. Plain <img> (not next/image) so replacing files
 * in public/ is not blocked by the Next image optimizer cache. Cache-busting
 * comes from NEXT_PUBLIC_BRAND_ASSET_VERSION (content hash in next.config).
 */

const SIZE_MAP = {
  sm: {
    px: 32,
    className: 'h-8 w-8',
    wordmark: 'text-sm font-semibold tracking-tight',
    subtitle: 'text-[10px]',
  },
  md: {
    px: 40,
    className: 'h-9 w-9 sm:h-10 sm:w-10',
    wordmark: 'text-base sm:text-lg font-semibold tracking-tight',
    subtitle: 'text-[10px] sm:text-xs',
  },
  lg: {
    px: 56,
    className: 'h-14 w-14',
    wordmark: 'text-xl font-semibold tracking-tight',
    subtitle: 'text-xs sm:text-sm',
  },
  xl: {
    px: 72,
    className: 'h-[4.5rem] w-[4.5rem]',
    wordmark: 'text-2xl font-semibold tracking-tight',
    subtitle: 'text-sm',
  },
} as const

type BrandLogoProps = {
  href?: string | null
  size?: keyof typeof SIZE_MAP
  subtitle?: string
  /** Hide subtitle below `md` breakpoint (e.g. compact headers). */
  hideSubtitleOnMobile?: boolean
  /** Stack mark above wordmark (auth pages). */
  stacked?: boolean
  className?: string
  priority?: boolean
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-foreground', className)}>
      Ticket
      <span className="brand-gold-95" aria-hidden="false">
        95
      </span>
      <span className="font-medium text-muted-foreground">.com</span>
    </span>
  )
}

export function BrandLogo({
  href = '/',
  size = 'md',
  subtitle,
  hideSubtitleOnMobile = false,
  stacked = false,
  className,
  priority = false,
}: BrandLogoProps) {
  const { px, className: sizeClass, wordmark, subtitle: subtitleClass } = SIZE_MAP[size]

  const mark = (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: avoid next/image cache for brand assets
    <img
      src={brandAssetUrl(BRAND_LOGO_SRC)}
      alt=""
      width={px}
      height={px}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={(event) => {
        const img = event.currentTarget
        if (img.src.includes(BRAND_LOGO_FALLBACK_SRC)) return
        img.src = brandAssetUrl(BRAND_LOGO_FALLBACK_SRC)
      }}
      className={cn(
        'shrink-0 rounded-xl object-cover bg-black shadow-sm ring-1 ring-border/60',
        sizeClass
      )}
    />
  )

  const text = (
    <span
      className={cn(
        'min-w-0 text-left leading-tight',
        stacked && 'text-center',
        hideSubtitleOnMobile && subtitle && 'max-md:[&>span:last-child]:hidden'
      )}
    >
      <Wordmark className={cn('block', wordmark)} />
      {subtitle ? (
        <span className={cn('mt-0.5 block font-medium text-muted-foreground', subtitleClass)}>
          {subtitle}
        </span>
      ) : null}
    </span>
  )

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 sm:gap-3',
        stacked && 'flex-col gap-3',
        className
      )}
    >
      {mark}
      {text}
    </span>
  )

  if (href === null) {
    return content
  }

  return (
    <Link
      href={href}
      className="group shrink-0 transition-opacity hover:opacity-90"
      aria-label="Ticket95.com home"
    >
      {content}
    </Link>
  )
}
