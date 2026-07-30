import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOrRestoreSession } from '@/lib/session-restore';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const session = await getOrRestoreSession();

  if (!session) {
    redirect('/login?redirect=/organizer/dashboard/create');
  }

  return children;
}
