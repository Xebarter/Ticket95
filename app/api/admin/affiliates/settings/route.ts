import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import {
  clampAffiliateCommissionPercent,
  getAffiliateSettings,
  setAffiliateSettings,
  MIN_AFFILIATE_COMMISSION_PERCENT,
  MAX_AFFILIATE_COMMISSION_PERCENT,
} from '@/lib/affiliates';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getAffiliateSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Admin affiliate settings GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load settings';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const programEnabled =
      typeof body?.programEnabled === 'boolean' ? body.programEnabled : undefined;
    let commissionPercent: number | undefined;
    if (body?.commissionPercent != null) {
      const parsed = Number(body.commissionPercent);
      if (
        Number.isNaN(parsed) ||
        parsed < MIN_AFFILIATE_COMMISSION_PERCENT ||
        parsed > MAX_AFFILIATE_COMMISSION_PERCENT
      ) {
        return NextResponse.json(
          {
            error: `commissionPercent must be between ${MIN_AFFILIATE_COMMISSION_PERCENT} and ${MAX_AFFILIATE_COMMISSION_PERCENT}`,
          },
          { status: 400 }
        );
      }
      commissionPercent = clampAffiliateCommissionPercent(parsed);
    }

    const settings = await setAffiliateSettings(
      { programEnabled, commissionPercent },
      session.userId
    );

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Admin affiliate settings PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
