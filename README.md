# TicketRevolution - Event Ticketing Platform

A modern, full-stack event ticketing platform built with Next.js and Supabase, enabling organizers to create events and customers to purchase tickets with digital QR code verification.

## Features

- **User Authentication**: Sign up and login with email/password, role-based access control (customer, organizer, admin)
- **Event Management**: Organizers can create and manage events with detailed information
- **Ticket Sales**: Customers can browse approved events and purchase tickets with real-time availability
- **Admin Approval System**: Admin dashboard to review, approve, or reject user-created events
- **Digital Tickets**: QR code-enabled tickets with PDF download capability
- **Sponsor Integration**: Events can feature multiple sponsors with logo display on tickets
- **Role-Based Dashboards**: Tailored interfaces for customers, organizers, and administrators
- **Professional UI**: Clean, modern design with responsive layouts

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with email/password
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Utilities**: QRCode generation, jsPDF for ticket downloads, Lucide icons

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm package manager
- A Supabase account (free tier available at https://supabase.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticketrevolution
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Supabase**
   - Create a Supabase project at https://supabase.com/dashboard
   - Copy your project URL and anon key
   - Create `.env.local` file with:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Execute SQL migrations**
   - See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions
   - Migrations are in `/scripts/sql/` directory

5. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Database Setup

All SQL migration files are located in `/scripts/sql/` and ready for immediate execution in Supabase:

### Database Schema

The database includes properly structured PostgreSQL tables with RLS policies:

**Users Table** - User accounts with role-based access
- UUID primary key, unique email, password hash
- Roles: admin, organizer, customer
- Profile fields: name, description, logo URL
- Timestamps: created_at, updated_at

**Events Table** - Event listings created by organizers
- UUID primary key, organizer relationship
- Complete event details: name, description, date, venue
- Inventory: total_tickets, tickets_available
- Status: pending, approved, rejected
- Rejection reason tracking
- Indexes for fast queries by organizer, status, date

**Sponsors Table** - Companies sponsoring events
- UUID primary key, event relationship (cascading delete)
- Name, logo URL, display order
- Indexed by event and display order

**Orders Table** - Customer ticket purchases
- UUID primary key, relationships to events and users
- Quantity and total price tracking
- Status: pending, completed, failed, refunded
- Timestamps with automatic updates

**Tickets Table** - Individual tickets with QR codes
- UUID primary key, relationships to orders, events, and users
- Event/organizer details (denormalized for performance)
- Sponsors stored as JSONB array
- QR code for verification
- Status: valid, used, expired, refunded
- Comprehensive indexes for ticket lookups

All tables include Row Level Security (RLS) policies for security.

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with AuthProvider
│   ├── page.tsx                # Home page with event listing
│   ├── signup/                 # User signup pages
│   ├── login/                  # User login pages
│   ├── dashboard/              # Customer ticket dashboard
│   ├── organizer/              # Organizer event management
│   └── admin/                  # Admin event approval dashboard
├── components/
│   ├── auth/                   # Authentication forms
│   ├── events/                 # Event display and purchase components
│   ├── organizer/              # Event creation wizard
│   ├── tickets/                # Ticket display and generation
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── supabase-client.ts      # Supabase client initialization
│   ├── supabase-db.ts          # Database query functions
│   ├── supabase-auth-context.tsx  # Authentication context
│   └── pdf-generator.ts        # Ticket PDF generation
├── scripts/
│   └── sql/                    # Database migration files
│       ├── 001_create_users_table.sql
│       ├── 002_create_events_table.sql
│       ├── 003_create_sponsors_table.sql
│       ├── 004_create_orders_table.sql
│       ├── 005_create_tickets_table.sql
│       └── 006_seed_admin_user.sql
└── public/                     # Static assets
```

## Usage Guide

### For Customers

1. **Sign Up**: Create account at `/signup` selecting "Customer" role
2. **Browse Events**: View all approved events on the home page
3. **Purchase Tickets**: Click "Purchase" on an event and select quantity
4. **View Tickets**: Go to `/dashboard` to see your tickets and orders
5. **Download Tickets**: Download digital ticket PDFs with QR codes

### For Organizers

1. **Sign Up**: Create account at `/signup` selecting "Organizer" role
2. **Create Events**: Go to `/organizer/dashboard` and click "Create Event"
3. **Fill Event Details**: Use the 4-step wizard to enter event information
4. **Add Sponsors**: Optionally add sponsors with logos
5. **Submit for Approval**: Event status becomes "pending"
6. **Track Status**: Check dashboard for approval updates

### For Administrators

1. **Login**: Use admin credentials at `/login`
2. **Access Dashboard**: Navigate to `/admin`
3. **Review Events**: View all pending events awaiting approval
4. **Take Action**: Approve, reject, or add notes on events
5. **Monitor System**: View event statistics and sales data

## Authentication Flow

The application uses Supabase Authentication with custom user roles:

1. User signs up via `/signup`
2. Supabase creates auth user and session
3. Custom user record created in `users` table with selected role
4. Role-based policies control data access via Row Level Security
5. Auth context provides user state across application

## Security

- **Row Level Security (RLS)**: All tables protected with role-based policies
- **Session Management**: Secure HTTP-only cookies via Supabase
- **Password Hashing**: Supabase handles password security
- **API Keys**: Public anon key used for client operations only
- **Data Isolation**: Users can only see data they're authorized for

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |

These are automatically picked up from `.env.local`

## Development

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
npm run start
```

### Code Quality

```bash
npm run lint
```

## Deployment

The application can be deployed to Vercel, AWS, or any Node.js hosting:

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

1. Ensure Node.js 18+ is available
2. Set environment variables in platform settings
3. Build: `npm run build`
4. Start: `npm run start`

## Troubleshooting

### Database Connection Issues

- Verify Supabase URL and anon key in `.env.local`
- Check that migrations were executed successfully
- Ensure RLS policies aren't blocking access (in development, they should allow authenticated operations)

### Authentication Errors

- Clear browser cookies and try again
- Verify Supabase Auth is enabled in project settings
- Check that email/password provider is configured

### Ticket Purchase Failures

- Confirm event is in "approved" status
- Check that tickets are still available
- Verify user is logged in as customer

For more detailed setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## Performance

- Database queries use indexes for fast lookups
- RLS policies enforce at-database level for security
- Static pages pre-rendered where possible
- Images optimized with Next.js Image component

## Future Enhancements

- Email notifications for event approvals
- Payment gateway integration (Stripe, PayPal)
- Event recommendations based on purchase history
- Refund processing system
- Advanced analytics dashboard
- Multi-language support
- Mobile app with React Native

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues or questions:
1. Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup guidance
2. Review Supabase documentation at https://supabase.com/docs
3. Check GitHub issues for similar problems
4. Contact project maintainers

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Built with Next.js, React, and Supabase. Ready for production use.
