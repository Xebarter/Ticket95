-- Add event category support (Sports, Concert, Movies, Other Events)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE public.events
SET category = 'other'
WHERE category IS NULL OR category = '';

ALTER TABLE public.events
  ALTER COLUMN category SET DEFAULT 'other';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_category_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_category_check
  CHECK (category IN ('sports', 'concert', 'movies', 'other'));

COMMENT ON COLUMN public.events.category IS 'Event category: sports, concert, movies, or other';
