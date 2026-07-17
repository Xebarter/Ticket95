-- Seed admin user for TicketRevolution
-- Note: This script assumes you've created an admin user through Supabase Auth first
-- You can create the admin user through the Supabase Dashboard or using the following SQL:

-- IMPORTANT: First create the user in Supabase Auth, then run this to update their role
-- Example: Create user with email 'admin@ticketrevolution.com' in Supabase Dashboard

-- Update the user's role to admin (replace the email with your admin email)
UPDATE users 
SET 
  role = 'admin',
  profile_name = 'Admin User',
  profile_description = 'TicketRevolution System Administrator'
WHERE email = 'admin@ticketrevolution.com';

-- Alternative: If you want to create the admin user directly (only works if auth.users record exists)
-- This will fail if the user doesn't exist in auth.users
-- Uncomment below and replace 'your-auth-user-id' with the actual UUID from auth.users

/*
INSERT INTO users (
  id,
  email, 
  password_hash, 
  role, 
  profile_name, 
  profile_description
) VALUES (
  'your-auth-user-id'::uuid,  -- Replace with actual auth.users.id
  'admin@ticketrevolution.com',
  '',  -- Password is managed by Supabase Auth
  'admin',
  'Admin User',
  'TicketRevolution System Administrator'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  profile_name = 'Admin User',
  profile_description = 'TicketRevolution System Administrator';
*/
