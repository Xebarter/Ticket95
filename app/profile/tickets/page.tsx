'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getEventById } from '@/lib/supabase-db';
import type { Event, Ticket } from '@/lib/supabase-client';
import { useProfileData } from '../use-profile-data';
import { downloadTicketAsPdf } from '@/lib/ticket-download';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Eye, QrCode, Ticket as TicketIcon } from 'lucide-react';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getTicketBadgeVariant = (status: Ticket['status']) => {
  if (status === 'valid') return 'default';
  if (status === 'used') return 'secondary';
  return 'destructive';
};

export default function ProfileTicketsPage() {
  const { loading, myTickets } = useProfileData();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketEvent, setTicketEvent] = useState<Event | null>(null);
  const [selectedTicketQrSrc, setSelectedTicketQrSrc] = useState<string>('');
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'used' | 'inactive'>('all');

  const ticketsByStatus = useMemo(() => {
    return {
      valid: myTickets.filter((ticket) => ticket.status === 'valid'),
      used: myTickets.filter((ticket) => ticket.status === 'used'),
      inactive: myTickets.filter((ticket) => ticket.status === 'expired' || ticket.status === 'refunded'),
    };
  }, [myTickets]);

  const visibleTickets = useMemo(() => {
    if (activeTab === 'all') return myTickets;
    if (activeTab === 'valid') return ticketsByStatus.valid;
    if (activeTab === 'used') return ticketsByStatus.used;
    return ticketsByStatus.inactive;
  }, [activeTab, myTickets, ticketsByStatus]);

  const uniqueEventsCount = useMemo(() => new Set(myTickets.map((ticket) => ticket.event_id)).size, [myTickets]);

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (ticket.qr_code?.startsWith('data:image/')) {
      setSelectedTicketQrSrc(ticket.qr_code);
    } else {
      try {
        const qrDataUrl = await QRCode.toDataURL(ticket.qr_code || 'ticket', {
          margin: 1,
          width: 300,
        });
        setSelectedTicketQrSrc(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate ticket QR image:', error);
        setSelectedTicketQrSrc('');
      }
    }
    try {
      const event = await getEventById(ticket.event_id);
      setTicketEvent(event);
    } catch (error) {
      console.error('Failed to fetch ticket event details:', error);
      setTicketEvent(null);
    }
  };

  const handleDownloadTicket = async (ticket: Ticket) => {
    if (ticket.status !== 'valid') return;
    setDownloadingTicketId(ticket.id);
    try {
      const event = await getEventById(ticket.event_id);
      await downloadTicketAsPdf(ticket, event);
    } catch (error) {
      console.error('Failed to download ticket PDF:', error);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">My Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View every purchased ticket, open QR codes, and re-download valid tickets as PDFs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {myTickets.length} total
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {uniqueEventsCount} event{uniqueEventsCount === 1 ? '' : 's'}
          </Badge>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Valid</p>
            <p className="mt-1 text-2xl font-semibold">{ticketsByStatus.valid.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Used</p>
            <p className="mt-1 text-2xl font-semibold">{ticketsByStatus.used.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Inactive</p>
            <p className="mt-1 text-2xl font-semibold">{ticketsByStatus.inactive.length}</p>
          </CardContent>
        </Card>
      </div>

      {myTickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <TicketIcon className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">No tickets yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Once you buy tickets they will appear here.</p>
            <Button asChild className="mt-4 rounded-full">
              <Link href="/">Browse events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All ({myTickets.length})</TabsTrigger>
            <TabsTrigger value="valid">Valid ({ticketsByStatus.valid.length})</TabsTrigger>
            <TabsTrigger value="used">Used ({ticketsByStatus.used.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({ticketsByStatus.inactive.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {visibleTickets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No tickets in this category.
                </CardContent>
              </Card>
            ) : (
              visibleTickets.map((ticket) => (
                <Card key={ticket.id} className="border-border/70">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant={getTicketBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                          <span className="text-xs text-muted-foreground">Purchased {formatDate(ticket.created_at)}</span>
                          {ticket.ticket_type_name ? (
                            <Badge variant="outline" className="rounded-full">
                              {ticket.ticket_type_name}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate font-semibold">{ticket.event_name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.organizer_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Ticket ID: {ticket.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="rounded-full" onClick={() => handleViewTicket(ticket)}>
                          <QrCode className="mr-1.5 h-4 w-4" />
                          QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => void handleDownloadTicket(ticket)}
                          disabled={ticket.status !== 'valid' || downloadingTicketId === ticket.id}
                        >
                          <Download className="mr-1.5 h-4 w-4" />
                          {downloadingTicketId === ticket.id ? 'Preparing...' : ticket.status === 'valid' ? 'Re-download PDF' : 'PDF unavailable'}
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="rounded-full">
                          <Link href={`/events/${ticket.event_id}`}>
                            <Eye className="mr-1.5 h-4 w-4" />
                            Event
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
            setTicketEvent(null);
            setSelectedTicketQrSrc('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.event_name || 'Ticket details'}</DialogTitle>
            <DialogDescription>Present this ticket QR code at entry.</DialogDescription>
          </DialogHeader>
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
                {selectedTicketQrSrc ? (
                  <img src={selectedTicketQrSrc} alt="Ticket QR code" className="mx-auto h-56 w-56 rounded-md bg-white p-2" />
                ) : (
                  <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground">
                    QR code unavailable
                  </div>
                )}
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Organizer</p>
                  <p className="font-medium">{selectedTicket.organizer_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedTicket.status}</p>
                </div>
                {ticketEvent ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(ticketEvent.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Venue</p>
                      <p className="font-medium">{ticketEvent.venue}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              Close
            </Button>
            <Button
              onClick={() => selectedTicket && void handleDownloadTicket(selectedTicket)}
              disabled={selectedTicket ? selectedTicket.status !== 'valid' || downloadingTicketId === selectedTicket.id : false}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {selectedTicket && downloadingTicketId === selectedTicket.id
                ? 'Preparing PDF...'
                : selectedTicket?.status === 'valid'
                  ? 'Re-download PDF'
                  : 'PDF unavailable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
