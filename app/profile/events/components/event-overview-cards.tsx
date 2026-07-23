import { DollarSign, ShoppingBag, Clock3, Users } from 'lucide-react';
import { ProfileMetric } from '@/components/profile/profile-ui';
import { formatDateTime, formatMoney } from '../helpers';
import type { EventManagementMetrics } from '../types';

type Props = {
  metrics: EventManagementMetrics;
  currency: string;
};

export function EventOverviewCards({ metrics, currency }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ProfileMetric
        label="Tickets sold"
        value={String(metrics.soldTickets)}
        icon={ShoppingBag}
      />
      <ProfileMetric
        label="Gross revenue"
        value={formatMoney(metrics.grossRevenue, currency)}
        icon={DollarSign}
        accent="emerald"
      />
      <ProfileMetric
        label="Unique buyers"
        value={String(metrics.uniqueBuyers)}
        icon={Users}
      />
      <ProfileMetric
        label="Latest purchase"
        value={formatDateTime(metrics.latestPurchaseAt)}
        icon={Clock3}
        accent="amber"
      />
    </div>
  );
}
