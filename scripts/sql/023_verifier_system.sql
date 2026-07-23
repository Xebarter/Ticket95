-- Verifier system: shareable door check-in without organizer login
-- Adds event verify slug + access code, verifier sessions, check-in audit columns

-- ---------------------------------------------------------------------------
-- Events: public verifier slug + hashed access code
-- ---------------------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS verify_slug TEXT;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS verifier_code_hash TEXT;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS verifier_code_rotated_at TIMESTAMPTZ;

-- Backfill slugs for existing events (short, URL-safe)
UPDATE events
SET verify_slug = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE verify_slug IS NULL OR verify_slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_verify_slug
  ON events (verify_slug)
  WHERE verify_slug IS NOT NULL;

COMMENT ON COLUMN events.verify_slug IS
  'Public path segment for /verify/{slug} door staff access';
COMMENT ON COLUMN events.verifier_code_hash IS
  'SHA-256 hash of the 6-digit verifier access code (with server pepper)';
COMMENT ON COLUMN events.verifier_code_rotated_at IS
  'When the organizer last generated/rotated the verifier access code';

-- ---------------------------------------------------------------------------
-- Verifier sessions (revocable device sessions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verifier_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Door device',
  token_jti TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verifier_sessions_event_id
  ON verifier_sessions (event_id);

CREATE INDEX IF NOT EXISTS idx_verifier_sessions_active
  ON verifier_sessions (event_id, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE verifier_sessions IS
  'Short-lived door-staff verifier sessions issued after access-code login';

-- ---------------------------------------------------------------------------
-- Tickets: check-in audit
-- ---------------------------------------------------------------------------
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES verifier_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets (event_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_event_updated_at
  ON tickets (event_id, updated_at);

COMMENT ON COLUMN tickets.checked_in_at IS
  'When the ticket was marked used at the door';
COMMENT ON COLUMN tickets.checked_in_by IS
  'Verifier session that checked the ticket in (null if organizer/admin path)';
