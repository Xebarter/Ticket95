import { DollarSign, ShoppingBag, Clock3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '../helpers';
import type { EventManagementMetrics } from '../types';

type Props = {
  metrics: EventManagementMetrics;
  currency: string;
};

function formatLatest(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const tones = {
  sold: {
    icon: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    wash: 'from-sky-50/80 to-white dark:from-sky-500/10 dark:to-slate-950/40',
  },
  revenue: {
    icon: 'bg-[#9A7B2F]/12 text-[#8a6d28]',
    wash: 'from-[#f7f2e8]/90 to-white dark:from-[#9A7B2F]/10 dark:to-slate-950/40',
  },
  buyers: {
    icon: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    wash: 'from-indigo-50/80 to-white dark:from-indigo-500/10 dark:to-slate-950/40',
  },
  latest: {
    icon: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    wash: 'from-slate-50/90 to-white dark:from-slate-500/10 dark:to-slate-950/40',
  },
} as const;

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof ShoppingBag;
  tone: keyof typeof tones;
}) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-3.5',
        'dark:border-slate-700/60',
        t.wash
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            t.icon
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 truncate text-base font-semibold tracking-tight text-slate-900 tabular-nums sm:text-xl dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

export function EventOverviewCards({ metrics, currency }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <Metric label="Sold" value={String(metrics.soldTickets)} icon={ShoppingBag} tone="sold" />
      <Metric
        label="Revenue"
        value={formatMoney(metrics.grossRevenue, currency)}
        icon={DollarSign}
        tone="revenue"
      />
      <Metric label="Buyers" value={String(metrics.uniqueBuyers)} icon={Users} tone="buyers" />
      <Metric
        label="Latest"
        value={formatLatest(metrics.latestPurchaseAt)}
        icon={Clock3}
        tone="latest"
      />
    </div>
  );
}
