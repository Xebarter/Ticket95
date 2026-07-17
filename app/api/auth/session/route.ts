import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { getServerAuthUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getServerAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await createSession({
      userId: authUser.userId,
      email: authUser.email,
      role: authUser.role,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Session sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
