import {
  EVENT_CATEGORIES,
  normalizeEventCategory,
  type EventCategoryId,
} from '@/lib/event-categories'
import type { Event } from '@/lib/supabase-client'

export type HomeFeedBlock =
  | { type: 'cards'; id: string; events: Event[] }
  | { type: 'mosaic'; id: string; category: EventCategoryId; events: Event[] }
  | { type: 'rail'; id: string; events: Event[] }

const CARDS_PER_CHUNK = 3
const MOSAIC_MAX = 4
const MOSAIC_MIN = 2
const RAIL_MIN = 6
const RAIL_MAX = 16

function hasCoverImage(event: Event): boolean {
  return Boolean((event.image_url || '').trim())
}

/** Group events that have cover images by normalized category (category order preserved). */
export function groupEventsByCategoryWithImages(
  events: Event[],
  excludeIds?: Set<string>
): Array<{ category: EventCategoryId; events: Event[] }> {
  const excluded = excludeIds || new Set<string>()
  const buckets = new Map<EventCategoryId, Event[]>()

  for (const category of EVENT_CATEGORIES) {
    buckets.set(category.id, [])
  }

  for (const event of events) {
    if (excluded.has(event.id) || !hasCoverImage(event)) continue
    const category = normalizeEventCategory(event.category)
    buckets.get(category)?.push(event)
  }

  return EVENT_CATEGORIES.map((category) => ({
    category: category.id,
    events: (buckets.get(category.id) || []).slice(0, MOSAIC_MAX),
  })).filter((group) => group.events.length >= MOSAIC_MIN)
}

/**
 * Build an interleaved discovery feed:
 * cards → mosaic → (optional rail) → cards → mosaic → …
 * Each event appears in at most one cards/mosaic block. Rails may reuse covers for motion.
 */
export function buildHomeDiscoveryFeed(events: Event[]): HomeFeedBlock[] {
  if (!events.length) return []

  const queue = [...events]
  const used = new Set<string>()
  const blocks: HomeFeedBlock[] = []
  let mosaicRound = 0
  let blockIndex = 0

  const takeNextCards = (): Event[] => {
    const picked: Event[] = []
    while (picked.length < CARDS_PER_CHUNK && queue.length > 0) {
      const next = queue.shift()!
      if (used.has(next.id)) continue
      used.add(next.id)
      picked.push(next)
    }
    return picked
  }

  const takeNextMosaic = (): { category: EventCategoryId; events: Event[] } | null => {
    const available = queue.filter((e) => !used.has(e.id))
    const groups = groupEventsByCategoryWithImages(available)
    if (!groups.length) return null

    const group = groups[mosaicRound % groups.length]
    mosaicRound += 1
    const mosaicEvents = group.events.slice(0, MOSAIC_MAX)

    for (const event of mosaicEvents) {
      used.add(event.id)
      const idx = queue.findIndex((e) => e.id === event.id)
      if (idx >= 0) queue.splice(idx, 1)
    }

    return { category: group.category, events: mosaicEvents }
  }

  while (queue.length > 0) {
    const cards = takeNextCards()
    if (cards.length) {
      blocks.push({ type: 'cards', id: `cards-${blockIndex++}`, events: cards })
    }

    const mosaic = takeNextMosaic()
    if (mosaic) {
      blocks.push({
        type: 'mosaic',
        id: `mosaic-${blockIndex++}`,
        category: mosaic.category,
        events: mosaic.events,
      })
    }

    // Safety: if neither cards nor mosaic advanced, drain remaining as cards
    if (!cards.length && !mosaic) {
      const leftovers = queue.splice(0, queue.length).filter((e) => !used.has(e.id))
      for (const event of leftovers) used.add(event.id)
      if (leftovers.length) {
        for (let i = 0; i < leftovers.length; i += CARDS_PER_CHUNK) {
          blocks.push({
            type: 'cards',
            id: `cards-${blockIndex++}`,
            events: leftovers.slice(i, i + CARDS_PER_CHUNK),
          })
        }
      }
      break
    }
  }

  // Insert rails between blocks: after every cards+mosaic pair when possible
  const withRails: HomeFeedBlock[] = []
  const coverPool = events.filter(hasCoverImage)
  let railIndex = 0

  for (let i = 0; i < blocks.length; i++) {
    withRails.push(blocks[i])
    const isPairEnd =
      blocks[i].type === 'mosaic' ||
      (blocks[i].type === 'cards' && blocks[i + 1]?.type !== 'mosaic')
    if (isPairEnd && coverPool.length >= RAIL_MIN && (i + 1) % 3 === 0) {
      const start = (railIndex * 5) % Math.max(coverPool.length, 1)
      const slice = [
        ...coverPool.slice(start, start + RAIL_MAX),
        ...coverPool.slice(0, Math.max(0, start + RAIL_MAX - coverPool.length)),
      ].slice(0, RAIL_MAX)
      if (slice.length >= RAIL_MIN) {
        withRails.push({
          type: 'rail',
          id: `rail-${blockIndex++}`,
          events: slice,
        })
        railIndex += 1
      }
    }
  }

  // Ensure at least one rail when we have enough images
  if (!withRails.some((b) => b.type === 'rail') && coverPool.length >= RAIL_MIN) {
    withRails.splice(
      Math.min(2, withRails.length),
      0,
      {
        type: 'rail',
        id: `rail-${blockIndex++}`,
        events: coverPool.slice(0, RAIL_MAX),
      }
    )
  }

  return withRails
}

export const HOME_FEED_INITIAL_BLOCKS = 3
export const HOME_FEED_BATCH_SIZE = 2
