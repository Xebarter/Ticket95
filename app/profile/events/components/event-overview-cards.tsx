import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Users } from 'lucide-react';
import { formatDateTime, formatMoney } from '../helpers';
import type { EventManagementMetrics } from '../types';

type Props = {
  metrics: EventManagementMetrics;
  currency: string;
};

export function EventOverviewCards({ metrics, currency }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tickets sold</p>
          <p className="mt-1 inline-flex items-center text-2xl font-semibold">
            <ShoppingBag className="mr-1.5 h-5 w-5 text-primary" />
            {metrics.soldTickets}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Gross revenue</p>
          <p className="mt-1 inline-flex items-center text-2xl font-semibold">
            <DollarSign className="mr-1.5 h-5 w-5 text-emerald-600" />
            {formatMoney(metrics.grossRevenue, currency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unique buyers</p>
          <p className="mt-1 inline-flex items-center text-2xl font-semibold">
            <Users className="mr-1.5 h-5 w-5 text-primary" />
            {metrics.uniqueBuyers}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Latest purchase</p>
          <p className="mt-1 text-sm font-semibold">{formatDateTime(metrics.latestPurchaseAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
