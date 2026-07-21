import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSession, requireAdmin } from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateSupportMessageBody = {
  name?: string;
  email: string;
  phone?: string;
  category?: string;
  subject?: string;
  orderReference?: string;
  eventName?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateSupportMessageBody>;

    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;

    const category = body.category ? String(body.category).trim() : 'general';
    const subject = body.subject ? String(body.subject).trim() : null;
    const orderReference = body.orderReference ? String(body.orderReference).trim() : null;
    const eventName = body.eventName ? String(body.eventName).trim() : null;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed message (at least 10 characters).' },
        { status: 400 }
      );
    }

    const session = await getSession();

    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .insert([
        {
          user_id: session?.userId || null,
          name,
          email,
          phone,
          category,
          subject,
          order_reference: orderReference,
          event_name: eventName,
          message,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create support message error:', error);
      return NextResponse.json({ error: 'Failed to submit message.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error: unknown) {
    console.error('Support message submit error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Number(searchParams.get('limit') || '50'));

    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('id, created_at, name, email, phone, category, subject, order_reference, event_name, status, resolved_at, message')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch support messages error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages.' }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] }, { status: 200 });
  } catch (error: unknown) {
    console.error('Fetch support messages error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

