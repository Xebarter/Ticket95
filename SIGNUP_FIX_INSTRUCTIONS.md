# Signup Error Fix Instructions

## Problem
When trying to register, you're getting a 500 error because the Row Level Security (RLS) policies on the `users` table are blocking the registration flow from verifying that the user record was created.

## Root Cause
The RLS policies only allow:
1. Users to read their own profile (when `auth.uid() = id`)
2. Admins to read all users
3. Anyone to read organizer profiles

However, during signup, the code tries to query the `users` table to verify the user was created, but the query fails because:
- The existing policies require `auth.uid()` to match, but the session might not be fully established yet
- There's no policy allowing service role operations during the trigger execution

## Solution

### Step 1: Run the SQL Migration
You need to run the SQL migration file `scripts/sql/008_fix_signup_rls.sql` in your Supabase SQL Editor.

**To apply the fix:**

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Open the file `scripts/sql/008_fix_signup_rls.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to execute the migration

This migration does the following:
- Updates the `handle_new_user()` trigger function to properly extract the role from user metadata
- Consolidates the RLS policies to allow authenticated users to read their own profile
- Removes redundant policies

### Step 2: Verify Auth Settings
Make sure email confirmation is disabled for testing, or handle the confirmation flow properly.

1. Go to Supabase Dashboard → Authentication → Settings
2. Check if "Enable email confirmations" is enabled
3. If enabled, users will need to verify their email before they can sign in

### Step 3: Test the Signup Flow
After applying the SQL migration, try registering again. The flow should now work correctly.

## Code Changes Made
I've also updated the `lib/supabase-auth-context.tsx` file to:
- Better handle the case where email confirmation is required
- Add retry logic with error handling when fetching the user record
- Provide clearer error messages to users

## What Was Fixed
1. **RLS Policy**: Simplified and consolidated policies to allow authenticated users to read their own profile
2. **Trigger Function**: Updated to properly handle the role from user metadata during signup
3. **Error Handling**: Added better retry logic and error messages in the signup flow

## Testing
After applying the fix:
1. Try registering with a new email address
2. If email confirmation is enabled, you should see: "Profile created! Please check your email to verify before signing in."
3. If email confirmation is disabled, you should be automatically logged in after registration
