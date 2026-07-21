-- =====================================================
-- TicketRevolution Supabase Setup Instructions
-- =====================================================
-- 
-- This file contains instructions for setting up your TicketRevolution
-- database in Supabase. Follow these steps in order.
--
-- =====================================================

-- PREREQUISITES:
-- 1. Create a Supabase project at https://supabase.com
-- 2. Note your project URL and anon key
-- 3. Update your .env.local file with these values:
--    NEXT_PUBLIC_SUPABASE_URL=your-project-url
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

-- =====================================================
-- EXECUTION ORDER:
-- =====================================================
-- Run these SQL scripts in the Supabase SQL Editor in this exact order:
--
-- 1. scripts/sql/001_create_users_table.sql
-- 2. scripts/sql/002_create_events_table.sql
-- 3. scripts/sql/003_create_sponsors_table.sql
-- 4. scripts/sql/004_create_orders_table.sql
-- 5. scripts/sql/005_create_tickets_table.sql
-- 6. scripts/sql/006_seed_admin_user.sql (optional - see notes below)

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================

-- 1. ROW LEVEL SECURITY (RLS):
--    All tables have RLS enabled. Users can only access data they own
--    or are authorized to see. Admins have full access.

-- 2. AUTHENTICATION:
--    - Users are automatically created in the 'users' table when they
--      register through Supabase Auth
--    - Password management is handled by Supabase Auth
--    - The password_hash field in users table is not used but kept for compatibility

-- 3. ADMIN USER SETUP:
--    To create an admin user:
--    a) Register normally through your app
--    b) Run this SQL to promote them to admin:
--       UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
--    
--    OR use the Supabase Dashboard:
--    - Go to Authentication > Users
--    - Create a new user
--    - Then update their role in the users table

-- 4. TRIGGERS AND FUNCTIONS:
--    - Auto-update timestamps on record changes
--    - Auto-create user records when auth users register
--    - Auto-populate ticket details from events
--    - Auto-manage ticket inventory on orders
--    - Auto-handle refunds

-- 5. TESTING:
--    After running all scripts, test by:
--    - Creating a test user through your app
--    - Promoting them to organizer: UPDATE users SET role = 'organizer' WHERE email = 'test@example.com';
--    - Creating a test event
--    - Approving it (as admin)
--    - Purchasing tickets
--    - Viewing tickets

-- =====================================================
-- VERIFY INSTALLATION:
-- =====================================================
-- Run this query to verify all tables are created:

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'events', 'sponsors', 'orders', 'tickets')
ORDER BY table_name;

-- Expected result: 5 tables (users, events, sponsors, orders, tickets)

-- =====================================================
-- VERIFY RLS POLICIES:
-- =====================================================
-- Run this to check RLS is enabled and policies exist:

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- TROUBLESHOOTING:
-- =====================================================

-- If you need to reset and start over:
/*
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
DROP TRIGGER IF EXISTS events_updated_at_trigger ON events;
DROP TRIGGER IF EXISTS check_tickets_available_trigger ON events;
DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
DROP TRIGGER IF EXISTS process_order_creation_trigger ON orders;
DROP TRIGGER IF EXISTS process_order_refund_trigger ON orders;
DROP TRIGGER IF EXISTS tickets_updated_at_trigger ON tickets;
DROP TRIGGER IF EXISTS populate_ticket_details_trigger ON tickets;

DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_events_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_tickets_available() CASCADE;
DROP FUNCTION IF EXISTS update_orders_updated_at() CASCADE;
DROP FUNCTION IF EXISTS process_order_creation() CASCADE;
DROP FUNCTION IF EXISTS process_order_refund() CASCADE;
DROP FUNCTION IF EXISTS update_tickets_updated_at() CASCADE;
DROP FUNCTION IF EXISTS populate_ticket_details() CASCADE;
*/

-- After dropping, re-run all migration scripts in order.
