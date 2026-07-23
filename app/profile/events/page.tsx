'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useProfileData } from '../use-profile-data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus } from 'lucide-react';
import { EventManagementHeader } from './components/event-management-header';
import { EventOverviewCards } from './components/event-overview-cards';
import { EventPurchasesTable } from './components/event-purchases-table';
import { EventBuyersTable } from './components/event-buyers-table';
import { EventTicketTypesTable } from './components/event-ticket-types-table';
import { useEventManagement } from './use-event-management';
import { ProfileEmptyState, ProfileLoadingState } from '@/components/profile/profile-ui';

export default function ProfileEventsPage() {
  const { loading, myEvents } = useProfileData();
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

  const { data, loading: loadingManagement, error } = useEventManagement(selectedEvent);

  useEffect(() => {
    setTab('overview');
  }, [selectedEventId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-44 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
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
      />

      {myEvents.length === 0 ? (
        <ProfileEmptyState
          icon={Calendar}
          title="No events yet"
          description="Create your first event to manage ticket sales, buyers, and check-in from here."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/organizer/dashboard/create">
                <Plus className="mr-1.5 h-4 w-4" />
                Create event
              </Link>
            </Button>
          }
        />
      ) : loadingManagement ? (
        <ProfileLoadingState label="Loading event performance…" />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <EventOverviewCards metrics={data.metrics} currency={data.event.currency || 'USD'} />

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/50 p-1">
              <TabsTrigger value="overview" className="rounded-xl px-3 py-2">
                Ticket types
              </TabsTrigger>
              <TabsTrigger value="purchases" className="rounded-xl px-3 py-2">
                Purchases
              </TabsTrigger>
              <TabsTrigger value="buyers" className="rounded-xl px-3 py-2">
                Buyers
              </TabsTrigger>
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
        </div>
      ) : null}
    </div>
  );
}
