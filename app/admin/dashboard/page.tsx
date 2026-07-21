import AdminStats from './stats';
import AdminEventList from './event-list';
import { getAdminEvents, getAdminStats } from '@/lib/admin-dashboard-data';

export default async function AdminDashboardPage() {
  const [stats, events] = await Promise.all([getAdminStats(), getAdminEvents()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <section aria-labelledby="admin-stats-heading">
        <h2 id="admin-stats-heading" className="sr-only">
          Stats
        </h2>
        <AdminStats initialData={stats} />
      </section>

      <section aria-labelledby="admin-events-heading" className="space-y-4">
        <h2 id="admin-events-heading" className="text-lg font-semibold tracking-tight">
          Queue
        </h2>
        <AdminEventList initialEvents={events} />
      </section>
    </div>
  );
}
