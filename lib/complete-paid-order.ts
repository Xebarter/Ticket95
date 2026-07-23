import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createAffiliateCommissionForOrder,
  getAffiliateByReferralCode,
  getAffiliateSettings,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliates';
import { DEFAULT_AFFILIATE_COMMISSION_PERCENT } from '@/lib/affiliate-constants';

type OrderRow = {
  id: string;
  status: string;
  event_id: string;
  user_id: string | null;
  total_price?: number;
  currency?: string | null;
  affiliate_id?: string | null;
  affiliate_referral_code?: string | null;
  payment_metadata: Record<string, unknown> | null;
};

type TicketSelection = {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketPrice: number;
  quantity: number;
};

type TicketTypeRow = {
  id: string;
  available_quantity: number;
  name?: string;
};

export async function completePaidOrder(order: OrderRow) {
  if (order.status === 'completed') {
    return { alreadyCompleted: true };
  }

  const metadata = (order.payment_metadata || {}) as {
    ticketSelections?: TicketSelection[];
  };

  const selections = (metadata.ticketSelections || []).filter((s) => Number(s.quantity) > 0);
  if (!selections.length) {
    throw new Error('Missing ticket selection metadata');
  }

  const totalQuantity = selections.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (totalQuantity < 1) {
    throw new Error('Invalid ticket selections');
  }

  const ticketTypeIds = [...new Set(selections.map((s) => s.ticketTypeId))];

  const [eventResult, sponsorsResult, ticketTypesResult] = await Promise.all([
    supabaseAdmin.from('events').select('*').eq('id', order.event_id).single(),
    supabaseAdmin
      .from('sponsors')
      .select('name, logo_url, order_index')
      .eq('event_id', order.event_id)
      .order('order_index', { ascending: true }),
    supabaseAdmin.from('ticket_types').select('id, available_quantity, name').in('id', ticketTypeIds),
  ]);

  if (eventResult.error) {
    if (eventResult.error.code === 'PGRST116') throw new Error('Event not found for order');
    throw eventResult.error;
  }
  if (sponsorsResult.error) throw sponsorsResult.error;
  if (ticketTypesResult.error) throw ticketTypesResult.error;

  const event = eventResult.data;
  if (!event) throw new Error('Event not found for order');

  const eventSponsors = (sponsorsResult.data || []).map((sponsor) => ({
    name: sponsor.name,
    logo_url: sponsor.logo_url || undefined,
  }));

  const ticketTypeMap = new Map<string, TicketTypeRow>(
    (ticketTypesResult.data || []).map((tt) => [tt.id, tt])
  );

  for (const selection of selections) {
    const ticketType = ticketTypeMap.get(selection.ticketTypeId);
    if (!ticketType) {
      throw new Error(`Ticket type not found: ${selection.ticketTypeName}`);
    }
    if (ticketType.available_quantity < selection.quantity) {
      throw new Error(`Not enough availability for ${selection.ticketTypeName}`);
    }
  }

  const ticketsPayload: Array<{
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
    status: 'valid';
    qr_code: string;
  }> = [];

  let ticketIndex = 0;
  for (const selection of selections) {
    for (let i = 0; i < selection.quantity; i += 1) {
      ticketsPayload.push({
        order_id: order.id,
        event_id: order.event_id,
        user_id: order.user_id,
        event_name: event.name,
        organizer_name: event.organizer_name,
        organizer_logo_url: event.organizer_logo_url,
        sponsors: eventSponsors,
        ticket_type_id: selection.ticketTypeId,
        ticket_type_name: selection.ticketTypeName,
        ticket_price: selection.ticketPrice,
        status: 'valid',
        qr_code: JSON.stringify({
          orderId: order.id,
          ticketIndex: ticketIndex++,
          ticketTypeId: selection.ticketTypeId,
        }),
      });
    }
  }

  const soldByType = new Map<string, number>();
  for (const selection of selections) {
    soldByType.set(
      selection.ticketTypeId,
      (soldByType.get(selection.ticketTypeId) || 0) + selection.quantity
    );
  }

  const { error: insertError } = await supabaseAdmin.from('tickets').insert(ticketsPayload);
  if (insertError) throw insertError;

  // Notify live verifiers about new tickets (best-effort)
  void (async () => {
    try {
      const { broadcastTicketUpdate } = await import('@/lib/verifier-session');
      const { data: created } = await supabaseAdmin
        .from('tickets')
        .select('id, qr_code, status, ticket_type_name, checked_in_at, checked_in_by, updated_at')
        .eq('order_id', order.id);
      for (const ticket of created || []) {
        await broadcastTicketUpdate(order.event_id, ticket);
      }
    } catch (error) {
      console.warn('Verifier ticket broadcast failed:', error);
    }
  })();

  const inventoryUpdates = [...soldByType.entries()].map(([ticketTypeId, quantitySold]) => {
    const ticketType = ticketTypeMap.get(ticketTypeId)!;
    const newAvailable = Math.max(0, ticketType.available_quantity - quantitySold);
    return supabaseAdmin
      .from('ticket_types')
      .update({ available_quantity: newAvailable })
      .eq('id', ticketTypeId);
  });

  const eventTicketsAvailable = Math.max(0, Number(event.tickets_available || 0) - totalQuantity);

  const inventoryResults = await Promise.all([
    ...inventoryUpdates,
    supabaseAdmin
      .from('events')
      .update({ tickets_available: eventTicketsAvailable })
      .eq('id', order.event_id),
    supabaseAdmin.from('orders').update({ status: 'completed' }).eq('id', order.id),
  ]);

  for (const result of inventoryResults) {
    if (result.error) throw result.error;
  }

  // Do not block checkout on affiliate bookkeeping
  void maybeAwardAffiliateCommission(order, event).catch((error) => {
    console.error('Affiliate commission award failed:', error);
  });

  return { alreadyCompleted: false };
}

async function maybeAwardAffiliateCommission(
  order: OrderRow,
  event: {
    affiliates_enabled?: boolean | null;
    affiliate_commission_percent?: number | null;
    currency?: string | null;
  }
) {
  try {
    const settings = await getAffiliateSettings();
    if (!settings.programEnabled || !event.affiliates_enabled) return;

    const metadata = (order.payment_metadata || {}) as {
      affiliateCode?: string;
      affiliateId?: string;
    };

    const referralCode =
      order.affiliate_referral_code ||
      (typeof metadata.affiliateCode === 'string' ? metadata.affiliateCode : '') ||
      '';

    let affiliateId = order.affiliate_id || metadata.affiliateId || null;
    let affiliate = affiliateId
      ? (
          await supabaseAdmin.from('affiliates').select('*').eq('id', affiliateId).maybeSingle()
        ).data
      : null;

    if (!affiliate && referralCode) {
      affiliate = await getAffiliateByReferralCode(referralCode);
      affiliateId = affiliate?.id || null;
    }

    if (!affiliate || affiliate.status !== 'active') return;

    // No self-referral commissions
    if (order.user_id && affiliate.user_id === order.user_id) return;

    const orderAmount = Number(order.total_price ?? 0);
    const currency = order.currency || event.currency || 'USD';
    const commissionPercent = clampAffiliateCommissionPercent(
      event.affiliate_commission_percent ??
        settings.commissionPercent ??
        DEFAULT_AFFILIATE_COMMISSION_PERCENT
    );

    await createAffiliateCommissionForOrder({
      orderId: order.id,
      eventId: order.event_id,
      buyerUserId: order.user_id,
      orderAmount,
      currency,
      affiliateId: affiliate.id,
      commissionPercent,
    });
  } catch (error) {
    console.error('Affiliate commission award failed:', error);
  }
}
