import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { getSiteUrl } from '@/lib/site-url';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Parse one or many emails from free text (comma, semicolon, whitespace, newlines).
 */
export function parseEmailList(input: string): string[] {
  const raw = (input || '')
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const unique = new Set<string>();
  for (const email of raw) {
    if (isValidEmail(email)) unique.add(email);
  }
  return Array.from(unique);
}

export function createUnsubscribeToken(): string {
  return randomBytes(24).toString('hex');
}

export function getEmailFromAddress(): string {
  const configured = (process.env.EMAIL_FROM || '').trim();
  if (configured) return configured;
  return 'Ticket95 <noreply@ticket95.com>';
}

export function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function isEmailConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY || '').trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convert plain text (or light HTML) into safe paragraph HTML. */
export function bodyToHtml(body: string): string {
  const trimmed = (body || '').trim();
  if (!trimmed) return '';

  // If it already looks like HTML, keep it (admin-authored).
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = escapeHtml(paragraph).replace(/\n/g, '<br />');
      return `<p style="margin:0 0 16px;line-height:1.6;color:#1e293b;font-size:15px;">${lines}</p>`;
    })
    .join('');
}

export function bodyToPlainText(body: string): string {
  const trimmed = (body || '').trim();
  if (!trimmed) return '';
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildUnsubscribeUrl(token: string): string {
  return `${getSiteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function wrapMarketingEmailHtml(input: {
  subject: string;
  previewText?: string | null;
  bodyHtml: string;
  unsubscribeUrl: string;
}): string {
  const preview = escapeHtml((input.previewText || input.subject).trim());
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:Lexend,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0e1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(180deg,#1a2238,#0a0e1a);padding:28px 28px 22px;border-bottom:2px solid #d4b46a;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Ticket<span style="color:#d4b46a;">95</span></div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;">Event updates</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="border-top:1px solid #e2e8f0;padding-top:18px;font-size:12px;line-height:1.5;color:#64748b;">
                <p style="margin:0 0 8px;">You’re receiving this because you subscribed to Ticket95 updates.</p>
                <p style="margin:0;">
                  <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#9A7B2F;text-decoration:underline;">Unsubscribe</a>
                  · © ${year} Ticket95.com
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendMarketingEmailInput = {
  to: string;
  subject: string;
  previewText?: string | null;
  bodyHtml: string;
  bodyText?: string | null;
  unsubscribeToken: string;
  idempotencyKey?: string;
};

export type SendMarketingEmailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

export async function sendMarketingEmail(
  input: SendMarketingEmailInput
): Promise<SendMarketingEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return {
      ok: false,
      error: 'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.',
    };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const html = wrapMarketingEmailHtml({
    subject: input.subject,
    previewText: input.previewText,
    bodyHtml: input.bodyHtml,
    unsubscribeUrl,
  });
  const text =
    (input.bodyText || bodyToPlainText(input.bodyHtml)) +
    `\n\nUnsubscribe: ${unsubscribeUrl}`;

  try {
    const { data, error } = await resend.emails.send(
      {
        from: getEmailFromAddress(),
        to: input.to,
        subject: input.subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      },
      input.idempotencyKey
        ? {
            idempotencyKey: createHash('sha256')
              .update(input.idempotencyKey)
              .digest('hex')
              .slice(0, 32),
          }
        : undefined
    );

    if (error) {
      return { ok: false, error: error.message || 'Failed to send email' };
    }

    return { ok: true, messageId: data?.id || null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
