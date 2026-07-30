import { NextRequest, NextResponse } from 'next/server';
import { ingestReceivedEmail, verifyResendWebhook } from '@/lib/newsletter-replies';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const payload = await request.text();

  try {
    const event = verifyResendWebhook(payload, request.headers);

    if (event.type !== 'email.received') {
      return NextResponse.json({ received: true, ignored: true, type: event.type });
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    const reply = await ingestReceivedEmail(emailId);
    return NextResponse.json({
      received: true,
      replyId: reply?.id || null,
    });
  } catch (error) {
    console.error('Resend webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook failed';
    const status =
      message.includes('not configured') || message.toLowerCase().includes('signature')
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
