// Fast event list for admin dashboard
'use client';

import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarX2, CheckCircle2, Eye, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { getEventLifecycleStatus } from '@/lib/event-status';
import type { AdminEventRow } from '@/lib/admin-dashboard-data';

function formatAdminEventDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const EventApprovalCard = dynamic(() =>
  import('@/components/admin/event-approval-card').then((mod) => mod.EventApprovalCard)
);
const AdminEventEdit = dynamic(() => import('./event-edit').then((mod) => mod.default), {
  ssr: false,
});
const FeaturedToggle = dynamic(
  () => import('@/components/admin/featured-toggle').then((mod) => mod.FeaturedToggle),
  { ssr: false }
);

async function fetchEvents() {
  const res = await fetch(
    '/api/admin/events?fields=id,name,description,date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured'
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export default function AdminEventList({
  initialEvents = [],
}: {
  initialEvents?: AdminEventRow[];
}) {
  const { data, error, mutate } = useSWR('admin-events', fetchEvents, {
    fallbackData: { events: initialEvents },
    revalidateOnMount: initialEvents.length === 0,
  });
  const events = data?.events ?? [];

  const { pending, approved, rejected, expired } = useMemo(() => {
    const all = events.map((event: any) => ({
      ...event,
      lifecycleStatus: getEventLifecycleStatus(event),
    }));
    return {
      pending: all.filter((e: any) => e.lifecycleStatus === 'pending'),
      approved: all.filter((e: any) => e.lifecycleStatus === 'approved'),
      rejected: all.filter((e: any) => e.lifecycleStatus === 'rejected'),
      expired: all.filter((e: any) => e.lifecycleStatus === 'expired'),
    };
  }, [events]);

  const total = events.length;

  if (error && events.length === 0) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">
          Unable to load events right now. Please refresh the dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-muted-foreground">{total}</p>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/admin/events/create">New event</Link>
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg text-xs sm:text-sm">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg text-xs sm:text-sm">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg text-xs sm:text-sm">
            Rejected ({rejected.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="rounded-lg text-xs sm:text-sm">
            Expired ({expired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">None</p>
          ) : (
            pending.map((event: any) => (
              <EventApprovalCard key={event.id} event={event} onApprove={mutate} />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">None</p>
          ) : (
            approved.map((event: any) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {event.name?.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-medium">{event.name}</div>
                    <div className="text-xs text-muted-foreground sm:text-sm">
                      {event.organizer_name} • {formatAdminEventDate(event.date)} • {event.venue}
                    </div>
                    {event.organizer_phone ? (
                      <div className="text-[11px] text-muted-foreground">Phone: {event.organizer_phone}</div>
                    ) : null}
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <FeaturedToggle eventId={event.id} isFeatured={!!event.is_featured} onToggle={mutate} />
                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                    <Link href={`/admin/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Details
                    </Link>
                  </Button>
                  <AdminEventEdit event={event} onUpdatedAction={mutate} />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">None</p>
          ) : (
            rejected.map((event: any) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/10 to-transparent p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {event.name?.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-medium">{event.name}</div>
                    <div className="text-xs text-muted-foreground sm:text-sm">
                      {event.organizer_name} • {formatAdminEventDate(event.date)} • {event.venue}
                    </div>
                    {event.organizer_phone ? (
                      <div className="text-[11px] text-muted-foreground">Phone: {event.organizer_phone}</div>
                    ) : null}
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[11px] text-red-700">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                    <Link href={`/admin/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Details
                    </Link>
                  </Button>
                  <AdminEventEdit event={event} onUpdatedAction={mutate} />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-4 space-y-3">
          {expired.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">None</p>
          ) : (
            expired.map((event: any) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-500/25 bg-gradient-to-br from-slate-500/10 to-transparent p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {event.name?.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-medium">{event.name}</div>
                    <div className="text-xs text-muted-foreground sm:text-sm">
                      {event.organizer_name} • {formatAdminEventDate(event.date)} • {event.venue}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-500/35 bg-slate-500/15 px-2 py-0.5 text-[11px] text-slate-700">
                      <CalendarX2 className="h-3 w-3" />
                      Expired
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                    <Link href={`/admin/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Details
                    </Link>
                  </Button>
                  <AdminEventEdit event={event} onUpdatedAction={mutate} />
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
