import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrRestoreSession } from '@/lib/session-restore';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';

function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
}

async function resolveClaimIdentity(request: NextRequest): Promise<{
  userId: string;
  email: string;
} | null> {
  const token = getBearerToken(request);
  if (token) {
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (!userError && user?.id && user.email) {
      return { userId: user.id, email: user.email };
    }
  }

  const session = await getOrRestoreSession();
  if (session?.userId && session.email) {
    return { userId: session.userId, email: session.email };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const identity = await resolveClaimIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await claimGuestPurchasesForUser(identity.email, identity.userId);
    return NextResponse.json(
      {
        success: true,
        claimedOrders: result.claimedOrders,
        claimedTickets: result.claimedTickets,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Guest purchase claim error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to claim guest purchases',
      },
      { status: 500 }
    );
  }
}
