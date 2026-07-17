# Quick Start - Unified Dashboard

## 🚀 What Changed?

Your TicketRevolution app now has a **unified experience**:
- ✅ Any user can **buy tickets**
- ✅ Any user can **create events**
- ✅ Single dashboard for everything
- ✅ No more role selection or onboarding

## 📋 Setup Steps

### 1. Update Supabase Database

Run the updated SQL scripts in your Supabase SQL Editor:

**Option A: Update existing database**
```sql
-- Copy and paste from: scripts/sql/002_create_events_table.sql
-- This updates the RLS policies to allow all users to create events
```

**Option B: Fresh setup**
```sql
-- Copy and paste from: scripts/sql/run_all_migrations.sql
-- This sets up everything from scratch
```

### 2. Deploy Your Application

```bash
npm install
npm run build
npm run dev
```

## 🎯 User Flow

### New User Signup:
1. Go to `/signup`
2. Enter email and password (no role selection!)
3. Click "Create Account"
4. Automatically redirected to unified dashboard

### Existing User Login:
1. Go to `/login`
2. Enter credentials
3. See unified dashboard with both tabs

### Buy Tickets:
1. Browse events on home page
2. Click "Buy Tickets"
3. Enter quantity and purchase
4. View in "My Tickets" tab of dashboard

### Create Events:
1. Click "Create Event" from anywhere
2. Fill in event details
3. Submit for admin approval
4. View in "My Events" tab of dashboard

## 🔑 Key URLs

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Browse public events |
| Dashboard | `/dashboard/unified` | Unified dashboard (tickets + events) |
| Create Event | `/organizer/dashboard/create` | Event creation form |
| Admin Panel | `/admin` | Admin-only event approval |
| Signup | `/signup` | New user registration |
| Login | `/login` | User authentication |

## 📱 Dashboard Tabs

### Tab 1: My Tickets
- All purchased tickets with QR codes
- Ticket status (valid, used, refunded, expired)
- Purchase history
- Download ticket as PDF
- View ticket details

### Tab 2: My Events
- Events you've created
- Event status (pending, approved, rejected)
- Tickets sold and revenue
- Quick stats dashboard
- Create new event button

## 🛡️ Security (RLS)

Row Level Security ensures:
- ✅ Users see only their own tickets
- ✅ Users see only their own orders
- ✅ Users can edit only their own events
- ✅ Everyone sees approved events
- ✅ Admins see everything

## 🧪 Testing

### Test as Regular User:
```
1. Sign up new account
2. Browse events and purchase a ticket
3. Click "Create Event" and create an event
4. Go to dashboard - see both tabs working
5. Verify ticket appears in "My Tickets"
6. Verify event appears in "My Events"
```

### Test as Admin:
```
1. Login as admin
2. Go to /admin
3. Approve/reject pending events
4. Verify approved events show on home page
```

## ⚠️ Important Notes

1. **Existing Users**: All existing data is preserved. Users will see the new dashboard on next login.

2. **Event Approval**: Events still require admin approval before becoming public.

3. **Roles Still Exist**: The role system is still in the database, but doesn't restrict functionality. All users default to 'customer' role.

4. **Admin Access**: Only users with 'admin' role can access `/admin` panel.

## 🐛 Troubleshooting

**Problem**: Can't create events
**Solution**: 
```sql
-- Check RLS policy in Supabase
SELECT * FROM pg_policies WHERE tablename = 'events';
-- Re-run scripts/sql/002_create_events_table.sql
```

**Problem**: Can't buy tickets
**Solution**: 
- Make sure event status is 'approved'
- Check tickets_available > 0
- Verify you're logged in

**Problem**: Dashboard not showing
**Solution**:
- Clear browser cache
- Verify redirect from `/dashboard` to `/dashboard/unified`
- Check browser console for errors

## 📊 What's Next?

Consider adding:
- [ ] Event analytics and insights
- [ ] Revenue reports for event creators
- [ ] Ticket transfer between users
- [ ] Event categories and filtering
- [ ] Email notifications
- [ ] Social sharing for events

## 💬 Support

Check these files for more details:
- `UNIFIED_DASHBOARD_CHANGES.md` - Complete change log
- `README.md` - General application info
- `SUPABASE_SETUP.md` - Database setup guide
