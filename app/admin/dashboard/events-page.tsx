'use client';

import useSWR from 'swr';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Edit, Eye, AlertCircle, CheckCircle2, XCircle, Clock3, Star, CalendarX2 } from 'lucide-react';
import Link from 'next/link';
import { getEventLifecycleStatus } from '@/lib/event-status';
import { FeaturedToggle } from '@/components/admin/featured-toggle';

const AdminEventEdit = dynamic(() => import('./event-edit').then(mod => mod.default), { ssr: false });

async function fetchEvents() {
  const res = await fetch('/api/admin/events?fields=id,name,description,date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured');
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
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-5 text-sm text-destructive">
          Error loading events. Please refresh and try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Events management
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Audit every listing, monitor moderation outcomes, and open records for detailed edits.
          </p>
        </div>
        <Link href="/admin/events/create">
          <Button size="sm" className="gap-2 rounded-full px-4 shadow-sm">
            <Calendar className="h-4 w-4" />
            Create event
          </Button>
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Total events</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Pending review</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-emerald-700">{approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-500/25 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-red-700">{rejected}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-500/25 bg-slate-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><CalendarX2 className="h-3.5 w-3.5" />Expired</CardDescription>
            <CardTitle className="text-3xl text-slate-700">{expired}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>All events</CardTitle>
          <CardDescription>
            Open public previews, edit metadata, and keep event listings accurate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No events found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Events will appear here once organizers create them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsWithLifecycle.map((event: any) => (
                <div
                  key={event.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-16 sm:w-16">
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
                        {new Date(event.date).toLocaleDateString()} • {event.organizer_name}
                      </div>
                      {event.organizer_phone ? (
                        <div className="text-[11px] text-muted-foreground">Phone: {event.organizer_phone}</div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            event.lifecycleStatus === 'approved'
                              ? 'default'
                              : event.lifecycleStatus === 'pending'
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {event.lifecycleStatus === 'pending' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {event.lifecycleStatus === 'approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {event.lifecycleStatus === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                          {event.lifecycleStatus === 'expired' && <CalendarX2 className="mr-1 h-3 w-3" />}
                          {event.lifecycleStatus}
                        </Badge>
                        {event.is_featured && (
                          <Badge variant="outline" className="border-primary/30 text-xs text-primary">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <FeaturedToggle eventId={event.id} isFeatured={!!event.is_featured} onToggle={mutate} />
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                      <Link href={`/events/${event.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="inline-flex">
                      <AdminEventEdit event={event} onUpdatedAction={mutate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
