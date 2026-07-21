import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Type definitions for database tables
export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'customer' | 'organizer' | 'admin';
  profile_name?: string;
  profile_description?: string;
  profile_logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  date: string;
  venue: string;
  ticket_price: number;
  total_tickets: number;
  tickets_available: number;
  organizer_name: string;
  organizer_phone?: string;
  organizer_logo_url?: string;
  image_url?: string;
  image_urls?: string[];
  currency?: string; // Currency code (USD, EUR, GBP, etc.)
  /** sports | concert | movies | other */
  category?: 'sports' | 'concert' | 'movies' | 'other';
  /** When true, account holders can share referral links and earn commission */
  affiliates_enabled?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_featured?: boolean;
  sponsors?: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  ticket_types?: TicketType[];
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  total_quantity: number;
  available_quantity: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url?: string;
  order_index: number;
  created_at: string;
}

export interface Order {
  id: string;
  event_id: string;
  user_id: string | null;
  quantity: number;
  total_price: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_provider?: string;
  payment_tracking_id?: string;
  payment_merchant_reference?: string;
  payment_metadata?: Record<string, any>;
  affiliate_id?: string | null;
  affiliate_referral_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  status: 'active' | 'suspended';
  payout_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id: string;
  event_id: string;
  buyer_user_id: string | null;
  order_amount: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by?: string | null;
}

export interface Ticket {
  id: string;
  order_id: string;
  event_id: string;
  user_id: string | null;
  event_name: string;
  organizer_name: string;
  organizer_logo_url?: string;
  sponsors: Array<{ name: string; logo_url?: string }>;
  ticket_type_id?: string;
  ticket_type_name?: string;
  ticket_price?: number;
  status: 'valid' | 'used' | 'expired' | 'refunded';
  qr_code: string;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>; Update: Partial<User> };
      events: { Row: Event; Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Event> };
      sponsors: { Row: Sponsor; Insert: Omit<Sponsor, 'id' | 'created_at'>; Update: Partial<Sponsor> };
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Order> };
      tickets: { Row: Ticket; Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Ticket> };
      ticket_types: { Row: TicketType; Insert: Omit<TicketType, 'id' | 'created_at' | 'updated_at'>; Update: Partial<TicketType> };
    };
  };
};
