import { supabaseAdmin } from '@/lib/supabase-admin';
import { getNowIso } from '@/lib/event-status';

const ADMIN_EVENT_FIELDS =
  'id,name,description,date,end_date,venue,image_url,total_tickets,ticket_price,organizer_name,organizer_phone,status,created_at,is_featured' as const;

export type AdminEventRow = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  end_date?: string | null;
  venue: string;
  image_url: string | null;
  total_tickets: number;
  ticket_price: number;
  organizer_name: string;
  organizer_phone: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string;
  is_featured: boolean | null;
};

export type AdminStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
};

export async function getAdminEvents(): Promise<AdminEventRow[]> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(ADMIN_EVENT_FIELDS)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin events:', error);
    return [];
  }

  return (data ?? []) as AdminEventRow[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const nowIso = getNowIso();
  const { data, error } = await supabaseAdmin.from('events').select('status,date');

  if (error) {
    console.error('Error fetching admin event stats:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
  }

  const rows = data ?? [];
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let expired = 0;

  for (const row of rows) {
    if (row.status === 'pending') {
      pending += 1;
      continue;
    }
    if (row.status === 'rejected') {
      rejected += 1;
      continue;
    }
    if (row.status === 'approved') {
      if (row.date && row.date < nowIso) {
        expired += 1;
      } else {
        approved += 1;
      }
    }
  }

  return {
    total: rows.length,
    pending,
    approved,
    rejected,
    expired,
  };
}
