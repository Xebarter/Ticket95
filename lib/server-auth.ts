import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type ServerAuthUser = {
  userId: string;
  email: string;
  role: 'admin' | 'organizer' | 'customer';
};

export async function getServerAuthUser(request: NextRequest): Promise<ServerAuthUser | null> {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (token) {
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(token);
    if (authUserError || !authUserData?.user) {
      return null;
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', authUserData.user.id)
      .single();

    if (userError || !userRow) {
      return null;
    }

    return {
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role as 'admin' | 'organizer' | 'customer',
    };
  }

  const cookieSession = await getSession();
  return cookieSession;
}
