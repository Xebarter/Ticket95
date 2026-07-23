/** UTC calendar day as YYYY-MM-DD (matches analytics dayKey). */
export function calendarDayUtc(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Store optional end date as end-of-day UTC so the UTC calendar day matches the picker. */
export function endDateFromDateInput(dateInput: string): string | null {
  const trimmed = dateInput.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  return `${trimmed}T23:59:59.999Z`
}

export function dateInputFromIso(iso?: string | null): string {
  if (!iso) return ''
  return calendarDayUtc(iso)
}

export function getEventStartDay(event: { date: string }): string {
  return calendarDayUtc(event.date)
}

export function getEventEndDay(event: { date: string; end_date?: string | null }): string {
  if (event.end_date) {
    const end = calendarDayUtc(event.end_date)
    if (end) return end
  }
  return getEventStartDay(event)
}

export function isMultiDayEvent(event: { date: string; end_date?: string | null }): boolean {
  return getEventStartDay(event) !== getEventEndDay(event)
}

export type EventAccessWindowResult =
  | { ok: true; today: string; startDay: string; endDay: string; isMultiDay: boolean; isLastDay: boolean }
  | {
      ok: false
      reason: 'too_early' | 'event_ended'
      message: string
      today: string
      startDay: string
      endDay: string
      isMultiDay: boolean
    }

export function evaluateEventAccessWindow(
  event: { date: string; end_date?: string | null },
  now: Date = new Date()
): EventAccessWindowResult {
  const today = calendarDayUtc(now)
  const startDay = getEventStartDay(event)
  const endDay = getEventEndDay(event)
  const multi = startDay !== endDay

  if (today < startDay) {
    return {
      ok: false,
      reason: 'too_early',
      message: multi
        ? `This event runs ${startDay} to ${endDay}. Entry is not open yet.`
        : 'This event has not started yet.',
      today,
      startDay,
      endDay,
      isMultiDay: multi,
    }
  }

  if (today > endDay) {
    return {
      ok: false,
      reason: 'event_ended',
      message: multi
        ? `This event ended on ${endDay}.`
        : 'This event has ended.',
      today,
      startDay,
      endDay,
      isMultiDay: multi,
    }
  }

  return {
    ok: true,
    today,
    startDay,
    endDay,
    isMultiDay: multi,
    isLastDay: today === endDay,
  }
}
