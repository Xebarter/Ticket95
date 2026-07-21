-- =====================================================
-- TicketRevolution - Complete Database Setup
-- =====================================================
-- This script runs all migrations in the correct order
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================

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

-- Prevent infinite recursion in RLS policies:
-- Some policies check admin role by selecting from `users`, which can recurse
-- when the `users` policies themselves use `users` in their USING clauses.
-- Use a SECURITY DEFINER helper to read the role safely.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Allow the helper to be used under RLS checks
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Anyone can view organizer profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can view all users
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

-- Policy: Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
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

-- =====================================================
-- 2. CREATE EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  ticket_price DECIMAL(10, 2) NOT NULL CHECK (ticket_price >= 0),
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  tickets_available INTEGER NOT NULL CHECK (tickets_available >= 0 AND tickets_available <= total_tickets),
  organizer_name TEXT NOT NULL,
  organizer_logo_url TEXT,
  image_url TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date) WHERE status = 'approved';

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved events" ON events;
DROP POLICY IF EXISTS "Organizers can view own events" ON events;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Organizers can insert their own events" ON events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;
DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

CREATE POLICY "Anyone can view approved events" ON events
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Admins can update events" ON events
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete events" ON events
  FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at_trigger ON events;
CREATE TRIGGER events_updated_at_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

CREATE OR REPLACE FUNCTION check_tickets_available()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tickets_available < 0 THEN
    RAISE EXCEPTION 'Cannot reduce tickets_available below 0';
  END IF;
  IF NEW.tickets_available > NEW.total_tickets THEN
    RAISE EXCEPTION 'tickets_available cannot exceed total_tickets';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_tickets_available_trigger ON events;
CREATE TRIGGER check_tickets_available_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION check_tickets_available();

-- =====================================================
-- 3. CREATE SPONSORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sponsors_event_id ON sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_order_index ON sponsors(event_id, order_index);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sponsors of approved events" ON sponsors;
DROP POLICY IF EXISTS "Organizers can view sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can view all sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can insert sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can update sponsors" ON sponsors;
DROP POLICY IF EXISTS "Organizers can delete sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can insert sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can update sponsors" ON sponsors;
DROP POLICY IF EXISTS "Admins can delete sponsors" ON sponsors;

CREATE POLICY "Anyone can view sponsors of approved events" ON sponsors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND events.status = 'approved')
  );

CREATE POLICY "Organizers can view sponsors" ON sponsors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Admins can view all sponsors" ON sponsors
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Organizers can insert sponsors" ON sponsors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Organizers can update sponsors" ON sponsors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND auth.uid() = events.organizer_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Organizers can delete sponsors" ON sponsors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = sponsors.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Admins can insert sponsors" ON sponsors
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update sponsors" ON sponsors
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete sponsors" ON sponsors
  FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- 4. CREATE ORDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Organizers can view orders for their events" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "System can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view orders for their events" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = orders.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

CREATE OR REPLACE FUNCTION process_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events 
  SET tickets_available = tickets_available - NEW.quantity
  WHERE id = NEW.event_id
  AND tickets_available >= NEW.quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough tickets available for this event';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_order_creation_trigger ON orders;
CREATE TRIGGER process_order_creation_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION process_order_creation();

CREATE OR REPLACE FUNCTION process_order_refund()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'refunded' AND NEW.status = 'refunded' THEN
    UPDATE events 
    SET tickets_available = tickets_available + NEW.quantity
    WHERE id = NEW.event_id;
    
    UPDATE tickets
    SET status = 'refunded'
    WHERE order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_order_refund_trigger ON orders;
CREATE TRIGGER process_order_refund_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_order_refund();

-- =====================================================
-- 5. CREATE TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_logo_url TEXT,
  sponsors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'refunded')),
  qr_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets(user_id, status);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can view tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "System can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can update tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;

CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view tickets for their events" ON tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "System can insert tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert tickets" ON tickets
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers can update tickets for their events" ON tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND auth.uid() = events.organizer_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND auth.uid() = events.organizer_id)
  );

CREATE POLICY "Admins can update all tickets" ON tickets
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_updated_at_trigger ON tickets;
CREATE TRIGGER tickets_updated_at_trigger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

CREATE OR REPLACE FUNCTION populate_ticket_details()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  sponsors_json JSONB;
BEGIN
  SELECT e.name, e.organizer_name, e.organizer_logo_url
  INTO event_record
  FROM events e
  WHERE e.id = NEW.event_id;
  
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('name', s.name, 'logo_url', s.logo_url)
      ORDER BY s.order_index
    ),
    '[]'::jsonb
  )
  INTO sponsors_json
  FROM sponsors s
  WHERE s.event_id = NEW.event_id;
  
  IF NEW.event_name IS NULL OR NEW.event_name = '' THEN
    NEW.event_name := event_record.name;
  END IF;
  
  IF NEW.organizer_name IS NULL OR NEW.organizer_name = '' THEN
    NEW.organizer_name := event_record.organizer_name;
  END IF;
  
  IF NEW.organizer_logo_url IS NULL OR NEW.organizer_logo_url = '' THEN
    NEW.organizer_logo_url := event_record.organizer_logo_url;
  END IF;
  
  IF NEW.sponsors IS NULL OR NEW.sponsors = '[]'::jsonb THEN
    NEW.sponsors := sponsors_json;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS populate_ticket_details_trigger ON tickets;
CREATE TRIGGER populate_ticket_details_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION populate_ticket_details();

-- =====================================================
-- 19. CREATE SUPPORT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,

  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  order_reference TEXT,
  event_name TEXT,

  message TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_email ON support_messages(email);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view support messages" ON support_messages;
CREATE POLICY "Admins can view support messages"
  ON support_messages
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update support messages" ON support_messages;
CREATE POLICY "Admins can update support messages"
  ON support_messages
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION update_support_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_messages_updated_at_trigger ON support_messages;
CREATE TRIGGER support_messages_updated_at_trigger
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_messages_updated_at();

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- All tables, indexes, triggers, and RLS policies have been created.
-- You can now use your TicketRevolution application!
--
-- Next steps:
-- 1. Create an admin user through Supabase Auth
-- 2. Run: UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
-- 3. Test the application
-- =====================================================
