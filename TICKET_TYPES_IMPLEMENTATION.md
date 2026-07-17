# Multiple Ticket Types & Currency Support

## Overview
Events can now have multiple ticket types (e.g., General Admission, VIP, Early Bird) with different prices, and you can easily set the currency for each event.

## Features Implemented ✅

### 1. Database Schema
- **New `ticket_types` table** to store different ticket types per event
- **Currency field** added to events table
- **Ticket type references** added to tickets and orders tables
- **RLS policies** for secure access control

### 2. Currency Support
- **12 common currencies** available:
  - USD ($), EUR (€), GBP (£), JPY (¥), AUD (A$), CAD (C$)
  - CHF (Fr), CNY (¥), INR (₹), NGN (₦), ZAR (R), KES (KSh)
- Easy-to-use **dropdown selector** in event creation form
- Currency symbol displayed throughout the UI

### 3. Admin Event Creation
- **Currency selector** - Choose the currency for your event
- **Ticket type manager** with:
  - Type name (e.g., "VIP", "General Admission")
  - Price (in selected currency)
  - Quantity available
  - Optional description
- **Add multiple ticket types** - Create as many as needed
- **Visual ticket type cards** showing:
  - Ticket icon
  - Name and price
  - Quantity and description
  - Remove button
- **Total ticket counter** - Shows sum of all ticket types

### 4. TypeScript Interfaces
Updated interfaces for full type safety:
- `Event` - includes `currency` field
- `TicketType` - new interface for ticket types
- `Ticket` - includes ticket type information
- `Order` - includes currency field

### 5. Database Functions
New functions in `lib/supabase-db.ts`:
- `getTicketTypesByEvent()` - Get all ticket types for an event
- `getTicketTypeById()` - Get specific ticket type
- `createTicketType()` - Create single ticket type
- `createTicketTypes()` - Bulk create ticket types
- `updateTicketTypeQuantity()` - Update available quantity
- `deleteTicketType()` - Remove ticket type

## Setup Instructions

### 1. Run SQL Migration
Execute the SQL migration to add the necessary database tables and fields:

```sql
-- File: scripts/sql/009_add_ticket_types_and_currency.sql
```

In your Supabase Dashboard:
1. Go to SQL Editor
2. Copy the contents of `scripts/sql/009_add_ticket_types_and_currency.sql`
3. Paste and run the migration

### 2. Test Event Creation
1. Go to `/admin` page
2. Click "Create Event"
3. Fill in event details
4. Select currency (defaults to USD)
5. Add ticket types:
   - Enter name, price, quantity, and optional description
   - Click "Add Ticket Type"
   - Add as many types as needed
6. Create the event

## Usage Example

### Creating an Event with Multiple Ticket Types

**Event:** Summer Music Festival 2024
**Currency:** USD ($)

**Ticket Types:**
1. **Early Bird**
   - Price: $50.00
   - Quantity: 100
   - Description: Limited time offer

2. **General Admission**
   - Price: $75.00
   - Quantity: 500
   - Description: Standard entry

3. **VIP Pass**
   - Price: $150.00
   - Quantity: 50
   - Description: Includes backstage access and meet & greet

**Total Tickets:** 650

## What's Next (Still Pending)

### 5. Update Event Display ⏳
- Show ticket types on event cards
- Display currency symbols correctly
- Show availability per ticket type

### 6. Update Purchase Flow ⏳
- Allow users to select ticket type when purchasing
- Display prices in event currency
- Handle different ticket types in cart/checkout

## Benefits

✅ **Flexible pricing** - Offer multiple price tiers
✅ **Global support** - Use any major currency
✅ **Better UX** - Clear ticket type selection
✅ **Revenue optimization** - Premium tiers for higher revenue
✅ **Easy management** - Simple UI for adding/removing types
✅ **Type safety** - Full TypeScript support

## Files Modified

1. `scripts/sql/009_add_ticket_types_and_currency.sql` - Database schema
2. `lib/supabase-client.ts` - TypeScript interfaces
3. `lib/supabase-db.ts` - Database functions
4. `app/admin/page.tsx` - Admin UI with ticket type management

## Database Structure

```
events
├── id
├── currency (NEW)
└── ... other fields

ticket_types (NEW TABLE)
├── id
├── event_id
├── name
├── description
├── price
├── total_quantity
├── available_quantity
└── order_index

tickets
├── ticket_type_id (NEW)
├── ticket_type_name (NEW)
├── ticket_price (NEW)
└── ... other fields
```

## Notes

- Legacy `ticket_price` field on events is now set to 0 (we use ticket_types instead)
- `total_tickets` on events is calculated from sum of all ticket type quantities
- Currency defaults to USD if not specified
- Ticket types are ordered by `order_index` field
