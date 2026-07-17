'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock3, MapPin, Star, Ticket } from 'lucide-react';
import type { Event } from '@/lib/supabase-client';
import dynamic from 'next/dynamic';

const TicketPurchaseDialog = dynamic(
  () => import('@/components/events/ticket-purchase-dialog').then(mod => mod.TicketPurchaseDialog),
  { ssr: false }
);

interface FeaturedCarouselProps {
  events: Event[];
}

// Format date consistently
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatCurrencyAmount(currency: string | undefined, amount: number) {
  const safeCurrency = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${Math.floor(amount).toLocaleString()}`;
  }
}

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) return;

    const interval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [isAutoPlaying, events.length, nextSlide]);

  if (events.length === 0) return null;

  return (
    <>
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Carousel Track */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {events.map((event, index) => (
            <div key={event.id} className="w-full shrink-0">
              <Card
                className="overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-xl transition-shadow duration-300 hover:shadow-2xl"
              >
                <CardContent className="p-0">
                  <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                    {/* Event Image */}
                    <div className="relative h-[320px] overflow-hidden lg:h-[520px]">
                      {event.image_url ? (
                        <Image
                          src={event.image_url}
                          alt={event.name}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-muted/40">
                          <Star className="w-24 h-24 text-muted-foreground opacity-30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Featured Badge */}
                      <div className="absolute left-4 top-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-500/95 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                          <Star className="w-4 h-4 fill-current" />
                          Featured Event
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/45 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                          <Ticket className="h-3.5 w-3.5" />
                          {event.ticket_types && event.ticket_types.length > 0
                            ? `${event.ticket_types.length} ticket type${event.ticket_types.length === 1 ? '' : 's'}`
                            : 'General admission'}
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                          {event.name}
                        </h3>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex flex-col justify-between p-6 lg:p-10">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Hero pick</p>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                          {event.description || 'An amazing event you won\'t want to miss!'}
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Date
                            </p>
                            <p className="mt-1 text-sm font-semibold">{formatEventDate(event.date)}</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              Time
                            </p>
                            <p className="mt-1 text-sm font-semibold">{formatEventTime(event.date)}</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-muted/25 p-3 sm:col-span-2">
                            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              Venue
                            </p>
                            <p className="mt-1 line-clamp-1 text-sm font-semibold">{event.venue}</p>
                          </div>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 text-xs text-muted-foreground">
                          <span className="font-medium">Hosted by</span>
                          <span className="font-semibold text-foreground">{event.organizer_name}</span>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Starts from</p>
                            <p className="mt-1 text-2xl font-bold text-primary">
                              {formatCurrencyAmount(
                                event.currency,
                                event.ticket_types && event.ticket_types.length > 0
                                  ? Math.min(...event.ticket_types.map((ticketType) => ticketType.price || 0))
                                  : event.ticket_price || 0
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Availability</p>
                            <p className="text-sm font-semibold">
                              {Math.max(event.tickets_available || 0, 0).toLocaleString()} / {(event.total_tickets || 0).toLocaleString()} left
                            </p>
                          </div>
                        </div>

                        {event.tickets_available > 0 && event.tickets_available <= 50 ? (
                          <div className="mt-2 inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Limited seats remaining
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <Button
                            onClick={() => setSelectedEvent(event)}
                            className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm sm:text-base"
                            size="lg"
                          >
                            <Ticket className="mr-2 h-4 w-4" />
                            View Tickets
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {events.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border/70 bg-background/90 shadow-md backdrop-blur-sm hover:bg-background"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border/70 bg-background/90 shadow-md backdrop-blur-sm hover:bg-background"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Dots Indicator */}
        {events.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full border border-border/60 bg-background/85 px-2 py-1 shadow-sm backdrop-blur-sm">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`h-2.5 rounded-full transition-all ${index === currentIndex
                  ? 'w-7 bg-primary'
                  : 'w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/60'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ticket Purchase Dialog */}
      {selectedEvent && (
        <TicketPurchaseDialog
          event={selectedEvent}
          onDialogClose={() => setSelectedEvent(null)}
          onPurchaseComplete={() => setSelectedEvent(null)}
          trigger={null}
        />
      )}
    </>
  );
}
