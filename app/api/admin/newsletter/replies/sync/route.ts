import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { syncReceivedEmailsFromResend } from '@/lib/newsletter-replies';

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncReceivedEmailsFromResend(50);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
