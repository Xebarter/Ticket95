import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { unverifyEvent } from '@/lib/event-removal';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const event = await unverifyEvent({ eventId: id });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/unverify:', error);
    const message = error instanceof Error ? error.message : 'Failed to unverify event';
    const status =
      message.includes('Admin') || message.includes('session')
        ? 403
        : message.includes('not found')
          ? 404
          : message.includes('Only approved')
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
