import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  addSubscribersToGroups,
  ensureWebsiteGroup,
  getActiveMembersForGroups,
} from '@/lib/newsletter-groups';
import {
  bodyToHtml,
  bodyToPlainText,
  createUnsubscribeToken,
  isEmailConfigured,
  parseEmailList,
  sendMarketingEmail,
} from '@/lib/email';

export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced';
export type SubscriberSource = 'footer' | 'admin' | 'import' | 'checkout';

export type NewsletterSubscriber = {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: SubscriberSource;
  unsubscribe_token: string;
  notes: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaign = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  body_text: string | null;
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'cancelled';
  created_by: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  target_group_ids?: string[];
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

const SEND_BATCH_SIZE = 25;
const SEND_BATCH_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type UpsertSubscribersResult = {
  added: number;
  reactivated: number;
  alreadyActive: number;
  invalid: string[];
  emails: string[];
  joinedGroup?: number;
};

export async function upsertSubscribers(params: {
  emailsInput: string | string[];
  source: SubscriberSource;
  notes?: string | null;
  groupIds?: string[];
  addedBy?: string | null;
  /** When true, do not auto-add footer sources to Website subscribers (caller handles groups). */
  skipWebsiteAutoJoin?: boolean;
}): Promise<UpsertSubscribersResult> {
  const emails =
    typeof params.emailsInput === 'string'
      ? parseEmailList(params.emailsInput)
      : parseEmailList(params.emailsInput.join('\n'));

  const rawParts =
    typeof params.emailsInput === 'string'
      ? params.emailsInput.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean)
      : params.emailsInput.map((p) => p.trim().toLowerCase()).filter(Boolean);

  const invalid = Array.from(new Set(rawParts.filter((part) => !emails.includes(part))));

  if (emails.length === 0) {
    return { added: 0, reactivated: 0, alreadyActive: 0, invalid, emails: [] };
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, email, status')
    .in('email', emails);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByEmail = new Map(
    (existingRows || []).map((row) => [row.email as string, row as { id: string; email: string; status: string }])
  );

  let added = 0;
  let reactivated = 0;
  let alreadyActive = 0;

  const toInsert: Array<{
    email: string;
    status: 'active';
    source: SubscriberSource;
    unsubscribe_token: string;
    notes: string | null;
    subscribed_at: string;
    unsubscribed_at: null;
  }> = [];

  const now = new Date().toISOString();

  for (const email of emails) {
    const existing = existingByEmail.get(email);
    if (!existing) {
      toInsert.push({
        email,
        status: 'active',
        source: params.source,
        unsubscribe_token: createUnsubscribeToken(),
        notes: params.notes || null,
        subscribed_at: now,
        unsubscribed_at: null,
      });
      added += 1;
      continue;
    }

    if (existing.status === 'active') {
      alreadyActive += 1;
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        source: params.source,
        notes: params.notes || null,
        subscribed_at: now,
        unsubscribed_at: null,
        unsubscribe_token: createUnsubscribeToken(),
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
    reactivated += 1;
  }

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 200) {
      const chunk = toInsert.slice(i, i + 200);
      const { error: insertError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .insert(chunk);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  const { data: allSubs, error: allError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id')
    .in('email', emails);

  if (allError) throw new Error(allError.message);
  const subscriberIds = (allSubs || []).map((s) => s.id as string);

  let joinedGroup = 0;
  const groupIds = [...(params.groupIds || [])];

  if (params.source === 'footer' && !params.skipWebsiteAutoJoin) {
    const website = await ensureWebsiteGroup();
    if (!groupIds.includes(website.id)) groupIds.push(website.id);
  }

  if (groupIds.length > 0 && subscriberIds.length > 0) {
    joinedGroup = await addSubscribersToGroups({
      subscriberIds,
      groupIds,
      addedBy: params.addedBy,
    });
  }

  return { added, reactivated, alreadyActive, invalid, emails, joinedGroup };
}

export async function unsubscribeByToken(token: string): Promise<{ email: string } | null> {
  const cleaned = (token || '').trim();
  if (!cleaned) return null;

  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, email, status')
    .eq('unsubscribe_token', cleaned)
    .maybeSingle();

  if (error || !data) return null;

  if (data.status !== 'unsubscribed') {
    const { error: updateError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return { email: data.email };
}

export async function setSubscriberStatus(
  id: string,
  status: SubscriberStatus
): Promise<NewsletterSubscriber> {
  const patch: Record<string, unknown> = { status };
  if (status === 'unsubscribed') {
    patch.unsubscribed_at = new Date().toISOString();
  } else if (status === 'active') {
    patch.unsubscribed_at = null;
    patch.subscribed_at = new Date().toISOString();
    patch.unsubscribe_token = createUnsubscribeToken();
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Subscriber not found');
  }

  return data as NewsletterSubscriber;
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('newsletter_subscribers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listSubscribers(params?: {
  status?: SubscriberStatus | 'all';
  q?: string;
  limit?: number;
  groupId?: string;
}): Promise<{ subscribers: NewsletterSubscriber[]; totals: Record<string, number> }> {
  if (params?.groupId) {
    const { listGroupMembers } = await import('@/lib/newsletter-groups');
    return listGroupMembers({
      groupId: params.groupId,
      status: params.status,
      q: params.q,
      limit: params.limit,
    });
  }

  const limit = Math.min(Math.max(params?.limit || 500, 1), 2000);
  let query = supabaseAdmin
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })
    .limit(limit);

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const q = (params?.q || '').trim().toLowerCase();
  if (q) {
    query = query.ilike('email', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { data: allStatuses, error: countError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('status');

  if (countError) throw new Error(countError.message);

  const totals: Record<string, number> = { all: 0, active: 0, unsubscribed: 0, bounced: 0 };
  for (const row of allStatuses || []) {
    totals.all += 1;
    const status = row.status as string;
    if (status in totals) totals[status] += 1;
  }

  return {
    subscribers: (data || []) as NewsletterSubscriber[],
    totals,
  };
}

export async function listCampaigns(limit = 50): Promise<MarketingCampaign[]> {
  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) throw new Error(error.message);
  return (data || []) as MarketingCampaign[];
}

export async function getCampaign(id: string): Promise<{
  campaign: MarketingCampaign;
  recipients: Array<{
    id: string;
    email: string;
    status: string;
    error_message: string | null;
    sent_at: string | null;
  }>;
} | null> {
  const { data: campaign, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!campaign) return null;

  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .from('marketing_campaign_recipients')
    .select('id, email, status, error_message, sent_at')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })
    .limit(2000);

  if (recipientsError) throw new Error(recipientsError.message);

  return {
    campaign: campaign as MarketingCampaign,
    recipients: recipients || [],
  };
}

async function resolveCampaignRecipients(params: {
  groupIds: string[];
  extraEmailsInput?: string;
}): Promise<Array<{ subscriberId: string | null; email: string; unsubscribeToken: string }>> {
  const byEmail = new Map<
    string,
    { subscriberId: string | null; email: string; unsubscribeToken: string }
  >();

  if (params.groupIds.length > 0) {
    const members = await getActiveMembersForGroups(params.groupIds);
    for (const row of members) {
      byEmail.set(row.email, {
        subscriberId: row.subscriberId,
        email: row.email,
        unsubscribeToken: row.unsubscribeToken,
      });
    }
  }

  const extras = parseEmailList(params.extraEmailsInput || '');
  if (extras.length > 0) {
    await upsertSubscribers({
      emailsInput: extras,
      source: 'admin',
      notes: 'Added via campaign compose',
      skipWebsiteAutoJoin: true,
    });

    const { data, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, email, unsubscribe_token, status')
      .in('email', extras);

    if (error) throw new Error(error.message);

    for (const row of data || []) {
      if (row.status !== 'active') continue;
      byEmail.set(row.email, {
        subscriberId: row.id,
        email: row.email,
        unsubscribeToken: row.unsubscribe_token,
      });
    }
  }

  return Array.from(byEmail.values());
}

export async function createCampaign(params: {
  subject: string;
  previewText?: string;
  body: string;
  createdBy?: string | null;
  groupIds?: string[];
  /** @deprecated use groupIds */
  includeAllActive?: boolean;
  extraEmailsInput?: string;
  sendNow?: boolean;
}): Promise<{ campaign: MarketingCampaign; sendResult?: SendCampaignResult }> {
  const subject = params.subject.trim();
  const body = params.body.trim();
  if (!subject) throw new Error('Subject is required');
  if (!body || !bodyToPlainText(body)) throw new Error('Email body is required');

  let groupIds = Array.isArray(params.groupIds)
    ? params.groupIds.filter((id) => typeof id === 'string' && id.trim())
    : [];

  // Backward compat: old clients sending includeAllActive
  if (groupIds.length === 0 && params.includeAllActive) {
    const website = await ensureWebsiteGroup();
    groupIds = [website.id];
  }

  const extras = (params.extraEmailsInput || '').trim();
  if (groupIds.length === 0 && !extras) {
    throw new Error('Select at least one recipient group or paste email addresses');
  }

  const bodyHtml = bodyToHtml(body);
  const bodyText = bodyToPlainText(body);

  const recipients = await resolveCampaignRecipients({
    groupIds,
    extraEmailsInput: params.extraEmailsInput,
  });

  if (params.sendNow && recipients.length === 0) {
    throw new Error('No active recipients to send to');
  }

  const { data: campaign, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .insert({
      subject,
      preview_text: (params.previewText || '').trim() || null,
      body_html: bodyHtml,
      body_text: bodyText,
      status: 'draft',
      created_by: params.createdBy || null,
      recipient_count: recipients.length,
      target_group_ids: groupIds,
    })
    .select('*')
    .single();

  if (error || !campaign) {
    throw new Error(error?.message || 'Failed to create campaign');
  }

  if (recipients.length > 0) {
    const rows = recipients.map((recipient) => ({
      campaign_id: campaign.id,
      subscriber_id: recipient.subscriberId,
      email: recipient.email,
      status: 'pending' as const,
    }));

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error: insertError } = await supabaseAdmin
        .from('marketing_campaign_recipients')
        .insert(chunk);
      if (insertError) throw new Error(insertError.message);
    }
  }

  if (!params.sendNow) {
    return { campaign: campaign as MarketingCampaign };
  }

  const sendResult = await sendCampaign(campaign.id);
  return { campaign: sendResult.campaign, sendResult };
}

export type SendCampaignResult = {
  campaign: MarketingCampaign;
  sent: number;
  failed: number;
  skipped: number;
  configured: boolean;
};

const EDITABLE_CAMPAIGN_STATUSES = new Set(['draft', 'failed']);

async function replaceCampaignRecipients(
  campaignId: string,
  groupIds: string[],
  extraEmailsInput?: string
): Promise<number> {
  const recipients = await resolveCampaignRecipients({
    groupIds,
    extraEmailsInput,
  });

  const { error: deleteError } = await supabaseAdmin
    .from('marketing_campaign_recipients')
    .delete()
    .eq('campaign_id', campaignId);

  if (deleteError) throw new Error(deleteError.message);

  if (recipients.length > 0) {
    const rows = recipients.map((recipient) => ({
      campaign_id: campaignId,
      subscriber_id: recipient.subscriberId,
      email: recipient.email,
      status: 'pending' as const,
    }));

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error: insertError } = await supabaseAdmin
        .from('marketing_campaign_recipients')
        .insert(chunk);
      if (insertError) throw new Error(insertError.message);
    }
  }

  return recipients.length;
}

/** Update content and/or recipients for draft or failed campaigns. */
export async function updateCampaign(params: {
  id: string;
  subject?: string;
  previewText?: string;
  body?: string;
  groupIds?: string[];
  extraEmailsInput?: string;
  /** When true (default if groupIds/extraEmails provided), re-resolve the recipient list. */
  replaceRecipients?: boolean;
}): Promise<MarketingCampaign> {
  const { data: existing, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!existing) throw new Error('Campaign not found');

  if (!EDITABLE_CAMPAIGN_STATUSES.has(existing.status)) {
    throw new Error('Only draft or failed campaigns can be edited');
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    status: 'draft',
    sent_count: 0,
    failed_count: 0,
    skipped_count: 0,
    sent_at: null,
  };

  if (typeof params.subject === 'string') {
    const subject = params.subject.trim();
    if (!subject) throw new Error('Subject is required');
    patch.subject = subject;
  }

  if (typeof params.previewText === 'string') {
    patch.preview_text = params.previewText.trim() || null;
  }

  if (typeof params.body === 'string') {
    const body = params.body.trim();
    if (!body || !bodyToPlainText(body)) throw new Error('Email body is required');
    patch.body_html = bodyToHtml(body);
    patch.body_text = bodyToPlainText(body);
  }

  const groupIdsProvided = Array.isArray(params.groupIds);
  const groupIds = groupIdsProvided
    ? params.groupIds!.filter((id) => typeof id === 'string' && id.trim())
    : ((existing.target_group_ids as string[]) || []);
  const extras = (params.extraEmailsInput || '').trim();
  const shouldReplaceRecipients =
    params.replaceRecipients === true ||
    groupIdsProvided ||
    typeof params.extraEmailsInput === 'string';

  if (shouldReplaceRecipients) {
    if (groupIds.length === 0 && !extras) {
      throw new Error('Select at least one recipient group or paste email addresses');
    }
    const count = await replaceCampaignRecipients(params.id, groupIds, params.extraEmailsInput);
    patch.target_group_ids = groupIds;
    patch.recipient_count = count;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('marketing_campaigns')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Failed to update campaign');
  }

  return updated as MarketingCampaign;
}

/** Clone a campaign into a new draft, optionally with a different audience. */
export async function duplicateCampaign(params: {
  sourceId: string;
  createdBy?: string | null;
  subject?: string;
  previewText?: string;
  body?: string;
  groupIds?: string[];
  extraEmailsInput?: string;
}): Promise<MarketingCampaign> {
  const { data: source, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', params.sourceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!source) throw new Error('Campaign not found');

  const sourceSubject = (source.subject || '').trim() || 'Untitled campaign';
  const subject =
    typeof params.subject === 'string'
      ? params.subject.trim()
      : `Copy of ${sourceSubject}`;
  const previewText =
    typeof params.previewText === 'string'
      ? params.previewText
      : (source.preview_text as string | null) || '';
  const body =
    typeof params.body === 'string'
      ? params.body
      : (source.body_html as string) || (source.body_text as string) || '';

  const groupIds = Array.isArray(params.groupIds)
    ? params.groupIds.filter((id) => typeof id === 'string' && id.trim())
    : ((source.target_group_ids as string[]) || []);

  let extras = (params.extraEmailsInput || '').trim();
  if (groupIds.length === 0 && !extras) {
    // Campaigns sent only to pasted emails have no stored extras — recover from recipient rows.
    const { data: recipientRows, error: recipientError } = await supabaseAdmin
      .from('marketing_campaign_recipients')
      .select('email')
      .eq('campaign_id', params.sourceId)
      .limit(2000);
    if (recipientError) throw new Error(recipientError.message);
    extras = (recipientRows || []).map((r) => r.email as string).filter(Boolean).join('\n');
  }

  if (groupIds.length === 0 && !extras) {
    throw new Error('Select at least one recipient group or paste email addresses');
  }

  const result = await createCampaign({
    subject,
    previewText,
    body,
    createdBy: params.createdBy,
    groupIds,
    extraEmailsInput: extras || undefined,
    sendNow: false,
  });

  return result.campaign;
}

export async function cancelCampaign(campaignId: string): Promise<MarketingCampaign> {
  const { data: existing, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!existing) throw new Error('Campaign not found');

  if (!EDITABLE_CAMPAIGN_STATUSES.has(existing.status)) {
    throw new Error('Only draft or failed campaigns can be cancelled');
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('marketing_campaigns')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Failed to cancel campaign');
  }

  return updated as MarketingCampaign;
}

export async function sendCampaign(campaignId: string): Promise<SendCampaignResult> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured. Set RESEND_API_KEY (and optionally EMAIL_FROM).');
  }

  const { data: campaign, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'sending') {
    throw new Error('Campaign is already sending');
  }

  if (campaign.status === 'cancelled') {
    throw new Error('Cancelled campaigns cannot be sent');
  }

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from('marketing_campaign_recipients')
    .select('id, email, subscriber_id, status')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'failed']);

  if (pendingError) throw new Error(pendingError.message);

  let recipients = pending || [];

  // Re-queue failed rows so retries can run cleanly.
  const failedIds = recipients.filter((r) => r.status === 'failed').map((r) => r.id);
  if (failedIds.length > 0) {
    for (let i = 0; i < failedIds.length; i += 200) {
      const chunk = failedIds.slice(i, i + 200);
      await supabaseAdmin
        .from('marketing_campaign_recipients')
        .update({ status: 'pending', error_message: null })
        .in('id', chunk);
    }
    recipients = recipients.map((r) =>
      r.status === 'failed' ? { ...r, status: 'pending', error_message: null } : r
    );
  }

  if (recipients.length === 0) {
    throw new Error('No pending recipients for this campaign');
  }

  // Preserve already-finalized counts; only recount outcomes from this run's queue.
  const { data: finalizedRows, error: finalizedError } = await supabaseAdmin
    .from('marketing_campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId)
    .in('status', ['sent', 'skipped']);

  if (finalizedError) throw new Error(finalizedError.message);

  let sent = (finalizedRows || []).filter((r) => r.status === 'sent').length;
  let skipped = (finalizedRows || []).filter((r) => r.status === 'skipped').length;
  let failed = 0;

  await supabaseAdmin
    .from('marketing_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  // Load unsubscribe tokens for subscribers
  const subscriberIds = recipients
    .map((r) => r.subscriber_id)
    .filter((id): id is string => Boolean(id));

  const tokenBySubscriberId = new Map<string, string>();
  if (subscriberIds.length > 0) {
    for (let i = 0; i < subscriberIds.length; i += 200) {
      const chunk = subscriberIds.slice(i, i + 200);
      const { data: subs, error: subsError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .select('id, unsubscribe_token, status')
        .in('id', chunk);
      if (subsError) throw new Error(subsError.message);
      for (const sub of subs || []) {
        if (sub.status === 'active') {
          tokenBySubscriberId.set(sub.id, sub.unsubscribe_token);
        }
      }
    }
  }

  for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SEND_BATCH_SIZE);

    await Promise.all(
      batch.map(async (recipient) => {
        const token = recipient.subscriber_id
          ? tokenBySubscriberId.get(recipient.subscriber_id)
          : null;

        if (!token) {
          skipped += 1;
          await supabaseAdmin
            .from('marketing_campaign_recipients')
            .update({
              status: 'skipped',
              error_message: 'Subscriber inactive or missing unsubscribe token',
            })
            .eq('id', recipient.id);
          return;
        }

        const result = await sendMarketingEmail({
          to: recipient.email,
          subject: campaign.subject,
          previewText: campaign.preview_text,
          bodyHtml: campaign.body_html,
          bodyText: campaign.body_text,
          unsubscribeToken: token,
          idempotencyKey: `${campaignId}:${recipient.id}`,
        });

        if (result.ok) {
          sent += 1;
          await supabaseAdmin
            .from('marketing_campaign_recipients')
            .update({
              status: 'sent',
              provider_message_id: result.messageId,
              provider_rfc_message_id: result.rfcMessageId,
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', recipient.id);
        } else {
          failed += 1;
          await supabaseAdmin
            .from('marketing_campaign_recipients')
            .update({
              status: 'failed',
              error_message: result.error,
            })
            .eq('id', recipient.id);
        }
      })
    );

    await supabaseAdmin
      .from('marketing_campaigns')
      .update({
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
      })
      .eq('id', campaignId);

    if (i + SEND_BATCH_SIZE < recipients.length) {
      await sleep(SEND_BATCH_DELAY_MS);
    }
  }

  const finalStatus = failed > 0 && sent === 0 ? 'failed' : 'sent';
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('marketing_campaigns')
    .update({
      status: finalStatus,
      sent_count: sent,
      failed_count: failed,
      skipped_count: skipped,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Failed to finalize campaign');
  }

  return {
    campaign: updated as MarketingCampaign,
    sent,
    failed,
    skipped,
    configured: true,
  };
}
