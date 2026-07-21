'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PublicEventCard } from '@/components/events/event-grid-client';
import type { Event } from '@/lib/supabase-client';
import { getEventLifecycleStatus } from '@/lib/event-status';
import { Calendar, Eye, Plus, QrCode } from 'lucide-react';
import { formatDateTime } from '../helpers';

type Props = {
  events: Event[];
  event: Event | null;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
};

export function EventManagementHeader({ events, event, selectedEventId, onSelectEvent }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewEvents = useMemo(() => (event ? [event as Event] : []), [event]);
  const lifecycleStatus = event ? getEventLifecycleStatus(event) : null;

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/organizer/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New
            </Link>
          </Button>
        </div>

        {events.length > 0 ? (
          <div className="space-y-4">
            <div>
              <Select value={selectedEventId} onValueChange={onSelectEvent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((listedEvent) => (
                    <SelectItem key={listedEvent.id} value={listedEvent.id}>
                      {listedEvent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {event ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      lifecycleStatus === 'approved'
                        ? 'default'
                        : lifecycleStatus === 'pending'
                          ? 'secondary'
                          : lifecycleStatus === 'expired'
                            ? 'outline'
                            : 'destructive'
                    }
                  >
                    {lifecycleStatus}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateTime(event.date)}
                  </span>
                </div>
                <p className="text-lg font-semibold">{event.name}</p>
                <p className="text-sm text-muted-foreground">{event.venue}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPreviewOpen(true)}>
                    <Eye className="mr-1.5 h-4 w-4" />
                    Preview
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href={`/organizer/dashboard/edit/${event.id}`}>Edit</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href={`/profile/verify?event=${event.id}`}>
                      <QrCode className="mr-1.5 h-4 w-4" />
                      Verify
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-[560px] overflow-y-auto border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Public event card preview</DialogTitle>

          {previewEvents.length > 0 ? (
            <div className="bg-background p-4 sm:p-6">
              <div className="mx-auto w-full max-w-[460px]">
                <PublicEventCard event={previewEvents[0]} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
