'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, QrCode, TrendingUp } from 'lucide-react';
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
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/organizer/dashboard/create">
            <Plus className="mr-1.5 h-4 w-4" />
            New event
          </Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tickets" value={String(totals.validTickets)} />
        <Metric label="Events" value={String(totals.approvedEvents)} />
        <Metric label="Spent" value={formatMoney(totals.totalSpent)} />
        <Metric label="Revenue" value={formatMoney(totals.estimatedRevenue)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ticket</p>
            {latestValidTicket ? (
              <>
                <div>
                  <p className="font-medium leading-snug">{latestValidTicket.event_name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{latestValidTicket.organizer_name}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/profile/tickets">
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Open
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</p>
            {newestEvent ? (
              <>
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-medium leading-snug">{newestEvent.name}</p>
                  <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
                    {newestEventStatus}
                  </Badge>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/profile/events">
                    <TrendingUp className="mr-1.5 h-4 w-4" />
                    Manage
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
