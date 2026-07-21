# SQL Schema Changelog

## Summary of Improvements

This document tracks the improvements made to the TicketRevolution SQL schema to ensure compatibility with Supabase and support all application features.

## Major Changes

### 1. Supabase Auth Integration

**Previous State:**
- Users table had standalone UUID generation
- Password management was handled manually

**Current State:**
- Users table references `auth.users(id)` with CASCADE delete
- Auto-trigger creates user record when Supabase Auth signup occurs
- Password management delegated to Supabase Auth
- `password_hash` field kept for backward compatibility but not used

**Files Modified:**
- `001_create_users_table.sql`

### 2. Enhanced Row Level Security (RLS)

**Previous State:**
- Some policies were too permissive (combined multiple conditions in one policy)
- Policies were not idempotent (couldn't be re-run safely)

**Current State:**
- Separate policies for each role and operation
- All policies are dropped before creation (idempotent)
- Clear separation between customer, organizer, and admin access
- Public access to approved events and organizer profiles

**Files Modified:**
- All table creation scripts (001-005)

### 3. Automated Business Logic

**New Triggers Added:**

#### Users Table
- `handle_new_user()`: Auto-creates user record from Supabase Auth signup

#### Events Table
- `check_tickets_available()`: Prevents negative inventory and validates ticket counts

#### Orders Table
- `process_order_creation()`: Automatically decreases event inventory when order is completed
- `process_order_refund()`: Returns tickets to inventory and updates ticket status on refunds

#### Tickets Table
- `populate_ticket_details()`: Auto-fills event name, organizer info, and sponsors from event

**Files Modified:**
- `001_create_users_table.sql` (auth trigger)
- `002_create_events_table.sql` (inventory validation)
- `004_create_orders_table.sql` (order processing)
- `005_create_tickets_table.sql` (ticket population)

### 4. Improved Indexes

**New Indexes:**
- `idx_events_status_date`: Composite index for approved events by date
- `idx_orders_user_created`: Composite index for user's orders sorted by date
- `idx_tickets_user_status`: Composite index for filtering user tickets by status
- `idx_tickets_qr_code`: Unique index for fast QR code lookups

**Files Modified:**
- `002_create_events_table.sql`
- `004_create_orders_table.sql`
- `005_create_tickets_table.sql`

### 5. Data Integrity Constraints

**Enhanced Constraints:**
- `tickets_available <= total_tickets` check on events
- `qr_code` UNIQUE constraint on tickets
- Proper CASCADE vs RESTRICT on foreign keys
- CHECK constraints on all status enums

**Files Modified:**
- `002_create_events_table.sql`
- `005_create_tickets_table.sql`

### 6. Idempotent Scripts

**Previous State:**
- Scripts would fail if run multiple times
- Manual cleanup required before re-running

**Current State:**
- All scripts use `IF NOT EXISTS` for tables and indexes
- All scripts use `CREATE OR REPLACE` for functions
- All scripts use `DROP ... IF EXISTS` before creating policies and triggers
- Safe to re-run any script multiple times

**Files Modified:**
- All migration scripts

## New Files Created

### Core Migration Files
- `run_all_migrations.sql`: Single file to run all migrations in order
- `000_setup_instructions.sql`: Detailed setup and troubleshooting guide
- `validate_schema.sql`: Validation script to verify installation

### Documentation
- `scripts/sql/README.md`: Comprehensive schema documentation
- `scripts/sql/CHANGELOG.md`: This file
- Updated `SUPABASE_SETUP.md`: Improved setup instructions

## Breaking Changes

### None for New Installations

For new installations, there are no breaking changes. Simply run the migration scripts.

### For Existing Installations

⚠️ **WARNING**: If you have an existing TicketRevolution installation with data, you should:

1. **Backup your data first**
2. Create a migration plan to:
   - Migrate existing users to Supabase Auth
   - Update foreign key constraints
   - Add new indexes
   - Create triggers and functions

Contact support or review the migration scripts carefully before applying to production.

## Database Statistics

### Tables: 5
- users
- events
- sponsors
- orders
- tickets

### RLS Policies: 35+
- Users: 5 policies
- Events: 7 policies
- Sponsors: 9 policies
- Orders: 6 policies
- Tickets: 8 policies

### Triggers: 8
- users_updated_at_trigger
- on_auth_user_created (on auth.users)
- events_updated_at_trigger
- check_tickets_available_trigger
- orders_updated_at_trigger
- process_order_creation_trigger
- process_order_refund_trigger
- tickets_updated_at_trigger
- populate_ticket_details_trigger

### Functions: 9
- update_users_updated_at()
- handle_new_user()
- update_events_updated_at()
- check_tickets_available()
- update_orders_updated_at()
- process_order_creation()
- process_order_refund()
- update_tickets_updated_at()
- populate_ticket_details()

### Indexes: 20+
- Primary key indexes (automatic)
- Foreign key indexes
- Email, status, date lookups
- Composite indexes for common queries
- Unique constraints

## Testing Checklist

After running migrations, verify:

- [ ] All 5 tables exist
- [ ] RLS is enabled on all tables
- [ ] Can register through Supabase Auth
- [ ] User record is auto-created on signup
- [ ] Can promote user to organizer/admin role
- [ ] Organizers can create events
- [ ] Events default to 'pending' status
- [ ] Admins can approve/reject events
- [ ] Customers can view approved events
- [ ] Can purchase tickets for approved events
- [ ] Ticket inventory decreases on purchase
- [ ] Tickets are auto-populated with event details
- [ ] Can view purchased tickets
- [ ] QR codes are unique
- [ ] Refunds return tickets to inventory
- [ ] All timestamps update automatically

## Performance Considerations

### Optimized Queries

The schema is optimized for these common queries:

1. **Browse approved events**: Uses `idx_events_status_date`
2. **User's tickets**: Uses `idx_tickets_user_id` and `idx_tickets_user_status`
3. **User's orders**: Uses `idx_orders_user_created`
4. **Event's sponsors**: Uses `idx_sponsors_event_id` and `idx_sponsors_order_index`
5. **QR code lookup**: Uses unique `idx_tickets_qr_code`
6. **Organizer's events**: Uses `idx_events_organizer_id`

### Scalability

- Indexes support millions of records
- RLS policies are optimized to avoid N+1 queries where possible
- Triggers are kept simple to avoid performance bottlenecks
- JSONB used for sponsors array (flexible, indexed if needed)

## Security Hardening

### RLS Policies
- All tables protected
- No public write access
- Users isolated to their own data
- Organizers scoped to their events
- Admins have full access but logged

### Auth Integration
- Passwords managed by Supabase (bcrypt, secure)
- User IDs from auth.users (prevents tampering)
- Session management by Supabase
- CSRF protection built-in

### Data Validation
- CHECK constraints on enums
- Foreign key constraints enforced
- Triggers prevent invalid state (e.g., negative inventory)
- Unique constraints on critical fields

## Future Enhancements

Potential improvements for future versions:

1. **Soft Deletes**: Add `deleted_at` column for audit trail
2. **Event Categories**: Add categories/tags table for better discovery
3. **Payment Integration**: Add payment_method, transaction_id to orders
4. **Email Notifications**: Add email templates and notification preferences
5. **Analytics**: Add views for reporting and analytics
6. **Rate Limiting**: Add tables to track API usage
7. **Audit Logging**: Add audit log table for admin actions
8. **Multi-currency**: Add currency field and conversion rates
9. **Seating**: Add seating/sections for events
10. **Waitlist**: Add waitlist table for sold-out events

## Support

For issues or questions about the database schema:

1. Review `/scripts/sql/README.md` for detailed documentation
2. Run `validate_schema.sql` to check your installation
3. Check `SUPABASE_SETUP.md` for setup instructions
4. Review `000_setup_instructions.sql` for troubleshooting

## Version History

### v1.0.0 (Current)
- Initial production-ready schema
- Full Supabase integration
- Comprehensive RLS policies
- Automated business logic triggers
- Complete documentation

---

Last Updated: 2026-02-25
