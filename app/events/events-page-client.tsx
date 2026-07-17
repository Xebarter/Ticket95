"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { EventGridClient } from '@/components/events/event-grid-client';
import { EventGridSkeleton } from '@/components/events/event-grid-skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter, Calendar, MapPin } from 'lucide-react';
import type { Event } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
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

interface EventsPageClientProps {
  initialEvents: Event[];
  initialSearch: string;
}

export function EventsPageClient({ initialEvents, initialSearch }: EventsPageClientProps) {
  // Events are already loaded server-side - instant display!
  const [events] = useState<Event[]>(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle browser back button for dialog
  useEffect(() => {
    const handlePopState = () => {
      if (selectedEvent) {
        setSelectedEvent(null);
      }
    };

    if (selectedEvent) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedEvent]);

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

  const handleSelectEvent = (event: Event) => {
    setShowSuggestions(false);
    setDialogKey(prev => prev + 1); // Force re-mount
    setSelectedEvent(event);
  };

  const handleCloseDialog = () => {
    setSelectedEvent(null);
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (!query.trim()) {
        setFilteredEvents(events);
        setIsFiltering(false);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();
      const filtered = events.filter(event =>
        event.name.toLowerCase().includes(normalizedQuery) ||
        event.venue.toLowerCase().includes(normalizedQuery) ||
        event.organizer_name.toLowerCase().includes(normalizedQuery) ||
        (event.description && event.description.toLowerCase().includes(normalizedQuery))
      );

      setFilteredEvents(filtered);
      setIsFiltering(false);
    }, 300),
    [events]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  useEffect(() => {
    if (searchQuery) {
      setIsFiltering(true);
    }
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the debounced effect
  };

  return (
    <div className="py-8 sm:py-12 flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Discover Amazing Events
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find concerts, conferences, workshops, and more. Book your tickets today!
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8 relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search events by name, venue, organizer, or description..."
                  className="pl-12 pr-12 py-6 text-lg rounded-xl border-border/40 focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Search events"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                className="px-8 py-6 text-lg font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>

            {/* Search Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    {suggestions.map((event) => (
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

            {/* Search Results Info */}
            {searchQuery && suggestions.length === 0 && (
              <div className="mt-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                  {searchQuery && ` for "${searchQuery}"`}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Filtering State */}
        {isFiltering && <EventGridSkeleton />}

        {/* Events Grid */}
        {!isFiltering && (
          <>
            {filteredEvents.length > 0 ? (
              <EventGridClient events={filteredEvents} />
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto max-w-md">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery ? 'No events found' : 'No events available'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? `We couldn't find any events matching "${searchQuery}". Try adjusting your search terms.`
                      : 'Check back soon for upcoming events.'
                    }
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={handleClearSearch}
                      className="gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Purchase Dialog */}
      {selectedEvent && (
        <TicketPurchaseDialog
          key={selectedEvent.id}
          event={selectedEvent}
          onPurchaseComplete={handleCloseDialog}
          trigger={null}
        />
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}
