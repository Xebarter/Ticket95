import { notFound } from 'next/navigation';
import { getAdminEventDetails } from '@/lib/admin-event-details';
import AdminEditEventClient from './edit-client';

interface AdminEditEventPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AdminEditEventPage({ params }: AdminEditEventPageProps) {
  const resolved = await Promise.resolve(params);
  const { event } = await getAdminEventDetails(resolved.id);

  if (!event) {
    notFound();
  }

  return <AdminEditEventClient event={event} />;
}
