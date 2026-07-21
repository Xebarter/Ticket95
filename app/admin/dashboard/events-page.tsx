'use client';

import useSWR from 'swr';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import { getEventLifecycleStatus } from '@/lib/event-status';
import { FeaturedToggle } from '@/components/admin/featured-toggle';

const AdminEventEdit = dynamic(() => import('./event-edit').then((mod) => mod.default), {
  ssr: false,
});

async function fetchEvents() {
  const res = await fetch(
    '/api/admin/events?fields=id,name,description,date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured'
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export default function AdminEventsPage() {
  const { data, error, isLoading, mutate } = useSWR('admin-events', fetchEvents);
  const events = data?.events ?? [];
  const eventsWithLifecycle = events.map((event: any) => ({
    ...event,
    lifecycleStatus: getEventLifecycleStatus(event),
  }));

  const total = eventsWithLifecycle.length;
  const pending = eventsWithLifecycle.filter((e: any) => e.lifecycleStatus === 'pending').length;
  const approved = eventsWithLifecycle.filter((e: any) => e.lifecycleStatus === 'approved').length;
  const rejected = eventsWithLifecycle.filter((e: any) => e.lifecycleStatus === 'rejected').length;
  const expired = eventsWithLifecycle.filter((e: any) => e.lifecycleStatus === 'expired').length;

  if (error) {
    return <p className="text-sm text-destructive">Unable to load events</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/admin/events/create">
            <Calendar className="mr-1.5 h-4 w-4" />
            New
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Total" value={total} />
        <Metric label="Pending" value={pending} />
        <Metric label="Approved" value={approved} />
        <Metric label="Rejected" value={rejected} />
        <Metric label="Expired" value={expired} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">None</p>
      ) : (
        <div className="space-y-2">
          {eventsWithLifecycle.map((event: any) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {event.image_url ? (
                    <Image src={event.image_url} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      {event.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString()} · {event.organizer_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {event.lifecycleStatus}
                    </Badge>
                    {event.is_featured ? (
                      <Badge variant="outline" className="rounded-full text-[10px] text-primary">
                        <Star className="mr-1 h-3 w-3" />
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-center">
                <FeaturedToggle
                  eventId={event.id}
                  isFeatured={!!event.is_featured}
                  onToggle={mutate}
                />
                <Button variant="ghost" size="icon" asChild className="rounded-xl">
                  <Link href={`/events/${event.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <AdminEventEdit event={event} onUpdatedAction={mutate} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
