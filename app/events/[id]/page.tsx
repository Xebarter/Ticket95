import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getEventById, getSponsorsByEvent, getTicketTypesForEvent } from '@/lib/supabase-db';
import { AffiliateRefCapture } from '@/components/affiliates/affiliate-ref-capture';
import { EventDetailsView } from '@/components/events/event-details-view';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { getEventShareImage, getSiteUrl, toAbsoluteUrl } from '@/lib/site-url';

interface EventPageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function guessImageMime(url: string): string | undefined {
  const path = url.split('?')[0]?.toLowerCase() || '';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return undefined;
}

export async function generateMetadata({ params, searchParams }: EventPageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const ref = firstQueryValue(query.ref).trim();

  const event = await getEventById(resolved.id);

  if (!event || event.status !== 'approved') {
    return { title: 'Event not found | Ticket95' };
  }

  const siteUrl = getSiteUrl();
  const path = `/events/${resolved.id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
  const pageUrl = `${siteUrl}${path}`;
  const description =
    (event.description || '').trim() ||
    `Get tickets for ${event.name} at ${event.venue} on Ticket95.`;
  const shareImage = getEventShareImage(event);
  const ogImages = shareImage
    ? [
        {
          url: shareImage.url,
          secureUrl: shareImage.url.startsWith('https') ? shareImage.url : undefined,
          alt: shareImage.alt,
          type: guessImageMime(shareImage.url),
        },
      ]
    : undefined;

  return {
    title: `${event.name} | Ticket95`,
    description,
    alternates: {
      canonical: toAbsoluteUrl(`/events/${resolved.id}`) || pageUrl,
    },
    openGraph: {
      type: 'website',
      siteName: 'Ticket95',
      title: event.name,
      description,
      url: pageUrl,
      locale: 'en_US',
      images: ogImages,
    },
    twitter: {
      card: shareImage ? 'summary_large_image' : 'summary',
      title: event.name,
      description,
      images: shareImage ? [shareImage.url] : undefined,
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

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <HeaderClient />

      <Suspense fallback={null}>
        <AffiliateRefCapture />
      </Suspense>

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
