-- Per-event affiliate commission rate (organizer-set, minimum 5%)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS affiliate_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 5;

-- Backfill / enforce floor for any existing rows
UPDATE events
SET affiliate_commission_percent = 5
WHERE affiliate_commission_percent IS NULL
   OR affiliate_commission_percent < 5;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_affiliate_commission_percent_check;

ALTER TABLE events
  ADD CONSTRAINT events_affiliate_commission_percent_check
  CHECK (
    affiliate_commission_percent >= 5
    AND affiliate_commission_percent <= 100
  );

COMMENT ON COLUMN events.affiliate_commission_percent IS
  'Commission percent paid to affiliates for referred sales. Minimum 5%.';
