'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Phone, Ticket, Wallet } from 'lucide-react';
import { formatEventDateTime } from '@/lib/event-display';

interface EventApprovalCardProps {
  event: {
    id: string;
    name: string;
    description: string;
    date: string;
    venue: string;
    image_url?: string;
    total_tickets: number;
    ticket_price?: number;
    organizer_name: string;
    organizer_phone?: string;
    status: string;
    created_at: string;
  };
  onApprove: () => void;
}

export function EventApprovalCard({ event, onApprove }: EventApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, note }),
      });

      if (response.ok) {
        toast({
          title: 'Event approved',
          description: 'The listing is now visible in the public marketplace.',
        });
        onApprove();
      } else {
        const errorData = await response.json();
        console.error('Approval failed:', errorData);
        toast({
          title: 'Approval failed',
          description: errorData.error || 'Unable to approve this event right now.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval failed',
        description: 'An unexpected error occurred while approving the event.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, note }),
      });

      if (response.ok) {
        toast({
          title: 'Event rejected',
          description: 'The organizer status has been updated successfully.',
        });
        onApprove();
      } else {
        const errorData = await response.json();
        console.error('Rejection failed:', errorData);
        toast({
          title: 'Rejection failed',
          description: errorData.error || 'Unable to reject this event right now.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Rejection failed',
        description: 'An unexpected error occurred while rejecting the event.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const price = event.ticket_price ?? 0;

  return (
    <Card className="overflow-hidden border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
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
              <CardTitle className="line-clamp-2 text-base sm:text-lg">{event.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {event.organizer_name}
              </CardDescription>
              {event.organizer_phone ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {event.organizer_phone}
                </p>
              ) : null}
            </div>
          </div>
          <Badge variant="outline" className="w-fit rounded-full border-amber-500/40 bg-amber-500/10 text-[10px] uppercase tracking-wide text-amber-800">
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-2 text-xs sm:grid-cols-2 sm:gap-3 sm:text-sm lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="mb-1 inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Date</p>
            <p className="font-medium">{formatEventDateTime(event.date)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="mb-1 inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Venue</p>
            <p className="font-medium">{event.venue}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="mb-1 inline-flex items-center gap-1 text-muted-foreground"><Ticket className="h-3.5 w-3.5" />Total tickets</p>
            <p className="font-medium">{event.total_tickets}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="mb-1 inline-flex items-center gap-1 text-muted-foreground"><Wallet className="h-3.5 w-3.5" />Price</p>
            <p className="font-medium">
              {price > 0 ? `$${price.toFixed(2)}` : 'Not set'}
            </p>
          </div>
        </div>

        {event.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed sm:text-sm">{event.description}</p>
          </div>
        )}

        <div className="space-y-2 border-t border-border/70 pt-4">
          <Textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button onClick={handleApprove} disabled={loading} className="flex-1 rounded-xl">
            {loading ? '…' : 'Approve'}
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            className="flex-1 rounded-xl"
          >
            {loading ? '…' : 'Reject'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
