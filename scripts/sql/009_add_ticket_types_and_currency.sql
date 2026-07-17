-- Add currency field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Create ticket_types table for multiple ticket types per event
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  total_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on event_id for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);

-- Enable RLS on ticket_types
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_types
-- Allow everyone to read ticket types (for public event viewing)
CREATE POLICY "Allow public read access to ticket types"
  ON ticket_types
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert ticket types (for event creation)
CREATE POLICY "Allow authenticated users to insert ticket types"
  ON ticket_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow event organizers to update their ticket types
CREATE POLICY "Allow organizers to update their ticket types"
  ON ticket_types
  FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Allow event organizers to delete their ticket types
CREATE POLICY "Allow organizers to delete their ticket types"
  ON ticket_types
  FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Update tickets table to reference ticket_type
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type_name VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10, 2);

-- Add currency to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Update the updated_at timestamp trigger for ticket_types
CREATE OR REPLACE FUNCTION update_ticket_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_types_updated_at();

-- Comments for documentation
COMMENT ON TABLE ticket_types IS 'Stores different ticket types for each event (e.g., VIP, General Admission, Early Bird)';
COMMENT ON COLUMN events.currency IS 'Currency code for the event (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN ticket_types.price IS 'Price for this ticket type in the event currency';
COMMENT ON COLUMN ticket_types.total_quantity IS 'Total number of tickets available for this type';
COMMENT ON COLUMN ticket_types.available_quantity IS 'Number of tickets still available for purchase';
