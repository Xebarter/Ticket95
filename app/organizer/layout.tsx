import { redirect } from 'next/navigation';
import { getOrRestoreSession } from '@/lib/session-restore';

export const dynamic = 'force-dynamic';

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const session = await getOrRestoreSession();

  if (!session) {
    redirect('/login?redirect=/organizer/dashboard/create');
  }

  return children;
}
