import { supabaseAdmin } from '@/lib/supabase-admin';

export async function claimGuestPurchasesForUser(email: string, userId: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !userId) {
    return { claimedOrders: 0, claimedTickets: 0 };
  }

  const { data, error } = await supabaseAdmin.rpc('claim_guest_purchases', {
    p_email: normalizedEmail,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    claimedOrders: Number(row?.claimed_orders || 0),
    claimedTickets: Number(row?.claimed_tickets || 0),
  };
}
