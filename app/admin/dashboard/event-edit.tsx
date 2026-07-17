// Fast event editing dialog for admin dashboard
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';

export default function AdminEventEdit({ event, onUpdatedAction }: { event: any, onUpdatedAction: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...event, is_featured: event.is_featured || false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // File upload states
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null);
  const [organizerLogoPreview, setOrganizerLogoPreview] = useState<string>('');
  const [eventImages, setEventImages] = useState<File[]>([]);
  const [eventImagePreviews, setEventImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(event.image_urls || (event.image_url ? [event.image_url] : []));
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Upload file to Supabase storage
  const uploadFile = async (file: File, bucket: string, userId: string): Promise<string> => {
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = `${userId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload file');
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    return data.publicUrl;
  };

  // Handle organizer logo file change
  const handleOrganizerLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrganizerLogoFile(file);
      const preview = URL.createObjectURL(file);
      setOrganizerLogoPreview(preview);
      setForm((prev: typeof form) => ({ ...prev, organizer_logo_url: '' })); // Clear URL input
    }
  };

  // Handle event images change
  const handleEventImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setEventImages(prev => [...prev, ...files]);
      setEventImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Remove event image
  const removeEventImage = (index: number) => {
    if (index < existingImageUrls.length) {
      // Remove from existing URLs
      setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
      if (coverImageIndex === index) {
        setCoverImageIndex(0);
      } else if (coverImageIndex > index) {
        setCoverImageIndex(prev => prev - 1);
      }
    } else {
      // Remove from new uploads
      const newIndex = index - existingImageUrls.length;
      setEventImages(prev => prev.filter((_, i) => i !== newIndex));
      setEventImagePreviews(prev => {
        const newPreviews = [...prev];
        URL.revokeObjectURL(newPreviews[newIndex]);
        newPreviews.splice(newIndex, 1);
        return newPreviews;
      });
      if (coverImageIndex >= existingImageUrls.length && coverImageIndex === index) {
        setCoverImageIndex(existingImageUrls.length > 0 ? 0 : 0);
      }
    }
  };

  // Set cover image
  const setAsCover = (index: number) => {
    setCoverImageIndex(index);
  };

  async function handleUpdate() {
    setLoading(true);
    setError('');
    try {
      console.log('handleUpdate called - form data:', form);

      setUploadingImages(true);

      // Get current user for storage paths
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      // Upload organizer logo if file selected
      let organizerLogoUrl = form.organizer_logo_url;
      if (organizerLogoFile) {
        organizerLogoUrl = await uploadFile(organizerLogoFile, 'event-images', user.id);
      }

      // Upload new event images
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < eventImages.length; i++) {
        const imageUrl = await uploadFile(eventImages[i], 'event-images', user.id);
        uploadedImageUrls.push(imageUrl);
      }

      // Combine existing and new images
      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls];
      const primaryImageUrl = allImageUrls[coverImageIndex] || '';

      setUploadingImages(false);

      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventData: {
            ...form,
            organizer_logo_url: organizerLogoUrl,
            image_url: primaryImageUrl,
            image_urls: allImageUrls
          }
        })
      });
      if (!res.ok) throw new Error('Failed to update event');
      setOpen(false);
      onUpdatedAction();
    } catch (e: any) {
      setError(e.message);
      setUploadingImages(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full px-3 text-xs"
      >
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Event Name</Label>
              <Input
                id="edit-name"
                placeholder="Event Name"
                value={form.name}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date & Time</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-venue">Venue</Label>
              <Input
                id="edit-venue"
                placeholder="Venue"
                value={form.venue}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, venue: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-organizer">Organizer Name</Label>
              <Input
                id="edit-organizer"
                placeholder="Organizer Name"
                value={form.organizer_name}
                onChange={(e) => setForm((f: typeof form) => ({ ...f, organizer_name: e.target.value }))}
              />
            </div>

            {/* Organizer Logo */}
            <div className="grid gap-2">
              <Label htmlFor="edit-organizer-logo">Organizer Logo</Label>
              <div className="space-y-2">
                <Input
                  id="edit-organizer-logo-url"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={form.organizer_logo_url || ''}
                  onChange={(e) => setForm((f: typeof form) => ({ ...f, organizer_logo_url: e.target.value }))}
                  disabled={!!organizerLogoFile}
                />
                <Input
                  id="edit-organizer-logo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleOrganizerLogoChange}
                  disabled={!!form.organizer_logo_url}
                />
                {(organizerLogoPreview || form.organizer_logo_url) && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Logo preview:</p>
                    <img
                      src={organizerLogoPreview || form.organizer_logo_url}
                      alt="Logo preview"
                      className="h-12 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Event Images */}
            <div className="grid gap-2">
              <Label>Event Images</Label>
              <div className="space-y-2">
                <Input
                  id="edit-event-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEventImagesChange}
                  disabled={uploadingImages}
                />
                <p className="text-xs text-muted-foreground">
                  Add more images. Click an image to set as cover.
                </p>
              </div>

              {(existingImageUrls.length > 0 || eventImagePreviews.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {existingImageUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={url}
                        alt={`Event ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {coverImageIndex === index && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Cover
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setAsCover(index)}
                          className="h-8 px-2 text-xs"
                        >
                          Set as Cover
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeEventImage(index)}
                          className="h-8 px-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {eventImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={preview}
                        alt={`New ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {coverImageIndex === existingImageUrls.length + index && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Cover
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setAsCover(existingImageUrls.length + index)}
                          className="h-8 px-2 text-xs"
                        >
                          Set as Cover
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeEventImage(existingImageUrls.length + index)}
                          className="h-8 px-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {uploadingImages && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Uploading images...</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3 border-t pt-4 pb-2">
            <Checkbox
              id="edit-is_featured"
              checked={form.is_featured}
              onCheckedChange={(checked) => setForm((f: typeof form) => ({ ...f, is_featured: checked as boolean }))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="edit-is_featured"
                className="text-sm font-medium cursor-pointer"
              >
                Mark as Featured Event
              </Label>
              <p className="text-xs text-muted-foreground">
                Featured events appear in the carousel on the homepage
              </p>
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading || uploadingImages}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading || uploadingImages}>
              {loading || uploadingImages ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
