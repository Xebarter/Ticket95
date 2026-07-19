'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Trash2, Plus, Image as ImageIcon, Star, ArrowLeft } from 'lucide-react';
import { createEvent, createSponsor, createTicketTypes, updateEvent, replaceEventSponsors, replaceEventTicketTypes } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase-client';
import { isEventDatePast } from '@/lib/event-status';
import { EVENT_CATEGORIES, normalizeEventCategory, type EventCategoryId } from '@/lib/event-categories';

type WizardStep = 'basic' | 'pricing' | 'organizer' | 'sponsors' | 'review';

interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  logoFile?: File;
}

interface WizardTicketType {
  id: string;
  name: string;
  description?: string;
  price: string;
  quantity: string;
}

type WizardMode = 'create' | 'edit';

type InitialEventData = {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  venue?: string;
  currency?: string;
  ticket_price?: number;
  total_tickets?: number;
  tickets_available?: number;
  organizer_name?: string;
  organizer_phone?: string;
  organizer_logo_url?: string;
  image_url?: string;
  image_urls?: string[];
  category?: EventCategoryId;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
};

type InitialTicketTypeData = {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  total_quantity?: number;
  available_quantity?: number;
  order_index?: number;
};

type TimePeriod = 'AM' | 'PM';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const to12Hour = (hours24: number) => {
  if (hours24 === 0) return { hour: 12, period: 'AM' as TimePeriod };
  if (hours24 < 12) return { hour: hours24, period: 'AM' as TimePeriod };
  if (hours24 === 12) return { hour: 12, period: 'PM' as TimePeriod };
  return { hour: hours24 - 12, period: 'PM' as TimePeriod };
};

const to24Hour = (hour12: number, period: TimePeriod) => {
  const normalized = hour12 % 12;
  return period === 'PM' ? normalized + 12 : normalized;
};

const buildDateTimeLocal = (date: string, hour12: string, minute: string, period: TimePeriod) => {
  if (!date || !hour12 || !minute) return '';
  const hour = Math.min(Math.max(parseInt(hour12, 10) || 12, 1), 12);
  const safeMinute = Math.min(Math.max(parseInt(minute, 10) || 0, 0), 59);
  const hour24 = to24Hour(hour, period);
  return `${date}T${String(hour24).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
};

const getInitialDateTimeParts = (sourceDate?: string) => {
  let date = sourceDate ? new Date(sourceDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }
  if (!sourceDate) {
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);
  }

  const minute = date.getMinutes();
  const roundedMinute = Math.round(minute / 5) * 5;
  if (roundedMinute === 60) {
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
  } else {
    date.setMinutes(roundedMinute);
  }

  const time = to12Hour(date.getHours());
  return {
    eventDate: toDateInputValue(date),
    eventHour: String(time.hour),
    eventMinute: String(date.getMinutes()).padStart(2, '0'),
    timePeriod: time.period,
  };
};

const CURRENCY_OPTIONS = [
  'USD',
  'EUR',
  'GBP',
  'UGX',
  'KES',
  'TZS',
  'RWF',
  'NGN',
  'GHS',
  'ZAR',
  'AED',
  'INR',
];

const maskId = (value?: string | null) => {
  if (!value) return 'null';
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

export function EventCreationWizard({
  mode = 'create',
  eventId,
  initialEvent,
  initialSponsors,
  initialTicketTypes,
  onDone,
  context = 'organizer',
  onCancel,
}: {
  mode?: WizardMode;
  eventId?: string;
  initialEvent?: InitialEventData;
  initialSponsors?: Sponsor[];
  initialTicketTypes?: InitialTicketTypeData[];
  onDone?: () => void;
  context?: 'organizer' | 'admin';
  onCancel?: () => void;
}) {

  const router = useRouter();
  const { user } = useAuth();
  const isAdminContext = context === 'admin';
  const [step, setStep] = useState<WizardStep>('basic');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [eventImages, setEventImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialEvent?.image_urls || []);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(() => {
    const urls = initialEvent?.image_urls || [];
    const primary = initialEvent?.image_url;
    if (primary) {
      const idx = urls.indexOf(primary);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const eventImagePreviews = useMemo(() => {
    return eventImages.map((file) => URL.createObjectURL(file));
  }, [eventImages]);

  const initialDateTime = useMemo(() => getInitialDateTimeParts(initialEvent?.date), [initialEvent?.date]);
  const [eventDate, setEventDate] = useState(initialDateTime.eventDate);
  const [eventHour, setEventHour] = useState(initialDateTime.eventHour);
  const [eventMinute, setEventMinute] = useState(initialDateTime.eventMinute);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialDateTime.timePeriod);

  useEffect(() => {
    return () => {
      for (const url of eventImagePreviews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [eventImagePreviews]);

  const [formData, setFormData] = useState({
    name: initialEvent?.name || '',
    description: initialEvent?.description || '',
    date: buildDateTimeLocal(
      initialDateTime.eventDate,
      initialDateTime.eventHour,
      initialDateTime.eventMinute,
      initialDateTime.timePeriod
    ),
    venue: initialEvent?.venue || '',
    currency: initialEvent?.currency || 'USD',
    category: normalizeEventCategory(initialEvent?.category) as EventCategoryId,
    ticketPrice: initialEvent?.ticket_price != null ? String(initialEvent.ticket_price) : '',
    totalTickets: initialEvent?.total_tickets != null ? String(initialEvent.total_tickets) : '',
  });

  const [organizer, setOrganizer] = useState({
    name: initialEvent?.organizer_name || user?.profile_name || '',
    phone: initialEvent?.organizer_phone || '',
    logo: initialEvent?.organizer_logo_url || user?.profile_logo_url || '',
  });
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null);
  const [organizerLogoPreview, setOrganizerLogoPreview] = useState<string>('');

  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors || []);
  const [newSponsor, setNewSponsor] = useState({ name: '', logo: '' });
  const [ticketTypes, setTicketTypes] = useState<WizardTicketType[]>(() => {
    if (initialTicketTypes && initialTicketTypes.length > 0) {
      return initialTicketTypes.map((ticketType, idx) => ({
        id: ticketType.id || `ticket_type_${Date.now()}_${idx}`,
        name: ticketType.name || `Ticket ${idx + 1}`,
        description: ticketType.description || '',
        price: String(ticketType.price ?? 0),
        quantity: String(ticketType.total_quantity ?? 1),
      }));
    }

    return [];
  });
  const [newTicketType, setNewTicketType] = useState<Omit<WizardTicketType, 'id'>>({
    name: '',
    description: '',
    price: '',
    quantity: '',
  });
  const [editingTicketType, setEditingTicketType] = useState<WizardTicketType | null>(null);
  const [ticketTypeError, setTicketTypeError] = useState('');
  const selectedDateTimePreview = useMemo(() => {
    if (!formData.date) return '';
    const dt = new Date(formData.date);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [formData.date]);

  const steps: Array<{ key: WizardStep; title: string; description: string }> = [
    { key: 'basic', title: 'Basic Info', description: 'Event name, date, and venue' },
    { key: 'pricing', title: 'Pricing', description: 'Ticket price and quantity' },
    { key: 'organizer', title: 'Organizer', description: 'Your branding' },
    { key: 'sponsors', title: 'Sponsors', description: 'Add sponsors (optional)' },
    { key: 'review', title: 'Review', description: 'Confirm everything' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < steps.length - 1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const combined = buildDateTimeLocal(eventDate, eventHour, eventMinute, timePeriod);
    setFormData((prev) => ({ ...prev, date: combined }));
  }, [eventDate, eventHour, eventMinute, timePeriod]);

  const handleEventImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEventImages(files);
  };

  const removeEventImage = (index: number) => {
    if (index < existingImageUrls.length) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
      setCoverImageIndex((prev) => {
        if (index === prev) return 0;
        if (index < prev) return Math.max(0, prev - 1);
        return prev;
      });
      return;
    }

    const fileIndex = index - existingImageUrls.length;
    setEventImages((prev) => prev.filter((_, i) => i !== fileIndex));
    setCoverImageIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const uploadEventImages = async (
    files: File[],
    opts?: {
      onFile?: (index: number, total: number, fileName: string) => void;
      onFileComplete?: (fileName: string) => void;
    }
  ): Promise<string[]> => {
    if (files.length === 0) return [];

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.id) {
      throw new Error('Your session expired. Please sign in again and retry.');
    }

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      opts?.onFile?.(i + 1, files.length, file.name || 'image');
      const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${authUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

      const { error: uploadError } = await withTimeout(
        supabase.storage
          .from('event-images')
          .upload(path, file, { upsert: false, contentType: file.type || undefined }),
        60000,
        'Image upload timed out. Please try again.'
      );

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload event image');
      }

      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      if (!data?.publicUrl) {
        throw new Error('Failed to generate public URL for uploaded image');
      }
      uploadedUrls.push(data.publicUrl);
      opts?.onFileComplete?.(file.name || 'image');
    }

    return uploadedUrls;
  };

  const handleOrganizerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrganizer((prev) => ({ ...prev, [name]: value }));
  };

  const handleOrganizerLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (organizerLogoPreview) {
      URL.revokeObjectURL(organizerLogoPreview);
    }

    const preview = URL.createObjectURL(file);
    setOrganizerLogoFile(file);
    setOrganizerLogoPreview(preview);
  };

  const handleNewSponsorLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (newSponsor.logo && newSponsor.logo.startsWith('blob:')) {
      URL.revokeObjectURL(newSponsor.logo);
    }

    const preview = URL.createObjectURL(file);
    setNewSponsor((prev) => ({ ...prev, logo: preview }));
    (e.currentTarget as HTMLInputElement).dataset.fileAttached = 'true';
    (e.currentTarget as HTMLInputElement).dataset.fileName = file.name;
    (e.currentTarget as HTMLInputElement).dataset.fileType = file.type;
    (e.currentTarget as HTMLInputElement).dataset.fileSize = String(file.size);
    (e.currentTarget as any)._file = file;
  };

  const handleAddSponsor = () => {
    if (!newSponsor.name.trim()) return;
    const sponsorFileInput = document.getElementById('new-sponsor-logo-file') as HTMLInputElement | null;
    const sponsorFile = (sponsorFileInput as any)?._file as File | undefined;

    const sponsor: Sponsor = {
      id: 'sponsor_' + Date.now(),
      name: newSponsor.name,
      logo: newSponsor.logo,
      logoFile: sponsorFile,
    };
    setSponsors([...sponsors, sponsor]);
    setNewSponsor({ name: '', logo: '' });
    if (sponsorFileInput) {
      sponsorFileInput.value = '';
      delete (sponsorFileInput as any)._file;
    }
  };

  const handleRemoveSponsor = (id: string) => {
    const sponsorToRemove = sponsors.find((s) => s.id === id);
    if (sponsorToRemove?.logo?.startsWith('blob:')) {
      URL.revokeObjectURL(sponsorToRemove.logo);
    }
    setSponsors(sponsors.filter((s) => s.id !== id));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 'basic':
        return !!(
          formData.name.trim() &&
          formData.category &&
          eventDate &&
          eventHour &&
          eventMinute &&
          formData.date &&
          formData.venue.trim() &&
          (existingImageUrls.length + eventImages.length) > 0
        );
      case 'pricing':
        if (ticketTypes.length === 0) return false;
        return ticketTypes.every((ticketType) =>
          ticketType.name.trim() &&
          Number(ticketType.price) >= 0 &&
          Number(ticketType.quantity) > 0
        );
      case 'organizer':
        return !!(organizer.name.trim() && organizer.phone.trim());
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    if (!validateStep()) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) setStep(nextStep.key);
  };

  const goToPreviousStep = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) setStep(prevStep.key);
    setError('');
  };

  const goToStep = (targetStep: WizardStep) => {
    setStep(targetStep);
    setError('');
  };

  const isTicketTypeValid = (ticketType: Omit<WizardTicketType, 'id'> | WizardTicketType) => {
    return (
      ticketType.name.trim().length > 0 &&
      Number(ticketType.price) >= 0 &&
      Number(ticketType.quantity) > 0
    );
  };

  const addTicketType = () => {
    if (!isTicketTypeValid(newTicketType)) {
      setTicketTypeError('Add a name, price of 0 or more, and quantity above 0.');
      return;
    }

    setTicketTypes((prev) => [
      ...prev,
      {
        id: `ticket_type_${Date.now()}_${prev.length}`,
        name: newTicketType.name.trim(),
        description: newTicketType.description?.trim() || '',
        price: newTicketType.price,
        quantity: newTicketType.quantity,
      },
    ]);
    setTicketTypeError('');
    setNewTicketType({ name: '', description: '', price: '', quantity: '' });
  };

  const updateTicketType = (id: string, field: keyof WizardTicketType, value: string) => {
    setTicketTypes((prev) =>
      prev.map((ticketType) => (ticketType.id === id ? { ...ticketType, [field]: value } : ticketType))
    );
  };

  const removeTicketType = (id: string) => {
    setTicketTypes((prev) => prev.filter((ticketType) => ticketType.id !== id));
  };

  const beginEditTicketType = (ticketType: WizardTicketType) => {
    setEditingTicketType({ ...ticketType });
    setTicketTypeError('');
  };

  const saveEditedTicketType = () => {
    if (!editingTicketType) return;
    if (!isTicketTypeValid(editingTicketType)) {
      setTicketTypeError('Name, price (0+), and quantity are required for each ticket type.');
      return;
    }

    setTicketTypes((prev) =>
      prev.map((ticketType) =>
        ticketType.id === editingTicketType.id
          ? {
              ...ticketType,
              name: editingTicketType.name.trim(),
              description: editingTicketType.description?.trim() || '',
              price: editingTicketType.price,
              quantity: editingTicketType.quantity,
            }
          : ticketType
      )
    );
    setEditingTicketType(null);
    setTicketTypeError('');
  };

  const normalizedTicketTypes = useMemo(() => {
    return ticketTypes
      .map((ticketType, idx) => ({
        name: ticketType.name.trim(),
        description: ticketType.description?.trim() || undefined,
        price: Number(ticketType.price) || 0,
        total_quantity: Number(ticketType.quantity) || 0,
        available_quantity: Number(ticketType.quantity) || 0,
        order_index: idx,
      }))
      .filter((ticketType) => ticketType.name && ticketType.price >= 0 && ticketType.total_quantity > 0);
  }, [ticketTypes]);

  const totalTicketsFromTypes = useMemo(
    () => normalizedTicketTypes.reduce((sum, ticketType) => sum + ticketType.total_quantity, 0),
    [normalizedTicketTypes]
  );

  const minTicketPrice = useMemo(() => {
    if (normalizedTicketTypes.length === 0) return 0;
    return Math.min(...normalizedTicketTypes.map((ticketType) => ticketType.price));
  }, [normalizedTicketTypes]);

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);
    setLoading(true);
    setLoadingMessage(mode === 'edit' ? 'Saving changes...' : 'Creating event...');
    setUploadProgress(0);
    setUploadComplete(false);

    if (!user) {
      setError(isAdminContext ? 'You must be logged in as an admin' : 'You must be logged in as an organizer');
      setLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser?.id) {
        throw new Error('Your session expired. Please sign in again and retry.');
      }

      const organizerIdForInsert = authUser.id;
      console.info('[create-event][debug] identity-check', {
        authUserId: maskId(authUser.id),
        organizerIdForInsert: maskId(organizerIdForInsert),
        matches: authUser.id === organizerIdForInsert,
        sessionPresent: !!session?.access_token,
        userRole: user?.role || 'unknown',
      });

      if ((existingImageUrls.length + eventImages.length) === 0) {
        throw new Error('Please upload at least one event image');
      }

      const totalUploadFiles =
        eventImages.length +
        (organizerLogoFile ? 1 : 0) +
        sponsors.filter((sponsor) => sponsor.logoFile).length;
      let uploadedFileCount = 0;
      const onUploadFileComplete = () => {
        if (totalUploadFiles === 0) {
          setUploadProgress(100);
          setUploadComplete(true);
          return;
        }
        uploadedFileCount += 1;
        const pct = Math.min(100, Math.round((uploadedFileCount / totalUploadFiles) * 100));
        setUploadProgress(pct);
        if (uploadedFileCount >= totalUploadFiles) {
          setUploadComplete(true);
        }
      };
      if (totalUploadFiles === 0) {
        setUploadProgress(100);
        setUploadComplete(true);
      }

      const uploadedNewUrls = await uploadEventImages(eventImages, {
        onFile: (idx, total, fileName) => {
          setLoadingMessage(`Uploading images (${idx}/${total}) — ${fileName}`);
        },
        onFileComplete: onUploadFileComplete,
      });
      const allUrls = [...existingImageUrls, ...uploadedNewUrls];
      const primaryImageUrl = allUrls[coverImageIndex] || allUrls[0];

      if (mode === 'create') {
        setLoadingMessage('Creating event...');
        const createTotalTickets = mode === 'create' ? totalTicketsFromTypes : Number(formData.totalTickets);
        const createTicketPrice = mode === 'create' ? minTicketPrice : Number(formData.ticketPrice);
        let organizerLogoUrl = organizer.logo;

        if (organizerLogoFile) {
          setLoadingMessage('Uploading organizer logo...');
          const [uploadedOrganizerLogo] = await uploadEventImages([organizerLogoFile], {
            onFileComplete: onUploadFileComplete,
          });
          organizerLogoUrl = uploadedOrganizerLogo || organizer.logo;
        }

        const event = await createEvent({
          name: formData.name,
          description: formData.description,
          date: formData.date,
          venue: formData.venue,
          currency: formData.currency,
          category: formData.category,
          ticket_price: createTicketPrice,
          total_tickets: createTotalTickets,
          tickets_available: createTotalTickets,
          organizer_id: organizerIdForInsert,
          organizer_name: organizer.name,
          organizer_phone: organizer.phone.trim(),
          organizer_logo_url: organizerLogoUrl,
          image_url: primaryImageUrl || undefined,
          image_urls: allUrls,
          status: 'pending',
        });

        if (normalizedTicketTypes.length > 0) {
          setLoadingMessage('Adding ticket types...');
          await createTicketTypes(
            normalizedTicketTypes.map((ticketType) => ({
              event_id: event.id,
              name: ticketType.name,
              description: ticketType.description,
              price: ticketType.price,
              total_quantity: ticketType.total_quantity,
              available_quantity: ticketType.available_quantity,
              order_index: ticketType.order_index,
            }))
          );
        }

        for (const sponsor of sponsors) {
          setLoadingMessage('Adding sponsors...');
          let sponsorLogoUrl = sponsor.logo;
          if (sponsor.logoFile) {
            const [uploadedSponsorLogo] = await uploadEventImages([sponsor.logoFile], {
              onFileComplete: onUploadFileComplete,
            });
            sponsorLogoUrl = uploadedSponsorLogo || sponsor.logo;
          }
          await createSponsor({
            event_id: event.id,
            name: sponsor.name,
            logo_url: sponsorLogoUrl,
            order_index: sponsors.indexOf(sponsor),
          });
        }
      } else {
        const targetId = eventId || initialEvent?.id;
        if (!targetId) {
          throw new Error('Missing event id');
        }

        const desiredTotal = totalTicketsFromTypes;
        const currentAvailable = initialEvent?.tickets_available ?? desiredTotal;
        const nextAvailable = Math.min(currentAvailable, desiredTotal);
        const nextTicketPrice = minTicketPrice;
        let organizerLogoUrl = organizer.logo;

        if (organizerLogoFile) {
          setLoadingMessage('Uploading organizer logo...');
          const [uploadedOrganizerLogo] = await uploadEventImages([organizerLogoFile], {
            onFileComplete: onUploadFileComplete,
          });
          organizerLogoUrl = uploadedOrganizerLogo || organizer.logo;
        }

        setLoadingMessage('Saving event changes...');
        const shouldResubmitForApproval =
          !isAdminContext &&
          initialEvent?.status === 'approved' &&
          initialEvent.date &&
          isEventDatePast(initialEvent.date) &&
          !isEventDatePast(formData.date);

        await updateEvent(targetId, {
          name: formData.name,
          description: formData.description,
          date: formData.date,
          venue: formData.venue,
          currency: formData.currency,
          category: formData.category,
          ticket_price: nextTicketPrice,
          total_tickets: desiredTotal,
          tickets_available: nextAvailable,
          organizer_name: organizer.name,
          organizer_phone: organizer.phone.trim(),
          organizer_logo_url: organizerLogoUrl,
          image_url: primaryImageUrl || undefined,
          image_urls: allUrls,
          ...(shouldResubmitForApproval ? { status: 'pending', rejection_reason: null } : {}),
        });

        const sponsorsWithUploadedLogos = [];
        for (const sponsor of sponsors) {
          let sponsorLogoUrl = sponsor.logo;
          if (sponsor.logoFile) {
            setLoadingMessage(`Uploading sponsor logo for ${sponsor.name}...`);
            const [uploadedSponsorLogo] = await uploadEventImages([sponsor.logoFile], {
              onFileComplete: onUploadFileComplete,
            });
            sponsorLogoUrl = uploadedSponsorLogo || sponsor.logo;
          }
          sponsorsWithUploadedLogos.push({
            name: sponsor.name,
            logo: sponsorLogoUrl,
          });
        }

        setLoadingMessage('Updating sponsors...');
        await replaceEventSponsors(
          targetId,
          sponsorsWithUploadedLogos.map((s, idx) => ({
            event_id: targetId,
            name: s.name,
            logo_url: s.logo,
            order_index: idx,
          }))
        );

        setLoadingMessage('Updating ticket types...');
        await replaceEventTicketTypes(
          targetId,
          normalizedTicketTypes.map((ticketType) => ({
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            total_quantity: ticketType.total_quantity,
            available_quantity: ticketType.available_quantity,
            order_index: ticketType.order_index,
          }))
        );
      }

      setSuccess(true);
      setTimeout(() => {
        if (onDone) {
          onDone();
          return;
        }
        router.push(isAdminContext ? '/admin/events' : '/profile');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className={isAdminContext ? 'p-0' : 'min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4 sm:p-6'}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          {isAdminContext && onCancel && (
            <Button variant="ghost" size="sm" className="mb-3 px-0" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to events
            </Button>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'edit' ? 'Edit event' : isAdminContext ? 'Create event (Admin)' : 'Create an event'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdminContext
              ? 'Create and publish a complete event listing from the admin dashboard.'
              : 'A guided setup that helps you publish a polished event in minutes.'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between mb-3 gap-2">
            {steps.map((s, idx) => (
              <button
                type="button"
                key={s.key}
                onClick={() => goToStep(s.key)}
                disabled={loading}
                className={`flex-1 text-center rounded-lg p-1 transition-colors ${
                  idx <= currentStepIndex ? 'opacity-100' : 'opacity-60'
                } ${step === s.key ? 'bg-primary/10' : 'hover:bg-muted/50'} ${
                  loading ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                aria-current={step === s.key ? 'step' : undefined}
                aria-label={`Go to ${s.title} step`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold ${
                    step === s.key
                      ? 'bg-primary text-primary-foreground'
                      : idx <= currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < currentStepIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <div className="text-xs font-medium hidden sm:block">{s.title}</div>
                <div className="text-[11px] text-muted-foreground hidden lg:block">{s.description}</div>
              </button>
            ))}
          </div>
          <div className="w-full bg-muted h-1 rounded-full">
            <div
              className="bg-primary h-1 rounded-full transition-all"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 rounded-xl bg-background/70 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                {uploadComplete ? (
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                )}
                <p className="mt-4 text-sm font-semibold">{loadingMessage || (mode === 'edit' ? 'Saving...' : 'Creating...')}</p>
                <p className="mt-1 text-xs font-medium text-emerald-600">{uploadProgress}% uploaded</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-500/20">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadComplete && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">Upload complete</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Please don’t close this window.</p>
              </div>
            </div>
          )}

          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">{steps[currentStepIndex].title}</CardTitle>
              <CardDescription>{steps[currentStepIndex].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

            {/* Step: Basic Info */}
            {step === 'basic' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold">Event Name *</label>
                  <Input
                    type="text"
                    name="name"
                    placeholder="e.g., Summer Music Festival 2024"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use a clear title people will recognize instantly.</p>
                </div>

                <div>
                  <label className="text-sm font-semibold">Category *</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {EVENT_CATEGORIES.map((category) => {
                      const selected = formData.category === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, category: category.id }))
                          }
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-border bg-background text-foreground hover:border-slate-400 hover:bg-muted/40'
                          }`}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose the category that best matches your event.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold">Description</label>
                  <Textarea
                    name="description"
                    placeholder="Tell attendees about your event..."
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Date & Time *</label>
                  <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px_90px]">
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                    <select
                      value={eventHour}
                      onChange={(e) => setEventHour(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const value = String(idx + 1);
                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={eventMinute}
                      onChange={(e) => setEventMinute(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {Array.from({ length: 60 }).map((_, idx) => {
                        const value = String(idx).padStart(2, '0');
                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setEventDate(toDateInputValue(new Date()))}
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setEventDate(toDateInputValue(tomorrow));
                      }}
                    >
                      Tomorrow
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a 12-hour clock for attendee-friendly scheduling.
                    {selectedDateTimePreview ? ` Scheduled for ${selectedDateTimePreview}.` : ''}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold">Venue *</label>
                  <Input
                    type="text"
                    name="venue"
                    placeholder="e.g., Central Park, New York"
                    value={formData.venue}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Event Images *</label>
                  <div className="mt-2 rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Upload your event images</p>
                          <p className="text-xs text-muted-foreground">Add 1+ images. Pick a cover image to appear on cards.</p>
                        </div>
                      </div>
                      <label className="inline-flex">
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEventImagesChange}
                          className="w-full sm:w-[260px] cursor-pointer"
                        />
                      </label>
                    </div>

                    {eventImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {eventImagePreviews.map((src, idx) => (
                          <div key={src} className="relative overflow-hidden rounded-lg border bg-background">
                            <img src={src} alt={`Event image ${idx + 1}`} className="h-24 w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={idx === coverImageIndex ? 'secondary' : 'ghost'}
                                className="h-7 px-2 text-xs text-white hover:text-white"
                                onClick={() => setCoverImageIndex(idx)}
                              >
                                <Star className="w-3.5 h-3.5 mr-1" />
                                {idx === coverImageIndex ? 'Cover' : 'Set cover'}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white hover:text-white"
                                onClick={() => removeEventImage(idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {existingImageUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {existingImageUrls.map((src, idx) => (
                          <div key={src} className="relative overflow-hidden rounded-lg border bg-background">
                            <img src={src} alt={`Event image ${idx + 1}`} className="h-24 w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={idx === coverImageIndex ? 'secondary' : 'ghost'}
                                className="h-7 px-2 text-xs text-white hover:text-white"
                                onClick={() => setCoverImageIndex(idx)}
                              >
                                <Star className="w-3.5 h-3.5 mr-1" />
                                {idx === coverImageIndex ? 'Cover' : 'Set cover'}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white hover:text-white"
                                onClick={() => removeEventImage(idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Pricing */}
            {step === 'pricing' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold">Currency *</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies to all ticket types for this event.
                  </p>
                </div>

                <>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-sm font-semibold">Ticket Types *</label>
                        <p className="text-xs text-muted-foreground">
                          Add a ticket type below, then it appears in your saved list.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold">Creating new ticket type</p>
                        <p className="text-xs text-muted-foreground">
                          Fill this card, then click "Add ticket type".
                        </p>
                      </div>
                      <Input
                        type="text"
                        placeholder="Type name (e.g., VIP)"
                        value={newTicketType.name}
                        onChange={(e) =>
                          setNewTicketType((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                      <Input
                        type="text"
                        placeholder="Short description (optional)"
                        value={newTicketType.description || ''}
                        onChange={(e) =>
                          setNewTicketType((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          value={newTicketType.price}
                          onChange={(e) =>
                            setNewTicketType((prev) => ({ ...prev, price: e.target.value }))
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Quantity"
                          min="1"
                          value={newTicketType.quantity}
                          onChange={(e) =>
                            setNewTicketType((prev) => ({ ...prev, quantity: e.target.value }))
                          }
                        />
                      </div>
                      <Button type="button" variant="default" size="sm" onClick={addTicketType}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add ticket type
                      </Button>
                    </div>

                    {ticketTypeError && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {ticketTypeError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Added ticket types</p>
                        <p className="text-xs text-muted-foreground">{ticketTypes.length} saved</p>
                      </div>
                      {ticketTypes.map((ticketType, index) => (
                        <div key={ticketType.id} className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-3">
                          {editingTicketType?.id === ticketType.id ? (
                            <>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Editing type #{index + 1}</p>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setEditingTicketType(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8"
                                    onClick={saveEditedTicketType}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                              <Input
                                type="text"
                                value={editingTicketType.name}
                                onChange={(e) =>
                                  setEditingTicketType((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                }
                              />
                              <Input
                                type="text"
                                value={editingTicketType.description || ''}
                                onChange={(e) =>
                                  setEditingTicketType((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                                }
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingTicketType.price}
                                  onChange={(e) =>
                                    setEditingTicketType((prev) => (prev ? { ...prev, price: e.target.value } : prev))
                                  }
                                />
                                <Input
                                  type="number"
                                  min="1"
                                  value={editingTicketType.quantity}
                                  onChange={(e) =>
                                    setEditingTicketType((prev) => (prev ? { ...prev, quantity: e.target.value } : prev))
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold">{ticketType.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ticketType.description?.trim() || 'No description'}
                                  </p>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-emerald-600/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Added
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-lg border border-emerald-500/20 bg-background/70 px-3 py-2">
                                  <p className="text-muted-foreground">Price</p>
                                  <p className="font-semibold">
                                    {formData.currency} {Number(ticketType.price || 0).toFixed(2)}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-emerald-500/20 bg-background/70 px-3 py-2">
                                  <p className="text-muted-foreground">Quantity</p>
                                  <p className="font-semibold">{Number(ticketType.quantity || 0)}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => beginEditTicketType(ticketType)}
                                >
                                  Edit
                                </Button>
                                {ticketTypes.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTicketType(ticketType.id)}
                                    className="h-8 text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {ticketTypes.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Add at least one ticket type before continuing.
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <strong>Valid ticket types:</strong> {normalizedTicketTypes.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Total tickets:</strong> {totalTicketsFromTypes}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Starting price:</strong> {formData.currency} {minTicketPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Total potential revenue:</strong> {formData.currency}{' '}
                        {normalizedTicketTypes
                          .reduce((sum, ticketType) => sum + (ticketType.price * ticketType.total_quantity), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                </>
              </div>
            )}

            {/* Step: Organizer */}
            {step === 'organizer' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold">Organization Name *</label>
                  <Input
                    type="text"
                    name="name"
                    placeholder="Your organization name"
                    value={organizer.name}
                    onChange={handleOrganizerChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Organizer Phone Number *</label>
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="e.g., +256 700 123456"
                    value={organizer.phone}
                    onChange={handleOrganizerChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Visible to admins on moderation dashboard for follow-up.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold">Organizer Logo</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleOrganizerLogoFileChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a logo image (PNG, JPG, WebP). URL input has been removed.
                  </p>
                </div>

                {(organizerLogoPreview || organizer.logo) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                      {organizerLogoPreview ? 'New logo preview:' : 'Current logo:'}
                    </p>
                    <img
                      src={organizerLogoPreview || organizer.logo}
                      alt="Logo preview"
                      className="h-12 object-contain"
                      onError={() => {}}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step: Sponsors */}
            {step === 'sponsors' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Sponsors are optional. You can publish now and add them later from the edit page.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-8 rounded-full px-3 text-xs"
                    onClick={() => setStep('review')}
                  >
                    Skip sponsors
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-semibold">Add Sponsors (Optional)</label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="text"
                      placeholder="Sponsor name"
                      value={newSponsor.name}
                      onChange={(e) => setNewSponsor((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      id="new-sponsor-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleNewSponsorLogoFileChange}
                    />
                    {newSponsor.logo && (
                      <div className="rounded-md border border-border/70 bg-background p-2">
                        <p className="text-xs text-muted-foreground mb-1">Sponsor logo preview:</p>
                        <img src={newSponsor.logo} alt="Sponsor preview" className="h-10 object-contain" />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleAddSponsor}
                      disabled={!newSponsor.name.trim()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Sponsor
                    </Button>
                  </div>
                </div>

                {sponsors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Sponsors ({sponsors.length})</label>
                    {sponsors.map((sponsor) => (
                      <div key={sponsor.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{sponsor.name}</div>
                          {sponsor.logo && (
                            <img
                              src={sponsor.logo}
                              alt={sponsor.name}
                              className="h-6 object-contain mt-1"
                              onError={() => {}}
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSponsor(sponsor.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Review */}
            {step === 'review' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Event Name</p>
                    <p className="font-semibold">{formData.name}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold">
                      {EVENT_CATEGORIES.find((c) => c.id === formData.category)?.label || 'Other Events'}
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">{selectedDateTimePreview || 'Not set'}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Ticket Price</p>
                    <p className="font-semibold">
                      {formData.currency} {minTicketPrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Tickets</p>
                    <p className="font-semibold">{totalTicketsFromTypes}</p>
                  </div>

                  <div className="md:col-span-2 p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Organizer</p>
                    <p className="font-semibold">{organizer.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Phone: {organizer.phone || 'Not provided'}</p>
                  </div>
                </div>

                {sponsors.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Sponsors ({sponsors.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {sponsors.map((sponsor) => (
                        <span key={sponsor.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {sponsor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {normalizedTicketTypes.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Ticket Types ({normalizedTicketTypes.length})</p>
                    <div className="space-y-1.5">
                      {normalizedTicketTypes.map((ticketType) => (
                        <div key={ticketType.order_index} className="text-sm flex items-center justify-between">
                          <span>{ticketType.name}</span>
                          <span className="text-muted-foreground">
                            {formData.currency} {ticketType.price.toFixed(2)} × {ticketType.total_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-primary/10 text-primary rounded-lg">
                  <p className="text-sm font-medium">
                    {isAdminContext
                      ? 'After creation, the event appears in Admin > Manage Events where you can review and manage it.'
                      : 'Your event will be created in "pending" status and requires admin approval before it goes live.'}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={!canGoBack || loading}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              {step === 'review' ? (
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading
                    ? (mode === 'edit' ? 'Saving...' : 'Creating...')
                    : (mode === 'edit'
                      ? 'Save Changes'
                      : isAdminContext
                        ? 'Create Event & Return'
                        : 'Create Event')}
                </Button>
              ) : (
                <Button
                  onClick={goToNextStep}
                  disabled={!canGoForward || loading}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
