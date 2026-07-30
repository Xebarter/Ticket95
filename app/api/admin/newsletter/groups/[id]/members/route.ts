import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import {
  addEmailsToGroup,
  listGroupMembers,
  removeSubscriberFromGroup,
} from '@/lib/newsletter-groups';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const status = (request.nextUrl.searchParams.get('status') || 'all') as
      | 'all'
      | 'active'
      | 'unsubscribed'
      | 'bounced';
    const q = request.nextUrl.searchParams.get('q') || '';
    const data = await listGroupMembers({ groupId: id, status, q });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load members';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const emailsInput =
      typeof body?.emails === 'string'
        ? body.emails
        : Array.isArray(body?.emails)
          ? body.emails.join('\n')
          : '';

    if (!emailsInput.trim()) {
      return NextResponse.json({ error: 'Email(s) required' }, { status: 400 });
    }

    const result = await addEmailsToGroup({
      groupId: id,
      emailsInput,
      addedBy: session.userId,
    });

    if (result.added + result.reactivated + result.alreadyActive === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found', invalid: result.invalid },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add members';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const subscriberId =
      typeof body?.subscriberId === 'string'
        ? body.subscriberId
        : request.nextUrl.searchParams.get('subscriberId');

    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriberId is required' }, { status: 400 });
    }

    await removeSubscriberFromGroup({ groupId: id, subscriberId });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
