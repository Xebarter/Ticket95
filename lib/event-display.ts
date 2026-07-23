import type { Event, TicketType } from '@/lib/supabase-client';

export function formatEventDateLong(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
