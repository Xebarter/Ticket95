-- =====================================================
-- 031: Admin soft-remove status (`removed`)
-- =====================================================
-- Admin "Delete" soft-removes the event from the public site.
-- Organizers can edit/resubmit (→ pending) or permanently hard-delete.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'deactivated', 'removed'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_removed
  ON events (status, removed_at DESC)
  WHERE status = 'removed';
