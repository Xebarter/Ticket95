'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useProfileData } from '../use-profile-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus } from 'lucide-react';
import { EventManagementHeader } from './components/event-management-header';
import { EventOverviewCards } from './components/event-overview-cards';
import { useEventManagement } from './use-event-management';

export default function ProfileEventsPage() {
  const { loading, myEvents } = useProfileData();
  const [selectedEventId, setSelectedEventId] = useState<string>('');

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
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
    <div className="space-y-4">
      <EventManagementHeader
        events={myEvents}
        event={selectedEvent}
        selectedEventId={selectedEvent?.id || ''}
        onSelectEvent={setSelectedEventId}
      />

      {myEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No events</p>
            <Button asChild size="sm" className="mt-4 rounded-xl">
              <Link href="/organizer/dashboard/create">
                <Plus className="mr-1.5 h-4 w-4" />
                Create
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {loadingManagement ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <Card className="border-destructive/40">
              <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : data ? (
            <EventOverviewCards metrics={data.metrics} currency={data.event.currency || 'USD'} />
          ) : null}
        </div>
      )}
    </div>
  );
}
