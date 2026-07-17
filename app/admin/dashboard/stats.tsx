// Admin dashboard stats (fast, minimal fetch)
'use client';
import useSWR from 'swr';
import { ArrowDownRight, ArrowUpRight, CalendarX2, Clock3, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

async function fetchStats() {
  const res = await fetch('/api/admin/events/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

const cardBase =
  'relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm';

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  helper?: string;
}) {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    neutral: 'border-border/60',
    success: 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 to-transparent',
    warning: 'border-amber-500/35 bg-gradient-to-br from-amber-500/10 to-transparent',
    danger: 'border-red-500/35 bg-gradient-to-br from-red-500/10 to-transparent',
  };

  return (
    <article className={cn(cardBase, tone ? toneClasses[tone] : 'border-border/60')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2rem]">{value}</p>
        </div>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-background/75 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {helper ? <p className="mt-2 text-xs text-muted-foreground/80">{helper}</p> : null}
    </article>
  );
}

export default function AdminStats() {
  const { data, error, isLoading } = useSWR('admin-stats', fetchStats);

  if (isLoading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/70 bg-card/60">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Unable to load overview right now. Please refresh the page.
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total events"
        value={data.total}
        icon={Shield}
        tone="neutral"
        helper="All events currently in the system."
      />
      <StatCard
        label="Pending review"
        value={data.pending}
        icon={Clock3}
        tone="warning"
        helper="New or updated events awaiting a decision."
      />
      <StatCard
        label="Approved"
        value={data.approved}
        icon={ArrowUpRight}
        tone="success"
        helper="Visible on the public marketplace."
      />
      <StatCard
        label="Rejected"
        value={data.rejected}
        icon={ArrowDownRight}
        tone="danger"
        helper="Not shown publicly; feedback shared with organizers."
      />
      <StatCard
        label="Expired"
        value={data.expired ?? 0}
        icon={CalendarX2}
        tone="warning"
        helper="Past-date events no longer shown publicly."
      />
    </div>
  );
}
