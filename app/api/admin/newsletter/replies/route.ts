import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import {
  getReply,
  listReplies,
  setReplyStatus,
  type ReplyStatus,
} from '@/lib/newsletter-replies';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const status = (request.nextUrl.searchParams.get('status') || 'inbox') as
      | ReplyStatus
      | 'all'
      | 'inbox';
    const q = request.nextUrl.searchParams.get('q') || '';
    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      const detail = await getReply(id);
      if (!detail) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const data = await listReplies({ status, q });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load replies';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    const status = body?.status as ReplyStatus;

    if (!id || !['unread', 'read', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status are required' }, { status: 400 });
    }

    const reply = await setReplyStatus(id, status);
    return NextResponse.json({ success: true, reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reply';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
