-- Fix 403 / RLS insert failures on public.events
-- Run this in Supabase SQL Editor for the target project.

BEGIN;

-- Ensure table RLS is active
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated role can access table operations (RLS still applies)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.events TO authenticated;

-- Clean up possibly stale policy names
DROP POLICY IF EXISTS "Organizers can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;

-- Recreate insert policy with explicit authenticated-role check
CREATE POLICY "Authenticated users can insert events" ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = organizer_id
  );

COMMIT;
