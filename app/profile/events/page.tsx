'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useProfileData } from '../use-profile-data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { EventManagementHeader } from './components/event-management-header';
import { EventOverviewCards } from './components/event-overview-cards';
import { EventPurchasesTable } from './components/event-purchases-table';
import { EventBuyersTable } from './components/event-buyers-table';
import { EventTicketTypesTable } from './components/event-ticket-types-table';
import { useEventManagement } from './use-event-management';
import { ProfileEmptyState } from '@/components/profile/profile-ui';
import { cn } from '@/lib/utils';

export default function ProfileEventsPage() {
  const { loading, myEvents, patchEvent } = useProfileData();
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
      />

      {myEvents.length === 0 ? (
        <ProfileEmptyState
          icon={Calendar}
          title="No events yet"
          description="Create your first event to manage ticket sales, buyers, and check-in from here."
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
        <div className="relative space-y-4">
          {showManagementSkeleton ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading event performance">
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : error && !data ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-5">
              <p className="text-sm font-medium text-destructive">Couldn’t load event data</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
                onClick={() => void reload()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : data ? (
            <>
              <EventOverviewCards metrics={data.metrics} currency={data.event.currency || 'USD'} />

              <Tabs value={tab} onValueChange={setTab} className="gap-4">
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/70 bg-slate-50/90 p-1 dark:bg-slate-900/60">
                  {(
                    [
                      {
                        value: 'overview',
                        label: 'Ticket types',
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
                          'relative h-9 flex-none gap-2 overflow-hidden rounded-lg border border-transparent px-3.5 text-xs font-medium shadow-none sm:text-sm',
                          'text-muted-foreground transition-[color,background-color,box-shadow,border-color]',
                          'hover:text-foreground',
                          'focus-visible:ring-2 focus-visible:ring-[#9A7B2F]/20 focus-visible:outline-none',
                          'data-[state=active]:border-slate-200/80 data-[state=active]:bg-white',
                          'data-[state=active]:text-slate-900 data-[state=active]:shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
                          'dark:data-[state=active]:border-slate-700 dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white'
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#9A7B2F] via-[#d4b46a] to-[#9A7B2F] transition-opacity',
                            active ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {item.label}
                        <span
                          className={cn(
                            'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                            active
                              ? 'bg-[#9A7B2F]/15 text-[#7a6224]'
                              : 'bg-white/80 text-muted-foreground dark:bg-slate-800'
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
