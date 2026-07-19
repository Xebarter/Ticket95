export const EVENT_CATEGORIES = [
  { id: 'sports', label: 'Sports', href: '/events?category=sports' },
  { id: 'concert', label: 'Concert', href: '/events?category=concert' },
  { id: 'movies', label: 'Movies', href: '/events?category=movies' },
  { id: 'other', label: 'Other Events', href: '/events?category=other' },
] as const

export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]['id']

export function isEventCategoryId(value: string | null | undefined): value is EventCategoryId {
  return EVENT_CATEGORIES.some((category) => category.id === value)
}

export function getEventCategoryLabel(id: string | null | undefined): string {
  const match = EVENT_CATEGORIES.find((category) => category.id === id)
  return match?.label ?? 'Other Events'
}

export function normalizeEventCategory(
  value: string | null | undefined
): EventCategoryId {
  return isEventCategoryId(value) ? value : 'other'
}
