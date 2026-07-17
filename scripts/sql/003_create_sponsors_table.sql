-- Create sponsors table for TicketRevolution
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sponsors_event_id ON sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_order_index ON sponsors(event_id, order_index);

-- Enable Row Level Security
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view sponsors of approved events" ON sponsors;
DROP POLICY IF EXISTS "Organizers can view sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can view all sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can manage sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can manage all sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can insert sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can update sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can delete sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can insert sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can update sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can delete sponsors" ON sponsors;

-- Policy: Anyone can view sponsors of approved events
CREATE POLICY "Anyone can view sponsors of approved events" ON sponsors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND events.status = 'approved'
    )
  );

-- Policy: Organizers can view sponsors for their events
CREATE POLICY "Organizers can view sponsors" ON sponsors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Admins can view all sponsors
CREATE POLICY "Admins can view all sponsors" ON sponsors
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Event organizers can insert sponsors for their events
CREATE POLICY "Organizers can insert sponsors" ON sponsors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Event organizers can update sponsors for their events
CREATE POLICY "Organizers can update sponsors" ON sponsors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND auth.uid() = events.organizer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Event organizers can delete sponsors for their events
CREATE POLICY "Organizers can delete sponsors" ON sponsors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = sponsors.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Admins can insert sponsors
CREATE POLICY "Admins can insert sponsors" ON sponsors
  FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admins can update sponsors
CREATE POLICY "Admins can update sponsors" ON sponsors
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admins can delete sponsors
CREATE POLICY "Admins can delete sponsors" ON sponsors
  FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
