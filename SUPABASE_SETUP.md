# TicketRevolution - Supabase Setup Guide

This guide walks you through setting up TicketRevolution with Supabase as the database backend.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 18+ installed
- This TicketRevolution project cloned locally

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Enter a project name (e.g., "ticketrevolution")
4. Set a strong database password
5. Select your region (closest to your users)
6. Click "Create new project"

Wait for the project to initialize (this takes a few minutes).

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, click "Settings" in the bottom left
2. Go to "API" in the left menu
3. Copy your:
   - **Project URL** (under "Project API URL")
   - **Anon Key** (under "Project API Key" → "public")

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (copy from `.env.local.example` if it exists)
2. Add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the placeholder values with your actual Supabase credentials.

## Step 4: Execute SQL Migration Scripts

The migration scripts are located in `/scripts/sql/` directory.

### Option A: Single Script (Recommended - Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left menu
3. Click **New Query**
4. Open `/scripts/sql/run_all_migrations.sql` in your text editor
5. Copy the **entire contents** and paste into the SQL Editor
6. Click **Run** to execute all migrations at once

This single script creates all tables, indexes, triggers, and RLS policies in the correct order.

### Option B: Individual Scripts (Advanced)

If you prefer to run scripts individually, execute them in this exact order:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left menu
3. For each file below, create a new query, copy the contents, and run:
   - `001_create_users_table.sql`
   - `002_create_events_table.sql`
   - `003_create_sponsors_table.sql`
   - `004_create_orders_table.sql`
   - `005_create_tickets_table.sql`
   - `006_seed_admin_user.sql` (optional)

### Option C: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project (you'll need your project ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Run the all-in-one migration
supabase db execute -f scripts/sql/run_all_migrations.sql

# Or run individual migrations
supabase db execute -f scripts/sql/001_create_users_table.sql
supabase db execute -f scripts/sql/002_create_events_table.sql
# ... and so on
```

### Verify Installation

After running the migrations, verify everything is set up correctly:

```sql
-- Run this in Supabase SQL Editor to check all tables were created
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'events', 'sponsors', 'orders', 'tickets')
ORDER BY table_name;
```

You should see 5 tables listed.

## Step 5: Create Admin User

After running the migrations, you need to create an admin user. The user record is automatically created when someone signs up through Supabase Auth.

### Method 1: Through Supabase Dashboard

1. Go to **Authentication** → **Users** in the left menu
2. Click **Add user** → **Create new user**
3. Enter admin email (e.g., `admin@ticketrevolution.com`)
4. Set a strong password
5. Click **Create user**
6. Go to **SQL Editor** and run:

```sql
UPDATE users 
SET role = 'admin',
    profile_name = 'Admin User',
    profile_description = 'TicketRevolution Administrator'
WHERE email = 'admin@ticketrevolution.com';
```

### Method 2: Through Your Application

1. Sign up through your app at `/signup`
2. Go to Supabase **SQL Editor** and promote the user to admin:

```sql
UPDATE users 
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Verify Admin Access

Log in with your admin credentials and navigate to `/admin` to verify admin access is working.

## Step 6: Install Dependencies

```bash
npm install
```

This will install the Supabase client and other dependencies.

## Step 7: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Step 8: Test the Setup

1. **Sign up** as a new customer
2. **Go to admin dashboard** at `/admin` (login with admin credentials)
3. **Browse events** on the home page
4. **Create an organizer account** and create an event
5. **Approve the event** in the admin dashboard
6. **Purchase a ticket** for the event as a customer

## Troubleshooting

### "Missing Supabase environment variables" error

- Verify that `.env.local` exists in your project root
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Restart the dev server after adding environment variables

### Authentication errors

- Ensure Supabase Auth is enabled in your project (Settings → Auth)
- Check that email/password authentication is configured as a provider
- Verify that RLS policies are correctly set on tables (not blocking reads/writes)

### Database connection issues

- Check that all SQL migration files were executed successfully
- Verify table creation in Supabase (Database → Tables)
- Ensure RLS policies are not blocking operations (initially, they should allow operations for authenticated users)

### Tickets/Orders not creating

- Check that the `orders` and `tickets` tables were created successfully
- Verify that the foreign key relationships are intact
- Check browser console for specific error messages

## Database Schema

The application uses these Supabase tables:

- **users**: User accounts with roles (customer, organizer, admin)
- **events**: Event listings created by organizers
- **sponsors**: Companies sponsoring events
- **orders**: Customer ticket purchases
- **tickets**: Individual tickets with QR codes

All tables have Row Level Security (RLS) enabled for security.

### Key Features

#### 🔐 Row Level Security (RLS)
- All tables protected with comprehensive RLS policies
- Users can only access their own data
- Organizers can manage their events and see related orders/tickets
- Admins have full access to all data

#### ⚡ Automated Triggers
- **Auto-timestamps**: All records automatically track creation and update times
- **User creation**: Automatically creates user record when someone signs up via Supabase Auth
- **Inventory management**: Automatically decreases/increases ticket inventory on orders/refunds
- **Ticket population**: Auto-fills event details, organizer info, and sponsors on ticket creation
- **Refund handling**: Automatically updates ticket status and returns inventory on refunds

#### 📊 Optimized Indexes
- Fast lookups by email, event status, date, QR codes
- Composite indexes for common query patterns
- Unique constraints on critical fields (email, QR codes)

For detailed schema documentation, see `/scripts/sql/README.md`.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key for client-side access |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key for server-side operations (keep secret) |

## Next Steps

- Customize event creation fields in `/components/organizer/event-creation-wizard.tsx`
- Update ticket pricing and availability logic in `/lib/supabase-db.ts`
- Configure email notifications with Supabase email templates
- Set up Supabase edge functions for advanced features

## Support

For issues with Supabase integration, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [TicketRevolution README](./README.md)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
