-- Add organizer phone support on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_phone TEXT;

COMMENT ON COLUMN public.events.organizer_phone IS 'Primary contact phone for the event organizer';
