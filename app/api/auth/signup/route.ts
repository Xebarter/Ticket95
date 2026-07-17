import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/supabase-db';
import { createSession } from '@/lib/session';
import { generateId } from '@/lib/auth';
import { claimGuestPurchasesForUser } from '@/lib/guest-purchase-linking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role = 'customer', organizerName, organizerLogoUrl } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const userId = generateId();

    // Create user in Supabase
    await createUser(userId, email, role || 'customer');

    // TODO: Update user profile with organizerName and organizerLogoUrl if provided

    try {
      await claimGuestPurchasesForUser(email, userId);
    } catch (linkError) {
      console.error('Guest purchase linking failed on signup:', linkError);
    }

    // Create session
    await createSession({
      userId,
      email,
      role: (role || 'customer') as 'admin' | 'organizer' | 'customer',
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          role: role || 'customer',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
