# TicketRevolution Database Schema

This directory contains all SQL migration scripts for setting up the TicketRevolution database in Supabase.

## Quick Start

### Option 1: Run All Migrations at Once (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `run_all_migrations.sql`
4. Click **Run**

### Option 2: Run Individual Scripts

Execute the scripts in this order:

1. `001_create_users_table.sql`
2. `002_create_events_table.sql`
3. `003_create_sponsors_table.sql`
4. `004_create_orders_table.sql`
5. `005_create_tickets_table.sql`
6. `006_seed_admin_user.sql` (optional)

## Database Schema Overview

### Tables

#### 1. **users**
- Stores user account information
- Integrates with Supabase Auth (`auth.users`)
- Fields: id, email, password_hash, role, profile_name, profile_description, profile_logo_url
- Roles: `customer`, `organizer`, `admin`

#### 2. **events**
- Stores event information created by organizers
- Fields: id, organizer_id, name, description, date, venue, ticket_price, total_tickets, tickets_available, status
- Status: `pending`, `approved`, `rejected`

#### 3. **sponsors**
- Stores sponsor information for events
- Fields: id, event_id, name, logo_url, order_index

#### 4. **orders**
- Stores ticket purchase orders
- Fields: id, event_id, user_id, quantity, total_price, status
- Status: `pending`, `completed`, `failed`, `refunded`

#### 5. **tickets**
- Stores individual tickets (one per ticket purchased)
- Fields: id, order_id, event_id, user_id, event_name, organizer_name, sponsors, status, qr_code
- Status: `valid`, `used`, `expired`, `refunded`

## Key Features

### Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

- **Users**: Can view own profile, organizers are publicly viewable, admins see all
- **Events**: Public can view approved events, organizers manage their own, admins manage all
- **Sponsors**: Visible based on event visibility
- **Orders**: Users see own orders, organizers see orders for their events, admins see all
- **Tickets**: Users see own tickets, organizers see tickets for their events, admins see all

### Automated Triggers

#### Auto-Timestamps
- All tables automatically update `updated_at` on modifications

#### User Creation
- `handle_new_user()`: Automatically creates a user record when someone signs up via Supabase Auth

#### Ticket Inventory Management
- `process_order_creation()`: Automatically decreases available tickets when order is completed
- `process_order_refund()`: Returns tickets to inventory when order is refunded
- `check_tickets_available()`: Prevents tickets_available from going negative or exceeding total

#### Ticket Details
- `populate_ticket_details()`: Auto-populates event name, organizer info, and sponsors when ticket is created

### Indexes

Optimized indexes for common queries:
- Email lookups
- Event filtering by status and date
- User's orders and tickets
- QR code lookups
- Composite indexes for common query patterns

## Data Flow

### User Signup
1. User signs up through Supabase Auth
2. `handle_new_user()` trigger creates record in `users` table with role `customer`
3. User can be promoted to `organizer` or `admin` via SQL update

### Event Creation
1. Organizer creates event (status: `pending` by default, `approved` for admins)
2. Admin approves/rejects event
3. Approved events become visible to public

### Ticket Purchase
1. User creates order for specific event and quantity
2. `process_order_creation()` trigger decreases `tickets_available`
3. Tickets are created with auto-populated details from event
4. QR codes are generated and stored

### Refunds
1. Order status changed to `refunded`
2. `process_order_refund()` trigger:
   - Returns tickets to inventory
   - Updates all tickets to `refunded` status

## Security Considerations

### Password Management
- Passwords are managed entirely by Supabase Auth
- The `password_hash` field in `users` table is not used but kept for compatibility

### Admin Access
- Admins have full access to all data
- Admin role should be carefully controlled
- To create admin: `UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';`

### RLS Bypass
- Server-side operations can use the service role key to bypass RLS
- Client operations always respect RLS policies

## Maintenance

### Reset Database
See `000_setup_instructions.sql` for complete reset script.

### Verify Installation
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### Common Operations

#### Promote User to Organizer
```sql
UPDATE users 
SET role = 'organizer' 
WHERE email = 'user@example.com';
```

#### Approve Event
```sql
UPDATE events 
SET status = 'approved' 
WHERE id = 'event-uuid';
```

#### View All Pending Events (as admin)
```sql
SELECT id, name, organizer_name, created_at
FROM events
WHERE status = 'pending'
ORDER BY created_at DESC;
```

#### Process Refund
```sql
UPDATE orders
SET status = 'refunded'
WHERE id = 'order-uuid';
-- Triggers automatically handle ticket inventory and status updates
```

## Troubleshooting

### User Record Not Created After Signup
- Check if `on_auth_user_created` trigger exists on `auth.users`
- Verify the trigger function `handle_new_user()` is defined

### RLS Blocking Legitimate Access
- Verify user is authenticated: `SELECT auth.uid();`
- Check user's role: `SELECT role FROM users WHERE id = auth.uid();`
- Review policy conditions in the specific table

### Tickets Not Auto-Populating
- Check `populate_ticket_details_trigger` exists on `tickets` table
- Ensure event and sponsors exist before creating tickets

### Order Creation Fails with "Not enough tickets"
- Verify `tickets_available >= quantity` for the event
- Check for race conditions in concurrent purchases
- Consider implementing optimistic locking if needed

## Migration Strategy

All scripts are idempotent (can be run multiple times safely):
- Tables use `CREATE TABLE IF NOT EXISTS`
- Triggers and functions use `CREATE OR REPLACE`
- Policies are dropped before creation
- Indexes use `IF NOT EXISTS`

## Support

For issues or questions:
1. Check the main `SUPABASE_SETUP.md` in the project root
2. Review `000_setup_instructions.sql` for detailed setup info
3. Consult Supabase documentation for Auth and RLS details
