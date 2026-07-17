-- Add event images support
-- Primary image URL and an optional gallery of image URLs

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
