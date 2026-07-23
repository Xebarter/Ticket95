import type { ProfileAnalyticsPayload } from '@/lib/profile-analytics';

export function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

function csvEscape(value: string | number | undefined | null) {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number | undefined | null>>) {
  return [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join(
    '\n'
  );
}

export function buildAnalyticsCsv(data: ProfileAnalyticsPayload): string {
  const currency = data.kpis.currency;
  const sections: string[] = [];

  sections.push('Overview KPIs');
  sections.push(
    rowsToCsv(
      ['Metric', 'Value'],
      [
        ['Gross revenue', formatMoney(data.kpis.grossRevenue, currency)],
        ['Net revenue', formatMoney(data.kpis.netRevenue, currency)],
        ['Tickets sold', data.kpis.ticketsSold],
        ['Sell-through %', data.kpis.sellThroughPercent.toFixed(1)],
        ['Checked in', data.kpis.checkedIn],
        ['Attendance rate %', data.kpis.attendanceRate.toFixed(1)],
        ['Completed orders', data.kpis.completedOrders],
        ['Average order value', formatMoney(data.kpis.averageOrderValue, currency)],
        ['Unique buyers', data.kpis.uniqueBuyers],
      ]
    )
  );

  sections.push('', 'Ticket types');
  sections.push(
    rowsToCsv(
      ['Event', 'Type', 'Capacity', 'Sold', 'Remaining', 'Revenue', 'Attended', 'Refunded', 'Sold %'],
      data.ticketTypes.map((row) => [
        row.eventName,
        row.name,
        row.capacity,
        row.sold,
        row.remaining,
        row.revenue.toFixed(2),
        row.attended,
        row.refunded,
        row.soldPercent.toFixed(1),
      ])
    )
  );

  sections.push('', 'Top buyers');
  sections.push(
    rowsToCsv(
      ['Name', 'Email', 'Orders', 'Tickets', 'Spend', 'Returning'],
      data.buyers.map((row) => [
        row.name || '',
        row.email,
        row.orders,
        row.tickets,
        row.spend.toFixed(2),
        row.isReturning ? 'yes' : 'no',
      ])
    )
  );

  sections.push('', 'Affiliates');
  sections.push(
    rowsToCsv(
      ['Referral code', 'Sales', 'Revenue', 'Commission', 'Pending', 'Paid'],
      data.affiliates.map((row) => [
        row.referralCode,
        row.sales,
        row.revenue.toFixed(2),
        row.commission.toFixed(2),
        row.pendingCommission.toFixed(2),
        row.paidCommission.toFixed(2),
      ])
    )
  );

  sections.push('', 'Recent orders');
  sections.push(
    rowsToCsv(
      ['Order ID', 'Event', 'Buyer', 'Email', 'Qty', 'Total', 'Status', 'Provider', 'Created'],
      data.recentOrders.map((row) => [
        row.id,
        row.eventName,
        row.buyerName || '',
        row.buyerEmail,
        row.quantity,
        row.totalPrice.toFixed(2),
        row.status,
        row.paymentProvider || '',
        row.createdAt,
      ])
    )
  );

  return sections.join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
