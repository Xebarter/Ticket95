import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { sendAdminReply } from '@/lib/newsletter-replies';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.body === 'string' ? body.body : '';

    const result = await sendAdminReply({
      replyId: id,
      body: text,
      createdBy: session.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reply';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
