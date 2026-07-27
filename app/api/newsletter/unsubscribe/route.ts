import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token =
      typeof body?.token === 'string'
        ? body.token
        : request.nextUrl.searchParams.get('token') || '';

    const result = await unsubscribeByToken(token);
    if (!result) {
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 404 });
    }

    return NextResponse.json({ success: true, email: result.email });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const result = await unsubscribeByToken(token).catch(() => null);

  if (!result) {
    return NextResponse.redirect(new URL('/unsubscribe?error=invalid', request.url));
  }

  return NextResponse.redirect(
    new URL(`/unsubscribe?success=1&email=${encodeURIComponent(result.email)}`, request.url)
  );
}
