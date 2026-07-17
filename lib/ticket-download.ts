import QRCode from 'qrcode';
import type { Event, Ticket } from '@/lib/supabase-client';
import { downloadTicketPDF } from '@/lib/pdf-generator';

const DEFAULT_EVENT_DATE = 'Date to be announced';
const DEFAULT_EVENT_VENUE = 'Venue to be announced';

function formatEventDate(value?: string): string {
  if (!value) return DEFAULT_EVENT_DATE;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DEFAULT_EVENT_DATE;

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .toLowerCase();
}

async function resolveQrCodeDataUrl(qrCodeValue: string): Promise<string> {
  if (qrCodeValue.startsWith('data:image/')) {
    return qrCodeValue;
  }

  return QRCode.toDataURL(qrCodeValue || 'ticket', {
    margin: 1,
    width: 300,
  });
}

export async function downloadTicketAsPdf(ticket: Ticket, event?: Event | null): Promise<void> {
  const qrCodeDataUrl = await resolveQrCodeDataUrl(ticket.qr_code);
  const sponsors = Array.isArray(ticket.sponsors)
    ? ticket.sponsors.map((sponsor) => ({
        name: sponsor.name,
        logoUrl: sponsor.logo_url,
      }))
    : [];

  const eventName = event?.name || ticket.event_name || 'Event Ticket';
  const filename = sanitizeFilename(`${eventName}-${ticket.id.slice(0, 8)}`) || `ticket-${ticket.id.slice(0, 8)}`;

  await downloadTicketPDF(filename, {
    eventName,
    eventDate: formatEventDate(event?.date),
    eventVenue: event?.venue || DEFAULT_EVENT_VENUE,
    organizerName: ticket.organizer_name || event?.organizer_name || 'Event Organizer',
    organizerLogoUrl: ticket.organizer_logo_url || event?.organizer_logo_url,
    ticketNumber: ticket.id.slice(0, 8).toUpperCase(),
    qrCodeDataUrl,
    sponsors,
  });
}
