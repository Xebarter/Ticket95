-- Create users table for TicketRevolution
-- This table integrates with Supabase Auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'organizer', 'admin')),
  profile_name TEXT,
  profile_description TEXT,
  profile_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Anyone can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Anyone can view organizer profiles (public info)
CREATE POLICY "Anyone can view organizer profiles" ON users
  FOR SELECT USING (role = 'organizer');

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Function to handle user creation from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, role)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Password is managed by Supabase Auth
    'customer' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
