'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  MapPin,
  RefreshCw,
  Ticket,
  XCircle,
} from 'lucide-react';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { takeFreeCheckoutPayload } from '@/lib/checkout-handoff';
import { formatEventDateLong, formatEventTime } from '@/lib/event-display';
import type { Event, Ticket as TicketRecord } from '@/lib/supabase-client';
import { downloadTicketsAsPdfs, downloadTicketAsPdf } from '@/lib/ticket-download';
import { cn } from '@/lib/utils';

type EventSummary = Pick<
  Event,
  | 'id'
  | 'name'
  | 'date'
  | 'venue'
  | 'organizer_name'
  | 'organizer_logo_url'
  | 'image_url'
  | 'image_urls'
  | 'sponsors'
>;

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [isFreeOrder, setIsFreeOrder] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  const autoDownloadStarted = useRef(false);

  const orderId = searchParams.get('orderId') || searchParams.get('OrderMerchantReference') || '';
  const purchaseId =
    searchParams.get('purchaseId') ||
    searchParams.get('orderTrackingId') ||
    searchParams.get('OrderTrackingId') ||
    '';
  const freeCheckout = searchParams.get('freeCheckout') === '1';
  const redirectStatus = (searchParams.get('status') || '').toLowerCase();
  const customerEmailParam = searchParams.get('customerEmail') || '';
  const guestCheckoutParam = searchParams.get('guestCheckout') === '1';

  const verifyEndpoint = useMemo(
    () => (freeCheckout ? null : '/api/payments/paytota/verify'),
    [freeCheckout]
  );

  useEffect(() => {
    let cancelled = false;

    async function applySuccessPayload(ticketData: {
      tickets?: unknown;
      event?: EventSummary | null;
      order?: {
        customerEmail?: string | null;
        isGuest?: boolean;
        isFree?: boolean;
      };
    }) {
      if (cancelled) return;
      const loadedTickets = Array.isArray(ticketData.tickets)
        ? (ticketData.tickets as TicketRecord[])
        : [];
      setTickets(loadedTickets);
      setEvent(ticketData?.event || null);
      setCustomerEmail(ticketData?.order?.customerEmail || customerEmailParam || null);
      setIsGuestCheckout(Boolean(ticketData?.order?.isGuest || guestCheckoutParam));
      setIsFreeOrder(Boolean(freeCheckout || ticketData?.order?.isFree));
      setStatus('success');
      setMessage(
        freeCheckout || ticketData?.order?.isFree
          ? 'Your free tickets are ready. Download should start automatically.'
          : 'Payment successful. Your tickets are ready.'
      );
    }

    async function run() {
      if (!orderId) {
        setStatus('failed');
        setMessage('Missing order reference in payment callback.');
        return;
      }

      if (redirectStatus === 'failed' || redirectStatus === 'cancelled') {
        setStatus('failed');
        setMessage(
          redirectStatus === 'cancelled'
            ? 'Payment was cancelled. You can try again from the event page.'
            : 'Payment was not completed. Please try again.'
        );
        return;
      }

      try {
        if (freeCheckout) {
          const stashed = takeFreeCheckoutPayload(orderId);
          if (stashed?.tickets?.length) {
            await applySuccessPayload({
              tickets: stashed.tickets,
              event: stashed.event as EventSummary | null,
              order: {
                customerEmail: stashed.order?.customerEmail ?? customerEmailParam,
                isGuest: stashed.order?.isGuest ?? guestCheckoutParam,
                isFree: true,
              },
            });
            return;
          }
        }

        if (verifyEndpoint) {
          const res = await fetch(verifyEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              purchaseId: purchaseId || undefined,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (res.status === 409) {
              setStatus('pending');
              setMessage('Payment is still processing. Please refresh in a moment.');
              return;
            }
            throw new Error(data?.error || 'Payment verification failed');
          }

          if (Array.isArray(data.tickets) && data.tickets.length > 0) {
            await applySuccessPayload(data);
            return;
          }
        }

        const ticketRes = await fetch(
          `/api/payments/tickets?orderId=${encodeURIComponent(orderId)}${
            purchaseId ? `&orderTrackingId=${encodeURIComponent(purchaseId)}` : ''
          }${freeCheckout ? '&freeCheckout=1' : ''}`
        );
        const ticketData = await ticketRes.json().catch(() => ({}));

        if (!ticketRes.ok) {
          throw new Error(ticketData?.error || 'Could not load tickets');
        }

        await applySuccessPayload(ticketData);
      } catch (error: unknown) {
        if (cancelled) return;
        setStatus('failed');
        setMessage(
          error instanceof Error ? error.message : 'Something went wrong while verifying payment.'
        );
      }
    }

    if (freeCheckout) {
      setMessage('Confirming your free tickets...');
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [
    orderId,
    purchaseId,
    verifyEndpoint,
    freeCheckout,
    redirectStatus,
    customerEmailParam,
    guestCheckoutParam,
  ]);

  useEffect(() => {
    if (status !== 'success' || !isFreeOrder || tickets.length === 0 || autoDownloadStarted.current) {
      return;
    }

    autoDownloadStarted.current = true;
    setDownloading(true);

    downloadTicketsAsPdfs(tickets, event)
      .then(() => {
        setMessage('Your free tickets have been downloaded.');
      })
      .catch((error) => {
        console.error('Auto-download failed:', error);
        setMessage(
          'Your free tickets are ready. Use the download buttons below if the file did not save.'
        );
      })
      .finally(() => {
        setDownloading(false);
      });
  }, [status, isFreeOrder, tickets, event]);

  const handleDownloadAll = async () => {
    if (!tickets.length) return;
    setDownloading(true);
    try {
      await downloadTicketsAsPdfs(tickets, event);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadOne = async (ticket: TicketRecord) => {
    setDownloadingTicketId(ticket.id);
    try {
      await downloadTicketAsPdf(ticket, event);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  const headline =
    status === 'loading'
      ? isFreeOrder || freeCheckout
        ? 'Confirming tickets'
        : 'Processing payment'
      : status === 'pending'
        ? 'Payment pending'
        : status === 'success'
          ? isFreeOrder
            ? 'Free tickets confirmed'
            : 'You’re all set'
          : isFreeOrder
            ? 'Ticket issue'
            : 'Payment issue';

  const eventName = event?.name || tickets[0]?.event_name;
  const venue = event?.venue;
  const eventDate = event?.date;

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <HeaderClient />

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(154,123,47,0.10),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(15,23,42,0.05),_transparent_40%)]"
        />

        {/* Hero band */}
        <section className="relative overflow-hidden border-b border-white/5 bg-[#0a0e1a] text-white">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#9A7B2F] via-[#d4b46a] to-[#9A7B2F]" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#9A7B2F]/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#d4b46a]/10 blur-2xl"
          />

          <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} busy={downloading && status === 'success'} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b46a]">
                    Ticket95 · Checkout
                  </p>
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{headline}</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  {message}
                </p>
                {customerEmail && status === 'success' ? (
                  <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300">
                    Confirmation for{' '}
                    <span className="ml-1 font-medium text-white">{customerEmail}</span>
                  </p>
                ) : null}
              </div>

              {orderId ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Order reference
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#d4b46a]">
                    {shortId(orderId)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Page body */}
        <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="space-y-8">
              {status === 'success' && (eventName || venue || eventDate) ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Event details
                  </p>
                  {eventName ? (
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {eventName}
                    </h2>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
                    {eventDate ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-[#9A7B2F]" />
                        {formatEventDateLong(eventDate)} · {formatEventTime(eventDate)}
                      </span>
                    ) : null}
                    {venue ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-[#9A7B2F]" />
                        <span className="truncate">{venue}</span>
                      </span>
                    ) : null}
                  </div>
                  {event?.organizer_name ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Organized by{' '}
                      <span className="font-medium text-slate-800">{event.organizer_name}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {status === 'loading' || status === 'pending' ? (
                <div className="space-y-4">
                  <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                  {status === 'pending' ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh status
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {status === 'success' && tickets.length > 0 ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Your tickets
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {tickets.length} ticket{tickets.length === 1 ? '' : 's'} ready to download
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloading || downloadingTicketId !== null}
                      className="h-10 rounded-xl bg-[#0a0e1a] px-4 font-semibold hover:bg-[#151b2e]"
                    >
                      {downloading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {downloading ? 'Downloading…' : 'Download all'}
                    </Button>
                  </div>

                  <ul className="divide-y divide-slate-200/80 border-y border-slate-200/80">
                    {tickets.map((ticket, index) => {
                      const isThisDownloading = downloadingTicketId === ticket.id;
                      return (
                        <li
                          key={ticket.id}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0a0e1a] text-[#d4b46a]">
                              <Ticket className="h-4 w-4" />
                              <span className="mt-0.5 text-[10px] font-bold tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {ticket.ticket_type_name || 'General admission'}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-slate-500">
                                #{shortId(ticket.id)}
                                <span className="mx-1.5 text-slate-300">·</span>
                                <span className="capitalize">{ticket.status || 'valid'}</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={downloading || downloadingTicketId !== null}
                            onClick={() => handleDownloadOne(ticket)}
                            className="h-9 shrink-0 rounded-lg border-slate-200 self-start sm:self-auto"
                          >
                            {isThisDownloading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Download PDF
                          </Button>
                        </li>
                      );
                    })}
                  </ul>

                  {isGuestCheckout ? (
                    <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950/80">
                      Keep this page or your PDF downloads — guest tickets aren’t saved to an
                      account. Create an account with{' '}
                      <span className="font-medium">{customerEmail || 'the same email'}</span> later
                      to sync them.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {status === 'success' && tickets.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Payment went through, but tickets aren’t showing yet. Refresh in a moment or
                    check your email.
                  </p>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    <Button asChild className="h-11 rounded-xl bg-[#0a0e1a] hover:bg-[#151b2e]">
                      <Link href={isGuestCheckout ? '/events' : '/profile/tickets'}>
                        {isGuestCheckout ? 'Browse events' : 'Go to my tickets'}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              {status === 'failed' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    No charge is confirmed for this attempt. You can return to events and try again.
                  </p>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button asChild className="h-11 rounded-xl bg-[#0a0e1a] hover:bg-[#151b2e]">
                      <Link href="/events">
                        Return to events
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200">
                      <Link href="/">Home</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Side actions / next steps */}
            <aside className="lg:pt-1">
              <div className="sticky top-24 space-y-5 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Next steps
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                    {status === 'success'
                      ? 'Save your tickets'
                      : status === 'failed'
                        ? 'Try again'
                        : 'Hang tight'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {status === 'success'
                      ? 'Download your PDFs now and keep them handy for entry. Present the QR code at the door.'
                      : status === 'failed'
                        ? 'You can go back to events and complete checkout whenever you’re ready.'
                        : 'We’re confirming your order. This usually only takes a few seconds.'}
                  </p>
                </div>

                {status === 'success' ? (
                  <div className="flex flex-col gap-2.5">
                    <Button
                      asChild
                      className="h-11 rounded-xl bg-[#0a0e1a] font-semibold hover:bg-[#151b2e]"
                    >
                      <Link href={isGuestCheckout ? '/events' : '/profile/tickets'}>
                        {isGuestCheckout ? 'Browse more events' : 'View my tickets'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    {!isGuestCheckout ? (
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-xl border-slate-200"
                      >
                        <Link href="/events">Back to events</Link>
                      </Button>
                    ) : null}
                    {event?.id ? (
                      <Button asChild variant="ghost" className="h-10 rounded-xl text-slate-600">
                        <Link href={`/events/${event.id}`}>View event page</Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {status === 'failed' ? (
                  <div className="flex flex-col gap-2.5">
                    <Button asChild className="h-11 rounded-xl bg-[#0a0e1a] hover:bg-[#151b2e]">
                      <Link href="/events">Browse events</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-xl">
                      <Link href="/">Go home</Link>
                    </Button>
                  </div>
                ) : null}

                {(status === 'loading' || status === 'pending') && orderId ? (
                  <p className="text-xs tabular-nums text-slate-400">
                    Ref · {shortId(orderId)}
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatusIcon({
  status,
  busy,
}: {
  status: 'loading' | 'success' | 'failed' | 'pending';
  busy?: boolean;
}) {
  const wrapping = cn(
    'flex h-12 w-12 items-center justify-center rounded-full border',
    status === 'success' && !busy && 'border-emerald-400/40 bg-emerald-500/15',
    status === 'failed' && 'border-red-400/40 bg-red-500/15',
    (status === 'loading' || status === 'pending' || busy) &&
      'border-[#c4a45a]/35 bg-[#9A7B2F]/15'
  );

  return (
    <div className={wrapping}>
      {status === 'loading' || status === 'pending' || busy ? (
        <Loader2 className="h-6 w-6 animate-spin text-[#c4a45a]" />
      ) : status === 'success' ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      ) : (
        <XCircle className="h-6 w-6 text-red-400" />
      )}
    </div>
  );
}

function PaymentCompleteFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <HeaderClient />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#c4a45a]/35 bg-[#0a0e1a]">
            <Loader2 className="h-7 w-7 animate-spin text-[#c4a45a]" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7B2F]">
            Ticket95
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Processing</h1>
          <p className="mt-2 text-sm text-slate-500">Please wait…</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<PaymentCompleteFallback />}>
      <PaymentCompleteContent />
    </Suspense>
  );
}
