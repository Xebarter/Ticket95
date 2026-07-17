import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  if (code) {
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

      const next = requestUrl.searchParams.get('next');
      if (next === '/auth/reset-password') {
        return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
      }

      return NextResponse.redirect(new URL('/profile', requestUrl.origin));
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        new URL('/login?error=An unexpected error occurred', requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=Invalid callback request', requestUrl.origin)
  );
}
