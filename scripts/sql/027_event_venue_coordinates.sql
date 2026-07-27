-- Event venue coordinates from Google Places (for Near me distance filtering)

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_lat DOUBLE PRECISION;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_lng DOUBLE PRECISION;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_place_id TEXT;

COMMENT ON COLUMN events.venue_lat IS
  'Latitude of the venue from Google Places (nullable for legacy free-text venues)';

COMMENT ON COLUMN events.venue_lng IS
  'Longitude of the venue from Google Places (nullable for legacy free-text venues)';

COMMENT ON COLUMN events.venue_place_id IS
  'Google Places place_id for the selected venue';

CREATE INDEX IF NOT EXISTS idx_events_venue_coords
  ON events (venue_lat, venue_lng)
  WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL;
