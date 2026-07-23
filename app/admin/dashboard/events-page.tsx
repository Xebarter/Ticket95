'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getEventLifecycleStatus, type EventLifecycleStatus } from '@/lib/event-status';
import { FeaturedToggle } from '@/components/admin/featured-toggle';
import type { AdminEventRow } from '@/lib/admin-dashboard-data';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Check,
  CheckCircle2,
  Eye,
  Inbox,
  Loader2,
  MapPin,
  X,
} from 'lucide-react';

const AdminEventEdit = dynamic(() => import('./event-edit').then((mod) => mod.default), {
  ssr: false,
});

type FilterKey = 'pending' | 'approved' | 'rejected' | 'expired' | 'all';

async function fetchEvents() {
  const res = await fetch(
    '/api/admin/events?fields=id,name,description,date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured'
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export default function AdminEventsPage({
  initialEvents = [],
}: {
  initialEvents?: AdminEventRow[];
}) {
  const { data, error, mutate } = useSWR('admin-events', fetchEvents, {
    fallbackData: { events: initialEvents },
    revalidateOnMount: initialEvents.length === 0,
  });
  const events = data?.events ?? [];

  const eventsWithLifecycle = useMemo(
    () =>
      events.map((event: AdminEventRow) => ({
        ...event,
        lifecycleStatus: getEventLifecycleStatus(event) as EventLifecycleStatus,
      })),
    [events]
  );

  const counts = useMemo(() => {
    const next = { pending: 0, approved: 0, rejected: 0, expired: 0, all: eventsWithLifecycle.length };
    for (const event of eventsWithLifecycle) {
      if (event.lifecycleStatus in next) {
        next[event.lifecycleStatus as keyof typeof next] += 1;
      }
    }
    return next;
  }, [eventsWithLifecycle]);

  const [filter, setFilter] = useState<FilterKey>(() =>
    counts.pending > 0 ? 'pending' : 'all'
  );

  const visible = useMemo(() => {
    if (filter === 'all') return eventsWithLifecycle;
    return eventsWithLifecycle.filter((event: any) => event.lifecycleStatus === filter);
  }, [eventsWithLifecycle, filter]);

  if (error && events.length === 0) {
    return <p className="text-sm text-destructive">Unable to load events</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.pending > 0
              ? `${counts.pending} waiting for review`
              : 'Queue is clear — nothing pending'}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/admin/events/create">
            <Calendar className="mr-1.5 h-4 w-4" />
            New
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'expired', label: 'Expired' },
            { key: 'all', label: 'All' },
          ] as const
        ).map((item) => {
          const active = filter === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                item.key === 'pending' && count > 0 && !active
                  ? 'bg-amber-500/15 text-amber-900 hover:bg-amber-500/25'
                  : null
              )}
            >
              {item.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} onShowAll={() => setFilter('all')} />
      ) : (
        <div className="space-y-2">
          {visible.map((event: any) => (
            <EventRow
              key={event.id}
              event={event}
              allEvents={events}
              mutate={mutate}
              emphasizePending={filter === 'pending' || event.lifecycleStatus === 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter, onShowAll }: { filter: FilterKey; onShowAll: () => void }) {
  if (filter === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="font-medium">All caught up</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          No events waiting for approval. New submissions will show up here.
        </p>
        <Button type="button" variant="ghost" size="sm" className="mt-4 rounded-xl" onClick={onShowAll}>
          Browse all events
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
      <Inbox className="mb-3 h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nothing in this list</p>
    </div>
  );
}

function EventRow({
  event,
  allEvents,
  mutate,
  emphasizePending,
}: {
  event: AdminEventRow & { lifecycleStatus: EventLifecycleStatus };
  allEvents: AdminEventRow[];
  mutate: (
    data?: any,
    opts?: { optimisticData?: any; rollbackOnError?: boolean; revalidate?: boolean }
  ) => Promise<any>;
  emphasizePending: boolean;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const isPending = event.lifecycleStatus === 'pending';
  const dateLabel = new Date(event.date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const refresh = () => mutate();

  const setStatusOptimistic = async (approved: boolean, rejectionNote?: string) => {
    setBusy(approved ? 'approve' : 'reject');
    const nextStatus = approved ? 'approved' : 'rejected';
    const optimisticEvents = allEvents.map((row) =>
      row.id === event.id ? { ...row, status: nextStatus } : row
    );

    try {
      if (approved) setJustApproved(true);

      await mutate(
        async () => {
          const response = await fetch(`/api/admin/events/${event.id}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              approved,
              note: rejectionNote?.trim() || undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Update failed');
          }

          return { events: optimisticEvents };
        },
        {
          optimisticData: { events: optimisticEvents },
          rollbackOnError: true,
          revalidate: true,
        }
      );

      if (approved) {
        toast({
          title: 'Approved',
          description: `${event.name} is live.`,
        });
      } else {
        toast({
          title: 'Rejected',
          description: `${event.name} was sent back.`,
        });
        setRejectOpen(false);
        setNote('');
      }
    } catch (err) {
      setJustApproved(false);
      toast({
        title: approved ? 'Couldn’t approve' : 'Couldn’t reject',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border transition-all duration-300',
        justApproved
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : isPending && emphasizePending
            ? 'border-amber-500/30 bg-amber-500/[0.06]'
            : 'border-border/70 bg-card'
      )}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {event.image_url ? (
              <Image src={event.image_url} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                {event.name?.charAt(0) ?? '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium leading-tight">{event.name}</p>
              <StatusBadge status={justApproved ? 'approved' : event.lifecycleStatus} />
              {event.is_featured ? (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  Featured
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {event.organizer_name}
              {event.organizer_phone ? ` · ${event.organizer_phone}` : ''}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateLabel}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isPending && !justApproved ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl px-4"
                disabled={!!busy}
                onClick={() => setStatusOptimistic(true)}
              >
                {busy === 'approve' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant={rejectOpen ? 'secondary' : 'outline'}
                className="h-9 rounded-xl px-4"
                disabled={!!busy}
                onClick={() => setRejectOpen((open) => !open)}
              >
                <X className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            </>
          ) : null}

          {justApproved ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Live
            </span>
          ) : null}

          {!isPending || justApproved ? (
            <FeaturedToggle
              eventId={event.id}
              isFeatured={!!event.is_featured}
              onToggle={refresh}
            />
          ) : null}

          <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl">
            <Link href={`/admin/events/${event.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View details</span>
            </Link>
          </Button>
          <AdminEventEdit event={event} onUpdatedAction={refresh} />
        </div>
      </div>

      {isPending && rejectOpen && !justApproved ? (
        <div className="space-y-3 border-t border-border/60 bg-background/60 px-3 py-3 sm:px-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for the organizer"
            rows={2}
            disabled={!!busy}
            className="resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              disabled={!!busy}
              onClick={() => {
                setRejectOpen(false);
                setNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-xl"
              disabled={!!busy}
              onClick={() => setStatusOptimistic(false, note)}
            >
              {busy === 'reject' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Confirm reject
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: EventLifecycleStatus }) {
  const styles: Record<EventLifecycleStatus, string> = {
    pending: 'border-amber-500/35 bg-amber-500/10 text-amber-900',
    approved: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800',
    rejected: 'border-red-500/35 bg-red-500/10 text-red-800',
    expired: 'border-slate-500/35 bg-slate-500/10 text-slate-700',
  };

  return (
    <Badge variant="outline" className={cn('rounded-full text-[10px] capitalize', styles[status])}>
      {status}
    </Badge>
  );
}
