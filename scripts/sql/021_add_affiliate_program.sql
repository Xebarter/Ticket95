-- Affiliate program: platform commission settings, event opt-in, affiliate codes, commissions

-- =====================================================
-- 21a. EVENT AFFILIATE OPT-IN
-- =====================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS affiliates_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_affiliates_enabled
  ON events(affiliates_enabled)
  WHERE affiliates_enabled = true;

-- =====================================================
-- 21b. PLATFORM SETTINGS (key/value)
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (key, value)
VALUES
  ('affiliate_program_enabled', 'true'::jsonb),
  ('affiliate_commission_percent', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON platform_settings;
CREATE POLICY "Anyone can read platform settings"
  ON platform_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update platform settings" ON platform_settings;
CREATE POLICY "Admins can update platform settings"
  ON platform_settings
  FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can insert platform settings" ON platform_settings;
CREATE POLICY "Admins can insert platform settings"
  ON platform_settings
  FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_settings_updated_at_trigger ON platform_settings;
CREATE TRIGGER platform_settings_updated_at_trigger
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

-- =====================================================
-- 21c. AFFILIATES
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  payout_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own affiliate profile" ON affiliates;
CREATE POLICY "Users can view own affiliate profile"
  ON affiliates
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can insert own affiliate profile" ON affiliates;
CREATE POLICY "Users can insert own affiliate profile"
  ON affiliates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own affiliate profile" ON affiliates;
CREATE POLICY "Users can update own affiliate profile"
  ON affiliates
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliates_updated_at_trigger ON affiliates;
CREATE TRIGGER affiliates_updated_at_trigger
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliates_updated_at();

-- =====================================================
-- 21d. AFFILIATE COMMISSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  order_amount NUMERIC(12, 2) NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate
  ON affiliate_commissions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status
  ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_event
  ON affiliate_commissions(event_id);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own commissions" ON affiliate_commissions;
CREATE POLICY "Affiliates can view own commissions"
  ON affiliate_commissions
  FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update affiliate commissions" ON affiliate_commissions;
CREATE POLICY "Admins can update affiliate commissions"
  ON affiliate_commissions
  FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION update_affiliate_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliate_commissions_updated_at_trigger ON affiliate_commissions;
CREATE TRIGGER affiliate_commissions_updated_at_trigger
  BEFORE UPDATE ON affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_commissions_updated_at();

-- =====================================================
-- 21e. ORDER AFFILIATE ATTRIBUTION COLUMNS
-- =====================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_referral_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id)
  WHERE affiliate_id IS NOT NULL;
