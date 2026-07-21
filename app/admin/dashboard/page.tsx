import { Suspense } from 'react';
import AdminStats from './stats';
import AdminEventList from './event-list';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <section aria-labelledby="admin-stats-heading">
        <h2 id="admin-stats-heading" className="sr-only">
          Stats
        </h2>
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <AdminStats />
        </Suspense>
      </section>

      <section aria-labelledby="admin-events-heading" className="space-y-4">
        <h2 id="admin-events-heading" className="text-lg font-semibold tracking-tight">
          Queue
        </h2>
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <AdminEventList />
        </Suspense>
      </section>
    </div>
  );
}
