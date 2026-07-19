import type { Event } from '@/lib/supabase-client'
import { normalizeEventCategory, type EventCategoryId } from '@/lib/event-categories'

/** Instant client-side match — no network round-trip. */
export function filterEvents(
  events: Event[],
  query: string,
  category?: EventCategoryId | null
): Event[] {
  const normalized = query.toLowerCase().trim()
  const tokens = normalized ? normalized.split(/\s+/).filter(Boolean) : []

  return events.filter((event) => {
    if (category && normalizeEventCategory(event.category) !== category) {
      return false
    }

    if (!tokens.length) return true

    const haystack = [
      event.name,
      event.venue,
      event.organizer_name,
      event.description ?? '',
      event.category ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return tokens.every((token) => haystack.includes(token))
  })
}
