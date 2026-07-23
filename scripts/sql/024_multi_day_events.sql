-- Multi-day events: optional end_date + per-day check-in log
-- Tickets remain valid across days; one entry allowed per calendar day (UTC).

-- ---------------------------------------------------------------------------
-- Events: optional end date (null = single-day event)
-- ---------------------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

COMMENT ON COLUMN events.end_date IS
  'Optional last day of a multi-day event. Null means single-day (events.date only).';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_end_date_after_start;

ALTER TABLE events
  ADD CONSTRAINT events_end_date_after_start
  CHECK (end_date IS NULL OR end_date >= date);

-- ---------------------------------------------------------------------------
-- Ticket check-ins: one row per ticket per calendar day
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  check_in_day DATE NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_by UUID REFERENCES verifier_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ticket_check_ins_unique_day UNIQUE (ticket_id, check_in_day)
);

CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_event_day
  ON ticket_check_ins (event_id, check_in_day);

CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_ticket
  ON ticket_check_ins (ticket_id);

COMMENT ON TABLE ticket_check_ins IS
  'Per-day door admissions. Enforces one successful check-in per ticket per UTC calendar day.';

ALTER TABLE ticket_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can view check-ins for their events" ON ticket_check_ins;
DROP POLICY IF EXISTS "Admins can view all check-ins" ON ticket_check_ins;

CREATE POLICY "Organizers can view check-ins for their events" ON ticket_check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_check_ins.event_id
      AND auth.uid() = events.organizer_id
    )
  );

CREATE POLICY "Admins can view all check-ins" ON ticket_check_ins
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
