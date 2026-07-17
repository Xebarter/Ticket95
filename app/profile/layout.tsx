import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import ProfileLayoutShell from './ProfileLayoutShell';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login?redirect=/profile');
  }

  return <ProfileLayoutShell>{children}</ProfileLayoutShell>;
}
