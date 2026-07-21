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

    if (!userRow) {
      // If the public `users` row doesn't exist yet (or trigger hasn't
      // materialized it), create it so the rest of the app can treat the
      // user like they already had a profile.
      const roleFromMeta = (authUserData.user.user_metadata as any)?.role;
      const role =
        roleFromMeta === 'admin' || roleFromMeta === 'organizer' || roleFromMeta === 'customer'
          ? roleFromMeta
          : 'customer';

      const { data: ensuredUserRow, error: ensureError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: authUserData.user.id,
            email: authUserData.user.email || '',
            password_hash: '',
            role,
          },
          { onConflict: 'id' }
        )
        .select('id, email, role')
        .single();

      if (ensureError || !ensuredUserRow) return null;

      return {
        userId: ensuredUserRow.id,
        email: ensuredUserRow.email,
        role: ensuredUserRow.role as 'admin' | 'organizer' | 'customer',
      };
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
