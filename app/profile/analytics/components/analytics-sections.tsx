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
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  tickets: { label: 'Tickets', color: '#10b981' },
  orders: { label: 'Orders', color: '#6366f1' },
} satisfies ChartConfig;

const hourlyChartConfig = {
  orders: { label: 'Orders', color: 'hsl(var(--primary))' },
  checkIns: { label: 'Check-ins', color: '#10b981' },
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
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-sm">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Event
          </p>
          <Select value={eventId || 'all'} onValueChange={(v) => onEventChange(v === 'all' ? '' : v)}>
            <SelectTrigger>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Date range
        </p>
        <ProfileFilterChips items={PRESET_ITEMS} value={preset} onChange={onPresetChange} />
      </div>

      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">From</p>
            <Input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">To</p>
            <Input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} />
          </div>
        </div>
      ) : null}

      {generatedAt ? (
        <p className="text-xs text-muted-foreground">Last updated {formatDateTime(generatedAt)}</p>
      ) : null}
    </div>
  );
}

export function AnalyticsEventHeader({ event }: { event: NonNullable<ProfileAnalyticsPayload['selectedEvent']> }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 sm:flex-row sm:items-center sm:p-5">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="h-20 w-full rounded-xl object-cover sm:h-24 sm:w-36"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center rounded-xl bg-muted/60 sm:h-24 sm:w-36">
          <Ticket className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-semibold tracking-tight">{event.name}</h2>
          <Badge variant="secondary" className="capitalize">
            {event.status}
          </Badge>
          {event.isLive ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Live</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateTime(event.date)} · {event.venue}
        </p>
      </div>
    </div>
  );
}

export function AnalyticsKpis({ data }: { data: ProfileAnalyticsPayload }) {
  const { kpis } = data;
  const currency = kpis.currency;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        hint={`${kpis.ticketsRemaining} remaining · ${formatPercent(kpis.sellThroughPercent)} sold`}
        icon={Ticket}
      />
      <ProfileMetric
        label="Attendance"
        value={formatPercent(kpis.attendanceRate)}
        hint={`${kpis.checkedIn} checked in · ${kpis.remainingCheckIn} remaining`}
        icon={ScanLine}
        accent="amber"
      />
      <ProfileMetric
        label="Avg order"
        value={formatMoney(kpis.averageOrderValue, currency)}
        hint={`${kpis.completedOrders} completed · ${kpis.uniqueBuyers} buyers`}
        icon={ShoppingBag}
      />
    </div>
  );
}

export function AnalyticsLiveStrip({ live }: { live: ProfileAnalyticsPayload['live'] }) {
  if (!live.isLive) return null;
  return (
    <ProfileSection
      title="Live now"
      description="Door and sales pulse — refreshes about every 10 seconds."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <LiveStat label="Checked in" value={String(live.checkedIn)} />
        <LiveStat label="Last 10 min" value={String(live.checkInsLast10Min)} />
        <LiveStat label="Active devices" value={String(live.activeVerifierSessions)} />
        <LiveStat label="Sold today" value={String(live.ticketsPurchasedToday)} />
        <LiveStat label="Last scan" value={formatDateTime(live.lastCheckInAt)} />
      </div>
    </ProfileSection>
  );
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AnalyticsSalesCharts({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ProfileSection title="Revenue over time" description="Completed order revenue by day." className="xl:col-span-2">
        {data.dailySeries.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
            <AreaChart data={data.dailySeries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={70} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.18}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </ProfileSection>

      <ProfileSection title="Order status" description="Orders in the selected range.">
        {data.orderStatus.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-4">
            <ChartContainer config={{ value: { label: 'Orders' } }} className="mx-auto h-[180px] w-full">
              <PieChart>
                <Pie
                  data={data.orderStatus}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={75}
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
                  className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Cumulative sales" description="Running totals across the range." className="xl:col-span-2">
        {data.cumulativeSeries.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[240px] w-full">
            <LineChart data={data.cumulativeSeries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={70} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="tickets" stroke="var(--color-tickets)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </ProfileSection>

      <ProfileSection title="Hourly activity" description="Orders and check-ins by hour of day.">
        <ChartContainer config={hourlyChartConfig} className="h-[240px] w-full">
          <BarChart data={data.hourlySeries}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={3} />
            <YAxis tickLine={false} axisLine={false} width={36} />
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
  return <p className="py-10 text-center text-sm text-muted-foreground">No data in this range</p>;
}

export function AnalyticsTicketTypes({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection title="Ticket types" description="Capacity, sales, and attendance by type.">
      {data.ticketTypes.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
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
                <tr key={row.key} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-3 font-medium">{row.name}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{row.eventName}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {row.sold}
                    <span className="text-muted-foreground">
                      /{row.capacity || '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(row.revenue, currency)}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {row.attended}
                    {row.refunded > 0 ? (
                      <span className="text-muted-foreground"> · {row.refunded} refunded</span>
                    ) : null}
                  </td>
                  <td className="py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(row.soldPercent, 100)} className="h-2" />
                      <span className="w-10 text-xs tabular-nums text-muted-foreground">
                        {formatPercent(row.soldPercent)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}

export function AnalyticsAttendance({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ProfileSection title="Attendance" description="Check-in performance for selected events.">
        <div className="space-y-3">
          <div className="rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Checked in</span>
              <span className="font-semibold tabular-nums">{data.kpis.checkedIn}</span>
            </div>
            <Progress className="mt-2" value={Math.min(data.kpis.attendanceRate, 100)} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-muted-foreground">Remaining</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.remainingCheckIn}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-muted-foreground">Peak hour</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {data.peakCheckInHour == null ? '—' : `${String(data.peakCheckInHour).padStart(2, '0')}:00`}
              </p>
            </div>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Check-in timeline" description="Daily door scans." className="xl:col-span-2">
        {data.checkInTimeline.length === 0 ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={{ tickets: { label: 'Check-ins', color: '#10b981' } }} className="h-[220px] w-full">
            <BarChart data={data.checkInTimeline}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={36} />
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
      <ProfileSection title="Customers" description="Buyers across selected events.">
        <div className="space-y-3">
          <ProfileMetric label="Unique buyers" value={String(summary.uniqueBuyers)} icon={Users} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-muted-foreground">New</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{summary.newBuyers}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-muted-foreground">Returning</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{summary.returningBuyers}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Repeat rate {formatPercent(summary.repeatRate)} · Avg spend{' '}
            {formatMoney(summary.averageSpend, currency)}
          </p>
        </div>
      </ProfileSection>

      <ProfileSection title="Top buyers" description="Highest spend in range." className="xl:col-span-2">
        {data.buyers.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3 font-medium">Buyer</th>
                  <th className="py-2 pr-3 font-medium">Orders</th>
                  <th className="py-2 pr-3 font-medium">Tickets</th>
                  <th className="py-2 font-medium">Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.buyers.slice(0, 10).map((buyer) => (
                  <tr key={buyer.key} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{buyer.name || buyer.email}</p>
                      {buyer.name ? (
                        <p className="text-xs text-muted-foreground">{buyer.email}</p>
                      ) : null}
                      {buyer.isReturning ? (
                        <Badge variant="secondary" className="mt-1">
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
        )}
      </ProfileSection>
    </div>
  );
}

export function AnalyticsPayments({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ProfileSection title="Payments" description="Completed revenue by payment provider.">
        {data.payments.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-2">
            {data.payments.map((row) => (
              <div
                key={row.provider}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">{row.provider}</p>
                  <p className="text-xs text-muted-foreground">{row.orders} orders</p>
                </div>
                <p className="font-semibold tabular-nums">{formatMoney(row.revenue, currency)}</p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Refunds & failures" description="Order outcomes that need attention.">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">Refunded orders</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.refundedOrders}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatMoney(data.kpis.refundedRevenue, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">Failed orders</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.failedOrders}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">Pending</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.kpis.pendingOrders}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-muted-foreground">Completed</p>
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
    <ProfileSection title="Affiliates" description="Attributed sales and commissions on your events.">
      {data.affiliates.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Sales</th>
                <th className="py-2 pr-3 font-medium">Revenue</th>
                <th className="py-2 pr-3 font-medium">Commission</th>
                <th className="py-2 font-medium">Pending / Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.affiliates.map((row) => (
                <tr key={row.affiliateId} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-3 font-medium">{row.referralCode}</td>
                  <td className="py-3 pr-3 tabular-nums">{row.sales}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(row.revenue, currency)}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(row.commission, currency)}</td>
                  <td className="py-3 text-muted-foreground tabular-nums">
                    {formatMoney(row.pendingCommission, currency)} /{' '}
                    {formatMoney(row.paidCommission, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}

export function AnalyticsVerifiers({ data }: { data: ProfileAnalyticsPayload }) {
  return (
    <ProfileSection title="Verifier devices" description="Door sessions and attributed check-ins.">
      {data.verifiers.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 pr-3 font-medium">Device</th>
                <th className="py-2 pr-3 font-medium">Event</th>
                <th className="py-2 pr-3 font-medium">Check-ins</th>
                <th className="py-2 pr-3 font-medium">Last seen</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.verifiers.map((row) => (
                <tr key={row.sessionId} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-3 font-medium">{row.deviceName}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{row.eventName}</td>
                  <td className="py-3 pr-3 tabular-nums">{row.checkIns}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{formatDateTime(row.lastSeenAt)}</td>
                  <td className="py-3">
                    {row.revokedAt ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : row.isActive ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Expired</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}

export function AnalyticsCapacity({ data }: { data: ProfileAnalyticsPayload }) {
  const currency = data.kpis.currency;
  return (
    <ProfileSection title="Capacity" description="Sell-through by event.">
      {data.capacityByEvent.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="space-y-3">
          {data.capacityByEvent.map((row) => (
            <div key={row.eventId} className="rounded-xl border border-border/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.eventName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.sold}/{row.capacity} sold · {formatMoney(row.revenue, currency)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatPercent(row.fillRate)}</span>
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
    <ProfileSection title="Insights" description="Rule-based highlights from your current filters.">
      <div className="grid gap-3 md:grid-cols-2">
        {data.insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-xl border px-4 py-3 ${
              insight.tone === 'warning'
                ? 'border-amber-500/30 bg-amber-500/5'
                : insight.tone === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border/70 bg-muted/20'
            }`}
          >
            <div className="flex items-start gap-2">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
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
      description="Latest orders for the selected filters."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/events">Manage events</Link>
        </Button>
      }
    >
      {data.recentOrders.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
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
                <tr key={order.id} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                  <td className="py-3 pr-3 font-medium">{order.eventName}</td>
                  <td className="py-3 pr-3">
                    <p>{order.buyerName || order.buyerEmail}</p>
                    {order.buyerName ? (
                      <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{order.quantity}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {formatMoney(order.totalPrice, order.currency || currency)}
                  </td>
                  <td className="py-3">
                    <Badge variant="secondary" className="capitalize">
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}
