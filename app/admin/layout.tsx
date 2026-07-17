import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login?redirect=/admin');
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', session.userId)
    .maybeSingle();

  if (userError || !userRow || userRow.role !== 'admin') {
    redirect('/profile');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
