import type { Event, TicketType } from '@/lib/supabase-client';
import { getEventEndDay, getEventStartDay, isMultiDayEvent } from '@/lib/multi-day-events';

export function formatEventDateLong(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats a single day or a start–end range for multi-day events. */
export function formatEventDateRange(
  event: Pick<Event, 'date' | 'end_date'>,
  style: 'long' | 'short' = 'long'
) {
  if (!isMultiDayEvent(event)) {
    return style === 'long' ? formatEventDateLong(event.date) : formatEventDateTime(event.date);
  }

  const start = new Date(event.date);
  const endDay = getEventEndDay(event);
  const end = new Date(`${endDay}T12:00:00.000Z`);

  if (style === 'short') {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', {
      ...opts,
      year: 'numeric',
    })}`;
  }

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })} – ${end.toLocaleDateString('en-US', {
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })}`;
  }

  return `${formatEventDateLong(`${getEventStartDay(event)}T12:00:00.000Z`)} – ${formatEventDateLong(
    `${endDay}T12:00:00.000Z`
  )}`;
}

export function formatEventTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrencyAmount(currency: string | undefined, amount: number) {
  const safeCurrency = currency || 'UGX';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === 'UGX' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${Math.floor(amount).toLocaleString()}`;
  }
}

export function isFreePrice(amount: number) {
  return !Number.isFinite(amount) || amount <= 0;
}

export function formatDisplayPrice(currency: string | undefined, amount: number) {
  if (isFreePrice(amount)) return 'Free';
  return formatCurrencyAmount(currency, amount);
}

export function getStartingPrice(event: Event, ticketTypes: TicketType[]) {
  if (ticketTypes.length > 0) {
    return Math.min(...ticketTypes.map((t) => t.price || 0));
  }
  return event.ticket_price || 0;
}

export function getEventImages(event: Event): string[] {
  if (event.image_urls && event.image_urls.length > 0) {
    return event.image_urls;
  }
  if (event.image_url) {
    return [event.image_url];
  }
  return [];
}

export function isEventSoldOut(event: Event, ticketTypes: TicketType[]) {
  if (ticketTypes.length > 0) {
    return ticketTypes.every((t) => t.available_quantity <= 0);
  }
  return (event.tickets_available || 0) <= 0 && (event.total_tickets || 0) > 0;
}
