'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Trash2, Plus, Image as ImageIcon, Star, MapPin, Award, Ticket } from 'lucide-react';
import {
  WizardField,
  WizardFooterNav,
  WizardLoadingOverlay,
  WizardMobileStepper,
  WizardPageHeader,
  WizardPanel,
  WizardReviewItem,
  WizardSection,
  WizardStepSidebar,
  WizardSuccessState,
  WIZARD_STEP_ICONS,
} from '@/components/organizer/event-wizard-ui';
import { createEvent, createSponsor, createTicketTypes, updateEvent, replaceEventSponsors, replaceEventTicketTypes } from '@/lib/supabase-db';
import { MAX_EVENT_SPONSORS } from '@/lib/event-sponsors';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { isEventDatePast } from '@/lib/event-status';
import { EVENT_CATEGORIES, normalizeEventCategory, type EventCategoryId } from '@/lib/event-categories';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  MIN_AFFILIATE_COMMISSION_PERCENT,
  MAX_AFFILIATE_COMMISSION_PERCENT,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliate-constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const supabase = getSupabaseBrowserClient();

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
  affiliates_enabled?: boolean;
  affiliate_commission_percent?: number;
  is_featured?: boolean;
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
  { code: 'UGX', label: 'UGX — Ugandan Shilling' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { code: 'RWF', label: 'RWF — Rwandan Franc' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'INR', label: 'INR — Indian Rupee' },
] as const;

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const STEP_COPY: Record<WizardStep, { title: string; description: string }> = {
  basic: {
    title: 'Event details',
    description: 'Name your event, set when and where it happens, and add photos.',
  },
  pricing: {
    title: 'Tickets',
    description: 'Choose a currency and add at least one ticket type people can buy.',
  },
  organizer: {
    title: 'Organizer contact',
    description: 'Buyers and admins use this to reach you about the event.',
  },
  sponsors: {
    title: 'Sponsors',
    description: 'Optional. Add up to 5 partners now, or skip and do it later.',
  },
  review: {
    title: 'Review & submit',
    description: 'Double-check every detail before saving.',
  },
};

const NEXT_LABELS: Partial<Record<WizardStep, string>> = {
  basic: 'Continue to tickets',
  pricing: 'Continue to organizer',
  organizer: 'Continue to sponsors',
  sponsors: 'Review event',
};

type FieldErrors = Partial<Record<string, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  // Snap minutes to 5-minute options (edit mode may have odd values).
  useEffect(() => {
    if (MINUTE_OPTIONS.includes(eventMinute)) return;
    const n = Math.min(Math.max(parseInt(eventMinute, 10) || 0, 0), 59);
    const rounded = Math.round(n / 5) * 5;
    setEventMinute(String(rounded === 60 ? 0 : rounded).padStart(2, '0'));
  }, [eventMinute]);

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
    currency: initialEvent?.currency || 'UGX',
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

    // Start with one editable type so create mode isn’t an empty dead-end.
    return [
      {
        id: `ticket_type_${Date.now()}_0`,
        name: 'General Admission',
        description: '',
        price: '0',
        quantity: '100',
      },
    ];
  });
  const [affiliatesEnabled, setAffiliatesEnabled] = useState(
    Boolean(initialEvent?.affiliates_enabled)
  );
  const [affiliateCommissionPercent, setAffiliateCommissionPercent] = useState(() =>
    String(
      clampAffiliateCommissionPercent(
        initialEvent?.affiliate_commission_percent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT
      )
    )
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(initialEvent?.is_featured));
  const [eventStatus, setEventStatus] = useState<'pending' | 'approved' | 'rejected'>(() => {
    if (initialEvent?.status === 'approved' || initialEvent?.status === 'rejected') {
      return initialEvent.status;
    }
    return 'pending';
  });
  const [rejectionReason, setRejectionReason] = useState(initialEvent?.rejection_reason || '');
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

  const steps: Array<{ key: WizardStep; title: string }> = [
    { key: 'basic', title: 'Basics' },
    { key: 'pricing', title: 'Tickets' },
    { key: 'organizer', title: 'Organizer' },
    { key: 'sponsors', title: 'Sponsors' },
    { key: 'review', title: 'Review' },
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
    if (files.length === 0) return;
    setEventImages((prev) => [...prev, ...files]);
    setFieldErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
    e.target.value = '';
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

  const galleryImages = useMemo(() => {
    return [
      ...existingImageUrls.map((src, index) => ({ src, index })),
      ...eventImagePreviews.map((src, i) => ({
        src,
        index: existingImageUrls.length + i,
      })),
    ];
  }, [existingImageUrls, eventImagePreviews]);

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
    if (sponsors.length >= MAX_EVENT_SPONSORS) {
      setError(`You can add up to ${MAX_EVENT_SPONSORS} sponsors`);
      return;
    }
    const sponsorFileInput = document.getElementById('new-sponsor-logo-file') as HTMLInputElement | null;
    const sponsorFile = (sponsorFileInput as any)?._file as File | undefined;

    const sponsor: Sponsor = {
      id: 'sponsor_' + Date.now(),
      name: newSponsor.name,
      logo: newSponsor.logo,
      logoFile: sponsorFile,
    };
    setSponsors([...sponsors, sponsor]);
    setError('');
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

  const getErrorsForStep = (targetStep: WizardStep): FieldErrors => {
    const errors: FieldErrors = {};

    switch (targetStep) {
      case 'basic': {
        if (!formData.name.trim()) errors.name = 'Enter an event name';
        if (!formData.category) errors.category = 'Choose a category';
        if (!eventDate || !eventHour || !eventMinute || !formData.date) {
          errors.date = 'Set the date and time';
        } else if (mode === 'create' && isEventDatePast(formData.date)) {
          errors.date = 'Choose a date and time in the future';
        }
        if (!formData.venue.trim()) errors.venue = 'Enter the venue or location';
        if (existingImageUrls.length + eventImages.length === 0) {
          errors.images = 'Add at least one event photo';
        }
        break;
      }
      case 'pricing': {
        if (!formData.currency) errors.currency = 'Select a currency';
        if (ticketTypes.length === 0) {
          errors.tickets = 'Add at least one ticket type';
        } else if (
          !ticketTypes.every(
            (ticketType) =>
              ticketType.name.trim() &&
              ticketType.price !== '' &&
              !Number.isNaN(Number(ticketType.price)) &&
              Number(ticketType.price) >= 0 &&
              Number(ticketType.quantity) > 0
          )
        ) {
          errors.tickets = 'Each ticket needs a name, price (0 for free), and quantity above 0';
        }
        break;
      }
      case 'organizer': {
        if (!organizer.name.trim()) errors.organizerName = 'Enter the organizer name';
        if (!organizer.phone.trim()) errors.organizerPhone = 'Enter a contact phone number';
        break;
      }
      default:
        break;
    }

    return errors;
  };

  const isStepValid = (targetStep: WizardStep) => Object.keys(getErrorsForStep(targetStep)).length === 0;

  const validateStep = (): boolean => {
    const errors = getErrorsForStep(step);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.values(errors)[0];
      setError(first || 'Please fix the highlighted fields');
      return false;
    }
    setError('');
    return true;
  };

  const goToNextStep = () => {
    if (!validateStep()) return;
    setFieldErrors({});
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) setStep(nextStep.key);
  };

  const goToPreviousStep = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) setStep(prevStep.key);
    setError('');
    setFieldErrors({});
  };

  const goToStep = (targetStep: WizardStep) => {
    const targetIndex = steps.findIndex((s) => s.key === targetStep);
    if (targetIndex < 0 || targetIndex === currentStepIndex) return;

    // Always allow going backward.
    if (targetIndex < currentStepIndex) {
      setStep(targetStep);
      setError('');
      setFieldErrors({});
      return;
    }

    // Going forward: every earlier step must be complete.
    for (let i = 0; i < targetIndex; i++) {
      const prior = steps[i];
      const priorErrors = getErrorsForStep(prior.key);
      if (Object.keys(priorErrors).length > 0) {
        setStep(prior.key);
        setFieldErrors(priorErrors);
        setError(`Finish “${prior.title}” before continuing`);
        return;
      }
    }

    setStep(targetStep);
    setError('');
    setFieldErrors({});
  };

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isTicketTypeValid = (ticketType: Omit<WizardTicketType, 'id'> | WizardTicketType) => {
    return (
      ticketType.name.trim().length > 0 &&
      ticketType.price !== '' &&
      !Number.isNaN(Number(ticketType.price)) &&
      Number(ticketType.price) >= 0 &&
      Number(ticketType.quantity) > 0
    );
  };

  const addEmptyTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        id: `ticket_type_${Date.now()}_${prev.length}`,
        name: '',
        description: '',
        price: '',
        quantity: '50',
      },
    ]);
    clearFieldError('tickets');
  };

  const applyTicketPreset = (name: string, price: string, quantity = '100') => {
    const emptySlot = ticketTypes.find(
      (ticketType) => !ticketType.name.trim() || ticketType.price === ''
    );

    if (emptySlot) {
      setTicketTypes((prev) =>
        prev.map((ticketType) =>
          ticketType.id === emptySlot.id
            ? {
                ...ticketType,
                name,
                price,
                quantity: ticketType.quantity || quantity,
              }
            : ticketType
        )
      );
    } else {
      setTicketTypes((prev) => [
        ...prev,
        {
          id: `ticket_type_${Date.now()}_${prev.length}`,
          name,
          description: '',
          price,
          quantity,
        },
      ]);
    }
    clearFieldError('tickets');
  };

  const updateTicketType = (id: string, field: keyof WizardTicketType, value: string) => {
    setTicketTypes((prev) =>
      prev.map((ticketType) => (ticketType.id === id ? { ...ticketType, [field]: value } : ticketType))
    );
    clearFieldError('tickets');
  };

  const removeTicketType = (id: string) => {
    setTicketTypes((prev) => prev.filter((ticketType) => ticketType.id !== id));
    clearFieldError('tickets');
  };

  const formatTicketPriceLabel = (price: number) => {
    if (price <= 0) return 'Free';
    return `${formData.currency} ${price.toLocaleString(undefined, {
      maximumFractionDigits: formData.currency === 'UGX' ? 0 : 2,
    })}`;
  };

  const initialTicketTypeMap = useMemo(() => {
    return new Map(
      (initialTicketTypes || [])
        .filter((ticketType) => ticketType.id)
        .map((ticketType) => [ticketType.id as string, ticketType])
    );
  }, [initialTicketTypes]);

  const normalizedTicketTypes = useMemo(() => {
    return ticketTypes
      .map((ticketType, idx) => {
        const totalQuantity = Number(ticketType.quantity) || 0;
        const initialTicketType = initialTicketTypeMap.get(ticketType.id);
        const soldCount = initialTicketType
          ? Math.max(
              0,
              (initialTicketType.total_quantity ?? 0) - (initialTicketType.available_quantity ?? 0)
            )
          : 0;
        const availableQuantity =
          mode === 'edit' && initialTicketType
            ? Math.max(0, totalQuantity - soldCount)
            : totalQuantity;

        return {
          name: ticketType.name.trim(),
          description: ticketType.description?.trim() || undefined,
          price: Number(ticketType.price) || 0,
          total_quantity: totalQuantity,
          available_quantity: availableQuantity,
          order_index: idx,
        };
      })
      .filter(
        (ticketType) => ticketType.name && ticketType.price >= 0 && ticketType.total_quantity > 0
      );
  }, [ticketTypes, mode, initialTicketTypeMap]);

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
      // Auth context may still be hydrating — confirm via the cookie session client.
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setError(isAdminContext ? 'You must be logged in as an admin' : 'You must be logged in as an organizer');
        setLoading(false);
        return;
      }
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
          affiliates_enabled: affiliatesEnabled,
          affiliate_commission_percent: clampAffiliateCommissionPercent(affiliateCommissionPercent),
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
        const soldEventTickets = Math.max(
          0,
          (initialEvent?.total_tickets ?? desiredTotal) - (initialEvent?.tickets_available ?? desiredTotal)
        );
        const nextAvailable = Math.max(0, desiredTotal - soldEventTickets);
        const nextTicketPrice = minTicketPrice;
        let organizerLogoUrl = organizer.logo;

        if (organizerLogoFile) {
          setLoadingMessage('Uploading organizer logo...');
          const [uploadedOrganizerLogo] = await uploadEventImages([organizerLogoFile], {
            onFileComplete: onUploadFileComplete,
          });
          organizerLogoUrl = uploadedOrganizerLogo || organizer.logo;
        }

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

        const shouldResubmitForApproval =
          !isAdminContext &&
          initialEvent?.status === 'approved' &&
          initialEvent.date &&
          isEventDatePast(initialEvent.date) &&
          !isEventDatePast(formData.date);

        const eventPayload = {
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
          affiliates_enabled: affiliatesEnabled,
          affiliate_commission_percent: clampAffiliateCommissionPercent(affiliateCommissionPercent),
          ...(shouldResubmitForApproval ? { status: 'pending' as const, rejection_reason: null } : {}),
          ...(isAdminContext
            ? {
                is_featured: isFeatured,
                status: eventStatus,
                rejection_reason: eventStatus === 'rejected' ? rejectionReason.trim() || null : null,
              }
            : {}),
        };

        if (isAdminContext) {
          setLoadingMessage('Saving event changes...');
          const response = await fetch(`/api/admin/events/${targetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventData: eventPayload,
              ticketTypes: normalizedTicketTypes,
              sponsors: sponsorsWithUploadedLogos.map((sponsor, idx) => ({
                event_id: targetId,
                name: sponsor.name,
                logo_url: sponsor.logo,
                order_index: idx,
              })),
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || 'Failed to update event');
          }
        } else {
          setLoadingMessage('Saving event changes...');
          await updateEvent(targetId, eventPayload);

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

  const isEmbedded = context === 'organizer';

  const wizardFooter = (
    <WizardFooterNav
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      loading={loading}
      isReview={step === 'review'}
      mode={mode}
      isAdminContext={isAdminContext}
      nextLabel={NEXT_LABELS[step] || 'Next'}
      onBack={goToPreviousStep}
      onNext={goToNextStep}
      onSubmit={handleSubmit}
    />
  );

  if (success) {
    return <WizardSuccessState mode={mode} isAdminContext={isAdminContext} />;
  }

  return (
    <div className="space-y-6">
      <WizardPageHeader mode={mode} isAdminContext={isAdminContext} onCancel={onCancel} />

      <div className="lg:grid lg:grid-cols-[minmax(0,13rem)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,15rem)_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <WizardStepSidebar
              steps={steps}
              currentStepIndex={currentStepIndex}
              step={step}
              loading={loading}
              onStepClick={goToStep}
              isStepValid={isStepValid}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <WizardMobileStepper
            steps={steps}
            currentStepIndex={currentStepIndex}
            step={step}
            loading={loading}
            onStepClick={goToStep}
            isStepValid={isStepValid}
          />

          <WizardPanel
            embedded={isEmbedded}
            stepTitle={STEP_COPY[step].title}
            stepDescription={STEP_COPY[step].description}
            footer={wizardFooter}
          >
            <WizardLoadingOverlay
              loading={loading}
              uploadComplete={uploadComplete}
              loadingMessage={loadingMessage}
              mode={mode}
              uploadProgress={uploadProgress}
            />

            {error ? (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            {step === 'basic' && (
              <div className="space-y-5">
                <WizardSection title="About the event" description="Give attendees a clear idea of what to expect.">
                  <WizardField label="Event name" htmlFor="event-name" required error={fieldErrors.name}>
                    <Input
                      id="event-name"
                      type="text"
                      name="name"
                      placeholder="e.g. Kampala Jazz Night"
                      value={formData.name}
                      onChange={(e) => {
                        handleChange(e);
                        clearFieldError('name');
                      }}
                      aria-invalid={!!fieldErrors.name}
                      className={fieldErrors.name ? 'border-destructive' : ''}
                    />
                  </WizardField>

                  <WizardField label="Category" required error={fieldErrors.category}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {EVENT_CATEGORIES.map((category) => {
                        const selected = formData.category === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, category: category.id }));
                              clearFieldError('category');
                            }}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                              selected
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : fieldErrors.category
                                  ? 'border-destructive bg-background hover:bg-muted/40'
                                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
                            }`}
                          >
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                  </WizardField>

                  <WizardField
                    label="Description"
                    htmlFor="event-description"
                    hint="Optional — helps buyers decide before they purchase."
                  >
                    <Textarea
                      id="event-description"
                      name="description"
                      placeholder="What is this event about?"
                      value={formData.description}
                      onChange={handleChange}
                      className="resize-none"
                      rows={4}
                    />
                  </WizardField>
                </WizardSection>

                <WizardSection
                  icon={MapPin}
                  title="Date, time & venue"
                  description="When and where people should show up."
                >
                  <WizardField label="Date & time" required error={fieldErrors.date}>
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px_80px]">
                        <Input
                          type="date"
                          value={eventDate}
                          onChange={(e) => {
                            setEventDate(e.target.value);
                            clearFieldError('date');
                          }}
                          aria-invalid={!!fieldErrors.date}
                          className={fieldErrors.date ? 'border-destructive' : ''}
                        />
                        <select
                          value={eventHour}
                          onChange={(e) => {
                            setEventHour(e.target.value);
                            clearFieldError('date');
                          }}
                          aria-label="Hour"
                          className={`h-10 rounded-md border bg-background px-3 text-sm ${
                            fieldErrors.date ? 'border-destructive' : 'border-input'
                          }`}
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
                          onChange={(e) => {
                            setEventMinute(e.target.value);
                            clearFieldError('date');
                          }}
                          aria-label="Minute"
                          className={`h-10 rounded-md border bg-background px-3 text-sm ${
                            fieldErrors.date ? 'border-destructive' : 'border-input'
                          }`}
                        >
                          {MINUTE_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <select
                          value={timePeriod}
                          onChange={(e) => {
                            setTimePeriod(e.target.value as TimePeriod);
                            clearFieldError('date');
                          }}
                          aria-label="AM or PM"
                          className={`h-10 rounded-md border bg-background px-3 text-sm ${
                            fieldErrors.date ? 'border-destructive' : 'border-input'
                          }`}
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
                          className="h-8 rounded-full text-xs"
                          onClick={() => {
                            setEventDate(toDateInputValue(new Date()));
                            clearFieldError('date');
                          }}
                        >
                          Today
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full text-xs"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setEventDate(toDateInputValue(tomorrow));
                            clearFieldError('date');
                          }}
                        >
                          Tomorrow
                        </Button>
                      </div>
                      {!fieldErrors.date && selectedDateTimePreview ? (
                        <p className="text-xs text-muted-foreground">Starts {selectedDateTimePreview}</p>
                      ) : null}
                    </div>
                  </WizardField>

                  <WizardField label="Venue" htmlFor="event-venue" required error={fieldErrors.venue}>
                    <Input
                      id="event-venue"
                      type="text"
                      name="venue"
                      placeholder="e.g. National Theatre, Kampala"
                      value={formData.venue}
                      onChange={(e) => {
                        handleChange(e);
                        clearFieldError('venue');
                      }}
                      aria-invalid={!!fieldErrors.venue}
                      className={fieldErrors.venue ? 'border-destructive' : ''}
                    />
                  </WizardField>
                </WizardSection>

                <WizardSection
                  icon={ImageIcon}
                  title="Event photos"
                  description="Add at least one image. Tap the star on a photo to set the cover."
                >
                  <div
                    className={`rounded-xl border border-dashed bg-background p-4 ${
                      fieldErrors.images ? 'border-destructive' : 'border-border/70'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <ImageIcon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {galleryImages.length === 0
                            ? 'No photos yet'
                            : `${galleryImages.length} photo${galleryImages.length === 1 ? '' : 's'}`}
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEventImagesChange}
                        className="w-full cursor-pointer sm:w-[240px]"
                      />
                    </div>

                    {galleryImages.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {galleryImages.map(({ src, index }) => (
                          <div
                            key={`${src}-${index}`}
                            className="relative overflow-hidden rounded-xl border bg-background"
                          >
                            <img src={src} alt="" className="h-24 w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={index === coverImageIndex ? 'secondary' : 'ghost'}
                                className="h-7 px-2 text-xs text-white hover:text-white"
                                onClick={() => setCoverImageIndex(index)}
                              >
                                <Star className="mr-1 h-3.5 w-3.5" />
                                {index === coverImageIndex ? 'Cover' : 'Set cover'}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white hover:text-white"
                                onClick={() => removeEventImage(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {fieldErrors.images ? (
                    <p className="text-xs text-destructive">{fieldErrors.images}</p>
                  ) : null}
                </WizardSection>
              </div>
            )}

            {step === 'pricing' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">Ticket types</p>
                      <p className="text-xs text-muted-foreground">
                        Add one or more ticket options. Use price <span className="font-medium">0</span> for
                        free events — attendees can claim tickets without payment.
                      </p>
                    </div>
                  </div>

                  {normalizedTicketTypes.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-center">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Types</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums">
                          {normalizedTicketTypes.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total seats</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums">{totalTicketsFromTypes}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Starting at</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums">
                          {formatTicketPriceLabel(minTicketPrice)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <WizardField label="Currency" htmlFor="event-currency" error={fieldErrors.currency}>
                  <select
                    id="event-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, currency: e.target.value }));
                      clearFieldError('currency');
                    }}
                    className={`h-10 w-full rounded-md border bg-background px-3 text-sm ${
                      fieldErrors.currency ? 'border-destructive' : 'border-input'
                    }`}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </WizardField>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quick start
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => applyTicketPreset('General Admission', '0')}
                    >
                      General · Free
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => applyTicketPreset('General Admission', '25000')}
                    >
                      General · Paid
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => applyTicketPreset('VIP', '75000')}
                    >
                      VIP
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => applyTicketPreset('Early Bird', '15000', '50')}
                    >
                      Early Bird
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Your ticket types</p>
                    <span className="text-xs text-muted-foreground">
                      {ticketTypes.length} {ticketTypes.length === 1 ? 'type' : 'types'}
                    </span>
                  </div>

                  {ticketTypes.map((ticketType, index) => {
                    const priceValue = ticketType.price === '' ? null : Number(ticketType.price);
                    const isValid = isTicketTypeValid(ticketType);

                    return (
                      <div
                        key={ticketType.id}
                        className={`space-y-4 rounded-2xl border p-4 ${
                          fieldErrors.tickets && !isValid
                            ? 'border-destructive/50 bg-destructive/5'
                            : 'border-border/70 bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium">
                              {ticketType.name.trim() || `Ticket type ${index + 1}`}
                            </p>
                          </div>
                          {ticketTypes.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 rounded-full p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTicketType(ticketType.id)}
                              aria-label={`Remove ${ticketType.name || 'ticket type'}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5 sm:col-span-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`ticket-name-${ticketType.id}`}
                            >
                              Name
                            </label>
                            <Input
                              id={`ticket-name-${ticketType.id}`}
                              type="text"
                              placeholder="e.g. General Admission, VIP"
                              value={ticketType.name}
                              onChange={(e) => updateTicketType(ticketType.id, 'name', e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`ticket-desc-${ticketType.id}`}
                            >
                              Description <span className="font-normal">(optional)</span>
                            </label>
                            <Input
                              id={`ticket-desc-${ticketType.id}`}
                              type="text"
                              placeholder="What is included with this ticket?"
                              value={ticketType.description || ''}
                              onChange={(e) =>
                                updateTicketType(ticketType.id, 'description', e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`ticket-price-${ticketType.id}`}
                            >
                              Price ({formData.currency})
                            </label>
                            <Input
                              id={`ticket-price-${ticketType.id}`}
                              type="number"
                              min="0"
                              step={formData.currency === 'UGX' ? '1' : '0.01'}
                              placeholder="0 for free"
                              value={ticketType.price}
                              onChange={(e) => updateTicketType(ticketType.id, 'price', e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {priceValue === null
                                ? 'Enter a price or use 0 for free tickets'
                                : priceValue <= 0
                                  ? 'Free — no payment at checkout'
                                  : `Buyers pay ${formatTicketPriceLabel(priceValue)}`}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label
                              className="text-xs font-medium text-muted-foreground"
                              htmlFor={`ticket-qty-${ticketType.id}`}
                            >
                              Quantity available
                            </label>
                            <Input
                              id={`ticket-qty-${ticketType.id}`}
                              type="number"
                              min="1"
                              placeholder="100"
                              value={ticketType.quantity}
                              onChange={(e) => updateTicketType(ticketType.id, 'quantity', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-dashed"
                  onClick={addEmptyTicketType}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add another ticket type
                </Button>

                {fieldErrors.tickets ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {fieldErrors.tickets}
                  </div>
                ) : null}
              </div>
            )}

            {step === 'organizer' && (
              <div className="space-y-5">
                <WizardSection
                  icon={WIZARD_STEP_ICONS.organizer}
                  title="Organizer contact"
                  description="Shown on the event page and used if buyers need help."
                >
                  <WizardField
                    label="Organizer name"
                    htmlFor="organizer-name"
                    required
                    error={fieldErrors.organizerName}
                  >
                    <Input
                      id="organizer-name"
                      type="text"
                      name="name"
                      placeholder="Your name or organization"
                      value={organizer.name}
                      onChange={(e) => {
                        handleOrganizerChange(e);
                        clearFieldError('organizerName');
                      }}
                      aria-invalid={!!fieldErrors.organizerName}
                      className={fieldErrors.organizerName ? 'border-destructive' : ''}
                    />
                  </WizardField>

                  <WizardField
                    label="Contact phone"
                    htmlFor="organizer-phone"
                    required
                    error={fieldErrors.organizerPhone}
                    hint="Include country code so buyers can reach you."
                  >
                    <Input
                      id="organizer-phone"
                      type="tel"
                      name="phone"
                      placeholder="+256 700 000000"
                      value={organizer.phone}
                      onChange={(e) => {
                        handleOrganizerChange(e);
                        clearFieldError('organizerPhone');
                      }}
                      aria-invalid={!!fieldErrors.organizerPhone}
                      className={fieldErrors.organizerPhone ? 'border-destructive' : ''}
                    />
                  </WizardField>

                  <WizardField
                    label="Logo"
                    htmlFor="organizer-logo"
                    hint="Optional — appears on tickets and your event page."
                  >
                    <div className="rounded-xl border border-dashed border-border/70 bg-background p-4">
                      <Input
                        id="organizer-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleOrganizerLogoFileChange}
                        className="cursor-pointer"
                      />
                      {(organizerLogoPreview || organizer.logo) && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                          <img
                            src={organizerLogoPreview || organizer.logo}
                            alt=""
                            className="mx-auto h-14 object-contain"
                            onError={() => {}}
                          />
                        </div>
                      )}
                    </div>
                  </WizardField>
                </WizardSection>
              </div>
            )}

            {step === 'sponsors' && (
              <div className="space-y-5">
                <WizardSection
                  icon={Award}
                  title="Event sponsors"
                  description={`Optional partners displayed on your event page and tickets (up to ${MAX_EVENT_SPONSORS}).`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                    <p className="text-sm text-muted-foreground">
                      {sponsors.length >= MAX_EVENT_SPONSORS
                        ? `Maximum of ${MAX_EVENT_SPONSORS} sponsors reached.`
                        : 'No sponsors yet? You can skip this step.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {sponsors.length}/{MAX_EVENT_SPONSORS}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 shrink-0 rounded-full px-3 text-xs"
                        onClick={() => {
                          setError('');
                          setFieldErrors({});
                          setStep('review');
                        }}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
                    <WizardField label="Sponsor name">
                      <Input
                        type="text"
                        placeholder="Company or partner name"
                        value={newSponsor.name}
                        onChange={(e) => setNewSponsor((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={sponsors.length >= MAX_EVENT_SPONSORS}
                      />
                    </WizardField>
                    <WizardField label="Logo" htmlFor="new-sponsor-logo-file" hint="Optional">
                      <Input
                        id="new-sponsor-logo-file"
                        type="file"
                        accept="image/*"
                        onChange={handleNewSponsorLogoFileChange}
                        className="cursor-pointer"
                        disabled={sponsors.length >= MAX_EVENT_SPONSORS}
                      />
                    </WizardField>
                    {newSponsor.logo ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                        <img src={newSponsor.logo} alt="" className="mx-auto h-10 object-contain" />
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={handleAddSponsor}
                      disabled={!newSponsor.name.trim() || sponsors.length >= MAX_EVENT_SPONSORS}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add sponsor
                    </Button>
                  </div>

                  {sponsors.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sponsors.map((sponsor) => (
                        <div
                          key={sponsor.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {sponsor.logo ? (
                              <img
                                src={sponsor.logo}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg border border-border/60 bg-muted/20 object-contain p-1"
                                onError={() => {}}
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                                {sponsor.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <p className="truncate font-medium">{sponsor.name}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveSponsor(sponsor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </WizardSection>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-5">
                {galleryImages.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                    <div className="relative h-36 sm:h-44">
                      <img
                        src={galleryImages[coverImageIndex]?.src || galleryImages[0]?.src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/80">Preview</p>
                        <p className="mt-0.5 text-lg font-semibold leading-tight">
                          {formData.name || 'Untitled event'}
                        </p>
                        {selectedDateTimePreview ? (
                          <p className="mt-1 text-sm text-white/85">{selectedDateTimePreview}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <WizardReviewItem
                    label="Event"
                    value={formData.name || '—'}
                    onEdit={() => goToStep('basic')}
                  />
                  <WizardReviewItem
                    label="Category"
                    value={
                      EVENT_CATEGORIES.find((c) => c.id === formData.category)?.label || 'Other'
                    }
                    onEdit={() => goToStep('basic')}
                  />
                  <WizardReviewItem
                    label="When"
                    value={selectedDateTimePreview || '—'}
                    onEdit={() => goToStep('basic')}
                  />
                  <WizardReviewItem
                    label="Where"
                    value={formData.venue || '—'}
                    onEdit={() => goToStep('basic')}
                  />
                  <WizardReviewItem
                    label="Tickets from"
                    value={formatTicketPriceLabel(minTicketPrice)}
                    onEdit={() => goToStep('pricing')}
                  />
                  <WizardReviewItem
                    label="Organizer"
                    value={organizer.name || '—'}
                    onEdit={() => goToStep('organizer')}
                  />
                </div>

                {organizer.phone ? (
                  <p className="text-xs text-muted-foreground">Contact: {organizer.phone}</p>
                ) : null}

                {galleryImages.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map(({ src, index }) => (
                      <div
                        key={`${src}-review-${index}`}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                          index === coverImageIndex ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {normalizedTicketTypes.length > 0 ? (
                  <WizardSection title="Ticket types" description="What buyers can purchase.">
                    <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-background">
                      {normalizedTicketTypes.map((ticketType) => (
                        <div
                          key={ticketType.order_index}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <span className="font-medium">{ticketType.name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatTicketPriceLabel(ticketType.price)} · {ticketType.total_quantity} seats
                          </span>
                        </div>
                      ))}
                    </div>
                  </WizardSection>
                ) : null}

                {sponsors.length > 0 ? (
                  <WizardSection title="Sponsors">
                    <div className="flex flex-wrap gap-2">
                      {sponsors.map((sponsor) => (
                        <span
                          key={sponsor.id}
                          className="rounded-full border border-border/60 bg-background px-3 py-1 text-sm"
                        >
                          {sponsor.name}
                        </span>
                      ))}
                    </div>
                  </WizardSection>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => goToStep('sponsors')}
                  >
                    No sponsors — add some?
                  </button>
                )}

                <WizardSection title="Publishing options">
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="affiliates-enabled" className="text-sm font-medium">
                          Allow affiliates
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Let Ticket95 account holders share your event and earn a commission on
                          sales they refer.
                        </p>
                      </div>
                      <Switch
                        id="affiliates-enabled"
                        checked={affiliatesEnabled}
                        onCheckedChange={setAffiliatesEnabled}
                      />
                    </div>

                    {affiliatesEnabled ? (
                      <div className="space-y-2 border-t border-border/60 pt-3">
                        <Label htmlFor="affiliate-commission-percent" className="text-sm font-medium">
                          Affiliate commission (%)
                        </Label>
                        <Input
                          id="affiliate-commission-percent"
                          type="number"
                          min={MIN_AFFILIATE_COMMISSION_PERCENT}
                          max={MAX_AFFILIATE_COMMISSION_PERCENT}
                          step={0.5}
                          value={affiliateCommissionPercent}
                          onChange={(e) => setAffiliateCommissionPercent(e.target.value)}
                          onBlur={() =>
                            setAffiliateCommissionPercent(
                              String(clampAffiliateCommissionPercent(affiliateCommissionPercent))
                            )
                          }
                          className="max-w-[10rem] rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum {MIN_AFFILIATE_COMMISSION_PERCENT}%. This rate is shown to
                          affiliates and applied to referred sales.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {isAdminContext ? (
                    <div className="space-y-4 rounded-xl border border-border/60 bg-background p-4">
                      <p className="text-sm font-semibold">Admin settings</p>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="featured-event" className="text-sm font-medium">
                            Featured event
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Highlight this event on the homepage and discovery surfaces.
                          </p>
                        </div>
                        <Switch
                          id="featured-event"
                          checked={isFeatured}
                          onCheckedChange={setIsFeatured}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-status" className="text-sm font-medium">
                          Approval status
                        </Label>
                        <Select
                          value={eventStatus}
                          onValueChange={(value: 'pending' | 'approved' | 'rejected') =>
                            setEventStatus(value)
                          }
                        >
                          <SelectTrigger id="event-status" className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {eventStatus === 'rejected' ? (
                        <div className="space-y-2">
                          <Label htmlFor="rejection-reason" className="text-sm font-medium">
                            Rejection note
                          </Label>
                          <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Optional note for the organizer"
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!isAdminContext ? (
                    <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                      After you submit, an admin reviews the event before it goes live on Ticket95.
                    </p>
                  ) : null}
                </WizardSection>
              </div>
            )}
          </WizardPanel>
        </div>
      </div>
    </div>
  );
}
