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
    return <ProfileLoadingState label="Loading…" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-5">
        <ProfilePageHeader title="Analytics" description="Sales and attendance." />
        <ProfileEmptyState
          icon={BarChart3}
          title="Couldn’t load analytics"
          description={error}
          action={
            <Button
              type="button"
              className="rounded-xl bg-[#9A7B2F] text-white hover:bg-[#866a28]"
              onClick={refresh}
            >
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
        <ProfilePageHeader title="Analytics" description="Sales and attendance." />
        <ProfileEmptyState
          icon={BarChart3}
          title="No events yet"
          description="Create an event to unlock sales and check-in analytics."
          action={
            <Button asChild className="rounded-xl bg-[#9A7B2F] text-white hover:bg-[#866a28]">
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
        description="Sales, attendance, and door performance."
        actions={
          <span className="rounded-full border border-[#9A7B2F]/20 bg-[#9A7B2F]/10 px-3 py-1 text-xs font-medium tabular-nums text-[#7a6224]">
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
        <p className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
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
