import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { cancelCampaign, getCampaign, updateCampaign } from '@/lib/newsletter';
import { isEmailConfigured } from '@/lib/email';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const data = await getCampaign(id);
    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (body?.action === 'cancel') {
      const campaign = await cancelCampaign(id);
      return NextResponse.json({
        success: true,
        campaign,
        emailConfigured: isEmailConfigured(),
      });
    }

    const subject = typeof body?.subject === 'string' ? body.subject : undefined;
    const previewText = typeof body?.previewText === 'string' ? body.previewText : undefined;
    const bodyContent = typeof body?.body === 'string' ? body.body : undefined;
    const groupIds = Array.isArray(body?.groupIds)
      ? body.groupIds.filter((gid: unknown) => typeof gid === 'string')
      : undefined;
    const extraEmails =
      typeof body?.extraEmails === 'string' ? body.extraEmails : undefined;
    const replaceRecipients =
      body?.replaceRecipients === true
        ? true
        : body?.replaceRecipients === false
          ? false
          : undefined;

    const campaign = await updateCampaign({
      id,
      subject,
      previewText,
      body: bodyContent,
      groupIds,
      extraEmailsInput: extraEmails,
      replaceRecipients,
    });

    return NextResponse.json({
      success: true,
      campaign,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
