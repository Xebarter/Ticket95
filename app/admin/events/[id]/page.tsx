import { notFound } from 'next/navigation';
import { getAdminEventDetails } from '@/lib/admin-event-details';
import AdminEventDetailsClient from './event-details-client';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AdminEventDetailsPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const { event, stats, recentOrders } = await getAdminEventDetails(resolved.id);

  if (!event) {
    notFound();
  }

  return (
    <AdminEventDetailsClient event={event} stats={stats} recentOrders={recentOrders} />
  );
}
