import QRCode from 'qrcode';
import type { Event, Ticket } from '@/lib/supabase-client';
import { downloadTicketPDF, downloadTicketsPDF, type TicketPDFData } from '@/lib/pdf-generator';
import { getSponsorsByEvent } from '@/lib/supabase-db';

const DEFAULT_EVENT_DATE = 'Date to be announced';
const DEFAULT_EVENT_VENUE = 'Venue to be announced';

type SponsorLike = {
  name?: string;
  logo_url?: string | null;
  logoUrl?: string | null;
  logo?: string | null;
};

type NormalizedSponsor = { name: string; logoUrl?: string };

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

function coerceSponsorList(raw: unknown): SponsorLike[] {
  if (!raw) return [];

  if (typeof raw === 'string') {
    try {
      return coerceSponsorList(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) return raw as SponsorLike[];

  return [];
}

function normalizeSponsors(sponsors?: unknown): NormalizedSponsor[] {
  return coerceSponsorList(sponsors)
    .map((sponsor) => ({
      name: (sponsor.name || '').trim(),
      logoUrl: sponsor.logoUrl || sponsor.logo_url || sponsor.logo || undefined,
    }))
    .filter((sponsor) => sponsor.name.length > 0);
}

async function resolveQrCodeDataUrl(qrCodeValue: string): Promise<string> {
  if (qrCodeValue.startsWith('data:image/')) {
    return qrCodeValue;
  }

  return QRCode.toDataURL(qrCodeValue || 'ticket', {
    margin: 2,
    width: 400,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

async function fetchSponsorsFromApi(eventId: string) {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/sponsors`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const payload = await response.json().catch(() => ({}));
    return normalizeSponsors(payload?.sponsors);
  } catch (error) {
    console.error('Failed to load sponsors via API for ticket PDF:', error);
    return [];
  }
}

/**
 * Prefer embedded ticket/event sponsors; only hit the network if both are empty.
 */
async function resolveTicketSponsors(
  ticket: Ticket,
  event?: Pick<Event, 'id' | 'sponsors'> | null
): Promise<NormalizedSponsor[]> {
  const fromTicket = normalizeSponsors(ticket.sponsors);
  if (fromTicket.length > 0) return fromTicket;

  const fromEvent = normalizeSponsors(event?.sponsors);
  if (fromEvent.length > 0) return fromEvent;

  const eventId = ticket.event_id || event?.id;
  if (!eventId) return [];

  const fromApi = await fetchSponsorsFromApi(eventId);
  if (fromApi.length > 0) return fromApi;

  try {
    return normalizeSponsors(await getSponsorsByEvent(eventId));
  } catch (error) {
    console.error('Failed to load event sponsors for ticket PDF:', error);
    return [];
  }
}

function buildTicketPdfData(options: {
  ticket: Ticket;
  event?: Event | null;
  qrCodeDataUrl: string;
  sponsors: NormalizedSponsor[];
  ticketIndex: number;
  ticketTotal: number;
}): TicketPDFData {
  const { ticket, event, qrCodeDataUrl, sponsors, ticketIndex, ticketTotal } = options;
  const eventName = firstNonEmpty(event?.name, ticket.event_name) || 'Event Ticket';
  const organizerName =
    firstNonEmpty(ticket.organizer_name, event?.organizer_name) || 'Event Organizer';
  const organizerLogoUrl =
    firstNonEmpty(ticket.organizer_logo_url, event?.organizer_logo_url) || undefined;
  const eventImageUrl =
    firstNonEmpty(
      event?.image_url,
      Array.isArray(event?.image_urls) ? event.image_urls[0] : undefined
    ) || undefined;

  return {
    eventName,
    eventDate: formatEventDate(event?.date),
    eventVenue: firstNonEmpty(event?.venue) || DEFAULT_EVENT_VENUE,
    organizerName,
    organizerLogoUrl,
    eventImageUrl,
    ticketTypeName: firstNonEmpty(ticket.ticket_type_name) || 'General Admission',
    ticketNumber: ticket.id.slice(0, 8).toUpperCase(),
    qrCodeDataUrl,
    sponsors,
    ticketIndex,
    ticketTotal,
  };
}

type DownloadOptions = {
  logoCache?: Map<string, string | null>;
  sponsors?: NormalizedSponsor[];
};

export async function downloadTicketAsPdf(
  ticket: Ticket,
  event?: Event | null,
  options?: DownloadOptions
): Promise<void> {
  const [qrCodeDataUrl, sponsors] = await Promise.all([
    resolveQrCodeDataUrl(ticket.qr_code),
    options?.sponsors
      ? Promise.resolve(options.sponsors)
      : resolveTicketSponsors(ticket, event),
  ]);

  const eventName = firstNonEmpty(event?.name, ticket.event_name) || 'Event Ticket';
  const filename =
    sanitizeFilename(`${eventName}-${ticket.id.slice(0, 8)}`) || `ticket-${ticket.id.slice(0, 8)}`;

  await downloadTicketPDF(
    filename,
    buildTicketPdfData({
      ticket,
      event,
      qrCodeDataUrl,
      sponsors,
      ticketIndex: 1,
      ticketTotal: 1,
    }),
    options?.logoCache
  );
}

/**
 * Download one multi-page PDF for all tickets in the purchase
 * (page 1 = Ticket 1, page 2 = Ticket 2, …). Different ticket types get
 * different header colors.
 */
export async function downloadTicketsAsPdfs(
  tickets: Ticket[],
  event?: Pick<
    Event,
    | 'name'
    | 'date'
    | 'venue'
    | 'organizer_name'
    | 'organizer_logo_url'
    | 'image_url'
    | 'image_urls'
    | 'sponsors'
    | 'id'
  > | null
): Promise<void> {
  if (tickets.length === 0) return;

  if (tickets.length === 1) {
    await downloadTicketAsPdf(tickets[0], event as Event | null);
    return;
  }

  const logoCache = new Map<string, string | null>();
  const sharedSponsors =
    normalizeSponsors(event?.sponsors).length > 0
      ? normalizeSponsors(event?.sponsors)
      : normalizeSponsors(tickets[0]?.sponsors).length > 0
        ? normalizeSponsors(tickets[0].sponsors)
        : await resolveTicketSponsors(tickets[0], event as Event | null);

  const qrCodes = await Promise.all(
    tickets.map((ticket) => resolveQrCodeDataUrl(ticket.qr_code))
  );

  const pages = tickets.map((ticket, index) =>
    buildTicketPdfData({
      ticket,
      event: event as Event | null,
      qrCodeDataUrl: qrCodes[index],
      sponsors: sharedSponsors,
      ticketIndex: index + 1,
      ticketTotal: tickets.length,
    })
  );

  const eventName =
    firstNonEmpty(event?.name, tickets[0]?.event_name) || 'Event Ticket';
  const filename =
    sanitizeFilename(`${eventName}-${tickets.length}-tickets`) ||
    `tickets-${tickets[0].id.slice(0, 8)}`;

  await downloadTicketsPDF(filename, pages, logoCache);
}
