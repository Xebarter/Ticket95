-- =====================================================
-- 028: Marketing email reply inbox (Resend inbound)
-- =====================================================

-- RFC Message-ID from outbound sends (for In-Reply-To matching)
ALTER TABLE marketing_campaign_recipients
  ADD COLUMN IF NOT EXISTS provider_rfc_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_recipients_rfc_message_id
  ON marketing_campaign_recipients (provider_rfc_message_id)
  WHERE provider_rfc_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT NOT NULL UNIQUE,
  message_id TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'archived')),
  attachment_meta JSONB NOT NULL DEFAULT '[]'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_status
  ON marketing_email_replies (status);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_received_at
  ON marketing_email_replies (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_from_email
  ON marketing_email_replies (from_email);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_campaign
  ON marketing_email_replies (campaign_id);

CREATE INDEX IF NOT EXISTS idx_marketing_email_replies_message_id
  ON marketing_email_replies (message_id)
  WHERE message_id IS NOT NULL;

ALTER TABLE marketing_email_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage marketing email replies" ON marketing_email_replies;
CREATE POLICY "Admins can manage marketing email replies"
  ON marketing_email_replies
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION update_marketing_email_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_email_replies_updated_at_trigger ON marketing_email_replies;
CREATE TRIGGER marketing_email_replies_updated_at_trigger
  BEFORE UPDATE ON marketing_email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_email_replies_updated_at();

CREATE TABLE IF NOT EXISTS marketing_email_admin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES marketing_email_replies(id) ON DELETE CASCADE,
  body_text TEXT NOT NULL,
  body_html TEXT,
  resend_email_id TEXT,
  message_id TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_admin_replies_reply
  ON marketing_email_admin_replies (reply_id, created_at ASC);

ALTER TABLE marketing_email_admin_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage marketing admin replies" ON marketing_email_admin_replies;
CREATE POLICY "Admins can manage marketing admin replies"
  ON marketing_email_admin_replies
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
