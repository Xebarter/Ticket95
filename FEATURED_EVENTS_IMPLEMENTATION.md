# Featured Events Carousel Implementation

## Overview
This implementation adds a beautiful, modern carousel for featured events on the homepage, along with the ability for admins to mark events as "featured" from the admin dashboard.

## Changes Made

### 1. Database Schema (`scripts/sql/012_add_featured_events.sql`)
- Added `is_featured` boolean column to the `events` table
- Created index for faster featured event queries
- Default value is `false`

**Run this SQL migration in your Supabase dashboard!**

### 2. Type Definitions (`lib/supabase-client.ts`)
- Added `is_featured?: boolean` to the Event interface

### 3. Database Functions (`lib/supabase-db.ts`)
- Added `getFeaturedEvents()` function to fetch featured events
- Filters by `status = 'approved'` AND `is_featured = true`

### 4. Featured Carousel Component (`components/home/featured-carousel.tsx`)
- Modern, responsive carousel with auto-play functionality
- Large event cards with image on left and details on right
- Navigation arrows and dot indicators
- Auto-play pauses on hover
- Shows featured badge prominently

### 5. API Endpoint (`app/api/admin/events/[id]/featured/route.ts`)
- PATCH endpoint to toggle featured status
- Requires admin authentication via service role key

### 6. Admin UI Components
- **FeaturedToggle Component** (`components/admin/featured-toggle.tsx`): Button to toggle featured status
- **Updated Event List** (`app/admin/dashboard/event-list.tsx`): Added featured toggle to approved events section

### 7. Homepage Layout (`app/page.tsx`, `app/home-client.tsx`)
- **New Layout Structure:**
  1. Header
  2. Search Bar Section (below header)
  3. Featured Events Carousel (if featured events exist)
  4. All Events Grid
  
- Removed old hero section with collage
- Search bar now in its own dedicated section below header
- Featured carousel displays between search and all events

## How to Use

### For Administrators:
You have **two ways** to mark events as featured:

#### Method 1: From the Event List (Quick Toggle)
1. Go to Admin Dashboard
2. In the "Approved Events" section, you'll see a "Featured" toggle button next to each event
3. Click "Make Featured" to add an event to the carousel
4. Click "Featured" to remove it from the carousel

#### Method 2: When Creating/Editing Events
1. **Creating a New Event:**
   - Click "Create Event"
   - Fill in the event details
   - Check the "Mark as Featured Event" checkbox
   - Click "Create"

2. **Editing an Existing Event:**
   - Click "Edit" on any event
   - Check or uncheck the "Mark as Featured Event" checkbox
   - Click "Save"

### For Users:
- Featured events appear in a beautiful carousel on the homepage
- Carousel auto-plays every 5 seconds
- Navigate using arrows or dots
- Click anywhere on a featured event card to view details and purchase tickets

## Features

### Carousel Features:
- ✅ Responsive design (mobile-friendly)
- ✅ Auto-play with 5-second intervals
- ✅ Pause on hover
- ✅ Smooth transitions
- ✅ Image optimization with Next.js Image
- ✅ Featured badge for visual distinction
- ✅ Event details prominently displayed
- ✅ Price and availability information

### Admin Features:
- ✅ One-click toggle for featured status
- ✅ Visual feedback (button color change)
- ✅ Toast notifications for success/error
- ✅ Real-time updates in the dashboard

## Styling
The carousel uses:
- Gradient backgrounds for modern look
- Shadow effects for depth
- Smooth animations and transitions
- Consistent color scheme with the rest of the app
- Mobile-first responsive design

## Testing
1. Run the SQL migration in Supabase
2. Mark some approved events as "featured" in the admin dashboard
3. Visit the homepage to see the carousel
4. Test auto-play, navigation, and responsiveness

## Notes
- Only approved events can be marked as featured
- The carousel only shows if there's at least one featured event
- Featured events are ordered by date (ascending)
- Maximum of 5 featured events shown at a time (configurable)
