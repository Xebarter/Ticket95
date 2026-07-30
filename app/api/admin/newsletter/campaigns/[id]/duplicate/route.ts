import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { duplicateCampaign, sendCampaign } from '@/lib/newsletter';
import { isEmailConfigured } from '@/lib/email';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const subject = typeof body?.subject === 'string' ? body.subject : undefined;
    const previewText = typeof body?.previewText === 'string' ? body.previewText : undefined;
    const bodyContent = typeof body?.body === 'string' ? body.body : undefined;
    const groupIds = Array.isArray(body?.groupIds)
      ? body.groupIds.filter((gid: unknown) => typeof gid === 'string')
      : undefined;
    const extraEmails =
      typeof body?.extraEmails === 'string' ? body.extraEmails : undefined;
    const sendNow = Boolean(body?.sendNow);

    const campaign = await duplicateCampaign({
      sourceId: id,
      createdBy: session.userId,
      subject,
      previewText,
      body: bodyContent,
      groupIds,
      extraEmailsInput: extraEmails,
    });

    if (!sendNow) {
      return NextResponse.json({
        success: true,
        campaign,
        sendResult: null,
        emailConfigured: isEmailConfigured(),
      });
    }

    const sendResult = await sendCampaign(campaign.id);

    return NextResponse.json({
      success: true,
      campaign: sendResult.campaign,
      sendResult,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
