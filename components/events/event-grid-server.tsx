import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ShieldCheck, Tickets } from 'lucide-react';
import type { Event } from '@/lib/supabase-client';

interface EventGridServerProps {
  events: Event[];
}

// A server-rendered grid that simply links to an event details page.  No
// client-side JavaScript is required for the landing page, so the markup can
// be cached easily and hydrates instantly.
export function EventGridServer({ events }: EventGridServerProps) {
  if (events.length === 0) {
    return (
      <div className="py-12 text-center">
        <Tickets className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No events available</h3>
        <p className="text-muted-foreground">Check back soon for upcoming events</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event, idx) => {
        const ticketCount = ((event as any).ticket_types || []).length;

        return (
          <Link key={event.id} href={`/events/${event.id}`} className="group h-full flex flex-col">
            <div className="overflow-hidden border-border/60 bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/60 hover:shadow-xl hover:shadow-primary/5 transition-all h-full flex flex-col">
              <div className="p-0 flex flex-col h-full">
                <div className="relative aspect-video bg-muted/30 overflow-hidden shrink-0">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.name}
                      fill
                      priority={idx < 2}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      {...(idx < 2 ? {} : { loading: 'lazy' })}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-primary/10 via-background to-muted/40">
                      <Tickets className="w-12 h-12 text-muted-foreground opacity-40" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[11px] text-white/85 tracking-wide">Hosted by</p>
                    <p className="text-sm font-semibold text-white truncate">{event.organizer_name}</p>
                  </div>
                </div>

                <div className="p-4 space-y-4 flex-1 flex flex-col">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-lg leading-snug line-clamp-2 min-h-14">{event.name}</h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span className="truncate">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-border/70">•</span>
                      <div className="inline-flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified organizer
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 mt-auto">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ticket Options</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ticketCount > 0
                          ? `${ticketCount} type${ticketCount === 1 ? '' : 's'}`
                          : ''}
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Click to view {ticketCount > 0 ? 'options' : 'tickets'}
                    </p>

                    <div className="pointer-events-none mt-2">
                      <div className="w-full h-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium gap-2">
                        <span>Get Tickets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
