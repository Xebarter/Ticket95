import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSession, getSession, type SessionData } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Returns the app session cookie, or restores it from a still-valid Supabase auth session.
 * Prevents accidental "signed out" redirects while the user still has a live auth session.
 */
export async function getOrRestoreSession(): Promise<SessionData | null> {
  const existing = await getSession();
  if (existing) return existing;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookie writes may be restricted.
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email) {
    return null;
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (userError || !userRow) {
    return null;
  }

  const session: SessionData = {
    userId: userRow.id,
    email: userRow.email,
    role: userRow.role as SessionData['role'],
  };

  try {
    await createSession(session);
  } catch (createError) {
    console.error('Failed to restore app session cookie:', createError);
  }

  return session;
}
