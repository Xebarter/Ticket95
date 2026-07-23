'use client';

import Link from 'next/link';
import { BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfilePageHeader,
} from '@/components/profile/profile-ui';
import {
  AnalyticsAffiliates,
  AnalyticsAttendance,
  AnalyticsCapacity,
  AnalyticsCustomers,
  AnalyticsEventHeader,
  AnalyticsFilters,
  AnalyticsInsights,
  AnalyticsKpis,
  AnalyticsLiveStrip,
  AnalyticsPayments,
  AnalyticsRecentOrders,
  AnalyticsSalesCharts,
  AnalyticsTicketTypes,
  AnalyticsVerifiers,
} from './components/analytics-sections';
import { buildAnalyticsCsv, downloadCsv } from './format';
import { useOrganizerAnalytics } from './use-analytics';

export default function ProfileAnalyticsPage() {
  const {
    eventId,
    setEventId,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    data,
    loading,
    refreshing,
    error,
    refresh,
  } = useOrganizerAnalytics();

  if (loading && !data) {
    return <ProfileLoadingState label="Loading analytics…" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-5">
        <ProfilePageHeader
          title="Analytics"
          description="Sales, attendance, and performance across your events."
        />
        <ProfileEmptyState
          icon={BarChart3}
          title="Couldn’t load analytics"
          description={error}
          action={
            <Button type="button" onClick={refresh}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="space-y-5">
        <ProfilePageHeader
          title="Analytics"
          description="Sales, attendance, and performance across your events."
        />
        <ProfileEmptyState
          icon={BarChart3}
          title="No events yet"
          description="Create an event to unlock organizer analytics for sales, revenue, and check-ins."
          action={
            <Button asChild>
              <Link href="/organizer/dashboard/create">
                <Plus className="mr-1.5 h-4 w-4" />
                Create event
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const handleExport = () => {
    const csv = buildAnalyticsCsv(data);
    downloadCsv(`ticket95-analytics-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-5">
      <ProfilePageHeader
        title="Analytics"
        description="Organizer sales, attendance, buyers, affiliates, and door performance."
        actions={
          <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs tabular-nums text-muted-foreground">
            {data.events.length} event{data.events.length === 1 ? '' : 's'}
          </span>
        }
      />

      <AnalyticsFilters
        events={data.events}
        eventId={eventId}
        onEventChange={setEventId}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        refreshing={refreshing}
        onRefresh={refresh}
        onExport={handleExport}
        generatedAt={data.generatedAt}
      />

      {data.selectedEvent ? <AnalyticsEventHeader event={data.selectedEvent} /> : null}

      {error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </p>
      ) : null}

      <AnalyticsKpis data={data} />
      <AnalyticsLiveStrip live={data.live} />
      <AnalyticsSalesCharts data={data} />
      <AnalyticsTicketTypes data={data} />
      <AnalyticsAttendance data={data} />
      <AnalyticsCustomers data={data} />
      <AnalyticsPayments data={data} />
      <AnalyticsAffiliates data={data} />
      <AnalyticsVerifiers data={data} />
      <AnalyticsCapacity data={data} />
      <AnalyticsInsights data={data} />
      <AnalyticsRecentOrders data={data} />
    </div>
  );
}
