'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TicketPurchaseDesktopAside,
  TicketPurchaseMobileSection,
  useTicketPurchase,
} from '@/components/events/ticket-purchase-form';
import { getEventCategoryLabel } from '@/lib/event-categories';
import {
  formatDisplayPrice,
  formatEventDateRange,
  formatEventTime,
  getEventImages,
  getStartingPrice,
  isEventSoldOut,
} from '@/lib/event-display';
import type { Event, Sponsor, TicketType } from '@/lib/supabase-client';

export function EventDetailsView({
  event,
  ticketTypes,
  sponsors,
}: {
  event: Event;
  ticketTypes: TicketType[];
  sponsors: Sponsor[];
}) {
  const searchParams = useSearchParams();
  const shouldScrollToTickets = searchParams.get('tickets') === '1';

  const purchase = useTicketPurchase({ event, ticketTypes, sponsors });
  const images = useMemo(() => getEventImages(event), [event]);
  const startingPrice = getStartingPrice(event, ticketTypes);
  const soldOut = isEventSoldOut(event, ticketTypes);
  const available = Math.max(event.tickets_available || 0, 0);
  const lowStock = available > 0 && available <= 50;

  useEffect(() => {
    if (!shouldScrollToTickets || soldOut) return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const targetId = isDesktop ? 'purchase-tickets' : 'purchase-tickets-mobile';
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [shouldScrollToTickets, soldOut]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 rounded-lg px-2 text-slate-600">
            <Link href="/events">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All events
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0 space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              {images.length > 0 ? (
                <div className="relative aspect-[16/9] max-h-[280px] w-full sm:max-h-[320px]">
                  <Image
                    src={images[0]}
                    alt={event.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 720px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                </div>
              ) : (
                <div className="flex aspect-[16/9] max-h-[220px] w-full items-center justify-center bg-slate-800 sm:max-h-[260px]">
                  <Ticket className="h-14 w-14 text-slate-600" />
                </div>
              )}
            </div>

            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {event.category ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7B2F]">
                    {getEventCategoryLabel(event.category)}
                  </p>
                ) : null}
                {lowStock && !soldOut ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    Limited availability
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {event.name}
              </h1>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatEventDateRange(event)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  {formatEventTime(event.date)}
                </span>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{event.venue}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:hidden">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    From
                  </p>
                  <p className="text-xl font-bold tracking-tight text-slate-900">
                    {soldOut ? 'Sold out' : formatDisplayPrice(event.currency, startingPrice)}
                  </p>
                </div>
                {!soldOut ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      <span className="font-medium text-slate-700">{available}</span> tickets left
                    </span>
                  </div>
                ) : null}
              </div>
            </header>

            {!soldOut ? (
              <TicketPurchaseMobileSection purchase={purchase} event={event} />
            ) : null}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">About this event</h2>
              {event.description ? (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-600">
                  {event.description}
                </p>
              ) : (
                <p className="text-slate-500">The organizer has not added a description yet.</p>
              )}
            </section>

            {images.length > 1 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">Gallery</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="200px" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Organizer</h2>
              <div className="mt-3 flex items-start gap-4">
                {event.organizer_logo_url ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Image
                      src={event.organizer_logo_url}
                      alt=""
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-400">
                    {event.organizer_name?.charAt(0) ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{event.organizer_name}</p>
                  {event.organizer_phone ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      {event.organizer_phone}
                    </p>
                  ) : null}
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified on Ticket95
                  </p>
                </div>
              </div>
            </section>

            {sponsors.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Sponsors</h2>
                <div className="flex flex-wrap gap-3">
                  {sponsors.map((sponsor) => (
                    <div
                      key={sponsor.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      {sponsor.logo_url ? (
                        <div className="relative h-8 w-8 overflow-hidden rounded-md bg-slate-50">
                          <Image
                            src={sponsor.logo_url}
                            alt=""
                            fill
                            className="object-contain p-0.5"
                          />
                        </div>
                      ) : null}
                      <span className="text-sm font-medium text-slate-800">{sponsor.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="hidden lg:block">
            {soldOut ? (
              <aside>
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      From
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {formatDisplayPrice(event.currency, startingPrice)}
                    </p>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        Availability
                      </span>
                      <span className="font-medium tabular-nums text-slate-900">Sold out</span>
                    </div>
                  </div>
                  <Button disabled className="h-11 w-full rounded-lg" size="lg">
                    Sold out
                  </Button>
                </div>
              </aside>
            ) : (
              <TicketPurchaseDesktopAside purchase={purchase} event={event} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
