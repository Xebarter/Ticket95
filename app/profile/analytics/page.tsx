'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { useProfileData } from '../use-profile-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, Ticket, TrendingUp } from 'lucide-react';
import { getEventLifecycleStatus } from '@/lib/event-status';

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const formatShortMonth = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

type MonthlyPoint = {
  month: string;
  revenue: number;
  orders: number;
};

export default function ProfileAnalyticsPage() {
  const { loading, myEvents, myOrders, myTickets } = useProfileData();

  const analytics = useMemo(() => {
    const currency =
      myOrders.find((order) => order.currency)?.currency ||
      myEvents.find((event) => event.currency)?.currency ||
      'USD';

    const completedOrders = myOrders.filter((order) => order.status === 'completed');
    const pendingOrders = myOrders.filter((order) => order.status === 'pending');
    const failedOrders = myOrders.filter((order) => order.status === 'failed');
    const refundedOrders = myOrders.filter((order) => order.status === 'refunded');

    const grossRevenue = completedOrders.reduce((sum, order) => sum + order.total_price, 0);
    const refundedRevenue = refundedOrders.reduce((sum, order) => sum + order.total_price, 0);
    const netRevenue = Math.max(grossRevenue - refundedRevenue, 0);
    const averageOrderValue = completedOrders.length > 0 ? grossRevenue / completedOrders.length : 0;

    const totalEventCapacity = myEvents.reduce((sum, event) => sum + event.total_tickets, 0);
    const totalTicketsRemaining = myEvents.reduce((sum, event) => sum + event.tickets_available, 0);
    const totalTicketsSold = Math.max(totalEventCapacity - totalTicketsRemaining, 0);
    const sellThrough = totalEventCapacity > 0 ? (totalTicketsSold / totalEventCapacity) * 100 : 0;

    const orderStatusData = [
      { status: 'completed', label: 'Completed', value: completedOrders.length, color: '#10b981' },
      { status: 'pending', label: 'Pending', value: pendingOrders.length, color: '#f59e0b' },
      { status: 'failed', label: 'Failed', value: failedOrders.length, color: '#ef4444' },
      { status: 'refunded', label: 'Refunded', value: refundedOrders.length, color: '#6366f1' },
    ].filter((item) => item.value > 0);

    const ticketsByStatus = {
      valid: myTickets.filter((ticket) => ticket.status === 'valid').length,
      used: myTickets.filter((ticket) => ticket.status === 'used').length,
      expired: myTickets.filter((ticket) => ticket.status === 'expired').length,
      refunded: myTickets.filter((ticket) => ticket.status === 'refunded').length,
    };

    const eventsByStatus = {
      approved: myEvents.filter((event) => getEventLifecycleStatus(event) === 'approved').length,
      pending: myEvents.filter((event) => getEventLifecycleStatus(event) === 'pending').length,
      rejected: myEvents.filter((event) => getEventLifecycleStatus(event) === 'rejected').length,
      expired: myEvents.filter((event) => getEventLifecycleStatus(event) === 'expired').length,
    };

    const monthlyMap = new Map<string, MonthlyPoint>();
    completedOrders.forEach((order) => {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = formatShortMonth(order.created_at);
      const current = monthlyMap.get(key) || { month: monthLabel, revenue: 0, orders: 0 };
      current.revenue += order.total_price;
      current.orders += 1;
      monthlyMap.set(key, current);
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
      .slice(-6);

    const eventPerformance = myEvents
      .map((event) => {
        const sold = Math.max(event.total_tickets - event.tickets_available, 0);
        const fillRate = event.total_tickets > 0 ? (sold / event.total_tickets) * 100 : 0;
        const estimatedRevenue = sold * event.ticket_price;
        return {
          id: event.id,
          name: event.name,
          sold,
          capacity: event.total_tickets,
          fillRate,
          estimatedRevenue,
          status: getEventLifecycleStatus(event),
          date: event.date,
        };
      })
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    const topEvents = eventPerformance.slice(0, 5);

    return {
      currency,
      grossRevenue,
      refundedRevenue,
      netRevenue,
      averageOrderValue,
      totalEventCapacity,
      totalTicketsSold,
      sellThrough,
      orderStatusData,
      ticketsByStatus,
      eventsByStatus,
      monthlyTrend,
      topEvents,
      recentOrders: [...myOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
    };
  }, [myEvents, myOrders, myTickets]);

  const revenueChartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  } satisfies ChartConfig;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, order quality, and ticket usage performance across your events.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full">
          {myEvents.length} event{myEvents.length === 1 ? '' : 's'} tracked
        </Badge>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Net revenue</p>
            <p className="mt-1 inline-flex items-center text-2xl font-semibold">
              <TrendingUp className="mr-1.5 h-5 w-5 text-emerald-600" />
              {formatMoney(analytics.netRevenue, analytics.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gross {formatMoney(analytics.grossRevenue, analytics.currency)} less refunds
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Average order value</p>
            <p className="mt-1 inline-flex items-center text-2xl font-semibold">
              <BarChart3 className="mr-1.5 h-5 w-5 text-primary" />
              {formatMoney(analytics.averageOrderValue, analytics.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Completed orders only</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tickets sold</p>
            <p className="mt-1 inline-flex items-center text-2xl font-semibold">
              <Ticket className="mr-1.5 h-5 w-5 text-primary" />
              {analytics.totalTicketsSold}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Capacity {analytics.totalEventCapacity} across all listed events
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sell-through</p>
            <p className="mt-1 inline-flex items-center text-2xl font-semibold">
              <CheckCircle2 className="mr-1.5 h-5 w-5 text-primary" />
              {analytics.sellThrough.toFixed(1)}%
            </p>
            <Progress value={analytics.sellThrough} className="mt-3 h-2.5" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue trend (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyTrend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No completed orders yet.</p>
            ) : (
              <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
                <BarChart data={analytics.monthlyTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" radius={8} fill="var(--color-revenue)" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Order status mix</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.orderStatusData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.orderStatusData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {analytics.orderStatusData.map((segment) => (
                          <Cell key={segment.status} fill={segment.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {analytics.orderStatusData.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Event approval pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Approved</span>
                <span className="font-semibold">{analytics.eventsByStatus.approved}</span>
              </div>
              <Progress
                className="mt-2"
                value={myEvents.length > 0 ? (analytics.eventsByStatus.approved / myEvents.length) * 100 : 0}
              />
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Pending</span>
                <span className="font-semibold">{analytics.eventsByStatus.pending}</span>
              </div>
              <Progress
                className="mt-2"
                value={myEvents.length > 0 ? (analytics.eventsByStatus.pending / myEvents.length) * 100 : 0}
              />
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Rejected</span>
                <span className="font-semibold">{analytics.eventsByStatus.rejected}</span>
              </div>
              <Progress
                className="mt-2"
                value={myEvents.length > 0 ? (analytics.eventsByStatus.rejected / myEvents.length) * 100 : 0}
              />
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Expired</span>
                <span className="font-semibold">{analytics.eventsByStatus.expired}</span>
              </div>
              <Progress
                className="mt-2"
                value={myEvents.length > 0 ? (analytics.eventsByStatus.expired / myEvents.length) * 100 : 0}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Ticket lifecycle health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
              <p className="text-sm">Valid tickets</p>
              <p className="text-lg font-semibold">{analytics.ticketsByStatus.valid}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
              <p className="text-sm">Used tickets</p>
              <p className="text-lg font-semibold">{analytics.ticketsByStatus.used}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
              <p className="text-sm">Expired tickets</p>
              <p className="text-lg font-semibold">{analytics.ticketsByStatus.expired}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
              <p className="text-sm">Refunded tickets</p>
              <p className="text-lg font-semibold">{analytics.ticketsByStatus.refunded}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Top performing events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create events to unlock performance rankings.</p>
          ) : (
            analytics.topEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{formatMoney(event.estimatedRevenue, analytics.currency)}</p>
                    <p className="text-muted-foreground">
                      {event.sold}/{event.capacity} sold ({event.fillRate.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <Progress className="mt-2 h-2.5" value={event.fillRate} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Recent order activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No order activity yet.</p>
          ) : (
            analytics.recentOrders.map((order) => (
              <div key={order.id} className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      order.status === 'completed'
                        ? 'default'
                        : order.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {order.status}
                  </Badge>
                  <p className="text-sm font-semibold">{formatMoney(order.total_price, order.currency || analytics.currency)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {analytics.refundedRevenue > 0 ? (
        <Card className="border-amber-500/40">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <p className="text-muted-foreground">
              Refunded revenue totals {formatMoney(analytics.refundedRevenue, analytics.currency)}. Net revenue already excludes refunds.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
