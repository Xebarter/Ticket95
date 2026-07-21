import AdminEventsPage from '../dashboard/events-page';
import { getAdminEvents } from '@/lib/admin-dashboard-data';

export default async function AdminEventsPageRoute() {
  const events = await getAdminEvents();
  return <AdminEventsPage initialEvents={events} />;
}
