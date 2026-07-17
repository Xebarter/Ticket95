import type { Event } from '@/lib/supabase-client';

export type EventLifecycleStatus = Event['status'] | 'expired';

export function isEventDatePast(eventDate: string, now: Date = new Date()): boolean {
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < now.getTime();
}

export function getEventLifecycleStatus(
  event: Pick<Event, 'status' | 'date'>,
  now: Date = new Date()
): EventLifecycleStatus {
  // Treat previously approved events with past dates as expired in the UI.
  if (event.status === 'approved' && isEventDatePast(event.date, now)) {
    return 'expired';
  }
  return event.status;
}

export function getNowIso() {
  return new Date().toISOString();
}
