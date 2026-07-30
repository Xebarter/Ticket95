import { BRAND_ICON_PATHS, brandAssetUrl } from '@/lib/brand-assets';
import {
  BRAND_ALTERNATE_NAMES,
  BRAND_AREA_SERVED,
  BRAND_PHONE_E164,
  BRAND_SUPPORT_EMAIL,
} from '@/lib/brand-contact';
import { getEventCategoryLabel } from '@/lib/event-categories';
import { getStartingPrice, isEventSoldOut, isFreePrice } from '@/lib/event-display';
import { getSiteUrl, toAbsoluteUrl, getEventShareImage } from '@/lib/site-url';
import type { Event, TicketType } from '@/lib/supabase-client';
import type { Metadata } from 'next';

export const SITE_NAME = 'Ticket95';
export const DEFAULT_DESCRIPTION =
  'Ticket95 (Ticket 95) is Uganda’s event ticketing platform — buy tickets for concerts, sports, movies, and live events in Kampala and across Uganda. Call +256 750 225 159. Secure checkout and instant e-tickets.';

/** Strip tags and collapse whitespace for meta / JSON-LD text. */
export function plainText(value: string | null | undefined): string {
  return (value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateMetaDescription(value: string, max = 160): string {
  const text = plainText(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(input.path);
  const description = truncateMetaDescription(input.description);
  const imageUrl =
    toAbsoluteUrl(input.image) ||
    absoluteUrl(brandAssetUrl(BRAND_ICON_PATHS.manifest512));

  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: input.type || 'website',
      siteName: SITE_NAME,
      title: input.title,
      description,
      url,
      locale: 'en_UG',
      images: [{ url: imageUrl, alt: input.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      images: [imageUrl],
    },
  };
}

export function buildOrganizationJsonLd() {
  const url = getSiteUrl();
  // Prefer a stable square mark Google can crawl (no cache-bust query for schema).
  const logoUrl = absoluteUrl(BRAND_ICON_PATHS.apple);

  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineBusiness'],
    name: SITE_NAME,
    legalName: 'Ticket95',
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
      contentUrl: logoUrl,
      width: 180,
      height: 180,
      caption: 'Ticket95 logo',
    },
    image: logoUrl,
    description: DEFAULT_DESCRIPTION,
    email: BRAND_SUPPORT_EMAIL,
    telephone: BRAND_PHONE_E164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Mutungo Zone 1, Nakawa',
      addressLocality: 'Kampala',
      addressCountry: 'UG',
    },
    areaServed: [
      { '@type': 'Country', name: BRAND_AREA_SERVED },
      { '@type': 'City', name: 'Kampala' },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: BRAND_PHONE_E164,
        contactType: 'customer support',
        email: BRAND_SUPPORT_EMAIL,
        areaServed: 'UG',
        availableLanguage: ['English'],
        url: absoluteUrl('/contact'),
      },
      {
        '@type': 'ContactPoint',
        telephone: BRAND_PHONE_E164,
        contactType: 'sales',
        areaServed: 'UG',
        availableLanguage: ['English'],
      },
    ],
    knowsAbout: [
      'event tickets Uganda',
      'concert tickets Kampala',
      'sports tickets',
      'online ticketing',
      'e-tickets',
    ],
  };
}

export function buildWebsiteJsonLd() {
  const url = getSiteUrl();
  const logoUrl = absoluteUrl(BRAND_ICON_PATHS.apple);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-UG',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: logoUrl,
      },
      telephone: BRAND_PHONE_E164,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/events?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: plainText(faq.answer),
      },
    })),
  };
}

export function buildEventJsonLd(event: Event, ticketTypes: TicketType[]) {
  const url = absoluteUrl(`/events/${event.id}`);
  const description = truncateMetaDescription(
    event.description ||
      `Get tickets for ${event.name} at ${event.venue} on Ticket95.`,
    300
  );
  const shareImage = getEventShareImage(event);
  const images = [
    shareImage?.url,
    ...(event.image_urls || []).map((src) => toAbsoluteUrl(src)).filter(Boolean),
  ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

  const soldOut = isEventSoldOut(event, ticketTypes);

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: event.venue,
    address: event.venue,
  };
  if (
    typeof event.venue_lat === 'number' &&
    typeof event.venue_lng === 'number' &&
    Number.isFinite(event.venue_lat) &&
    Number.isFinite(event.venue_lng)
  ) {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.venue_lat,
      longitude: event.venue_lng,
    };
  }

  const offers =
    ticketTypes.length > 0
      ? ticketTypes.map((ticket) => ({
          '@type': 'Offer',
          name: ticket.name,
          price: isFreePrice(ticket.price) ? 0 : ticket.price,
          priceCurrency: event.currency || 'UGX',
          availability:
            ticket.available_quantity > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          url,
          validFrom: event.created_at,
        }))
      : [
          {
            '@type': 'Offer',
            name: 'Admission',
            price: isFreePrice(getStartingPrice(event, ticketTypes))
              ? 0
              : getStartingPrice(event, ticketTypes),
            priceCurrency: event.currency || 'UGX',
            availability: soldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url,
            validFrom: event.created_at,
          },
        ];

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description,
    url,
    image: images.length > 0 ? images : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    startDate: event.date,
    endDate: event.end_date || undefined,
    location,
    organizer: {
      '@type': 'Organization',
      name: event.organizer_name || SITE_NAME,
      url: absoluteUrl('/'),
    },
    performer: {
      '@type': 'Organization',
      name: event.organizer_name || SITE_NAME,
    },
    offers,
    category: getEventCategoryLabel(event.category),
    isAccessibleForFree: isFreePrice(getStartingPrice(event, ticketTypes)),
  };
}

export function buildEventMetaDescription(event: Event): string {
  const category = getEventCategoryLabel(event.category);
  const base =
    plainText(event.description) ||
    `Buy tickets for ${event.name}, a ${category.toLowerCase()} event at ${event.venue}.`;
  const withVenue = base.toLowerCase().includes((event.venue || '').toLowerCase())
    ? base
    : `${base} Venue: ${event.venue}.`;
  return truncateMetaDescription(`${withVenue} Get your Ticket95 e-tickets online.`);
}

export function buildEventTitle(event: Event): string {
  const category = getEventCategoryLabel(event.category);
  const venue = (event.venue || '').trim();
  if (venue) return `${event.name} Tickets | ${category} in ${venue}`;
  return `${event.name} Tickets | ${category}`;
}
