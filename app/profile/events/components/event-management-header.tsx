'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PublicEventCard } from '@/components/events/event-grid-client';
import type { Event } from '@/lib/supabase-client';
import { getEventLifecycleStatus } from '@/lib/event-status';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronDown,
  Eye,
  ExternalLink,
  Handshake,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Search,
} from 'lucide-react';
import { formatDateTime } from '../helpers';
import { ProfilePageHeader } from '@/components/profile/profile-ui';
import { EventAffiliateChip, EventAffiliateControl } from './event-affiliate-control';

type StatusFilter = 'all' | 'approved' | 'pending' | 'expired' | 'rejected' | 'affiliates';

type Props = {
  events: Event[];
  event: Event | null;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onEventPatched: (eventId: string, patch: Partial<Event>) => void;
};

function statusLabel(status: string | null) {
  if (status === 'approved') return 'Live';
  if (status === 'pending') return 'Pending';
  if (status === 'expired') return 'Past';
  if (status === 'rejected') return 'Rejected';
  return status || 'Unknown';
}

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Live' },
  { key: 'pending', label: 'Pending' },
  { key: 'expired', label: 'Past' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'affiliates', label: 'Affiliates' },
];

export function EventManagementHeader({
  events,
  event,
  selectedEventId,
  onSelectEvent,
  onEventPatched,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const previewEvents = useMemo(() => (event ? [event as Event] : []), [event]);
  const lifecycleStatus = event ? getEventLifecycleStatus(event) : null;
  const cover = event?.image_url || event?.image_urls?.[0];

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((listed) => {
      if (statusFilter === 'affiliates') {
        if (!listed.affiliates_enabled) return false;
      } else if (statusFilter !== 'all') {
        const status = getEventLifecycleStatus(listed);
        if (status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        listed.name.toLowerCase().includes(q) ||
        listed.venue.toLowerCase().includes(q)
      );
    });
  }, [events, query, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: events.length,
      approved: 0,
      pending: 0,
      expired: 0,
      rejected: 0,
      affiliates: 0,
    };
    for (const listed of events) {
      const status = getEventLifecycleStatus(listed);
      if (status in counts) counts[status as Exclude<StatusFilter, 'all' | 'affiliates'>] += 1;
      if (listed.affiliates_enabled) counts.affiliates += 1;
    }
    return counts;
  }, [events]);

  return (
    <div className="space-y-5">
      <ProfilePageHeader
        title="Events"
        description="Manage sales, buyers, affiliates, and ticket verification."
        actions={
          <Button asChild size="sm" className="h-9 rounded-lg">
            <Link href="/organizer/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New event
            </Link>
          </Button>
        }
      />

      {events.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 sm:p-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or venue"
                  className="h-9 rounded-lg border-border/60 bg-transparent pl-9 shadow-none"
                />
              </div>
              <div className="relative sm:hidden">
                <select
                  value={
                    filteredEvents.some((listed) => listed.id === selectedEventId)
                      ? selectedEventId
                      : filteredEvents[0]?.id || ''
                  }
                  onChange={(e) => onSelectEvent(e.target.value)}
                  disabled={filteredEvents.length === 0}
                  className="h-9 w-full appearance-none rounded-lg border border-border/60 bg-transparent py-1.5 pl-3 pr-9 text-sm font-medium disabled:opacity-60"
                  aria-label="Jump to event"
                >
                  {filteredEvents.length === 0 ? (
                    <option value="">No matching events</option>
                  ) : (
                    filteredEvents.map((listed) => (
                      <option key={listed.id} value={listed.id}>
                        {listed.affiliates_enabled ? '◆ ' : ''}
                        {listed.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
              {FILTERS.filter(
                (filter) =>
                  filter.key === 'all' ||
                  filter.key === 'affiliates' ||
                  filterCounts[filter.key] > 0
              ).map((filter) => {
                const active = statusFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={cn(
                      'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {filter.key === 'affiliates' ? <Handshake className="h-3 w-3" /> : null}
                    {filter.label}
                    <span className="tabular-nums opacity-60">{filterCounts[filter.key]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              No events match your filters.
            </p>
          ) : (
            <div className="-mx-1 hidden gap-2 overflow-x-auto px-1 pb-1 sm:flex">
              {filteredEvents.map((listedEvent) => {
                const active = listedEvent.id === selectedEventId;
                const thumb = listedEvent.image_url || listedEvent.image_urls?.[0];
                const status = getEventLifecycleStatus(listedEvent);

                return (
                  <button
                    key={listedEvent.id}
                    type="button"
                    onClick={() => onSelectEvent(listedEvent.id)}
                    className={cn(
                      'group flex min-w-[240px] max-w-[280px] shrink-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                      active
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                        : 'border-border/70 bg-background hover:border-slate-300 hover:bg-muted/40'
                    )}
                  >
                    <div
                      className={cn(
                        'relative h-11 w-11 shrink-0 overflow-hidden rounded-lg',
                        active ? 'bg-white/10' : 'bg-muted'
                      )}
                    >
                      {thumb ? (
                        <Image src={thumb} alt="" fill className="object-cover" sizes="44px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Calendar
                            className={cn(
                              'h-4 w-4',
                              active ? 'text-white/50' : 'text-muted-foreground'
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold leading-snug">
                          {listedEvent.name}
                        </p>
                        <EventAffiliateChip
                          enabled={listedEvent.affiliates_enabled}
                          onDark={active}
                        />
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-[11px]',
                          active ? 'text-white/65 dark:text-slate-600' : 'text-muted-foreground'
                        )}
                      >
                        {statusLabel(status)} · {formatDateTime(listedEvent.date)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {event ? (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
              <div className="relative h-32 sm:h-44">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 900px"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900">
                    <Calendar className="h-9 w-9 text-white/25" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/20" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm',
                        lifecycleStatus === 'approved'
                          ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-100'
                          : lifecycleStatus === 'pending'
                            ? 'border-amber-400/30 bg-amber-500/20 text-amber-100'
                            : 'border-white/20 bg-white/10 text-white/90'
                      )}
                    >
                      {statusLabel(lifecycleStatus)}
                    </span>
                    {event.affiliates_enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
                        <Handshake className="h-3 w-3" />
                        Affiliates
                      </span>
                    ) : null}
                  </div>
                  <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {event.name}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDateTime(event.date)}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-border/60 p-3 sm:p-4">
                <EventAffiliateControl
                  event={event}
                  onUpdated={(patch) => onEventPatched(event.id, patch)}
                />

                <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <Button asChild size="sm" className="h-9 rounded-lg">
                    <Link href={`/profile/verify?event=${event.id}`}>
                      <QrCode className="mr-1.5 h-4 w-4" />
                      Verify tickets
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
                    <Link href={`/organizer/dashboard/edit/${event.id}`}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit event
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    Preview card
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-9 rounded-lg text-muted-foreground">
                    <Link href={`/events/${event.id}`}>
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Public page
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-[560px] overflow-y-auto border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Public event card preview</DialogTitle>
          {previewEvents.length > 0 ? (
            <div className="rounded-xl bg-background p-4 shadow-xl sm:p-6">
              <div className="mx-auto w-full max-w-[460px]">
                <PublicEventCard event={previewEvents[0]} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
