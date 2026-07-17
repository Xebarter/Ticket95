-- Add is_featured column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for faster featured event queries (includes date for ORDER BY)
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured) WHERE status = 'approved' AND is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_featured_date ON events(date ASC) WHERE status = 'approved' AND is_featured = true;

-- Add comment for documentation
COMMENT ON COLUMN events.is_featured IS 'Indicates if the event should be displayed in the featured carousel';
