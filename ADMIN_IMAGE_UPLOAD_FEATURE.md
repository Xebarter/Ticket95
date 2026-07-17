# Admin Dashboard Image Upload Feature

## Summary
Added comprehensive image upload capabilities to the admin dashboard event creation dialog, supporting:
- Organizer logo upload
- Sponsor logo uploads (per sponsor)
- Multiple event images with cover selection

## Changes Made

### 1. Updated Component: `app/admin/dashboard/event-create.tsx`

#### New State Variables
- `organizerLogoFile`: Stores the selected organizer logo file
- `organizerLogoPreview`: Preview URL for organizer logo
- `sponsorLogoFiles`: Map tracking logo files for each sponsor by index
- `eventImages`: Array of uploaded event image files
- `eventImagePreviews`: Array of preview URLs for event images
- `coverImageIndex`: Index of the selected cover image
- `uploadingImages`: Loading state during image upload

#### New Helper Functions

**`uploadFile(file, bucket, userId)`**
- Uploads a file to Supabase storage
- Returns the public URL
- Handles file naming and path generation

**`handleOrganizerLogoChange(e)`**
- Handles organizer logo file selection
- Creates preview URL
- Clears URL input when file is selected

**`handleSponsorLogoChange(e, sponsorIndex)`**
- Handles sponsor logo file selection
- Tracks files by sponsor index in a Map
- Updates preview for immediate feedback

**`handleEventImagesChange(e)`**
- Handles multiple event image file selection
- Creates preview URLs for all images
- Appends to existing images

**`removeEventImage(index)`**
- Removes an event image at specified index
- Cleans up preview URL resources
- Adjusts cover image index if needed

**`setAsCover(index)`**
- Sets which image is the cover/primary image

#### Updated `handleCreate()` Function
Now handles complete file upload workflow:
1. Validates that at least one image is provided
2. Gets authenticated user for storage paths
3. Uploads organizer logo (if file selected)
4. Uploads all sponsor logos
5. Uploads all event images
6. Determines primary image from cover selection
7. Sends all data including uploaded URLs to API

#### UI Enhancements

**Organizer Logo Section:**
- Added file input alongside URL input
- Mutual exclusivity: URL input disabled when file selected, file input disabled when URL entered
- Live preview for both file and URL

**Event Images Section (NEW):**
- Multiple file upload support
- Grid display of image previews (2 columns mobile, 3 desktop)
- Cover image badge indicator
- Hover actions: "Set as Cover" and "Delete" buttons
- Upload progress indicator

**Sponsors Section:**
- File input added for new sponsor logo
- Each existing sponsor has individual file upload
- Supports both URL and file upload simultaneously
- Preview displays uploaded logo

## Technical Details

### Storage Structure
Files are uploaded to Supabase storage bucket `event-images` with paths:
```
{user_id}/{timestamp}_{random_string}_{sanitized_filename}
```

### Supported Formats
- All image formats (via `accept="image/*"`)
- Multiple files for event images
- Single file for organizer and sponsor logos

### Data Flow
1. User selects files → Preview generated
2. User clicks "Create Event" → Files uploaded to Supabase
3. Public URLs generated → Included in event data
4. Event created with all image URLs

### Backward Compatibility
- URL inputs remain functional
- Users can choose between URL or file upload
- Existing events unaffected

## Usage Instructions

### For Admins Creating Events:

**Organizer Logo:**
1. Enter organizer name
2. Either:
   - Paste a URL in the "Organizer Logo URL" field, OR
   - Click "Choose File" to upload a logo
3. Preview appears automatically

**Event Images:**
1. Click "Upload Event Images"
2. Select one or multiple image files
3. Images appear in a grid
4. Hover over any image to:
   - Set as cover (appears on event cards)
   - Delete the image
5. First image is cover by default

**Sponsors:**
1. Enter sponsor name
2. Optionally add logo via URL or file upload
3. Click "+" button to add sponsor
4. Each sponsor can have their logo updated individually

## Dependencies
- Uses existing Supabase client (`@/lib/supabase-client`)
- Requires `event-images` storage bucket in Supabase
- Uses Shadcn UI components already in use

## Testing Checklist
- [ ] Upload organizer logo file
- [ ] Upload event images (multiple)
- [ ] Set different cover image
- [ ] Remove event images
- [ ] Add sponsors with logo files
- [ ] Create event with mixed URL/file inputs
- [ ] Verify images appear correctly after creation
- [ ] Test error handling (network issues, large files)

## Notes
- Files are uploaded before event creation
- Failed uploads prevent event creation
- All uploads use the authenticated user's ID for organization
- Preview URLs are blob URLs (not uploaded until form submission)
