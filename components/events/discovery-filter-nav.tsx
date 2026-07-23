'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  EVENT_DISCOVERY_FILTERS,
  isDiscoveryFilterId,
  type DiscoveryFilterId,
} from '@/lib/event-discovery-filters'
import { cn } from '@/lib/utils'

type DiscoveryFilterNavProps = {
  variant: 'sheet' | 'chips'
  /** Where chip links should point (home uses `/?filter=`, elsewhere `/events?filter=`). */
  linkTarget?: 'home' | 'events'
  onNavigate?: () => void
  className?: string
}

export function DiscoveryFilterNav({
  variant,
  linkTarget = 'events',
  onNavigate,
  className,
}: DiscoveryFilterNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const activeFilter: DiscoveryFilterId | null =
    (pathname === '/' || pathname === '/events') && isDiscoveryFilterId(rawFilter)
      ? rawFilter
      : null

  if (variant === 'sheet') {
    return (
      <nav className={cn('flex flex-col gap-1', className)} aria-label="Discover events">
        {EVENT_DISCOVERY_FILTERS.map((filter) => {
          const active = activeFilter === filter.id
          return (
            <Link
              key={filter.id}
              href={filter.href}
              onClick={onNavigate}
              className={cn(
                'rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-slate-50',
                active ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      className={cn('flex items-center gap-2 overflow-x-auto pb-1', className)}
      aria-label="Discover events"
    >
      {EVENT_DISCOVERY_FILTERS.map((filter) => {
        const href = linkTarget === 'home' ? filter.homeHref : filter.href
        const active = activeFilter === filter.id
        return (
          <Link
            key={filter.id}
            href={href}
            scroll={false}
            className={cn(
              'inline-flex h-9 shrink-0 items-center border px-3.5 text-sm font-medium transition-[color,background-color,border-color] duration-200',
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200/90 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            )}
          >
            {filter.label}
          </Link>
        )
      })}
    </nav>
  )
}
