/**
 * SEO keyword inventory sourced from additems.txt.
 * Prefer natural on-page use + structured data over dumping every phrase into meta tags.
 */

/** Homepage focus keywords (Top 20 from additems.txt). */
export const HOMEPAGE_FOCUS_KEYWORDS = [
  'Online Ticketing Platform',
  'Event Ticketing',
  'Sell Tickets Online',
  'Buy Tickets Online',
  'Digital Ticketing',
  'QR Code Ticketing',
  'Event Management',
  'Tour Booking',
  'Adventure Booking',
  'Tourism Ticketing',
  'Concert Tickets',
  'Festival Tickets',
  'Conference Registration',
  'Event Registration',
  'Event Check-in',
  'Affiliate Ticket Sales',
  'Ticket Verification',
  'Online Booking Platform',
  'Uganda Events',
  'Ticket95',
  'Ticket 95',
] as const;

/** Highest-priority primary ticketing phrases. */
export const PRIMARY_TICKETING_KEYWORDS = [
  'ticket 95',
  'online ticketing',
  'event ticketing',
  'event tickets',
  'buy tickets online',
  'sell tickets online',
  'online ticket sales',
  'digital tickets',
  'electronic tickets',
  'e-ticket',
  'e-ticketing',
  'QR code tickets',
  'QR ticketing',
  'ticket booking',
  'ticket reservation',
  'online booking',
  'ticket platform',
  'ticket management',
  'event registration',
  'event booking platform',
  'ticket verification',
  'ticket scanner',
  'ticket validation',
  'event entry system',
  'ticket sales platform',
] as const;

/** Uganda + East Africa local SEO. */
export const LOCAL_SEO_KEYWORDS = [
  'Uganda events',
  'Uganda concerts',
  'Uganda festivals',
  'Kampala events',
  'Kampala concerts',
  'Entebbe events',
  'Jinja events',
  'Mbarara events',
  'Gulu events',
  'Fort Portal events',
  'Uganda tourism',
  'Uganda safaris',
  'Uganda adventure',
  'Uganda conferences',
  'Uganda exhibitions',
  'Kenya events',
  'Rwanda events',
  'Tanzania events',
  'East Africa events',
  'East African tourism',
  'East Africa conferences',
  'East Africa festivals',
  'East Africa safaris',
] as const;

/** Brand variants. */
export const BRAND_KEYWORDS = [
  'Ticket95',
  'Ticket 95',
  'Ticket95 Uganda',
  'Ticket95 Africa',
  'Ticket95 events',
  'Ticket95 tickets',
  'Ticket95 booking',
  'Ticket95 concerts',
  'Ticket95 safaris',
  'Ticket95 festivals',
  'Ticket95 experiences',
  'Ticket95 affiliate',
  'Ticket95 organizer',
  'Ticket95 event management',
] as const;

/** Entertainment / sports / conference categories for content + schema. */
export const CATEGORY_KEYWORDS = [
  'concert tickets',
  'music festival tickets',
  'comedy show tickets',
  'cinema tickets',
  'movie tickets',
  'live music tickets',
  'theatre tickets',
  'football tickets',
  'basketball tickets',
  'sports events',
  'marathon registration',
  'conference tickets',
  'conference registration',
  'business summit registration',
  'startup events',
  'graduation tickets',
  'church event ticketing',
  'gospel concert tickets',
  'safari tickets',
  'gorilla trekking booking',
  'wildlife tours',
  'national park tickets',
  'tourism booking',
  'adventure booking',
  'travel experiences',
  'Uganda experiences',
  'East Africa tours',
] as const;

/** Organizer / tech differentiators. */
export const PLATFORM_KEYWORDS = [
  'event organizer software',
  'event management platform',
  'event ticketing system',
  'event check-in system',
  'attendee management',
  'affiliate ticket sales',
  'ticket affiliate program',
  'event affiliate marketing',
  'mobile money payments',
  'secure payments',
  'QR verification',
  'SaaS ticketing',
  'cloud ticketing',
  'digital event platform',
  'best online ticketing platform',
  'sell event tickets online',
  'create an event online',
  'online event registration',
  'QR code event ticketing',
] as const;

/** Curated meta keywords (keep focused — Google largely ignores huge keyword dumps). */
export const META_KEYWORDS: string[] = [
  ...HOMEPAGE_FOCUS_KEYWORDS,
  ...BRAND_KEYWORDS,
  ...LOCAL_SEO_KEYWORDS.slice(0, 16),
  ...PRIMARY_TICKETING_KEYWORDS.slice(0, 12),
  ...CATEGORY_KEYWORDS.slice(0, 14),
  ...PLATFORM_KEYWORDS.slice(0, 10),
];

/** Topics for Organization `knowsAbout` structured data. */
export const KNOWS_ABOUT_TOPICS: string[] = [
  ...HOMEPAGE_FOCUS_KEYWORDS,
  ...LOCAL_SEO_KEYWORDS,
  ...CATEGORY_KEYWORDS,
  ...PLATFORM_KEYWORDS.slice(0, 12),
  'mobile money payments',
  'Visa payments',
  'secure online ticketing',
  'digital ticketing platform',
];

/** Cities / regions for areaServed enrichment. */
export const SERVICE_AREAS = [
  { type: 'Country' as const, name: 'Uganda' },
  { type: 'Country' as const, name: 'Kenya' },
  { type: 'Country' as const, name: 'Rwanda' },
  { type: 'Country' as const, name: 'Tanzania' },
  { type: 'City' as const, name: 'Kampala' },
  { type: 'City' as const, name: 'Entebbe' },
  { type: 'City' as const, name: 'Jinja' },
  { type: 'City' as const, name: 'Mbarara' },
  { type: 'City' as const, name: 'Gulu' },
  { type: 'City' as const, name: 'Fort Portal' },
];

/** Homepage feature chips — readable copy mapped to focus keywords. */
export const HOMEPAGE_SEO_PILLARS: Array<{ title: string; body: string; href: string }> = [
  {
    title: 'Online ticketing platform',
    body: 'Buy tickets online or sell tickets online with digital e-tickets, QR code ticketing, and secure checkout.',
    href: '/events',
  },
  {
    title: 'Concerts, festivals & sports',
    body: 'Concert tickets, festival tickets, football tickets, and entertainment events across Uganda and East Africa.',
    href: '/events?category=concert',
  },
  {
    title: 'Tours & adventure booking',
    body: 'Tour booking, safari tickets, adventure booking, and tourism ticketing for Uganda experiences.',
    href: '/events?category=other',
  },
  {
    title: 'Conferences & registration',
    body: 'Conference registration, event registration, corporate events, and campus or church event ticketing.',
    href: '/events',
  },
  {
    title: 'Organizer event management',
    body: 'Create an event online, manage ticket sales, event check-in, and ticket verification with QR scanners.',
    href: '/organizer/dashboard/create',
  },
  {
    title: 'Affiliate ticket sales',
    body: 'Grow reach with Ticket95 affiliate ticket sales, event ambassadors, and referral commissions.',
    href: '/profile/affiliate',
  },
];

export const DEFAULT_SEO_DESCRIPTION =
  'Ticket95 (Ticket 95) is Uganda’s online ticketing platform for event ticketing — buy tickets online for concerts, festivals, sports, conferences, safari and adventure booking. Sell tickets online with QR code ticketing, event check-in, and affiliate ticket sales. Kampala events and Uganda tourism experiences. Call +256 750 225 159.';

export const DEFAULT_SEO_TITLE =
  'Ticket95 — Online Ticketing Platform for Uganda Events | Ticket 95';

export const EVENTS_LISTING_DESCRIPTION =
  'Browse Uganda events and buy tickets online on Ticket95 — concert tickets, festival tickets, sports events, conference registration, movie tickets, and tourism experiences in Kampala, Entebbe, Jinja, and across East Africa.';

export function uniqueKeywords(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const key = raw.trim();
    if (!key) continue;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(key);
  }
  return out;
}
