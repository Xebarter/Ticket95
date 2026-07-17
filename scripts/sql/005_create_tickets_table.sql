-- Create tickets table for TicketRevolution
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_logo_url TEXT,
  sponsors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'refunded')),
  qr_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets(user_id, status);

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can view tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can update tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
DROP POLICY IF EXISTS "System can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert tickets" ON tickets;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Organizers can view tickets for their events
CREATE POLICY "Organizers can view tickets for their events" ON tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: System can insert tickets (during order creation)
CREATE POLICY "System can insert tickets" ON tickets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Admins can insert tickets
CREATE POLICY "Admins can insert tickets" ON tickets
  FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Users can update their own tickets (mark as used)
CREATE POLICY "Users can update own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Organizers can update tickets for their events (for verification)
CREATE POLICY "Organizers can update tickets for their events" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND auth.uid() = events.organizer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Admins can update all tickets
CREATE POLICY "Admins can update all tickets" ON tickets
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_updated_at_trigger ON tickets;
CREATE TRIGGER tickets_updated_at_trigger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- Function to auto-populate ticket details from event
CREATE OR REPLACE FUNCTION populate_ticket_details()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  sponsors_json JSONB;
BEGIN
  -- Get event details
  SELECT e.name, e.organizer_name, e.organizer_logo_url
  INTO event_record
  FROM events e
  WHERE e.id = NEW.event_id;
  
  -- Get sponsors for the event
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('name', s.name, 'logo_url', s.logo_url)
      ORDER BY s.order_index
    ),
    '[]'::jsonb
  )
  INTO sponsors_json
  FROM sponsors s
  WHERE s.event_id = NEW.event_id;
  
  -- Populate fields if not already set
  IF NEW.event_name IS NULL OR NEW.event_name = '' THEN
    NEW.event_name := event_record.name;
  END IF;
  
  IF NEW.organizer_name IS NULL OR NEW.organizer_name = '' THEN
    NEW.organizer_name := event_record.organizer_name;
  END IF;
  
  IF NEW.organizer_logo_url IS NULL OR NEW.organizer_logo_url = '' THEN
    NEW.organizer_logo_url := event_record.organizer_logo_url;
  END IF;
  
  IF NEW.sponsors IS NULL OR NEW.sponsors = '[]'::jsonb THEN
    NEW.sponsors := sponsors_json;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS populate_ticket_details_trigger ON tickets;
CREATE TRIGGER populate_ticket_details_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION populate_ticket_details();
