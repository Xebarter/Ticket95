import { DollarSign, ShoppingBag, Clock3, Users } from 'lucide-react';
import { formatDateTime, formatMoney } from '../helpers';
import type { EventManagementMetrics } from '../types';

type Props = {
  metrics: EventManagementMetrics;
  currency: string;
};

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3.5 py-3 sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      </div>
      <p className="mt-2 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}

export function EventOverviewCards({ metrics, currency }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <Metric label="Tickets sold" value={String(metrics.soldTickets)} icon={ShoppingBag} />
      <Metric
        label="Gross revenue"
        value={formatMoney(metrics.grossRevenue, currency)}
        icon={DollarSign}
      />
      <Metric label="Unique buyers" value={String(metrics.uniqueBuyers)} icon={Users} />
      <Metric
        label="Latest purchase"
        value={formatDateTime(metrics.latestPurchaseAt)}
        icon={Clock3}
      />
    </div>
  );
}
