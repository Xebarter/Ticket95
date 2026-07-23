'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PublicEventCard } from '@/components/events/event-grid-client';
import type { Event } from '@/lib/supabase-client';
import { getEventLifecycleStatus } from '@/lib/event-status';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Eye,
  MapPin,
  Pencil,
  Plus,
  QrCode,
} from 'lucide-react';
import { formatDateTime } from '../helpers';
import { ProfilePageHeader } from '@/components/profile/profile-ui';

type Props = {
  events: Event[];
  event: Event | null;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
};

function statusBadgeVariant(status: string | null) {
  if (status === 'approved') return 'default' as const;
  if (status === 'pending') return 'secondary' as const;
  if (status === 'expired') return 'outline' as const;
  return 'destructive' as const;
}

export function EventManagementHeader({ events, event, selectedEventId, onSelectEvent }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewEvents = useMemo(() => (event ? [event as Event] : []), [event]);
  const lifecycleStatus = event ? getEventLifecycleStatus(event) : null;
  const cover = event?.image_url || event?.image_urls?.[0];

  return (
    <div className="space-y-5">
      <ProfilePageHeader
        title="Events"
        description="Select an event to review sales, buyers, and ticket performance."
        actions={
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/organizer/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New event
            </Link>
          </Button>
        }
      />

      {events.length > 0 ? (
        <div className="space-y-4">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {events.map((listedEvent) => {
              const active = listedEvent.id === selectedEventId;
              const thumb = listedEvent.image_url || listedEvent.image_urls?.[0];
              const status = getEventLifecycleStatus(listedEvent);

              return (
                <button
                  key={listedEvent.id}
                  type="button"
                  onClick={() => onSelectEvent(listedEvent.id)}
                  className={cn(
                    'group flex min-w-[220px] max-w-[260px] shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border/70 bg-background/60 hover:border-primary/30 hover:bg-muted/30'
                  )}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-snug">{listedEvent.name}</p>
                    <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
                      {status} · {formatDateTime(listedEvent.date)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {event ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
              <div className="relative h-36 sm:h-44">
                {cover ? (
                  <Image src={cover} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 800px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                    <Calendar className="h-10 w-10 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant(lifecycleStatus)} className="rounded-full capitalize">
                      {lifecycleStatus}
                    </Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(event.date)}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {event.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20 p-3 sm:p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="mr-1.5 h-4 w-4" />
                  Preview
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href={`/organizer/dashboard/edit/${event.id}`}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl">
                  <Link href={`/profile/verify?event=${event.id}`}>
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Verify tickets
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="rounded-xl">
                  <Link href={`/events/${event.id}`}>Public page</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
    </div>
  );
}
