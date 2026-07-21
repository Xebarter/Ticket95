import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from './supabase-admin';

export interface SessionData {
  userId: string;
  email: string;
  role: 'admin' | 'organizer' | 'customer';
}

const SESSION_COOKIE_NAME = 'ticketrevolution_session';
/** Keep signed-in users for a long time; cookie is refreshed while they use the app. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~13 months
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function signSessionPayload(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

function encodeSessionCookieValue(data: SessionData): string | null {
  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET is not configured; refusing to create insecure session cookie.');
    return null;
  }

  const payload = toBase64Url(JSON.stringify(data));
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function decodeSessionCookieValue(value: string): SessionData | null {
  if (!SESSION_SECRET) {
    return null;
  }

  const [payload, signature] = value.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);
  const providedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  const decoded = fromBase64Url(payload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as SessionData;
    if (!parsed?.userId || !parsed?.email || !parsed?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function createSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encodedValue = encodeSessionCookieValue(data);

  if (!encodedValue) {
    throw new Error('Unable to create session cookie');
  }

  cookieStore.set(SESSION_COOKIE_NAME, encodedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

/** Re-issue the session cookie so active users do not expire mid-use. */
export async function refreshSessionCookie(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session) return null;
  await createSession(session);
  return session;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  if (!session?.value) {
    return null;
  }

  return decodeSessionCookieValue(session.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error('No session found');
  }

  return session;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession();

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', session.userId)
    .maybeSingle();

  if (userError || !userRow || userRow.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return {
    ...session,
    role: 'admin',
  };
}

export async function requireOrganizer(): Promise<SessionData> {
  const session = await requireSession();

  if (session.role !== 'organizer') {
    throw new Error('Organizer access required');
  }

  return session;
}
