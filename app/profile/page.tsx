'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Plus, QrCode, ScanLine, TrendingUp } from 'lucide-react';
import { useProfileData } from './use-profile-data';
import { getEventLifecycleStatus } from '@/lib/event-status';

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function ProfileOverviewPage() {
  const { loading, totals, myTickets, myEvents } = useProfileData();
  const latestValidTicket = myTickets.find((ticket) => ticket.status === 'valid');
  const newestEvent = myEvents[0];
  const newestEventStatus = newestEvent ? getEventLifecycleStatus(newestEvent) : null;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick snapshot of your tickets, events, and purchases.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Valid Tickets</p>
            <p className="mt-1 text-2xl font-semibold">{totals.validTickets}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Approved Events</p>
            <p className="mt-1 text-2xl font-semibold">{totals.approvedEvents}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total Spent</p>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(totals.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Event Revenue</p>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(totals.estimatedRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/organizer/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              Create event
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/profile/tickets">
              <QrCode className="mr-1.5 h-4 w-4" />
              Open tickets
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/profile/verify">
              <ScanLine className="mr-1.5 h-4 w-4" />
              Verify tickets
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/profile/analytics">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/">
              <Calendar className="mr-1.5 h-4 w-4" />
              Browse events
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Profile workspace pages</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/profile/tickets" className="rounded-xl border border-border/70 p-3 transition hover:bg-muted/30">
            <p className="font-medium">Tickets</p>
            <p className="mt-1 text-sm text-muted-foreground">View QR codes and download ticket PDFs.</p>
          </Link>
          <Link href="/profile/events" className="rounded-xl border border-border/70 p-3 transition hover:bg-muted/30">
            <p className="font-medium">Events</p>
            <p className="mt-1 text-sm text-muted-foreground">Manage performance, buyers, and purchases.</p>
          </Link>
          <Link href="/profile/verify" className="rounded-xl border border-border/70 p-3 transition hover:bg-muted/30">
            <p className="font-medium">Verify</p>
            <p className="mt-1 text-sm text-muted-foreground">Scan entries and mark tickets as used.</p>
          </Link>
          <Link href="/profile/analytics" className="rounded-xl border border-border/70 p-3 transition hover:bg-muted/30">
            <p className="font-medium">Analytics</p>
            <p className="mt-1 text-sm text-muted-foreground">Track revenue, order quality, and ticket trends.</p>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Latest valid ticket</CardTitle>
          </CardHeader>
          <CardContent>
            {latestValidTicket ? (
              <div className="space-y-2">
                <p className="font-medium">{latestValidTicket.event_name}</p>
                <p className="text-sm text-muted-foreground">{latestValidTicket.organizer_name}</p>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/profile/tickets">View QR code</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">You currently have no valid tickets.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Newest event</CardTitle>
          </CardHeader>
          <CardContent>
            {newestEvent ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{newestEvent.name}</p>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {newestEventStatus}
                  </Badge>
                </div>
                <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Manage performance in the Events page
                </p>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href="/profile/events">Manage events</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
