'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminStats as AdminStatsData } from '@/lib/admin-dashboard-data';

async function fetchStats(): Promise<AdminStatsData> {
  const res = await fetch('/api/admin/events/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminStats({
  initialData,
}: {
  initialData?: AdminStatsData;
}) {
  const { data, error } = useSWR('admin-stats', fetchStats, {
    fallbackData: initialData,
    revalidateOnMount: !initialData,
  });

  if (error && !data) {
    return <p className="text-sm text-destructive">Unable to load stats</p>;
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Total" value={data.total} />
      <StatCard label="Pending" value={data.pending} />
      <StatCard label="Approved" value={data.approved} />
      <StatCard label="Rejected" value={data.rejected} />
      <StatCard label="Expired" value={data.expired ?? 0} />
    </div>
  );
}
