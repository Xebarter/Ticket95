'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronRight,
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
import { cn } from '@/lib/utils';

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
    <div className="relative space-y-5 sm:space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-1 -top-1 h-36 rounded-3xl bg-gradient-to-b from-sky-50/80 via-indigo-50/30 to-transparent dark:from-sky-950/25 dark:via-indigo-950/10 dark:to-transparent sm:-inset-x-2"
      />

      <div className="relative">
        <ProfilePageHeader
          title="Overview"
          description="Tickets, events, and earnings at a glance."
          actions={
            <Button
              asChild
              size="sm"
              className="h-10 w-full rounded-xl bg-emerald-600 text-white shadow-[0_1px_2px_rgba(5,150,105,0.25)] hover:bg-emerald-700 sm:h-9 sm:w-auto"
            >
              <Link href="/organizer/dashboard/create">
                <Plus className="mr-1.5 h-4 w-4" />
                New event
              </Link>
            </Button>
          }
        />
      </div>

      <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <ProfileMetric label="Tickets" value={String(totals.validTickets)} icon={Ticket} />
        <ProfileMetric label="Events" value={String(totals.approvedEvents)} icon={Calendar} />
        <ProfileMetric label="Spent" value={formatMoney(totals.totalSpent)} icon={Wallet} />
        <ProfileMetric
          label="Revenue"
          value={formatMoney(totals.estimatedRevenue)}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="relative grid gap-3 sm:gap-4 lg:grid-cols-2">
        <ProfileSection title="Latest ticket" description="Ready to use.">
          {latestValidTicket ? (
            <div className="space-y-3.5">
              <div className="overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/60 via-white to-indigo-50/30 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-sky-500/25 dark:from-sky-950/30 dark:via-slate-950 dark:to-indigo-950/20">
                <div className="flex items-stretch gap-0">
                  <div className="relative h-[5.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-slate-100 sm:h-24 sm:w-24 dark:bg-slate-800">
                    {ticketEventImage ? (
                      <Image
                        src={ticketEventImage}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/70">
                        <Ticket className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-3 sm:p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Ready
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">
                      {latestValidTicket.event_name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {latestValidTicket.ticket_type_name || latestValidTicket.organizer_name}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="h-11 w-full rounded-xl shadow-[0_1px_2px_rgba(37,99,235,0.2)] sm:h-9 sm:w-auto"
              >
                <Link href="/profile/tickets">
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Open tickets
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-sky-200/70 bg-sky-50/40 px-4 py-6 text-center dark:border-sky-500/25 dark:bg-sky-950/20">
              <p className="text-sm text-slate-600 dark:text-slate-300">No ready tickets yet.</p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 w-full rounded-xl border-sky-200/80 text-sky-800 hover:bg-sky-50 sm:h-9 sm:w-auto dark:border-sky-500/30 dark:text-sky-200 dark:hover:bg-sky-500/10"
              >
                <Link href="/events">Browse events</Link>
              </Button>
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="Latest event" description="Your newest listing.">
          {newestEvent ? (
            <div className="space-y-3.5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-sky-50/40 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700/60 dark:from-slate-950 dark:to-sky-950/20">
                <div className="flex items-stretch gap-0">
                  <div className="relative h-[5.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-slate-100 sm:h-24 sm:w-24 dark:bg-slate-800">
                    {newestEventImage ? (
                      <Image
                        src={newestEventImage}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Calendar className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-3 sm:p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">
                        {newestEvent.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 rounded-full capitalize text-[10px]',
                          newestEventStatus === 'approved'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-slate-200/80 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                        )}
                      >
                        {newestEventStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {newestEvent.venue}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-11 w-full rounded-xl border-sky-200/80 text-sky-800 hover:bg-sky-50 sm:h-9 sm:w-auto dark:border-sky-500/30 dark:text-sky-200 dark:hover:bg-sky-500/10"
              >
                <Link href="/profile/events">
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Manage events
                  <ChevronRight className="ml-1 h-3.5 w-3.5 opacity-60" />
                </Link>
              </Button>
            </div>
          ) : (
            <ProfileEmptyState
              icon={Calendar}
              title="No events yet"
              description="Create an event to start selling."
              action={
                <Button
                  asChild
                  size="sm"
                  className="h-10 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 sm:h-9 sm:w-auto"
                >
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
