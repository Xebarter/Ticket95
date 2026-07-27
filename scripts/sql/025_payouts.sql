-- =====================================================
-- 025: Payouts, order fee shares, affiliate default 10%
-- =====================================================

-- Order share columns (nullable for back-compat; filled on new completions)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gateway_fee_amount NUMERIC(12, 2);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12, 2);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_share_amount NUMERIC(12, 2);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS organizer_share_amount NUMERIC(12, 2);

COMMENT ON COLUMN orders.gateway_fee_amount IS 'Payment gateway fee (3.5% of total_price)';
COMMENT ON COLUMN orders.platform_fee_amount IS 'Ticket95 platform fee (2% of total_price)';
COMMENT ON COLUMN orders.affiliate_share_amount IS 'Affiliate commission share of total_price (0 if none)';
COMMENT ON COLUMN orders.organizer_share_amount IS 'Net amount owed to organizer after fees and affiliate cut';

-- Optional MoMo phone for payout prefills
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payout_phone TEXT;

COMMENT ON COLUMN users.payout_phone IS 'Preferred mobile money phone for payouts (e.g. 2567…)';

-- Payouts ledger
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_type TEXT NOT NULL CHECK (payee_type IN ('organizer', 'affiliate')),
  payee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'UGX',
  phone TEXT NOT NULL,
  email TEXT,
  country TEXT NOT NULL DEFAULT 'UG',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'error', 'cancelled')),
  paytota_payout_id TEXT,
  paytota_reference TEXT NOT NULL UNIQUE,
  execution_url TEXT,
  paytota_metadata JSONB DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payouts_payee_user_status
  ON payouts (payee_user_id, status);

CREATE INDEX IF NOT EXISTS idx_payouts_payee_type_status
  ON payouts (payee_type, status);

CREATE INDEX IF NOT EXISTS idx_payouts_paytota_id
  ON payouts (paytota_payout_id);

CREATE INDEX IF NOT EXISTS idx_payouts_requested_at
  ON payouts (requested_at DESC);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payouts" ON payouts;
CREATE POLICY "Users can view own payouts" ON payouts
  FOR SELECT USING (auth.uid() = payee_user_id);

DROP POLICY IF EXISTS "Admins can view all payouts" ON payouts;
CREATE POLICY "Admins can view all payouts" ON payouts
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payouts_updated_at_trigger ON payouts;
CREATE TRIGGER payouts_updated_at_trigger
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();

-- Link commissions to payouts
ALTER TABLE affiliate_commissions
  ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_payout
  ON affiliate_commissions (payout_id);

-- Raise affiliate default to 10%
INSERT INTO platform_settings (key, value)
VALUES ('affiliate_commission_percent', '10'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = '10'::jsonb,
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE events
  ALTER COLUMN affiliate_commission_percent SET DEFAULT 10;

UPDATE events
SET affiliate_commission_percent = 10
WHERE affiliate_commission_percent = 5;
