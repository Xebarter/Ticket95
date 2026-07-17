'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TicketDisplayProps {
  ticket: {
    id: string;
    ticket_number: string;
    qr_code: string;
    used: boolean;
    created_at: string;
  };
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    organizer_name: string;
    organizer_logo_url: string;
    sponsors: Array<{
      id: string;
      name: string;
      logo_url: string;
    }>;
  };
  onDownloadPDF: (ticketId: string) => void;
}

export function TicketDisplay({ ticket, event, onDownloadPDF }: TicketDisplayProps) {
  const eventDate = new Date(event.date);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
        {/* Header with organizer info */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">{event.name}</h3>
            <p className="text-sm opacity-90">{event.organizer_name}</p>
          </div>
          {event.organizer_logo_url && (
            <div className="relative w-16 h-16">
              <Image
                src={event.organizer_logo_url}
                alt={event.organizer_name}
                fill
                className="object-contain"
              />
            </div>
          )}
        </div>

        {/* Event details */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/20">
          <div>
            <p className="text-xs opacity-75">DATE & TIME</p>
            <p className="font-semibold">{eventDate.toLocaleDateString()}</p>
            <p className="text-sm">{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">VENUE</p>
            <p className="font-semibold">{event.venue}</p>
          </div>
        </div>

        {/* Ticket number and QR code */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs opacity-75 mb-1">TICKET NUMBER</p>
            <p className="font-mono text-lg font-bold">{ticket.ticket_number}</p>
          </div>
          {ticket.qr_code && (
            <div className="relative w-20 h-20 bg-white p-1 rounded-md">
              <Image
                src={ticket.qr_code}
                alt="QR Code"
                fill
                className="object-contain p-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer with sponsors */}
      {event.sponsors && event.sponsors.length > 0 && (
        <div className="bg-card p-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">SPONSORS</p>
          <div className="flex flex-wrap gap-3">
            {event.sponsors.map((sponsor) => (
              <div key={sponsor.id} className="flex items-center gap-2">
                {sponsor.logo_url && (
                  <div className="relative w-8 h-8">
                    <Image
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="text-xs">{sponsor.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status and actions */}
      <div className="p-4 bg-secondary flex items-center justify-between">
        <div>
          {ticket.used ? (
            <p className="text-sm font-medium text-destructive">Used on {new Date(ticket.created_at).toLocaleDateString()}</p>
          ) : (
            <p className="text-sm font-medium text-green-600">Valid - Not used</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => onDownloadPDF(ticket.id)}
          variant="outline"
        >
          Download PDF
        </Button>
      </div>
    </Card>
  );
}
