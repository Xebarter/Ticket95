import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

function resolveRole(meta: Record<string, unknown> | undefined) {
  const role = meta?.role;
  if (role === 'admin' || role === 'organizer' || role === 'customer') return role;
  return 'customer' as const;
}

function resolveProfileName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata || {};
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.profile_name === 'string' && meta.profile_name.trim()) ||
    '';
  if (fromMeta) return fromMeta;
  const email = user.email || '';
  return email.includes('@') ? email.split('@')[0] : email || 'User';
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(token);
    if (authUserError || !authUserData?.user?.id || !authUserData.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = authUserData.user;
    const role = resolveRole(authUser.user_metadata as Record<string, unknown> | undefined);
    const profileName = resolveProfileName(authUser);
    const avatarUrl =
      typeof authUser.user_metadata?.avatar_url === 'string'
        ? authUser.user_metadata.avatar_url
        : typeof authUser.user_metadata?.picture === 'string'
          ? authUser.user_metadata.picture
          : null;

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    let userRow = existing;

    if (!userRow) {
      const { data: created, error: createError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: authUser.id,
            email: authUser.email,
            password_hash: '',
            role,
            profile_name: profileName,
            profile_logo_url: avatarUrl,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      if (createError || !created) {
        console.error('Failed to ensure user profile:', createError);
        return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 });
      }
      userRow = created;
    } else if (!userRow.profile_name) {
      const { data: updated } = await supabaseAdmin
        .from('users')
        .update({
          profile_name: profileName,
          ...(userRow.profile_logo_url ? {} : { profile_logo_url: avatarUrl }),
        })
        .eq('id', authUser.id)
        .select('*')
        .single();
      if (updated) userRow = updated;
    }

    await createSession({
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role as 'admin' | 'organizer' | 'customer',
    });

    return NextResponse.json({ success: true, user: userRow }, { status: 200 });
  } catch (error) {
    console.error('Session sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
