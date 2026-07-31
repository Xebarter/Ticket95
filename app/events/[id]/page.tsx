import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventById, getSponsorsByEvent, getTicketTypesForEvent } from '@/lib/supabase-db';
import { AffiliateRefCapture } from '@/components/affiliates/affiliate-ref-capture';
import { EventDetailsView } from '@/components/events/event-details-view';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/seo/json-ld';
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildEventJsonLd,
  buildEventMetaDescription,
  buildEventTitle,
  truncateMetaDescription,
} from '@/lib/seo';
import { getEventShareImage, toAbsoluteUrl } from '@/lib/site-url';
import { OG_IMAGE_SIZE } from '@/components/seo/brand-og-markup';

interface EventPageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

function guessImageMime(url: string): string | undefined {
  const path = url.split('?')[0]?.toLowerCase() || '';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return undefined;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const event = await getEventById(resolved.id);

  if (!event || event.status !== 'approved') {
    return {
      title: 'Event not found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = toAbsoluteUrl(`/events/${resolved.id}`) || absoluteUrl(`/events/${resolved.id}`);
  const description = buildEventMetaDescription(event);
  const title = buildEventTitle(event);
  const shareImage = getEventShareImage(event);
  // Prefer the event cover directly so social previews show the photo.
  // Same-origin opengraph-image / twitter-image routes also render this cover.
  const coverUrl = shareImage?.url || absoluteUrl(`/events/${resolved.id}/opengraph-image`);
  const ogImages = [
    {
      url: coverUrl,
      secureUrl: coverUrl.startsWith('https') ? coverUrl : undefined,
      alt: shareImage?.alt || event.name,
      type: shareImage ? guessImageMime(shareImage.url) : 'image/png',
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      siteName: 'Ticket95',
      title: event.name,
      description: truncateMetaDescription(description),
      url: canonical,
      locale: 'en_UG',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: truncateMetaDescription(description),
      images: [coverUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const resolved = await Promise.resolve(params);
  const event = await getEventById(resolved.id);

  if (!event || event.status !== 'approved') {
    notFound();
  }

  const [ticketTypes, sponsors] = await Promise.all([
    getTicketTypesForEvent(resolved.id),
    getSponsorsByEvent(resolved.id),
  ]);

  const breadcrumbLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Events', path: '/events' },
    { name: event.name, path: `/events/${event.id}` },
  ]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <JsonLd data={buildEventJsonLd(event, ticketTypes)} />
      <JsonLd data={breadcrumbLd} />
      <HeaderClient />

      <Suspense fallback={null}>
        <AffiliateRefCapture />
      </Suspense>

      <nav
        aria-label="Breadcrumb"
        className="border-b border-slate-200 bg-white"
      >
        <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 py-2.5 text-xs text-slate-500 sm:px-6 lg:px-8">
          <li>
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/events" className="hover:text-slate-800">
              Events
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-slate-800" aria-current="page">
            {event.name}
          </li>
        </ol>
      </nav>

      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-6 aspect-[21/9] animate-pulse rounded-2xl bg-slate-200" />
          </div>
        }
      >
        <EventDetailsView event={event} ticketTypes={ticketTypes} sponsors={sponsors} />
      </Suspense>

      <Footer />
    </main>
  );
}
