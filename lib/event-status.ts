import type { Event } from '@/lib/supabase-client';
import { getEventEndDay, calendarDayUtc } from '@/lib/multi-day-events';

export type EventLifecycleStatus = Event['status'] | 'expired';

export function isEventDatePast(eventDate: string, now: Date = new Date()): boolean {
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < now.getTime();
}

/** True when the event's last calendar day is fully over. */
export function isEventFullyPast(
  event: Pick<Event, 'date' | 'end_date'>,
  now: Date = new Date()
): boolean {
  const endDay = getEventEndDay(event);
  const today = calendarDayUtc(now);
  if (today > endDay) return true;
  if (today < endDay) return false;
  // On the last calendar day: single-day events expire after start time;
  // multi-day events stay active for the whole last day.
  if (event.end_date && getEventEndDay(event) !== calendarDayUtc(event.date)) {
    return false;
  }
  return isEventDatePast(event.date, now);
}

export function getEventLifecycleStatus(
  event: Pick<Event, 'status' | 'date' | 'end_date'>,
  now: Date = new Date()
): EventLifecycleStatus {
  // Treat previously approved events past their last day as expired in the UI.
  if (event.status === 'approved' && isEventFullyPast(event, now)) {
    return 'expired';
  }
  return event.status;
}

export function getNowIso() {
  return new Date().toISOString();
}
