-- =====================================================
-- 030: Event deactivation (admin-approved)
-- =====================================================
-- Preferred model: status stays `approved` while a request is pending;
-- only flips to `deactivated` when an admin approves. Reactivation uses
-- the same request-flag pattern while status is `deactivated`.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'deactivated'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
  ADD COLUMN IF NOT EXISTS deactivation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivation_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_deactivation_requested
  ON events (deactivation_requested_at DESC)
  WHERE deactivation_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_reactivation_requested
  ON events (reactivation_requested_at DESC)
  WHERE reactivation_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_deactivated
  ON events (status, updated_at DESC)
  WHERE status = 'deactivated';
