import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSession } from '@/lib/session';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSafeRedirectPath, OAUTH_REDIRECT_COOKIE } from '@/lib/auth-redirect';

async function getUserRow(userId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const redirectCookie = request.cookies.get(OAUTH_REDIRECT_COOKIE)?.value;
  const next = getSafeRedirectPath(
    redirectCookie ? decodeURIComponent(redirectCookie) : requestUrl.searchParams.get('next')
  );

  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    console.error('Auth callback missing code. URL:', requestUrl.toString());
    return NextResponse.redirect(
      new URL(
        '/login?error=Google sign in could not be completed. Please try again.',
        requestUrl.origin
      )
    );
  }

  const cookieStore = await cookies();
  let response = NextResponse.redirect(new URL(next, requestUrl.origin));
  response.cookies.delete(OAUTH_REDIRECT_COOKIE);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          response = NextResponse.redirect(new URL(next, requestUrl.origin));
          response.cookies.delete(OAUTH_REDIRECT_COOKIE);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id || !user.email) {
      return NextResponse.redirect(
        new URL('/login?error=Unable to complete Google sign in', requestUrl.origin)
      );
    }

    let userRow = await getUserRow(user.id);
    if (!userRow) {
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const roleFromMeta = meta.role;
      const role =
        roleFromMeta === 'admin' || roleFromMeta === 'organizer' || roleFromMeta === 'customer'
          ? roleFromMeta
          : 'customer';
      const profileName =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta.name === 'string' && meta.name.trim()) ||
        user.email.split('@')[0];
      const avatarUrl =
        (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
        (typeof meta.picture === 'string' && meta.picture) ||
        null;

      const { data: ensuredUserRow, error: ensureError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email,
            password_hash: '',
            role,
            profile_name: profileName,
            profile_logo_url: avatarUrl,
          },
          { onConflict: 'id' }
        )
        .select('id, email, role')
        .maybeSingle();

      if (ensureError || !ensuredUserRow) {
        return NextResponse.redirect(
          new URL(
            '/login?error=Profile setup is still in progress. Please try again.',
            requestUrl.origin
          )
        );
      }

      userRow = ensuredUserRow;
    } else {
      // Backfill display name for existing Google users who only have email.
      const { data: fullRow } = await supabaseAdmin
        .from('users')
        .select('id, email, role, profile_name')
        .eq('id', user.id)
        .maybeSingle();

      if (fullRow && !fullRow.profile_name) {
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const profileName =
          (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
          (typeof meta.name === 'string' && meta.name.trim()) ||
          user.email.split('@')[0];
        await supabaseAdmin
          .from('users')
          .update({ profile_name: profileName })
          .eq('id', user.id);
      }
    }

    await createSession({
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role as 'admin' | 'organizer' | 'customer',
    });

    try {
      await claimGuestPurchasesForUser(userRow.email, userRow.id);
    } catch (linkError) {
      console.error('Guest purchase linking failed after OAuth:', linkError);
    }

    if (next === '/auth/reset-password') {
      response = NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
    }

    return response;
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    return NextResponse.redirect(
      new URL('/login?error=An unexpected error occurred', requestUrl.origin)
    );
  }
}
