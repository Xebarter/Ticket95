import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';

function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await claimGuestPurchasesForUser(user.email, user.id);
    return NextResponse.json(
      {
        success: true,
        claimedOrders: result.claimedOrders,
        claimedTickets: result.claimedTickets,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Guest purchase claim error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to claim guest purchases' },
      { status: 500 }
    );
  }
}
