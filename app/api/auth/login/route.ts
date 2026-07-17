import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/supabase-db';
import { verifyPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    try {
      await claimGuestPurchasesForUser(user.email, user.id);
    } catch (linkError) {
      console.error('Guest purchase linking failed on login:', linkError);
    }

    // Create session
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'organizer' | 'customer',
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}