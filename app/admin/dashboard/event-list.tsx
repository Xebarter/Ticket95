// Fast event list for admin dashboard
'use client';

import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Suspense, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarX2, CheckCircle2, Clock3, Eye, Star, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { getEventLifecycleStatus } from '@/lib/event-status';
const EventApprovalCard = dynamic(() => import('@/components/admin/event-approval-card').then(mod => mod.EventApprovalCard));
const AdminEventCreate = dynamic(() => import('./event-create').then(mod => mod.default), { ssr: false });
const AdminEventEdit = dynamic(() => import('./event-edit').then(mod => mod.default), { ssr: false });
const FeaturedToggle = dynamic(() => import('@/components/admin/featured-toggle').then(mod => mod.FeaturedToggle), { ssr: false });

async function fetchEvents() {
  const res = await fetch('/api/admin/events?fields=id,name,description,date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured');
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export default function AdminEventList() {
  const { data, error, isLoading, mutate } = useSWR('admin-events', fetchEvents);
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

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">
          Unable to load events right now. Please refresh the dashboard.
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Total: <span className="ml-1 font-semibold text-foreground">{total}</span>
          </Badge>
          <Badge variant="outline" className="rounded-full border-amber-500/30 bg-amber-500/5 px-3 py-1 text-amber-700">
            Pending {pending.length}
          </Badge>
          <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-emerald-700">
            Approved {approved.length}
          </Badge>
          <Badge variant="outline" className="rounded-full border-red-500/30 bg-red-500/5 px-3 py-1 text-red-700">
            Rejected {rejected.length}
          </Badge>
          <Badge variant="outline" className="rounded-full border-slate-500/30 bg-slate-500/5 px-3 py-1 text-slate-700">
            Expired {expired.length}
          </Badge>
        </div>
        <AdminEventCreate onCreatedAction={mutate} />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl border border-border/70 bg-muted/30 p-1">
          <TabsTrigger value="pending" className="rounded-lg text-xs sm:text-sm">
            <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-500" />
            Pending
            <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700">
              {pending.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg text-xs sm:text-sm">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
            Approved
            <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold text-emerald-700">
              {approved.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg text-xs sm:text-sm">
            <XCircle className="mr-1 h-3.5 w-3.5 text-red-500" />
            Rejected
            <span className="ml-1 rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-700">
              {rejected.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="expired" className="rounded-lg text-xs sm:text-sm">
            <CalendarX2 className="mr-1 h-3.5 w-3.5 text-slate-500" />
            Expired
            <span className="ml-1 rounded-full bg-slate-500/15 px-1.5 text-[10px] font-semibold text-slate-700">
              {expired.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
              <span>No events are currently waiting for review.</span>
              <span className="hidden sm:inline">New submissions will appear here automatically.</span>
            </div>
          ) : (
            pending.map((event: any) => (
              <Suspense key={event.id} fallback={<div className="h-24 rounded-lg border bg-card animate-pulse" />}>
                <EventApprovalCard event={event} onApprove={mutate} />
              </Suspense>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
              There are no approved events yet. Approve a pending submission to make it visible publicly.
            </div>
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
                      {event.organizer_name} • {new Date(event.date).toLocaleDateString()} • {event.venue}
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
                    <Link href={`/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview
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
            <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
              No rejected events. Declined submissions will appear here for reference.
            </div>
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
                      {event.organizer_name} • {new Date(event.date).toLocaleDateString()} • {event.venue}
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
                    <Link href={`/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview
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
            <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
              No expired events yet. Past approved events will appear here automatically.
            </div>
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
                      {event.organizer_name} • {new Date(event.date).toLocaleDateString()} • {event.venue}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-500/35 bg-slate-500/15 px-2 py-0.5 text-[11px] text-slate-700">
                      <CalendarX2 className="h-3 w-3" />
                      Expired
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                    <Link href={`/events/${event.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </Link>
                  </Button>
                  <AdminEventEdit event={event} onUpdatedAction={mutate} />
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-4 w-4 text-primary" />
            Keep response times low for pending submissions.
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 text-primary" />
            Feature only high-quality, complete listings.
          </span>
        </div>
      </div>
    </div>
  );
}
