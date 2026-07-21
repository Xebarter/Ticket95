-- =====================================================
-- TicketRevolution Schema Validation Script
-- =====================================================
-- Run this after executing all migrations to verify
-- that the database is set up correctly
-- =====================================================

-- Check if all required tables exist
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN COUNT(*) = 10 THEN '✓ PASS - All 10 tables exist'
    ELSE '✗ FAIL - Expected 10 tables, found ' || COUNT(*)
  END as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions');

-- List all tables with column counts
SELECT 
  'Table Details' as check_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_name = tables.table_name 
   AND columns.table_schema = 'public') as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if RLS is enabled on all tables
SELECT 
  'RLS Check' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')
ORDER BY tablename;

-- Count RLS policies per table
SELECT 
  'RLS Policies' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check if required indexes exist
SELECT 
  'Indexes Check' as check_type,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')
ORDER BY tablename, indexname;

-- Check if all triggers exist
SELECT 
  'Triggers Check' as check_type,
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event_type
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')
ORDER BY event_object_table, trigger_name;

-- Check if all functions exist
SELECT 
  'Functions Check' as check_type,
  routine_name as function_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_users_updated_at',
    'update_events_updated_at',
    'update_orders_updated_at',
    'update_tickets_updated_at',
    'update_support_messages_updated_at',
    'update_platform_settings_updated_at',
    'update_affiliates_updated_at',
    'update_affiliate_commissions_updated_at',
    'handle_new_user',
    'check_tickets_available',
    'process_order_creation',
    'process_order_refund',
    'populate_ticket_details'
  )
ORDER BY routine_name;

-- Check foreign key constraints
SELECT 
  'Foreign Keys' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check column constraints
SELECT 
  'Column Constraints' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')
ORDER BY table_name, ordinal_position;

-- Verify auth.users trigger exists
SELECT 
  'Auth Trigger' as check_type,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- Summary report
SELECT 
  'VALIDATION SUMMARY' as summary,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
   AND table_name IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')) as tables_created,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_schema = 'public') as total_triggers,
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_schema = 'public') as total_functions,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN ('users', 'events', 'sponsors', 'orders', 'tickets', 'support_messages', 'notifications', 'platform_settings', 'affiliates', 'affiliate_commissions')) as total_indexes;

-- Expected values:
-- tables_created: 10
-- total_policies: Should be at least 25+ (varies based on script)
-- total_triggers: Should be at least 8
-- total_functions: Should be at least 9
-- total_indexes: Should be at least 20+
