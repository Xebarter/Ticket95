"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { EventGridClient } from '@/components/events/event-grid-client';
import type { Event } from '@/lib/supabase-client';
import Image from 'next/image';
import { Calendar, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const TicketPurchaseDialog = dynamic(
  () => import('@/components/events/ticket-purchase-dialog').then(mod => mod.TicketPurchaseDialog),
  { ssr: false }
);

// Format date consistently to avoid hydration mismatches
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

interface HomeClientProps {
  events: Event[];
  featuredEvents: Event[];
}

export function HomeClient({ events, featuredEvents }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return events;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();
    return events.filter(event =>
      event.name.toLowerCase().includes(normalizedQuery) ||
      event.venue.toLowerCase().includes(normalizedQuery) ||
      event.organizer_name.toLowerCase().includes(normalizedQuery) ||
      (event.description && event.description.toLowerCase().includes(normalizedQuery))
    );
  }, [events, searchQuery]);


  // Get top 5 suggestions for the dropdown
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || !showSuggestions) return [];
    return filteredEvents.slice(0, 5);
  }, [filteredEvents, searchQuery, showSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(true);
  };

  const handleSelectEvent = (event: Event) => {
    setShowSuggestions(false);
    setSelectedEvent(event);
  };

  return (
    <>
      {/* Search Bar Section - Below Header */}
      <section className="py-8 sm:py-12 bg-gradient-to-br from-slate-50 to-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Discover Amazing Events
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find concerts, conferences, workshops, and more. Book your tickets today!
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto" ref={searchRef}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search events by name, location, or category..."
                  className="pl-12 pr-12 py-6 text-lg rounded-xl border-border/40 focus-visible:ring-2 focus-visible:ring-primary/30 shadow-lg"
                  aria-label="Search events"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className="px-8 py-6 text-lg font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </form>

            {/* Search Suggestions Dropdown */}
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    {suggestions.map((event, index) => (
                      <button
                        key={event.id}
                        onClick={() => handleSelectEvent(event)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-all text-left group border-b last:border-b-0 cursor-pointer"
                      >
                        {/* Event Image */}
                        <div className="relative w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                          {event.image_url ? (
                            <Image
                              src={event.image_url}
                              alt={event.name}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              sizes="96px"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted/40">
                              <Calendar className="w-6 h-6 text-muted-foreground opacity-40" />
                            </div>
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="truncate">
                                {formatEventDate(event.date)}
                              </span>
                            </div>
                            <span className="text-border/70">•</span>
                            <div className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Hosted by {event.organizer_name}
                          </p>
                        </div>

                        {/* Arrow Icon */}
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Show All Results */}
                  {filteredEvents.length > 5 && (
                    <div className="bg-muted/30 p-3 text-center border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing top 5 of {filteredEvents.length} results
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Events Carousel */}
      {featuredEvents.length > 0 && (
        <section className="py-8 sm:py-12 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FeaturedCarousel events={featuredEvents} />
          </div>
        </section>
      )}

      {/* All Events Grid */}
      <section className="py-12 sm:py-16 flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Available Events'}
            </h2>
            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          <EventGridClient events={filteredEvents} />

          {!searchQuery && filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events available at the moment.</p>
            </div>
          )}

          {searchQuery && filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </section>

      {/* Ticket Purchase Dialog */}
      {selectedEvent && (
        <TicketPurchaseDialog
          event={selectedEvent}
          onPurchaseComplete={() => setSelectedEvent(null)}
          trigger={null}
        />
      )}
    </>
  );
}
