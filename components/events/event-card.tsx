import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import Image from 'next/image';

interface TicketType {
  id: string;
  name: string;
  price: number;
  available_quantity: number;
  total_quantity: number;
  description?: string;
}

interface EventCardProps {
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    currency?: string;
    available_tickets: number;
    total_tickets: number;
    organizer_name: string;
    organizer_logo_url?: string;
    sponsors?: Array<{
      id: string;
      name: string;
      logo_url: string;
    }>;
  };
  ticketTypes?: TicketType[];
  onPurchaseClick: () => void;
}

export function EventCard({ event, ticketTypes = [], onPurchaseClick }: EventCardProps) {
  const eventDate = new Date(event.date);
  const isSoldOut = event.available_tickets === 0;
  const currency = event.currency || 'USD';

  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    const currencies: { [key: string]: string } = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
      'CHF': 'Fr', 'CNY': '¥', 'INR': '₹', 'NGN': '₦', 'ZAR': 'R', 'KES': 'KSh', 'UGX': 'USh'
    };
    return currencies[currencyCode] || currencyCode;
  };

  const currencySymbol = getCurrencySymbol(currency);

  // Calculate price range
  const prices = ticketTypes.map(tt => tt.price).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-3xl font-extrabold leading-tight mb-2 text-primary">{event.name}</CardTitle>
            <CardDescription className="text-base font-medium">by {event.organizer_name}</CardDescription>
          </div>
          {event.organizer_logo_url && (
            <div className="relative w-16 h-16 ml-4 flex-shrink-0">
              <Image
                src={event.organizer_logo_url}
                alt={event.organizer_name}
                fill
                className="object-contain rounded-md"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border-2 border-primary/20 shadow-sm">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide font-bold">Date & Time</p>
            <p className="font-bold text-xl text-primary leading-snug">
              {eventDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="font-bold text-lg text-primary mt-2">
              at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-wide font-semibold mb-1">Venue</p>
            <p className="font-medium">{event.venue}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-wide font-semibold mb-1">Availability</p>
            <p className="font-medium">{event.available_tickets} of {event.total_tickets} tickets available</p>
          </div>

          {/* Ticket Types */}
          {ticketTypes.length > 0 && (
            <div className="text-sm border-t pt-3">
              <p className="text-muted-foreground mb-2">Ticket Types</p>
              <div className="space-y-2">
                {ticketTypes.slice(0, 3).map((ticketType) => (
                  <div key={ticketType.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-medium text-xs">{ticketType.name}</p>
                        {ticketType.description && (
                          <p className="text-xs text-muted-foreground">{ticketType.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{currencySymbol}{ticketType.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticketType.available_quantity > 0 ? `${ticketType.available_quantity} left` : 'Sold out'}
                      </p>
                    </div>
                  </div>
                ))}
                {ticketTypes.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{ticketTypes.length - 3} more types available
                  </p>
                )}
              </div>
            </div>
          )}

          {event.sponsors && event.sponsors.length > 0 && (
            <div className="text-sm border-t pt-3">
              <p className="text-muted-foreground mb-2">Sponsors</p>
              <div className="flex flex-wrap gap-2">
                {event.sponsors.map((sponsor) => (
                  <div key={sponsor.id} className="flex items-center gap-1 bg-secondary rounded-md p-1">
                    {sponsor.logo_url && (
                      <div className="relative w-6 h-6">
                        <Image
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="text-xs font-medium">{sponsor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div>
            {ticketTypes.length > 0 ? (
              <div>
                {minPrice === maxPrice ? (
                  <p className="text-2xl font-bold text-primary">{currencySymbol}{minPrice.toFixed(2)}</p>
                ) : (
                  <p className="text-2xl font-bold text-primary">
                    {currencySymbol}{minPrice.toFixed(2)} - {currencySymbol}{maxPrice.toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {ticketTypes.length} ticket {ticketTypes.length === 1 ? 'type' : 'types'} available
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-muted-foreground">Price TBD</p>
                <p className="text-xs text-muted-foreground">No ticket types set</p>
              </div>
            )}
          </div>
          <Button
            onClick={onPurchaseClick}
            disabled={isSoldOut || ticketTypes.length === 0}
            className="w-32"
          >
            {isSoldOut ? 'Sold Out' : ticketTypes.length === 0 ? 'Not Available' : 'Buy Tickets'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
