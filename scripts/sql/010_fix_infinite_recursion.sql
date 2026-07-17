-- Fix infinite recursion in users table RLS policies
-- The issue: policies that query the users table create infinite loops
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Create a function to get user role (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Anyone can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Authenticated users can read own profile during signup" ON users;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can view all users (using the helper function to avoid recursion)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Policy: Anyone can view organizer profiles (public info)
CREATE POLICY "Anyone can view organizer profiles" ON users
  FOR SELECT USING (role = 'organizer');

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any user (using the helper function to avoid recursion)
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;
