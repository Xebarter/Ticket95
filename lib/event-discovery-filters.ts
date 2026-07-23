import type { Event } from '@/lib/supabase-client'

export const EVENT_DISCOVERY_FILTERS = [
  {
    id: 'trending',
    label: 'Trending',
    href: '/events?filter=trending',
    homeHref: '/?filter=trending',
  },
  {
    id: 'happening-soon',
    label: 'Happening soon',
    href: '/events?filter=happening-soon',
    homeHref: '/?filter=happening-soon',
  },
  {
    id: 'this-weekend',
    label: 'This weekend',
    href: '/events?filter=this-weekend',
    homeHref: '/?filter=this-weekend',
  },
  {
    id: 'this-month',
    label: 'This month',
    href: '/events?filter=this-month',
    homeHref: '/?filter=this-month',
  },
  {
    id: 'near-me',
    label: 'Near me',
    href: '/events?filter=near-me',
    homeHref: '/?filter=near-me',
  },
] as const

export type DiscoveryFilterId = (typeof EVENT_DISCOVERY_FILTERS)[number]['id']

export type NearMeContext = {
  /** City / region tokens derived from reverse geocode */
  placeTokens: string[]
}

export function isDiscoveryFilterId(
  value: string | null | undefined
): value is DiscoveryFilterId {
  return EVENT_DISCOVERY_FILTERS.some((filter) => filter.id === value)
}

export function getDiscoveryFilterLabel(id: string | null | undefined): string {
  const match = EVENT_DISCOVERY_FILTERS.find((filter) => filter.id === id)
  return match?.label ?? 'Events'
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

/** Upcoming Fri–Sun window (current weekend if already Fri–Sun). */
export function getThisWeekendRange(now: Date = new Date()): { start: Date; end: Date } {
  const day = now.getDay() // 0 Sun … 6 Sat
  const start = startOfDay(now)

  if (day === 5) {
    // Friday — this weekend
  } else if (day === 6) {
    start.setDate(start.getDate() - 1) // back to Friday
  } else if (day === 0) {
    start.setDate(start.getDate() - 2) // back to Friday
  } else {
    // Mon–Thu → upcoming Friday
    start.setDate(start.getDate() + (5 - day))
  }

  const end = endOfDay(new Date(start))
  end.setDate(end.getDate() + 2) // Sunday
  return { start, end }
}

export function getThisMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = startOfDay(now)
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  return { start, end }
}

export function getHappeningSoonRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = now
  const end = new Date(now)
  end.setDate(end.getDate() + 7)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function eventTime(event: Event): number {
  const t = new Date(event.date).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

function soldRatio(event: Event): number {
  const total = event.total_tickets ?? 0
  if (total <= 0) return 0
  const available = event.tickets_available ?? 0
  return Math.max(0, Math.min(1, (total - available) / total))
}

function inRange(event: Event, start: Date, end: Date): boolean {
  const t = eventTime(event)
  return t >= start.getTime() && t <= end.getTime()
}

function venueMatchesPlace(venue: string, placeTokens: string[]): boolean {
  if (!placeTokens.length) return false
  const haystack = venue.toLowerCase()
  return placeTokens.some((token) => {
    const t = token.toLowerCase().trim()
    return t.length >= 2 && haystack.includes(t)
  })
}

function sortByDateAsc(a: Event, b: Event): number {
  return eventTime(a) - eventTime(b)
}

function sortTrending(a: Event, b: Event): number {
  const soldDiff = soldRatio(b) - soldRatio(a)
  if (Math.abs(soldDiff) > 0.001) return soldDiff

  const featuredDiff = Number(!!b.is_featured) - Number(!!a.is_featured)
  if (featuredDiff !== 0) return featuredDiff

  return sortByDateAsc(a, b)
}

/** Apply a discovery filter (and optional Near me context) to a list of events. */
export function applyDiscoveryFilter(
  events: Event[],
  filterId: DiscoveryFilterId | null | undefined,
  nearMe?: NearMeContext | null,
  now: Date = new Date()
): Event[] {
  if (!filterId) return events

  switch (filterId) {
    case 'trending': {
      return [...events].sort(sortTrending)
    }
    case 'happening-soon': {
      const { start, end } = getHappeningSoonRange(now)
      return events.filter((e) => inRange(e, start, end)).sort(sortByDateAsc)
    }
    case 'this-weekend': {
      const { start, end } = getThisWeekendRange(now)
      return events.filter((e) => inRange(e, start, end)).sort(sortByDateAsc)
    }
    case 'this-month': {
      const { start, end } = getThisMonthRange(now)
      return events.filter((e) => inRange(e, start, end)).sort(sortByDateAsc)
    }
    case 'near-me': {
      const tokens = nearMe?.placeTokens ?? []
      if (!tokens.length) return []
      return events
        .filter((e) => venueMatchesPlace(e.venue ?? '', tokens))
        .sort(sortByDateAsc)
    }
    default:
      return events
  }
}
