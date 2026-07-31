import type { Event } from '@/lib/supabase-client';
import { getEventEndDay, calendarDayUtc } from '@/lib/multi-day-events';

export type EventLifecycleStatus = Event['status'] | 'expired';

export function hasPendingDeactivationRequest(
  event: Pick<Event, 'status' | 'deactivation_requested_at'>
): boolean {
  return event.status === 'approved' && Boolean(event.deactivation_requested_at);
}

export function hasPendingReactivationRequest(
  event: Pick<Event, 'status' | 'reactivation_requested_at'>
): boolean {
  return event.status === 'deactivated' && Boolean(event.reactivation_requested_at);
}

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

export function getEventLifecycleLabel(
  event: Pick<
    Event,
    | 'status'
    | 'date'
    | 'end_date'
    | 'deactivation_requested_at'
    | 'reactivation_requested_at'
  >
): string {
  if (hasPendingDeactivationRequest(event)) return 'Deactivation pending';
  if (hasPendingReactivationRequest(event)) return 'Reactivation pending';
  const status = getEventLifecycleStatus(event);
  if (status === 'approved') return 'Live';
  if (status === 'pending') return 'Pending';
  if (status === 'expired') return 'Past';
  if (status === 'rejected') return 'Rejected';
  if (status === 'deactivated') return 'Deactivated';
  if (status === 'removed') return 'Deleted by Admin';
  return status;
}

/** Public marketplace + checkout: only fully approved (request flags still sellable). */
export function isEventOnSale(event: Pick<Event, 'status'>): boolean {
  return event.status === 'approved';
}

export function getNowIso() {
  return new Date().toISOString();
}
