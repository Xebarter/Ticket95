'use client';

import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

async function fetchStats() {
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

export default function AdminStats() {
  const { data, error, isLoading } = useSWR('admin-stats', fetchStats);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/70">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
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
