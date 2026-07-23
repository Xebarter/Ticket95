'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getEventById } from '@/lib/supabase-db';
import type { Event, Ticket } from '@/lib/supabase-client';
import { getEventImages } from '@/lib/event-display';
import { useProfileData } from '../use-profile-data';
import { downloadTicketAsPdf } from '@/lib/ticket-download';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Download,
  ExternalLink,
  MapPin,
  QrCode,
  Ticket as TicketIcon,
} from 'lucide-react';
import {
  ProfileEmptyState,
  ProfileFilterChips,
  ProfileLoadingState,
  ProfilePageHeader,
} from '@/components/profile/profile-ui';

type FilterKey = 'upcoming' | 'used' | 'other' | 'all';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

function statusLabel(status: Ticket['status']) {
  if (status === 'valid') return 'Ready';
  if (status === 'used') return 'Used';
  if (status === 'expired') return 'Expired';
  return 'Refunded';
}

function statusClass(status: Ticket['status']) {
  if (status === 'valid') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800';
  if (status === 'used') return 'border-slate-400/40 bg-slate-500/10 text-slate-700';
  if (status === 'expired') return 'border-amber-500/30 bg-amber-500/10 text-amber-900';
  return 'border-red-500/30 bg-red-500/10 text-red-800';
}

export default function ProfileTicketsPage() {
  const { loading, myTickets } = useProfileData();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [filterReady, setFilterReady] = useState(false);
  const [eventsById, setEventsById] = useState<Record<string, Event | null>>({});
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTicketQrSrc, setSelectedTicketQrSrc] = useState('');
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);

  const buckets = useMemo(() => {
    const upcoming = myTickets.filter((ticket) => ticket.status === 'valid');
    const used = myTickets.filter((ticket) => ticket.status === 'used');
    const other = myTickets.filter(
      (ticket) => ticket.status === 'expired' || ticket.status === 'refunded'
    );
    return { upcoming, used, other };
  }, [myTickets]);

  useEffect(() => {
    if (loading || filterReady) return;
    setFilter(buckets.upcoming.length > 0 ? 'upcoming' : 'all');
    setFilterReady(true);
  }, [loading, filterReady, buckets.upcoming.length]);

  const visibleTickets = useMemo(() => {
    if (filter === 'upcoming') return buckets.upcoming;
    if (filter === 'used') return buckets.used;
    if (filter === 'other') return buckets.other;
    return myTickets;
  }, [buckets, filter, myTickets]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { eventId: string; eventName: string; organizerName: string; tickets: Ticket[] }
    >();

    for (const ticket of visibleTickets) {
      const existing = map.get(ticket.event_id);
      if (existing) {
        existing.tickets.push(ticket);
      } else {
        map.set(ticket.event_id, {
          eventId: ticket.event_id,
          eventName: ticket.event_name,
          organizerName: ticket.organizer_name,
          tickets: [ticket],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aReady = a.tickets.some((t) => t.status === 'valid') ? 0 : 1;
      const bReady = b.tickets.some((t) => t.status === 'valid') ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;
      return a.eventName.localeCompare(b.eventName);
    });
  }, [visibleTickets]);

  useEffect(() => {
    const ids = [...new Set(myTickets.map((ticket) => ticket.event_id))];
    if (ids.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const event = await getEventById(id);
            return [id, event] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (cancelled) return;
      setEventsById(Object.fromEntries(entries));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [myTickets]);

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (ticket.qr_code?.startsWith('data:image/')) {
      setSelectedTicketQrSrc(ticket.qr_code);
    } else {
      try {
        const qrDataUrl = await QRCode.toDataURL(ticket.qr_code || 'ticket', {
          margin: 2,
          width: 400,
          errorCorrectionLevel: 'H',
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setSelectedTicketQrSrc(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate ticket QR image:', error);
        setSelectedTicketQrSrc('');
      }
    }

    if (!eventsById[ticket.event_id]) {
      try {
        const event = await getEventById(ticket.event_id);
        setEventsById((prev) => ({ ...prev, [ticket.event_id]: event }));
      } catch (error) {
        console.error('Failed to fetch ticket event details:', error);
      }
    }
  };

  const handleDownloadTicket = async (ticket: Ticket) => {
    if (ticket.status !== 'valid') return;
    setDownloadingTicketId(ticket.id);
    try {
      const event = eventsById[ticket.event_id] || (await getEventById(ticket.event_id));
      if (!event) throw new Error('Event not found');
      await downloadTicketAsPdf(ticket, event);
    } catch (error) {
      console.error('Failed to download ticket PDF:', error);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  if (loading) {
    return <ProfileLoadingState label="Loading tickets…" />;
  }

  const selectedEvent = selectedTicket ? eventsById[selectedTicket.event_id] : null;

  return (
    <div className="space-y-5">
      <ProfilePageHeader
        title="My tickets"
        description={
          myTickets.length === 0
            ? 'Your entry passes will appear here after purchase.'
            : buckets.upcoming.length > 0
              ? `${buckets.upcoming.length} ready for entry`
              : `${myTickets.length} ticket${myTickets.length === 1 ? '' : 's'} in your wallet`
        }
      />

      {myTickets.length === 0 ? (
        <ProfileEmptyState
          icon={TicketIcon}
          title="No tickets yet"
          description="Browse events and buy tickets. Your QR codes and downloads will show up here."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/events">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ProfileFilterChips
            value={filter}
            onChange={setFilter}
            items={[
              { key: 'upcoming', label: 'Ready', count: buckets.upcoming.length },
              { key: 'used', label: 'Used', count: buckets.used.length },
              { key: 'other', label: 'Inactive', count: buckets.other.length },
              { key: 'all', label: 'All', count: myTickets.length },
            ]}
          />

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Nothing in this list</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => setFilter('all')}
              >
                Show all tickets
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => {
                const event = eventsById[group.eventId];
                return (
                  <section key={group.eventId} className="space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight">
                          {group.eventName}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{group.organizerName}</span>
                          {event?.date ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateTime(event.date)}
                            </span>
                          ) : null}
                          {event?.venue ? (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="h-8 self-start rounded-xl px-2.5">
                        <Link href={`/events/${group.eventId}`}>
                          Event details
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {group.tickets.map((ticket) => {
                        const canDownload = ticket.status === 'valid';
                        const isDownloading = downloadingTicketId === ticket.id;
                        const eventImage = event ? getEventImages(event)[0] : undefined;
                        return (
                          <div
                            key={ticket.id}
                            className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                                {eventImage ? (
                                  <Image
                                    src={eventImage}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="72px"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <TicketIcon className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn('rounded-full text-[10px]', statusClass(ticket.status))}
                                  >
                                    {statusLabel(ticket.status)}
                                  </Badge>
                                  {ticket.ticket_type_name ? (
                                    <span className="text-sm font-medium">{ticket.ticket_type_name}</span>
                                  ) : (
                                    <span className="text-sm font-medium">General admission</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  #{shortId(ticket.id)}
                                  <span className="mx-1.5 text-border">·</span>
                                  Bought {formatDate(ticket.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:pl-0 pl-[4.75rem]">
                              <Button
                                size="sm"
                                className="h-9 rounded-xl"
                                onClick={() => void handleViewTicket(ticket)}
                              >
                                <QrCode className="mr-1.5 h-4 w-4" />
                                Show QR
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl"
                                onClick={() => void handleDownloadTicket(ticket)}
                                disabled={!canDownload || isDownloading}
                              >
                                <Download className="mr-1.5 h-4 w-4" />
                                {isDownloading ? 'Preparing…' : 'Download'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
            setSelectedTicketQrSrc('');
          }
        }}
      >
        <DialogContent className="max-w-md gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl">
          {selectedTicket ? (
            <div className="overflow-hidden bg-[#f4f6f9]">
              <div className="relative overflow-hidden bg-[#0a0e1a] px-5 pb-6 pt-5 text-white">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#9A7B2F] via-[#d4b46a] to-[#9A7B2F]" />
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#9A7B2F]/10 blur-2xl" />
                <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-[#d4b46a]/10 blur-xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d4b46a]">
                        Ticket95
                      </p>
                      <span className="h-px w-6 bg-[#9A7B2F]/70" />
                    </div>
                    <DialogTitle className="mt-2.5 pr-0 text-xl font-bold leading-snug tracking-tight text-white">
                      {selectedTicket.event_name}
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-[13px] text-slate-300">
                      Organized by {selectedTicket.organizer_name}
                    </DialogDescription>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-md bg-gradient-to-b from-[#d4b46a] to-[#9A7B2F] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0a0e1a] shadow-sm">
                      Admit one
                    </span>
                    {selectedTicket.organizer_logo_url ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-[#d4b46a]/80 bg-white shadow-md">
                        <img
                          src={selectedTicket.organizer_logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d4b46a]/80 bg-[#1c2438] text-sm font-bold text-[#d4b46a]">
                        {(selectedTicket.organizer_name || 'O').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mt-4 flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0a0e1a]">
                    {selectedTicket.ticket_type_name || 'General admission'}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-[#9A7B2F]/50 to-transparent" />
                </div>
              </div>

              <div className="relative px-5 py-4">
                <div className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#f4f6f9]" />
                <div className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#f4f6f9]" />
                <div className="border-t border-dashed border-slate-300" />
              </div>

              <div className="space-y-4 px-5 pb-5">
                <div className="rounded-2xl border border-[#9A7B2F]/30 bg-white p-4 shadow-sm">
                  {selectedTicketQrSrc ? (
                    <img
                      src={selectedTicketQrSrc}
                      alt="Ticket QR code"
                      className="mx-auto h-52 w-52"
                    />
                  ) : (
                    <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                      QR unavailable
                    </div>
                  )}
                  <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    Scan at entry
                  </p>
                  <p className="text-center font-mono text-sm font-bold text-slate-900">
                    #{shortId(selectedTicket.id)}
                  </p>
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
                  <Detail label="Status" value={statusLabel(selectedTicket.status)} />
                  <Detail
                    label="Type"
                    value={selectedTicket.ticket_type_name || 'General admission'}
                  />
                  {selectedEvent?.date ? (
                    <Detail label="When" value={formatDateTime(selectedEvent.date)} />
                  ) : null}
                  {selectedEvent?.venue ? (
                    <Detail label="Where" value={selectedEvent.venue} />
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <DialogHeader className="px-5 py-4">
              <DialogTitle>Ticket</DialogTitle>
            </DialogHeader>
          )}

          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-5 py-4 sm:justify-between">
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedTicket(null)}>
              Close
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => selectedTicket && void handleDownloadTicket(selectedTicket)}
              disabled={
                !selectedTicket ||
                selectedTicket.status !== 'valid' ||
                downloadingTicketId === selectedTicket.id
              }
            >
              <Download className="mr-1.5 h-4 w-4" />
              {selectedTicket && downloadingTicketId === selectedTicket.id
                ? 'Preparing…'
                : 'Download PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-0.5 font-medium leading-snug', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
