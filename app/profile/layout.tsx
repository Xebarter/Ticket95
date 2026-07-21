import { redirect } from 'next/navigation';
import { getOrRestoreSession } from '@/lib/session-restore';
import ProfileLayoutShell from './ProfileLayoutShell';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getOrRestoreSession();

  if (!session) {
    redirect('/login?redirect=/profile');
  }

  return <ProfileLayoutShell>{children}</ProfileLayoutShell>;
}
