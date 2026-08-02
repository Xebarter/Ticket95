'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ProfileFilterChips,
  ProfileMetric,
  ProfileSection,
} from '@/components/profile/profile-ui';
import type {
  AnalyticsDatePreset,
  ProfileAnalyticsPayload,
} from '@/lib/profile-analytics';
import {
  Activity,
  Download,
  RefreshCw,
  ScanLine,
  ShoppingBag,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatMoney, formatPercent } from '../format';

const PRESET_ITEMS: Array<{ key: AnalyticsDatePreset; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: '7 days' },
  { key: 'last30', label: '30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'entire', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: '#9A7B2F' },
  tickets: { label: 'Tickets', color: '#059669' },
  orders: { label: 'Orders', color: '#6366f1' },
} satisfies ChartConfig;

const hourlyChartConfig = {
  orders: { label: 'Orders', color: '#9A7B2F' },
  checkIns: { label: 'Check-ins', color: '#059669' },
} satisfies ChartConfig;

export function AnalyticsFilters({
  events,
  eventId,
  onEventChange,
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  refreshing,
  onRefresh,
  onExport,
  generatedAt,
}: {
  events: ProfileAnalyticsPayload['events'];
  eventId: string;
  onEventChange: (id: string) => void;
  preset: AnalyticsDatePreset;
  onPresetChange: (preset: AnalyticsDatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
  generatedAt?: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/90 via-white to-[#f7f2e8]/40 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 dark:border-slate-700/60 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Event
          </p>
          <Select value={eventId || 'all'} onValueChange={(v) => onEventChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-950/60">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200/80 bg-white/80 sm:h-9 dark:border-slate-700"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200/80 bg-white/80 sm:h-9 dark:border-slate-700"
            onClick={onExport}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Range
        </p>
        <ProfileFilterChips items={PRESET_ITEMS} value={preset} onChange={onPresetChange} />
      </div>

      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs text-slate-500">From</p>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-slate-500">To</p>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      ) : null}

      {generatedAt ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Updated {formatDateTime(generatedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsEventHeader({
  event,
}: {
  event: NonNullable<ProfileAnalyticsPayload['selectedEvent']>;
}) {
  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:p-4 dark:border-slate-700/60 dark:from-slate-950 dark:to-slate-900/40">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="h-28 w-full rounded-xl object-cover sm:h-20 sm:w-28"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-slate-100 sm:h-20 sm:w-28 dark:bg-slate-800">
          <Ticket className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="line-clamp-2 text-base font-semibold tracking-tight text-slate-900 sm:truncate sm:text-lg dark:text-slate-50">
            {event.name}
          </h2>
          <Badge
            variant="secondary"
            className="capitalize rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {event.status}
          </Badge>
          {event.isLive ? (
            <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Live</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
          <span>{formatDateTime(event.date)}</span>
          <span className="mx-1 opacity-50">·</span>
          <span className="break-words">{event.venue}</span>
        </p>
      </div>
    </div>
  );
}

export function AnalyticsKpis({ data }: { data: ProfileAnalyticsPayload }) {
  const { kpis } = data;
  const currency = kpis.currency;
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <ProfileMetric
        label="Net revenue"
        value={formatMoney(kpis.netRevenue, currency)}
        hint={`${formatMoney(kpis.grossRevenue, currency)} gross`}
        icon={Wallet}
        accent="emerald"
      />
      <ProfileMetric
        label="Tickets sold"
        value={String(kpis.ticketsSold)}
        hint={`${kpis.ticketsRemaining} left · ${formatPercent(kpis.sellThroughPercent)}`}
        icon={Ticket}
      />
      <ProfileMetric
        label="Attendance"
        value={formatPercent(kpis.attendanceRate)}
        hint={`${kpis.checkedIn} in · ${kpis.remainingCheckIn} left`}
        icon={ScanLine}
        accent="amber"
      />
      <ProfileMetric
        label="Avg order"
        value={formatMoney(kpis.averageOrderValue, currency)}
        hint={`${kpis.completedOrders} orders · ${kpis.uniqueBuyers} buyers`}
        icon={ShoppingBag}
      />
    </div>
  );
}

export function AnalyticsLiveStrip({ live }: { live: ProfileAnalyticsPayload['live'] }) {
  if (!live.isLive) return null;
  return (
    <ProfileSection title="Live now">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <LiveStat label="Checked in" value={String(live.checkedIn)} />
        <LiveStat label="Last 10 min" value={String(live.checkInsLast10Min)} />
        <LiveStat label="Devices" value={String(live.activeVerifierSessions)} />
        <LiveStat label="Sold today" value={String(live.ticketsPurchasedToday)} />
        <LiveStat
          label="Last scan"
          value={formatDateTime(live.lastCheckInAt)}
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </ProfileSection>
  );
}

function LiveStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-950/50',
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums text-slate-900 sm:text-lg dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

export function AnalyticsSalesCharts({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ProfileSection title="Revenue" className="xl:col-span-2">
        {data.dailySeries.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[220px] w-full sm:h-[280px]">
            <AreaChart data={data.dailySeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.16}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </ProfileSection>

      <ProfileSection title="Order status">
        {data.orderStatus.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-4">
            <ChartContainer config={{ value: { label: 'Orders' } }} className="mx-auto h-[160px] w-full sm:h-[180px]">
              <PieChart>
                <Pie
                  data={data.orderStatus}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {data.orderStatus.map((segment) => (
                    <Cell key={segment.status} fill={segment.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="space-y-2">
              {data.orderStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm dark:border-slate-700/60 dark:bg-slate-950/40"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Cumulative sales" className="xl:col-span-2">
        {data.cumulativeSeries.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[200px] w-full sm:h-[240px]">
            <LineChart data={data.cumulativeSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="tickets"
                stroke="var(--color-tickets)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </ProfileSection>

      <ProfileSection title="Hourly activity">
        <ChartContainer config={hourlyChartConfig} className="h-[200px] w-full sm:h-[240px]">
          <BarChart data={data.hourlySeries} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={3}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={28}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
            <Bar dataKey="checkIns" fill="var(--color-checkIns)" radius={4} />
          </BarChart>
        </ChartContainer>
      </ProfileSection>
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No data in this range</p>
  );
}

export function AnalyticsTicketTypes({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection title="Ticket types">
      {data.ticketTypes.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.ticketTypes.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{row.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.eventName}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(row.revenue, currency)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-xs dark:border-slate-800">
                  <div>
                    <p className="text-slate-500">Sold</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {row.sold}
                      <span className="font-normal text-slate-400">/{row.capacity || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Attended</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{row.attended}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fill</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{formatPercent(row.soldPercent)}</p>
                  </div>
                </div>
                <Progress value={Math.min(row.soldPercent, 100)} className="mt-3 h-1.5" />
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Sold</th>
                  <th className="py-2 pr-3 font-medium">Revenue</th>
                  <th className="py-2 pr-3 font-medium">Attended</th>
                  <th className="py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.ticketTypes.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                    <td className="py-3 pr-3 font-medium">{row.name}</td>
                    <td className="py-3 pr-3 text-slate-500">{row.eventName}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {row.sold}
                      <span className="text-slate-400">/{row.capacity || '—'}</span>
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{formatMoney(row.revenue, currency)}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {row.attended}
                      {row.refunded > 0 ? (
                        <span className="text-slate-400"> · {row.refunded} refunded</span>
                      ) : null}
                    </td>
                    <td className="min-w-[140px] py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(row.soldPercent, 100)} className="h-2" />
                        <span className="w-10 text-xs tabular-nums text-slate-500">
                          {formatPercent(row.soldPercent)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProfileSection>
  );
}

export function AnalyticsAttendance({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ProfileSection title="Attendance">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">Checked in</span>
              <span className="font-semibold tabular-nums">{data.kpis.checkedIn}</span>
            </div>
            <Progress className="mt-2" value={Math.min(data.kpis.attendanceRate, 100)} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
              <p className="text-slate-500">Remaining</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.remainingCheckIn}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
              <p className="text-slate-500">Peak hour</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {data.peakCheckInHour == null
                  ? '—'
                  : `${String(data.peakCheckInHour).padStart(2, '0')}:00`}
              </p>
            </div>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Check-in timeline" className="xl:col-span-2">
        {data.checkInTimeline.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer
            config={{ tickets: { label: 'Check-ins', color: '#059669' } }}
            className="h-[180px] w-full sm:h-[220px]"
          >
            <BarChart data={data.checkInTimeline} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={28}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tickets" fill="var(--color-tickets)" radius={6} />
            </BarChart>
          </ChartContainer>
        )}
      </ProfileSection>
    </div>
  );
}

export function AnalyticsCustomers({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  const summary = data.customerSummary;
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ProfileSection title="Customers">
        <div className="space-y-3">
          <ProfileMetric label="Unique buyers" value={String(summary.uniqueBuyers)} icon={Users} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
              <p className="text-slate-500">New</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{summary.newBuyers}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
              <p className="text-slate-500">Returning</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{summary.returningBuyers}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
            Repeat {formatPercent(summary.repeatRate)} · Avg{' '}
            {formatMoney(summary.averageSpend, currency)}
          </p>
        </div>
      </ProfileSection>

      <ProfileSection title="Top buyers" className="xl:col-span-2">
        {data.buyers.length === 0 ? (
          <EmptyChart />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {data.buyers.slice(0, 10).map((buyer) => (
                <div
                  key={buyer.key}
                  className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{buyer.name || buyer.email}</p>
                      {buyer.name ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{buyer.email}</p>
                      ) : null}
                      {buyer.isReturning ? (
                        <Badge variant="secondary" className="mt-1.5 rounded-full text-[10px]">
                          Returning
                        </Badge>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(buyer.spend, currency)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-xs dark:border-slate-800">
                    <div>
                      <p className="text-slate-500">Orders</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{buyer.orders}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tickets</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{buyer.tickets}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200/70 dark:border-slate-800">
                    <th className="py-2 pr-3 font-medium">Buyer</th>
                    <th className="py-2 pr-3 font-medium">Orders</th>
                    <th className="py-2 pr-3 font-medium">Tickets</th>
                    <th className="py-2 font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buyers.slice(0, 10).map((buyer) => (
                    <tr
                      key={buyer.key}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                    >
                      <td className="py-3 pr-3">
                        <p className="font-medium">{buyer.name || buyer.email}</p>
                        {buyer.name ? (
                          <p className="text-xs text-slate-500">{buyer.email}</p>
                        ) : null}
                        {buyer.isReturning ? (
                          <Badge variant="secondary" className="mt-1 rounded-full">
                            Returning
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{buyer.orders}</td>
                      <td className="py-3 pr-3 tabular-nums">{buyer.tickets}</td>
                      <td className="py-3 tabular-nums">{formatMoney(buyer.spend, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ProfileSection>
    </div>
  );
}

export function AnalyticsPayments({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ProfileSection title="Payments">
        {data.payments.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-2">
            {data.payments.map((row) => (
              <div
                key={row.provider}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-sm dark:border-slate-700/60 dark:bg-slate-950/50"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize">{row.provider}</p>
                  <p className="text-[11px] text-slate-500">{row.orders} orders</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {formatMoney(row.revenue, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Refunds & failures">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
            <p className="text-slate-500">Refunded</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.refundedOrders}</p>
            <p className="mt-1 truncate text-[11px] text-slate-500">
              {formatMoney(data.kpis.refundedRevenue, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
            <p className="text-slate-500">Failed</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.failedOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
            <p className="text-slate-500">Pending</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.pendingOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50">
            <p className="text-slate-500">Completed</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.completedOrders}</p>
          </div>
        </div>
      </ProfileSection>
    </div>
  );
}

export function AnalyticsAffiliates({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection title="Affiliates">
      {data.affiliates.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.affiliates.map((row) => (
              <div
                key={row.affiliateId}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-sm font-medium tracking-wide">{row.referralCode}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(row.commission, currency)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-xs dark:border-slate-800">
                  <div>
                    <p className="text-slate-500">Sales</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{row.sales}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Revenue</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatMoney(row.revenue, currency)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Pending / Paid</p>
                    <p className="mt-0.5 tabular-nums text-slate-600 dark:text-slate-300">
                      {formatMoney(row.pendingCommission, currency)} /{' '}
                      {formatMoney(row.paidCommission, currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Sales</th>
                  <th className="py-2 pr-3 font-medium">Revenue</th>
                  <th className="py-2 pr-3 font-medium">Commission</th>
                  <th className="py-2 font-medium">Pending / Paid</th>
                </tr>
              </thead>
              <tbody>
                {data.affiliates.map((row) => (
                  <tr
                    key={row.affiliateId}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                  >
                    <td className="py-3 pr-3 font-medium">{row.referralCode}</td>
                    <td className="py-3 pr-3 tabular-nums">{row.sales}</td>
                    <td className="py-3 pr-3 tabular-nums">{formatMoney(row.revenue, currency)}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {formatMoney(row.commission, currency)}
                    </td>
                    <td className="py-3 tabular-nums text-slate-500">
                      {formatMoney(row.pendingCommission, currency)} /{' '}
                      {formatMoney(row.paidCommission, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProfileSection>
  );
}

export function AnalyticsVerifiers({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <ProfileSection title="Verifier devices">
      {data.verifiers.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.verifiers.map((row) => (
              <div
                key={row.sessionId}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.deviceName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.eventName}</p>
                  </div>
                  {row.revokedAt ? (
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      Revoked
                    </Badge>
                  ) : row.isActive ? (
                    <Badge className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-600">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      Expired
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-xs dark:border-slate-800">
                  <div>
                    <p className="text-slate-500">Check-ins</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{row.checkIns}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Last seen</p>
                    <p className="mt-0.5 leading-snug text-slate-600 dark:text-slate-300">
                      {formatDateTime(row.lastSeenAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Device</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Check-ins</th>
                  <th className="py-2 pr-3 font-medium">Last seen</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.verifiers.map((row) => (
                  <tr
                    key={row.sessionId}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                  >
                    <td className="py-3 pr-3 font-medium">{row.deviceName}</td>
                    <td className="py-3 pr-3 text-slate-500">{row.eventName}</td>
                    <td className="py-3 pr-3 tabular-nums">{row.checkIns}</td>
                    <td className="py-3 pr-3 text-slate-500">{formatDateTime(row.lastSeenAt)}</td>
                    <td className="py-3">
                      {row.revokedAt ? (
                        <Badge variant="secondary" className="rounded-full">
                          Revoked
                        </Badge>
                      ) : row.isActive ? (
                        <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full">
                          Expired
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProfileSection>
  );
}

export function AnalyticsCapacity({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection title="Capacity">
      {data.capacityByEvent.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="space-y-3">
          {data.capacityByEvent.map((row) => (
            <div
              key={row.eventId}
              className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.eventName}</p>
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    {row.sold}/{row.capacity} sold · {formatMoney(row.revenue, currency)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatPercent(row.fillRate)}
                </span>
              </div>
              <Progress className="mt-2" value={Math.min(row.fillRate, 100)} />
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

export function AnalyticsInsights({ data }: { data: ProfileAnalyticsPayload }) {
  if (data.insights.length === 0) return null;
  return (
    <ProfileSection title="Insights">
      <div className="grid gap-3 md:grid-cols-2">
        {data.insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              'rounded-xl border px-3 py-3 sm:px-4',
              insight.tone === 'warning'
                ? 'border-amber-200/70 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10'
                : insight.tone === 'success'
                  ? 'border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10'
                  : 'border-slate-200/70 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/40'
            )}
          >
            <div className="flex items-start gap-2">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {insight.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {insight.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ProfileSection>
  );
}

export function AnalyticsRecentOrders({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection
      title="Recent orders"
      actions={
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-slate-200/80 dark:border-slate-700"
        >
          <Link href="/profile/events">Manage events</Link>
        </Button>
      }
    >
      {data.recentOrders.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.eventName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {order.buyerName || order.buyerEmail}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full capitalize text-[10px]">
                    {order.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-xs dark:border-slate-800">
                  <div>
                    <p className="text-slate-500">Qty</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatMoney(order.totalPrice, order.currency || currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">When</p>
                    <p className="mt-0.5 leading-snug text-slate-600 dark:text-slate-300">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Buyer</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/80"
                  >
                    <td className="py-3 pr-3 text-slate-500">{formatDateTime(order.createdAt)}</td>
                    <td className="py-3 pr-3 font-medium">{order.eventName}</td>
                    <td className="py-3 pr-3">
                      <p>{order.buyerName || order.buyerEmail}</p>
                      {order.buyerName ? (
                        <p className="text-xs text-slate-500">{order.buyerEmail}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{order.quantity}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {formatMoney(order.totalPrice, order.currency || currency)}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="rounded-full capitalize">
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProfileSection>
  );
}
