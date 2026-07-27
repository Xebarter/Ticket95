import { NextRequest, NextResponse } from 'next/server';
import { upsertSubscribers } from '@/lib/newsletter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailsInput =
      typeof body?.emails === 'string'
        ? body.emails
        : Array.isArray(body?.emails)
          ? body.emails.join('\n')
          : typeof body?.email === 'string'
            ? body.email
            : '';

    if (!emailsInput.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await upsertSubscribers({
      emailsInput,
      source: body?.source === 'admin' ? 'admin' : 'footer',
    });

    if (result.emails.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid email addresses found',
          invalid: result.invalid,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      added: result.added,
      reactivated: result.reactivated,
      alreadyActive: result.alreadyActive,
      invalid: result.invalid,
      count: result.emails.length,
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
