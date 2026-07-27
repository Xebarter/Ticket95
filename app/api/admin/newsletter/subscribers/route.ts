import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import {
  deleteSubscriber,
  listSubscribers,
  setSubscriberStatus,
  upsertSubscribers,
  type SubscriberStatus,
} from '@/lib/newsletter';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const status = (request.nextUrl.searchParams.get('status') || 'all') as
      | SubscriberStatus
      | 'all';
    const q = request.nextUrl.searchParams.get('q') || '';
    const limit = Number(request.nextUrl.searchParams.get('limit') || 500);

    const data = await listSubscribers({ status, q, limit });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load subscribers';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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
      return NextResponse.json({ error: 'Email(s) required' }, { status: 400 });
    }

    const result = await upsertSubscribers({
      emailsInput,
      source: 'admin',
      notes: typeof body?.notes === 'string' ? body.notes : 'Added by admin',
    });

    if (result.emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found', invalid: result.invalid },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add subscribers';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    const status = body?.status as SubscriberStatus;

    if (!id || !['active', 'unsubscribed', 'bounced'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status are required' }, { status: 400 });
    }

    const subscriber = await setSubscriberStatus(id, status);
    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subscriber';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteSubscriber(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subscriber';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
