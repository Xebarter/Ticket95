// Fast event creation dialog for admin dashboard with improved UI/UX and multiple sponsor logo uploads
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Image as ImageIcon, Upload, Calendar, Clock, MapPin, User, DollarSign, Building2, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const supabase = getSupabaseBrowserClient();

interface TicketType {
  name: string;
  description?: string;
  price: number;
  total_quantity: number;
  order_index: number;
}

interface Sponsor {
  name: string;
  logo_url?: string;
}

export default function AdminEventCreate({ onCreatedAction }: { onCreatedAction: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    venue: '',
    organizer_name: '',
    organizer_logo_url: '',
    currency: 'USD',
    is_featured: false
  });
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: 'General', price: 0, total_quantity: 100, order_index: 0, description: '' }
  ]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [newSponsor, setNewSponsor] = useState({ name: '', logo_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // File upload states
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null);
  const [organizerLogoPreview, setOrganizerLogoPreview] = useState<string>('');
  const [sponsorLogoFiles, setSponsorLogoFiles] = useState<Map<number, File>>(new Map());
  const [eventImages, setEventImages] = useState<File[]>([]);
  const [eventImagePreviews, setEventImagePreviews] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Separate state for 12-hour time format
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      eventImagePreviews.forEach(url => URL.revokeObjectURL(url));
      if (organizerLogoPreview) URL.revokeObjectURL(organizerLogoPreview);
    };
  }, [eventImagePreviews, organizerLogoPreview]);

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Event name is required';
    if (!eventDate) newErrors.date = 'Event date is required';
    if (!eventTime) newErrors.time = 'Event time is required';
    if (!form.venue.trim()) newErrors.venue = 'Venue is required';
    if (!form.organizer_name.trim()) newErrors.organizer = 'Organizer name is required';

    // Validate ticket types
    ticketTypes.forEach((ticket, index) => {
      if (!ticket.name.trim()) newErrors[`ticket_${index}_name`] = 'Name required';
      if (ticket.price < 0) newErrors[`ticket_${index}_price`] = 'Invalid price';
      if (ticket.total_quantity < 1) newErrors[`ticket_${index}_quantity`] = 'Min 1 ticket';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      setForm(prev => ({ ...prev, organizer_logo_url: '' }));
    }
  };

  // Handle sponsor logo file change - IMPROVED to support ALL sponsors
  const handleSponsorLogoChange = (e: React.ChangeEvent<HTMLInputElement>, sponsorIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a new Map to avoid mutation issues
      const newFiles = new Map(sponsorLogoFiles);
      newFiles.set(sponsorIndex, file);
      setSponsorLogoFiles(newFiles);

      // Create preview URL
      const preview = URL.createObjectURL(file);

      // Update sponsor with preview URL using map for immutability
      const updatedSponsors = sponsors.map((sponsor, idx) => {
        if (idx === sponsorIndex) {
          return { ...sponsor, logo_url: preview };
        }
        return sponsor;
      });
      setSponsors(updatedSponsors);
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
    setEventImages(prev => prev.filter((_, i) => i !== index));
    setEventImagePreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    if (coverImageIndex === index) {
      setCoverImageIndex(0);
    } else if (coverImageIndex > index) {
      setCoverImageIndex(prev => prev - 1);
    }
  };

  // Set cover image
  const setAsCover = (index: number) => {
    setCoverImageIndex(index);
  };

  async function handleCreate() {
    setLoading(true);
    setError('');

    // Validate form first
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Validate event images
      if (eventImages.length === 0 && !form.organizer_logo_url) {
        throw new Error('Please upload at least one event image or provide organizer logo URL');
      }

      // Combine date and 12-hour time into ISO format
      let combinedDateTime = '';
      if (eventDate && eventTime) {
        const [hours, minutes] = eventTime.split(':');
        let hours24 = parseInt(hours);

        // Convert to 24-hour format
        if (timePeriod === 'PM' && hours24 !== 12) {
          hours24 += 12;
        } else if (timePeriod === 'AM' && hours24 === 12) {
          hours24 = 0;
        }

        const formattedHours = hours24.toString().padStart(2, '0');
        combinedDateTime = `${eventDate}T${formattedHours}:${minutes}:00`;
      }

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

      // Upload sponsor logos if files selected - NOW SUPPORTS ALL SPONSORS
      const uploadedSponsors = await Promise.all(
        sponsors.map(async (sponsor, index) => {
          const logoFile = sponsorLogoFiles.get(index);
          if (logoFile) {
            const logoUrl = await uploadFile(logoFile, 'event-images', user.id);
            return { ...sponsor, logo_url: logoUrl };
          }
          return sponsor;
        })
      );

      // Upload event images
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < eventImages.length; i++) {
        const imageUrl = await uploadFile(eventImages[i], 'event-images', user.id);
        uploadedImageUrls.push(imageUrl);
      }

      setUploadingImages(false);

      // Determine primary image URL (cover image)
      const primaryImageUrl = uploadedImageUrls[coverImageIndex] || '';

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventData: {
            ...form,
            organizer_id: user.id,  // Add organizer_id here
            date: combinedDateTime,
            organizer_logo_url: organizerLogoUrl,
            image_url: primaryImageUrl,
            image_urls: uploadedImageUrls
          },
          ticketTypes,
          sponsors: uploadedSponsors
        })
      });
      if (!res.ok) throw new Error('Failed to create event');

      // Reset form
      setOpen(false);
      setForm({ name: '', date: '', venue: '', organizer_name: '', organizer_logo_url: '', currency: 'USD', is_featured: false });
      setEventDate('');
      setEventTime('');
      setTimePeriod('PM');
      setTicketTypes([{ name: 'General', price: 0, total_quantity: 100, order_index: 0, description: '' }]);
      setSponsors([]);
      setNewSponsor({ name: '', logo_url: '' });
      setOrganizerLogoFile(null);
      setOrganizerLogoPreview('');
      setEventImages([]);
      setEventImagePreviews([]);
      setCoverImageIndex(0);
      setErrors({});
      onCreatedAction();
    } catch (e: any) {
      setError(e.message);
      setUploadingImages(false);
    } finally {
      setLoading(false);
    }
  }

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      {
        name: `Ticket ${ticketTypes.length + 1}`,
        price: 0,
        total_quantity: 100,
        order_index: ticketTypes.length,
        description: ''
      }
    ]);
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: any) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length === 1) return;
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const addSponsor = () => {
    if (!newSponsor.name.trim()) return;
    const sponsorIndex = sponsors.length;
    setSponsors([...sponsors, { ...newSponsor }]);

    // If there's a file stored in the input, move it to our file map
    const fileInput = document.getElementById('new_sponsor_logo_file') as any;
    if (fileInput?._file) {
      const newFiles = new Map(sponsorLogoFiles);
      newFiles.set(sponsorIndex, fileInput._file);
      setSponsorLogoFiles(newFiles);
      fileInput._file = null;
    }

    setNewSponsor({ name: '', logo_url: '' });
  };

  const removeSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="h-9 gap-1.5 rounded-full px-4 shadow-sm">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New event</span>
        <span className="inline sm:hidden">Create</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Create New Event</DialogTitle>
                <DialogDescription className="text-sm">
                  Fill in the details below to create a new event for the platform
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <Tabs defaultValue="basic" className="flex flex-col h-full">
            <div className="px-6 pt-4">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="basic" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Basic Info</span>
                </TabsTrigger>
                <TabsTrigger value="tickets" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Media</span>
                </TabsTrigger>
                <TabsTrigger value="sponsors" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Sponsors</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="max-h-[calc(95vh-280px)] px-6 py-4">
              {/* BASIC INFO TAB */}
              <TabsContent value="basic" className="space-y-6 mt-0 data-[state=inactive]:hidden">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Event Details</h3>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">Event Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter event name"
                      value={form.name}
                      onChange={(e) => setForm((f: typeof form) => ({ ...f, name: e.target.value }))}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                      />
                      {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                        />
                        {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="period">AM/PM</Label>
                        <select
                          id="period"
                          value={timePeriod}
                          onChange={(e) => setTimePeriod(e.target.value as 'AM' | 'PM')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      value={form.currency}
                      onChange={(e) => setForm((f: typeof form) => ({ ...f, currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {/* Major Global Currencies */}
                      <option value="USD">USD - United States Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound Sterling</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="CHF">CHF - Swiss Franc</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="NZD">NZD - New Zealand Dollar</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                      <option value="HKD">HKD - Hong Kong Dollar</option>
                      <option value="KRW">KRW - South Korean Won</option>
                      <option value="MXN">MXN - Mexican Peso</option>
                      <option value="BRL">BRL - Brazilian Real</option>
                      <option value="ZAR">ZAR - South African Rand</option>

                      {/* African Currencies */}
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                      <option value="RWF">RWF - Rwandan Franc</option>
                      <option value="ETB">ETB - Ethiopian Birr</option>
                      <option value="GHS">GHS - Ghanaian Cedi</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="EGP">EGP - Egyptian Pound</option>
                      <option value="MAD">MAD - Moroccan Dirham</option>
                      <option value="TND">TND - Tunisian Dinar</option>
                      <option value="DZD">DZD - Algerian Dinar</option>
                      <option value="LYD">LYD - Libyan Dinar</option>
                      <option value="AOA">AOA - Angolan Kwanza</option>
                      <option value="XOF">XOF - West African CFA Franc</option>
                      <option value="XAF">XAF - Central African CFA Franc</option>
                      <option value="MUR">MUR - Mauritian Rupee</option>
                      <option value="SCR">SCR - Seychellois Rupee</option>
                      <option value="BWP">BWP - Botswana Pula</option>
                      <option value="NAD">NAD - Namibian Dollar</option>
                      <option value="SZL">SZL - Swazi Lilangeni</option>
                      <option value="LSL">LSL - Lesotho Loti</option>
                      <option value="MWK">MWK - Malawian Kwacha</option>
                      <option value="ZMW">ZMW - Zambian Kwacha</option>
                      <option value="ZWL">ZWL - Zimbabwean Dollar</option>
                      <option value="MZN">MZN - Mozambican Metical</option>
                      <option value="MGA">MGA - Malagasy Ariary</option>
                      <option value="CDF">CDF - Congolese Franc</option>
                      <option value="SOS">SOS - Somali Shilling</option>
                      <option value="DJF">DJF - Djiboutian Franc</option>
                      <option value="ERN">ERN - Eritrean Nakfa</option>
                      <option value="SDG">SDG - Sudanese Pound</option>
                      <option value="SSP">SSP - South Sudanese Pound</option>
                      <option value="GMD">GMD - Gambian Dalasi</option>
                      <option value="GNF">GNF - Guinean Franc</option>
                      <option value="SLL">SLL - Sierra Leonean Leone</option>
                      <option value="LRD">LRD - Liberian Dollar</option>
                      <option value="CVE">CVE - Cape Verdean Escudo</option>
                      <option value="STN">STN - São Tomé and Príncipe Dobra</option>
                      <option value="CMR">CMR - Cameroonian Franc</option>

                      {/* Middle Eastern Currencies */}
                      <option value="AED">AED - United Arab Emirates Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="QAR">QAR - Qatari Riyal</option>
                      <option value="KWD">KWD - Kuwaiti Dinar</option>
                      <option value="BHD">BHD - Bahraini Dinar</option>
                      <option value="OMR">OMR - Omani Rial</option>
                      <option value="JOD">JOD - Jordanian Dinar</option>
                      <option value="LBP">LBP - Lebanese Pound</option>
                      <option value="TRY">TRY - Turkish Lira</option>
                      <option value="ILS">ILS - Israeli New Shekel</option>
                      <option value="PKR">PKR - Pakistani Rupee</option>
                      <option value="BDT">BDT - Bangladeshi Taka</option>
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      <option value="NPR">NPR - Nepalese Rupee</option>
                      <option value="AFN">AFN - Afghan Afghani</option>

                      {/* Asian Currencies */}
                      <option value="MMK">MMK - Myanmar Kyat</option>
                      <option value="KHR">KHR - Cambodian Riel</option>
                      <option value="LAK">LAK - Lao Kip</option>
                      <option value="VND">VND - Vietnamese Dong</option>
                      <option value="THB">THB - Thai Baht</option>
                      <option value="MYR">MYR - Malaysian Ringgit</option>
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="UAH">UAH - Ukrainian Hryvnia</option>
                      <option value="CZK">CZK - Czech Koruna</option>
                      <option value="HUF">HUF - Hungarian Forint</option>
                      <option value="RON">RON - Romanian Leu</option>
                      <option value="BGN">BGN - Bulgarian Lev</option>
                      <option value="HRK">HRK - Croatian Kuna</option>
                      <option value="ISK">ISK - Icelandic Króna</option>
                      <option value="SEK">SEK - Swedish Krona</option>
                      <option value="NOK">NOK - Norwegian Krone</option>
                      <option value="DKK">DKK - Danish Krone</option>
                      <option value="PLN">PLN - Polish Zloty</option>

                      {/* South American Currencies */}
                      <option value="CLP">CLP - Chilean Peso</option>
                      <option value="COP">COP - Colombian Peso</option>
                      <option value="PEN">PEN - Peruvian Sol</option>
                      <option value="ARS">ARS - Argentine Peso</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="venue">Venue *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="venue"
                        placeholder="Enter venue location"
                        value={form.venue}
                        onChange={(e) => setForm((f: typeof form) => ({ ...f, venue: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                    {errors.venue && <p className="text-xs text-destructive">{errors.venue}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Organizer Information</h3>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="organizer">Organizer Name *</Label>
                    <Input
                      id="organizer"
                      placeholder="Enter organizer name"
                      value={form.organizer_name}
                      onChange={(e) => setForm((f: typeof form) => ({ ...f, organizer_name: e.target.value }))}
                    />
                    {errors.organizer && <p className="text-xs text-destructive">{errors.organizer}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="organizer_logo">Organizer Logo</Label>
                    <div className="space-y-2">
                      <Input
                        id="organizer_logo_url"
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={form.organizer_logo_url}
                        onChange={(e) => setForm((f: typeof form) => ({ ...f, organizer_logo_url: e.target.value }))}
                        disabled={!!organizerLogoFile}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          id="organizer_logo_file"
                          type="file"
                          accept="image/*"
                          onChange={handleOrganizerLogoChange}
                          disabled={!!form.organizer_logo_url}
                          className="flex-1"
                        />
                      </div>
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
                </div>

                <div className="flex items-center space-x-3 border-t pt-4 pb-2">
                  <Checkbox
                    id="is_featured"
                    checked={form.is_featured}
                    onCheckedChange={(checked) => setForm((f: typeof form) => ({ ...f, is_featured: checked as boolean }))}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="is_featured"
                      className="text-sm font-medium cursor-pointer"
                    >
                      <Star className="w-4 h-4 inline mr-1" />
                      Mark as Featured Event
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Featured events appear prominently on the homepage carousel.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* TICKETS TAB */}
              <TabsContent value="tickets" className="space-y-4 mt-0 data-[state=inactive]:hidden">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold">Ticket Types</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addTicketType}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Ticket Type
                  </Button>
                </div>
                {ticketTypes.map((ticket, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ticket #{index + 1}</span>
                      {ticketTypes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTicketType(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Ticket name"
                          value={ticket.name}
                          onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                          className="h-8"
                        />
                        {errors[`ticket_${index}_name`] && <p className="text-xs text-destructive">{errors[`ticket_${index}_name`]}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Price ({form.currency})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={ticket.price}
                          onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                        {errors[`ticket_${index}_price`] && <p className="text-xs text-destructive">{errors[`ticket_${index}_price`]}</p>}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Total Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="100"
                        value={ticket.total_quantity}
                        onChange={(e) => updateTicketType(index, 'total_quantity', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                      {errors[`ticket_${index}_quantity`] && <p className="text-xs text-destructive">{errors[`ticket_${index}_quantity`]}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Description (Optional)</Label>
                      <Input
                        placeholder="Ticket description"
                        value={ticket.description || ''}
                        onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* MEDIA TAB */}
              <TabsContent value="media" className="space-y-4 mt-0 data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <Label htmlFor="event_images">Upload Event Images</Label>
                  <Input
                    id="event_images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEventImagesChange}
                    disabled={uploadingImages}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload multiple images. Click on an image to set it as the cover.
                  </p>
                </div>
                {eventImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {eventImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={preview}
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
                  </div>
                )}
                {uploadingImages && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Uploading images...</p>
                  </div>
                )}
              </TabsContent>

              {/* SPONSORS TAB */}
              <TabsContent value="sponsors" className="space-y-4 mt-0 data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      placeholder="Sponsor name"
                      value={newSponsor.name}
                      onChange={(e) => setNewSponsor((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Button type="button" variant="outline" onClick={addSponsor} disabled={!newSponsor.name.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Sponsor logo URL (optional)"
                      value={newSponsor.logo_url}
                      onChange={(e) => setNewSponsor((prev) => ({ ...prev, logo_url: e.target.value }))}
                    />
                    <Input
                      id={`new_sponsor_logo_file`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const preview = URL.createObjectURL(file);
                          setNewSponsor(prev => ({ ...prev, logo_url: preview }));
                          (e.target as any)._file = file;
                        }
                      }}
                      disabled={!!newSponsor.logo_url && !newSponsor.logo_url.startsWith('blob:')}
                    />
                  </div>
                </div>
                {sponsors.length > 0 && (
                  <div className="space-y-2">
                    {sponsors.map((sponsor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {sponsor.logo_url && (
                            <img
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              className="h-10 w-10 object-contain rounded-md bg-white p-1"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          )}
                          <span className="font-medium">{sponsor.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`sponsor_${index}_logo`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSponsorLogoChange(e, index)}
                            className="max-w-[200px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSponsor(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>

            <div className="px-6 py-4 border-t">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </DialogFooter>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
