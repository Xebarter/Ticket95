'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Tickets, Calendar, MapPin, ShieldCheck, ArrowRight, Clock3 } from 'lucide-react';
import type { Event } from '@/lib/supabase-client';

const TicketPurchaseDialog = dynamic(
    () => import('@/components/events/ticket-purchase-dialog').then(mod => mod.TicketPurchaseDialog),
    { ssr: false }
);

function formatEventDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatEventTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

interface EventGridProps {
    events: Event[];
}

type PublicEventCardProps = {
    event: Event;
    idx?: number;
    onClick?: () => void;
};

export function PublicEventCard({ event, idx = 0, onClick }: PublicEventCardProps) {
    const ticketCount = ((event as any).ticket_types || []).length;

    return (
        <div
            className={`group h-full flex flex-col ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            } : undefined}
        >
            <Card className="overflow-hidden border-border/70 bg-card transition-all duration-300 h-full flex flex-col shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-0.5">
                <CardContent className="p-0 flex flex-col h-full">
                    <div className="relative aspect-video bg-muted/30 overflow-hidden shrink-0">
                        {event.image_url ? (
                            <Image
                                src={event.image_url}
                                alt={event.name}
                                fill
                                priority={idx < 2}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                {...(idx < 2 ? {} : { loading: 'lazy' })}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted/40">
                                <Tickets className="w-12 h-12 text-muted-foreground opacity-40" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

                        <div className="absolute left-3 top-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm border border-white/25">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Verified Event
                            </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-4">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Hosted by</p>
                            <p className="text-sm font-semibold text-white truncate">{event.organizer_name}</p>
                        </div>
                    </div>

                    <div className="p-5 space-y-4 flex-1 flex flex-col">
                        <div className="space-y-3 flex-1">
                            <h3 className="font-semibold text-xl leading-tight line-clamp-2 min-h-[3.5rem] text-foreground group-hover:text-primary transition-colors">
                                {event.name}
                            </h3>

                            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
                                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>
                                        {formatEventDate(event.date)}
                                    </span>
                                </div>

                                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock3 className="w-4 h-4 text-primary" />
                                    <span>{formatEventTime(event.date)}</span>
                                </div>

                                <div className="inline-flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4 shrink-0 text-primary" />
                                    <span className="truncate">{event.venue}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/70 bg-background p-3 mt-auto">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ticket Availability</p>
                                <p className="text-xs text-muted-foreground">
                                    {ticketCount > 0
                                        ? `${ticketCount} type${ticketCount === 1 ? '' : 's'}`
                                        : 'No types yet'}
                                </p>
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground">
                                {ticketCount > 0
                                    ? 'Secure checkout powered by Ticket95.com.'
                                    : 'This event is listed. Ticket options are coming soon.'}
                            </p>

                            <div className="pointer-events-none mt-3">
                                <div className="w-full h-11 rounded-lg border border-primary/20 bg-primary/95 text-primary-foreground flex items-center justify-center text-sm font-medium gap-2">
                                    <span>{ticketCount > 0 ? 'View Tickets' : 'View Event'}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function EventGridClient({ events }: EventGridProps) {
    const [activeEvent, setActiveEvent] = React.useState<Event | null>(null);
    const [dialogKey, setDialogKey] = React.useState(0);

    // Handle browser back button
    React.useEffect(() => {
        const handlePopState = () => {
            if (activeEvent) {
                setActiveEvent(null);
            }
        };

        if (activeEvent) {
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeEvent]);

    const openEvent = (event: Event) => {
        setDialogKey(prev => prev + 1); // Force re-mount
        setActiveEvent(event);
    };

    const closeDialog = () => {
        setActiveEvent(null);
    };

    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Tickets className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No events available</h3>
                    <p className="text-muted-foreground">Check back soon for upcoming events</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, idx) => {
                    return (
                        <PublicEventCard
                            key={event.id}
                            event={event}
                            idx={idx}
                            onClick={() => openEvent(event)}
                        />
                    );
                })}
            </div>

            {activeEvent && (
                <TicketPurchaseDialog
                    key={dialogKey}
                    event={activeEvent}
                    onPurchaseComplete={closeDialog}
                    trigger={null}
                />
            )}
        </>
    );
}
