-- Create events table for TicketRevolution
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  ticket_price DECIMAL(10, 2) NOT NULL CHECK (ticket_price >= 0),
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  tickets_available INTEGER NOT NULL CHECK (tickets_available >= 0 AND tickets_available <= total_tickets),
  organizer_name TEXT NOT NULL,
  organizer_logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date) WHERE status = 'approved';

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view approved events" ON events;
DROP POLICY IF EXISTS "Organizers can view own events" ON events;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Organizers can insert their own events" ON events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;
DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

-- Policy: Anyone can view approved events
CREATE POLICY "Anyone can view approved events" ON events
  FOR SELECT USING (status = 'approved');

-- Policy: Users can view their own events (regardless of status)
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = organizer_id);

-- Policy: Admins can view all events
CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Any authenticated user can create events
CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id AND 
    auth.uid() IS NOT NULL
  );

-- Policy: Users can update their own events (except status)
CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Policy: Admins can update any event
CREATE POLICY "Admins can update events" ON events
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admins can delete events
CREATE POLICY "Admins can delete events" ON events
  FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at_trigger ON events;
CREATE TRIGGER events_updated_at_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- Function to prevent tickets_available from going negative
CREATE OR REPLACE FUNCTION check_tickets_available()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tickets_available < 0 THEN
    RAISE EXCEPTION 'Cannot reduce tickets_available below 0';
  END IF;
  IF NEW.tickets_available > NEW.total_tickets THEN
    RAISE EXCEPTION 'tickets_available cannot exceed total_tickets';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_tickets_available_trigger ON events;
CREATE TRIGGER check_tickets_available_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION check_tickets_available();
