'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useProfileData } from '../use-profile-data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { EventManagementHeader } from './components/event-management-header';
import { EventOverviewCards } from './components/event-overview-cards';
import { EventPurchasesTable } from './components/event-purchases-table';
import { EventBuyersTable } from './components/event-buyers-table';
import { EventTicketTypesTable } from './components/event-ticket-types-table';
import { useEventManagement } from './use-event-management';
import { ProfileEmptyState } from '@/components/profile/profile-ui';
import { OrganizerEarningsPanel } from '@/components/payouts/organizer-earnings-panel';
import { cn } from '@/lib/utils';
import { getEventLifecycleStatus } from '@/lib/event-status';

export default function ProfileEventsPage() {
  const { loading, myEvents, patchEvent, removeEvent } = useProfileData();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (myEvents.length === 0) {
      setSelectedEventId('');
      return;
    }
    if (!selectedEventId || !myEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(myEvents[0].id);
    }
  }, [myEvents, selectedEventId]);

  const selectedEvent = useMemo(
    () => myEvents.find((event) => event.id === selectedEventId) || null,
    [myEvents, selectedEventId]
  );

  const { data, loading: loadingManagement, error, reload } = useEventManagement(selectedEvent);

  useEffect(() => {
    setTab('overview');
  }, [selectedEventId]);

  const showBootstrapSkeleton = loading;
  const showManagementSkeleton =
    Boolean(selectedEvent) && loadingManagement && (!data || data.event.id !== selectedEvent?.id);
  const isPendingApproval = data ? getEventLifecycleStatus(data.event) === 'pending' : false;
  const isRemoved = selectedEvent?.status === 'removed';
  const managementLocked = isPendingApproval || isRemoved;

  if (showBootstrapSkeleton) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <EventManagementHeader
        events={myEvents}
        event={selectedEvent}
        selectedEventId={selectedEvent?.id || ''}
        onSelectEvent={setSelectedEventId}
        onEventPatched={patchEvent}
        onEventDeleted={removeEvent}
      />

      {myEvents.length === 0 ? (
        <ProfileEmptyState
          icon={Calendar}
          title="No events yet"
          description="Create an event to manage sales and check-in."
          action={
            <Button asChild className="rounded-lg">
              <Link href="/organizer/dashboard/create">
                <Plus className="mr-1.5 h-4 w-4" />
                Create event
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="relative space-y-5">
          {showManagementSkeleton ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading event performance">
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-10 w-full max-w-md rounded-xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : error && !data ? (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-5 dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="text-sm font-medium text-rose-800 dark:text-rose-100">
                Couldn’t load event data
              </p>
              <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-100/80">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl border-rose-200"
                onClick={() => void reload()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : data ? (
            <>
              {isRemoved ? (
                <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 px-3 py-2.5 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
                    <div>
                      <p className="text-sm font-semibold">Deleted by Admin</p>
                      <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-100/80">
                        Hidden publicly. Edit and resubmit, or delete permanently.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isPendingApproval ? (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div>
                      <p className="text-sm font-semibold">Pending approval</p>
                      <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-100/80">
                        Management unlocks after approval. You can still edit.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                className={cn(
                  'space-y-4 rounded-2xl border border-slate-200/60 bg-gradient-to-b from-[#fbfaf7]/80 via-white/60 to-transparent p-1 sm:p-1.5 dark:border-slate-800/80 dark:from-slate-900/40 dark:via-transparent',
                  managementLocked ? 'pointer-events-none select-none opacity-60' : ''
                )}
              >
                <EventOverviewCards metrics={data.metrics} currency={data.event.currency || 'USD'} />
                <OrganizerEarningsPanel selectedEventId={data.event.id} />
              </div>

              <Tabs
                value={tab}
                onValueChange={setTab}
                className={cn('gap-4', managementLocked ? 'pointer-events-none select-none opacity-60' : '')}
              >
                <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-50/90 to-[#f7f2e8]/50 p-1.5 dark:border-slate-700/60 dark:from-slate-900/80 dark:to-slate-950/80">
                  {(
                    [
                      {
                        value: 'overview',
                        label: 'Types',
                        count: data.ticketTypeSummaries.length,
                      },
                      { value: 'purchases', label: 'Purchases', count: data.purchases.length },
                      { value: 'buyers', label: 'Buyers', count: data.buyers.length },
                    ] as const
                  ).map((item) => {
                    const active = tab === item.value;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className={cn(
                          'relative h-10 flex-none gap-1.5 overflow-hidden rounded-xl border border-transparent px-3 text-xs font-medium shadow-none sm:h-9 sm:gap-2 sm:px-3.5 sm:text-sm',
                          'text-slate-500 transition-[color,background-color,box-shadow,border-color]',
                          'hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                          'focus-visible:ring-2 focus-visible:ring-[#9A7B2F]/25 focus-visible:outline-none',
                          'data-[state=active]:border-[#9A7B2F]/20 data-[state=active]:bg-white',
                          'data-[state=active]:text-slate-900 data-[state=active]:shadow-[0_1px_3px_rgba(154,123,47,0.12)]',
                          'dark:data-[state=active]:border-[#9A7B2F]/30 dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white'
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[#9A7B2F] via-[#d4b46a] to-[#9A7B2F] transition-opacity',
                            active ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {item.label}
                        <span
                          className={cn(
                            'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                            active
                              ? 'bg-[#9A7B2F]/15 text-[#7a6224]'
                              : 'bg-white/80 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          )}
                        >
                          {item.count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="overview" className="mt-0">
                  <EventTicketTypesTable
                    ticketTypes={data.ticketTypeSummaries}
                    currency={data.event.currency || 'USD'}
                  />
                </TabsContent>
                <TabsContent value="purchases" className="mt-0">
                  <EventPurchasesTable
                    purchases={data.purchases}
                    currency={data.event.currency || 'USD'}
                  />
                </TabsContent>
                <TabsContent value="buyers" className="mt-0">
                  <EventBuyersTable buyers={data.buyers} />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
