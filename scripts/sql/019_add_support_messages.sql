-- Add support messages table (Contact Us form submissions)

-- =====================================================
-- 19. CREATE SUPPORT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,

  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  order_reference TEXT,
  event_name TEXT,

  message TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_email ON support_messages(email);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

-- RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view support messages" ON support_messages;
CREATE POLICY "Admins can view support messages"
  ON support_messages
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update support messages" ON support_messages;
CREATE POLICY "Admins can update support messages"
  ON support_messages
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION update_support_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_messages_updated_at_trigger ON support_messages;
CREATE TRIGGER support_messages_updated_at_trigger
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_messages_updated_at();

