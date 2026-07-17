-- Fix RLS policies to allow signup flow to work properly
-- This allows authenticated users to check if their user record exists during signup

-- Drop the old trigger function and create an improved one that handles role from metadata
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from user metadata, default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Ensure role is valid
  IF user_role NOT IN ('customer', 'organizer', 'admin') THEN
    user_role := 'customer';
  END IF;
  
  INSERT INTO public.users (id, email, password_hash, role)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Password is managed by Supabase Auth
    user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add policy to allow authenticated users to read their own newly created profile
-- This is needed during the signup flow when the user tries to fetch their profile
DROP POLICY IF EXISTS "Authenticated users can read own profile during signup" ON users;
CREATE POLICY "Authenticated users can read own profile during signup" ON users
  FOR SELECT USING (
    auth.uid() = id
  );

-- Note: The existing "Users can read own profile" policy will be redundant now
-- Let's consolidate by dropping it since the new policy covers the same case
DROP POLICY IF EXISTS "Users can read own profile" ON users;
