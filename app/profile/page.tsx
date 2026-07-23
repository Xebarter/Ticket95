'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Plus,
  QrCode,
  Ticket,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useProfileData } from './use-profile-data';
import { getEventById } from '@/lib/supabase-db';
import { getEventImages } from '@/lib/event-display';
import { getEventLifecycleStatus } from '@/lib/event-status';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfileMetric,
  ProfilePageHeader,
  ProfileSection,
} from '@/components/profile/profile-ui';

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function ProfileOverviewPage() {
  const { loading, totals, myTickets, myEvents } = useProfileData();
  const latestValidTicket = myTickets.find((ticket) => ticket.status === 'valid');
  const newestEvent = myEvents[0];
  const newestEventStatus = newestEvent ? getEventLifecycleStatus(newestEvent) : null;
  const newestEventImage = newestEvent ? getEventImages(newestEvent)[0] : undefined;
  const [ticketEventImage, setTicketEventImage] = useState<string | undefined>();

  useEffect(() => {
    if (!latestValidTicket?.event_id) {
      setTicketEventImage(undefined);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const event = await getEventById(latestValidTicket.event_id);
        if (cancelled) return;
        setTicketEventImage(event ? getEventImages(event)[0] : undefined);
      } catch {
        if (!cancelled) setTicketEventImage(undefined);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [latestValidTicket?.event_id]);

  if (loading) {
    return <ProfileLoadingState />;
  }

  return (
    <div className="space-y-6">
      <ProfilePageHeader
        title="Overview"
        description="A quick look at your tickets, events, and earnings."
        actions={
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/organizer/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New event
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric label="Ready tickets" value={String(totals.validTickets)} icon={Ticket} />
        <ProfileMetric label="Live events" value={String(totals.approvedEvents)} icon={Calendar} />
        <ProfileMetric label="Spent" value={formatMoney(totals.totalSpent)} icon={Wallet} />
        <ProfileMetric
          label="Est. revenue"
          value={formatMoney(totals.estimatedRevenue)}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection title="Latest ticket" description="Your most recent ready-to-use pass.">
          {latestValidTicket ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                  {ticketEventImage ? (
                    <Image
                      src={ticketEventImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="72px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Ticket className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{latestValidTicket.event_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestValidTicket.organizer_name}
                    {latestValidTicket.ticket_type_name
                      ? ` · ${latestValidTicket.ticket_type_name}`
                      : ''}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="rounded-xl">
                <Link href="/profile/tickets">
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Open tickets
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No ready tickets yet.</p>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href="/events">Browse events</Link>
              </Button>
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="Latest event" description="Jump back into managing your newest listing.">
          {newestEvent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                  {newestEventImage ? (
                    <Image
                      src={newestEventImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="72px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Calendar className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 font-semibold leading-snug">{newestEvent.name}</p>
                    <Badge variant="outline" className="shrink-0 rounded-full capitalize text-[10px]">
                      {newestEventStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{newestEvent.venue}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href="/profile/events">
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Manage events
                </Link>
              </Button>
            </div>
          ) : (
            <ProfileEmptyState
              icon={Calendar}
              title="No events yet"
              description="Publish an event to start selling tickets and tracking performance."
              action={
                <Button asChild size="sm" className="rounded-xl">
                  <Link href="/organizer/dashboard/create">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create event
                  </Link>
                </Button>
              }
            />
          )}
        </ProfileSection>
      </div>
    </div>
  );
}
