# TicketRevolution SQL - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy your project URL and anon key

### Step 2: Configure Environment
Create `.env.local` in project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Run Database Migration
1. Open Supabase Dashboard → **SQL Editor**
2. Copy contents of `scripts/sql/run_all_migrations.sql`
3. Paste and click **Run**

### Step 4: Create Admin User
1. Sign up through your app at `/signup`
2. In Supabase **SQL Editor**, run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Step 5: Verify Installation
In Supabase SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
You should see: `events`, `orders`, `sponsors`, `tickets`, `users`

## ✅ Done!

Your database is ready. Start the app:
```bash
npm install
npm run dev
```

## 📚 Next Steps

- **Create organizer**: `UPDATE users SET role = 'organizer' WHERE email = '...'`
- **Create event**: Sign in as organizer, go to `/organizer/dashboard/create`
- **Approve event**: Sign in as admin, go to `/admin`
- **Buy tickets**: Sign in as customer, browse events on home page

## 🔍 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists and has correct values
- Restart dev server after adding variables

### "User not found" after signup
- Verify `on_auth_user_created` trigger exists
- Check Supabase Auth is enabled

### Can't see events
- Events need to be approved by admin
- Check event status: `SELECT id, name, status FROM events;`

### RLS blocking access
- Verify you're logged in: `SELECT auth.uid();`
- Check your role: `SELECT role FROM users WHERE id = auth.uid();`

## 📖 Full Documentation

- **Detailed Setup**: See `/SUPABASE_SETUP.md`
- **Schema Docs**: See `/scripts/sql/README.md`
- **Validation**: Run `/scripts/sql/validate_schema.sql`
- **Changes**: See `/scripts/sql/CHANGELOG.md`

## 🆘 Common Commands

### Promote to Organizer
```sql
UPDATE users SET role = 'organizer' WHERE email = 'user@example.com';
```

### Approve Event
```sql
UPDATE events SET status = 'approved' WHERE id = 'event-id';
```

### View Pending Events
```sql
SELECT id, name, organizer_name, created_at 
FROM events 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### Check Ticket Inventory
```sql
SELECT name, total_tickets, tickets_available, 
       (total_tickets - tickets_available) as sold
FROM events 
WHERE status = 'approved'
ORDER BY date;
```

### Process Refund
```sql
UPDATE orders SET status = 'refunded' WHERE id = 'order-id';
-- Triggers automatically handle inventory and tickets
```

## 🎯 Quick Test Flow

1. **Sign up** as customer
2. **Promote to organizer**: `UPDATE users SET role = 'organizer' WHERE email = '...'`
3. **Create event** at `/organizer/dashboard/create`
4. **Promote to admin**: `UPDATE users SET role = 'admin' WHERE email = '...'`
5. **Approve event** at `/admin`
6. **Browse events** at `/` (home page)
7. **Purchase tickets** (click on event)
8. **View tickets** at `/dashboard`

---

**Need help?** Check the full documentation or contact support.
