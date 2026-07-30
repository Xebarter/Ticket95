import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  bodyToHtml,
  bodyToPlainText,
  getEmailReplyToAddress,
  getResendClient,
  getResendWebhookSecret,
  isReplyInboxConfigured,
  isValidEmail,
  sendThreadedReplyEmail,
} from '@/lib/email';

export type ReplyStatus = 'unread' | 'read' | 'archived';

export type MarketingEmailReply = {
  id: string;
  resend_email_id: string;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  campaign_id: string | null;
  subscriber_id: string | null;
  status: ReplyStatus;
  attachment_meta: Array<{
    id?: string;
    filename?: string | null;
    content_type?: string;
  }>;
  received_at: string;
  created_at: string;
  updated_at: string;
  campaign_subject?: string | null;
};

export type MarketingEmailAdminReply = {
  id: string;
  reply_id: string;
  body_text: string;
  body_html: string | null;
  resend_email_id: string | null;
  message_id: string | null;
  created_by: string | null;
  created_at: string;
};

function normalizeEmail(raw: string): string {
  const trimmed = (raw || '').trim().toLowerCase();
  const match = trimmed.match(/<?([^\s<>]+@[^\s<>]+)>?/);
  return (match?.[1] || trimmed).toLowerCase();
}

function parseFromHeader(from: string): { email: string; name: string | null } {
  const raw = (from || '').trim();
  const named = raw.match(/^(.*)<([^>]+)>$/);
  if (named) {
    const name = named[1].trim().replace(/^"|"$/g, '') || null;
    return { email: normalizeEmail(named[2]), name };
  }
  return { email: normalizeEmail(raw), name: null };
}

function headerValue(
  headers: Record<string, string> | null | undefined,
  ...keys: string[]
): string | null {
  if (!headers) return null;
  const entries = Object.entries(headers);
  for (const key of keys) {
    const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found?.[1]) return found[1].trim();
  }
  return null;
}

function extractMessageIds(value: string | null): string[] {
  if (!value) return [];
  const matches = value.match(/<[^>]+>/g) || [];
  const bare = value
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.includes('@') && !p.startsWith('<'));
  return Array.from(new Set([...matches, ...bare.map((b) => (b.startsWith('<') ? b : `<${b}>`))]));
}

async function resolveLinks(params: {
  fromEmail: string;
  inReplyTo: string | null;
  referencesHeader: string | null;
}): Promise<{ campaignId: string | null; subscriberId: string | null }> {
  let campaignId: string | null = null;
  let subscriberId: string | null = null;

  const { data: subscriber } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', params.fromEmail)
    .maybeSingle();

  if (subscriber?.id) subscriberId = subscriber.id;

  const candidates = [
    ...extractMessageIds(params.inReplyTo),
    ...extractMessageIds(params.referencesHeader),
  ];

  for (const candidate of candidates.slice(0, 12)) {
    const bare = candidate.replace(/^<|>$/g, '');
    const variants = Array.from(new Set([candidate, bare, `<${bare}>`]));
    for (const variant of variants) {
      const { data } = await supabaseAdmin
        .from('marketing_campaign_recipients')
        .select('campaign_id')
        .eq('provider_rfc_message_id', variant)
        .limit(1)
        .maybeSingle();
      if (data?.campaign_id) {
        campaignId = data.campaign_id;
        break;
      }
    }
    if (campaignId) break;
  }

  // Fallback: most recent campaign sent to this email
  if (!campaignId && params.fromEmail) {
    const { data: recent } = await supabaseAdmin
      .from('marketing_campaign_recipients')
      .select('campaign_id')
      .eq('email', params.fromEmail)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.campaign_id) campaignId = recent.campaign_id;
  }

  return { campaignId, subscriberId };
}

function formatResendApiError(message: string): string {
  if (/restricted to only send emails/i.test(message)) {
    return (
      'Your RESEND_API_KEY is Sending access only. Receiving replies requires a Full access key. ' +
      'Create one at https://resend.com/api-keys (permission: Full access), then update RESEND_API_KEY locally and on Vercel.'
    );
  }
  return message;
}

export async function ingestReceivedEmail(resendEmailId: string): Promise<MarketingEmailReply | null> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data: existing } = await supabaseAdmin
    .from('marketing_email_replies')
    .select('*')
    .eq('resend_email_id', resendEmailId)
    .maybeSingle();

  if (existing) {
    return normalizeReplyRow(existing);
  }

  const { data, error } = await resend.emails.receiving.get(resendEmailId, {
    html_format: 'cid',
  });

  if (error || !data) {
    throw new Error(formatResendApiError(error?.message || 'Failed to fetch received email'));
  }

  const parsedFrom = parseFromHeader(data.from);
  if (!parsedFrom.email || !isValidEmail(parsedFrom.email)) {
    throw new Error('Received email has invalid from address');
  }

  const inReplyTo = headerValue(data.headers, 'in-reply-to', 'In-Reply-To');
  const referencesHeader = headerValue(data.headers, 'references', 'References');
  const { campaignId, subscriberId } = await resolveLinks({
    fromEmail: parsedFrom.email,
    inReplyTo,
    referencesHeader,
  });

  const attachmentMeta = (data.attachments || []).map((att) => ({
    id: att.id,
    filename: att.filename,
    content_type: att.content_type,
  }));

  const row = {
    resend_email_id: data.id,
    message_id: data.message_id || null,
    from_email: parsedFrom.email,
    from_name: parsedFrom.name,
    to_emails: data.to || [],
    subject: data.subject || null,
    body_text: data.text || (data.html ? bodyToPlainText(data.html) : null),
    body_html: data.html || null,
    in_reply_to: inReplyTo,
    references_header: referencesHeader,
    campaign_id: campaignId,
    subscriber_id: subscriberId,
    status: 'unread' as const,
    attachment_meta: attachmentMeta,
    received_at: data.created_at || new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('marketing_email_replies')
    .insert(row)
    .select('*')
    .single();

  if (insertError) {
    // Race: another webhook already inserted
    if (insertError.code === '23505') {
      const { data: raced } = await supabaseAdmin
        .from('marketing_email_replies')
        .select('*')
        .eq('resend_email_id', resendEmailId)
        .maybeSingle();
      if (raced) return normalizeReplyRow(raced);
    }
    throw new Error(insertError.message || 'Failed to store reply');
  }

  return normalizeReplyRow(inserted);
}

function normalizeReplyRow(row: Record<string, unknown>): MarketingEmailReply {
  return {
    id: row.id as string,
    resend_email_id: row.resend_email_id as string,
    message_id: (row.message_id as string) || null,
    from_email: row.from_email as string,
    from_name: (row.from_name as string) || null,
    to_emails: Array.isArray(row.to_emails) ? (row.to_emails as string[]) : [],
    subject: (row.subject as string) || null,
    body_text: (row.body_text as string) || null,
    body_html: (row.body_html as string) || null,
    in_reply_to: (row.in_reply_to as string) || null,
    references_header: (row.references_header as string) || null,
    campaign_id: (row.campaign_id as string) || null,
    subscriber_id: (row.subscriber_id as string) || null,
    status: row.status as ReplyStatus,
    attachment_meta: Array.isArray(row.attachment_meta)
      ? (row.attachment_meta as MarketingEmailReply['attachment_meta'])
      : [],
    received_at: row.received_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    campaign_subject: (row.campaign_subject as string) || null,
  };
}

/** Probe whether the configured Resend key can read inbound/received emails. */
export async function getReceivingAccessError(): Promise<string | null> {
  const resend = getResendClient();
  if (!resend) return 'RESEND_API_KEY is not configured';

  const { error } = await resend.emails.receiving.list({ limit: 1 });
  if (!error) return null;
  return formatResendApiError(error.message || 'Failed to access Resend receiving API');
}

export async function listReplies(params?: {
  status?: ReplyStatus | 'all' | 'inbox';
  q?: string;
  limit?: number;
}): Promise<{
  replies: MarketingEmailReply[];
  unreadCount: number;
  replyInboxConfigured: boolean;
  emailReplyTo: string | null;
  receivingAccessError: string | null;
}> {
  const limit = Math.min(Math.max(params?.limit || 100, 1), 500);
  let query = supabaseAdmin
    .from('marketing_email_replies')
    .select('*, marketing_campaigns(subject)')
    .order('received_at', { ascending: false })
    .limit(limit);

  const status = params?.status || 'inbox';
  if (status === 'inbox') {
    query = query.in('status', ['unread', 'read']);
  } else if (status !== 'all') {
    query = query.eq('status', status);
  }

  const q = (params?.q || '').trim();
  if (q) {
    query = query.or(`from_email.ilike.%${q}%,subject.ilike.%${q}%,body_text.ilike.%${q}%`);
  }

  const [{ data, error }, receivingAccessError] = await Promise.all([
    query,
    getReceivingAccessError().catch((err) =>
      err instanceof Error ? err.message : 'Failed to check Resend receiving access'
    ),
  ]);
  if (error) throw new Error(error.message);

  const { count, error: countError } = await supabaseAdmin
    .from('marketing_email_replies')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unread');

  if (countError) throw new Error(countError.message);

  const replies = (data || []).map((row) => {
    const campaign = row.marketing_campaigns as { subject?: string } | null;
    const { marketing_campaigns: _c, ...rest } = row as Record<string, unknown> & {
      marketing_campaigns?: { subject?: string } | null;
    };
    return normalizeReplyRow({
      ...rest,
      campaign_subject: campaign?.subject || null,
    });
  });

  return {
    replies,
    unreadCount: count || 0,
    replyInboxConfigured: isReplyInboxConfigured(),
    emailReplyTo: getEmailReplyToAddress(),
    receivingAccessError,
  };
}

export async function getReply(id: string): Promise<{
  reply: MarketingEmailReply;
  adminReplies: MarketingEmailAdminReply[];
} | null> {
  const { data, error } = await supabaseAdmin
    .from('marketing_email_replies')
    .select('*, marketing_campaigns(subject)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const campaign = data.marketing_campaigns as { subject?: string } | null;
  const { marketing_campaigns: _c, ...rest } = data as Record<string, unknown> & {
    marketing_campaigns?: { subject?: string } | null;
  };

  const { data: adminReplies, error: adminError } = await supabaseAdmin
    .from('marketing_email_admin_replies')
    .select('*')
    .eq('reply_id', id)
    .order('created_at', { ascending: true });

  if (adminError) throw new Error(adminError.message);

  return {
    reply: normalizeReplyRow({
      ...rest,
      campaign_subject: campaign?.subject || null,
    }),
    adminReplies: (adminReplies || []) as MarketingEmailAdminReply[],
  };
}

export async function setReplyStatus(id: string, status: ReplyStatus): Promise<MarketingEmailReply> {
  const { data, error } = await supabaseAdmin
    .from('marketing_email_replies')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Reply not found');
  return normalizeReplyRow(data);
}

export async function sendAdminReply(params: {
  replyId: string;
  body: string;
  createdBy?: string | null;
}): Promise<{ adminReply: MarketingEmailAdminReply; reply: MarketingEmailReply }> {
  const body = params.body.trim();
  if (!body) throw new Error('Reply body is required');

  const detail = await getReply(params.replyId);
  if (!detail) throw new Error('Reply not found');

  const subject = detail.reply.subject?.startsWith('Re:')
    ? detail.reply.subject
    : `Re: ${detail.reply.subject || 'Your message'}`;

  const referencesParts = [
    ...extractMessageIds(detail.reply.references_header),
    ...extractMessageIds(detail.reply.message_id),
  ];
  const references = Array.from(new Set(referencesParts)).join(' ') || null;
  const inReplyTo = detail.reply.message_id || detail.reply.in_reply_to;

  const sendResult = await sendThreadedReplyEmail({
    to: detail.reply.from_email,
    subject,
    bodyText: body,
    inReplyTo,
    references,
  });

  if (!sendResult.ok) {
    throw new Error(sendResult.error);
  }

  const { data: adminReply, error } = await supabaseAdmin
    .from('marketing_email_admin_replies')
    .insert({
      reply_id: params.replyId,
      body_text: body,
      body_html: bodyToHtml(body),
      resend_email_id: sendResult.messageId,
      message_id: sendResult.rfcMessageId,
      created_by: params.createdBy || null,
    })
    .select('*')
    .single();

  if (error || !adminReply) {
    throw new Error(error?.message || 'Failed to store admin reply');
  }

  if (detail.reply.status === 'unread') {
    await setReplyStatus(params.replyId, 'read');
  }

  const updated = await getReply(params.replyId);
  return {
    adminReply: adminReply as MarketingEmailAdminReply,
    reply: updated!.reply,
  };
}

export function verifyResendWebhook(payload: string, headers: Headers) {
  const secret = getResendWebhookSecret();
  const resend = getResendClient();
  if (!secret || !resend) {
    throw new Error('RESEND_WEBHOOK_SECRET or RESEND_API_KEY is not configured');
  }

  // Resend SDK expects { id, timestamp, signature }, not the raw Headers object.
  // See: https://resend.com/docs/webhooks/verify-webhooks-requests
  const id = headers.get('svix-id') || headers.get('webhook-id') || '';
  const timestamp = headers.get('svix-timestamp') || headers.get('webhook-timestamp') || '';
  const signature = headers.get('svix-signature') || headers.get('webhook-signature') || '';

  if (!id || !timestamp || !signature) {
    throw new Error('Missing webhook signature headers');
  }

  return resend.webhooks.verify({
    payload,
    headers: {
      id,
      timestamp,
      signature,
    } as unknown as Headers,
    webhookSecret: secret,
  });
}

/** Pull recent inbound emails from Resend into the admin inbox (backfill / webhook fallback). */
export async function syncReceivedEmailsFromResend(limit = 50): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data, error } = await resend.emails.receiving.list({ limit: Math.min(Math.max(limit, 1), 100) });
  if (error) {
    throw new Error(formatResendApiError(error.message || 'Failed to list received emails'));
  }

  const items = data?.data || [];
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('marketing_email_replies')
        .select('id')
        .eq('resend_email_id', item.id)
        .maybeSingle();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ingestReceivedEmail(item.id);
      imported += 1;
    } catch (err) {
      errors.push(
        `${item.id}: ${err instanceof Error ? err.message : 'import failed'}`
      );
    }
  }

  return { imported, skipped, errors };
}
