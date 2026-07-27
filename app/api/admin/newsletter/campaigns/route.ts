import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { createCampaign, listCampaigns } from '@/lib/newsletter';
import { isEmailConfigured } from '@/lib/email';

export async function GET() {
  try {
    await requireAdmin();
    const campaigns = await listCampaigns(100);
    return NextResponse.json({ campaigns, emailConfigured: isEmailConfigured() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load campaigns';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const subject = typeof body?.subject === 'string' ? body.subject : '';
    const previewText = typeof body?.previewText === 'string' ? body.previewText : '';
    const bodyContent = typeof body?.body === 'string' ? body.body : '';
    const includeAllActive = body?.includeAllActive !== false;
    const extraEmails = typeof body?.extraEmails === 'string' ? body.extraEmails : '';
    const sendNow = Boolean(body?.sendNow);

    const result = await createCampaign({
      subject,
      previewText,
      body: bodyContent,
      createdBy: session.userId,
      includeAllActive,
      extraEmailsInput: extraEmails,
      sendNow,
    });

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
      sendResult: result.sendResult || null,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
