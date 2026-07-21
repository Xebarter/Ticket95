import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSession } from '@/lib/session';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getSafeRedirectPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/profile';
  }
  return next;
}

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
  const next = getSafeRedirectPath(requestUrl.searchParams.get('next'));

  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Invalid callback request', requestUrl.origin)
    );
  }

  const cookieStore = await cookies();
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

    const userRow = await getUserRow(user.id);
    if (!userRow) {
      return NextResponse.redirect(
        new URL('/login?error=Account setup is still in progress. Please try again.', requestUrl.origin)
      );
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
      return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    return NextResponse.redirect(
      new URL('/login?error=An unexpected error occurred', requestUrl.origin)
    );
  }
}
