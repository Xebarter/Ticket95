import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

function getPepper(): string {
  return (
    process.env.VERIFIER_CODE_PEPPER ||
    process.env.VERIFIER_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'ticket95-verifier-dev-pepper'
  )
}

function getJwtSecret(): string {
  return (
    process.env.VERIFIER_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'ticket95-verifier-dev-secret'
  )
}

export function generateVerifySlug(): string {
  return randomBytes(6).toString('hex').slice(0, 10)
}

export function generateAccessCode(): string {
  // 6-digit numeric, avoid leading zeros for clarity
  const n = 100000 + (randomBytes(3).readUIntBE(0, 3) % 900000)
  return String(n)
}

export function hashAccessCode(code: string): string {
  const normalized = String(code || '').trim()
  return createHash('sha256').update(`${getPepper()}:${normalized}`).digest('hex')
}

export function accessCodesMatch(code: string, hash: string | null | undefined): boolean {
  if (!hash) return false
  const a = Buffer.from(hashAccessCode(code), 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64')
}

export type VerifierJwtPayload = {
  verifierId: string
  eventId: string
  jti: string
  exp: number
  iat: number
}

export function signVerifierJwt(payload: Omit<VerifierJwtPayload, 'iat' | 'exp'> & { exp?: number }): string {
  const now = Math.floor(Date.now() / 1000)
  const full: VerifierJwtPayload = {
    verifierId: payload.verifierId,
    eventId: payload.eventId,
    jti: payload.jti,
    iat: now,
    exp: payload.exp ?? now + Math.floor(SESSION_TTL_MS / 1000),
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(full))
  const data = `${header}.${body}`
  const sig = createHmac('sha256', getJwtSecret()).update(data).digest()
  return `${data}.${base64url(sig)}`
}

export function verifyVerifierJwt(token: string): VerifierJwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const data = `${header}.${body}`
  const expected = createHmac('sha256', getJwtSecret()).update(data).digest()
  let actual: Buffer
  try {
    actual = fromBase64url(sig)
  } catch {
    return null
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }
  try {
    const payload = JSON.parse(fromBase64url(body).toString('utf8')) as VerifierJwtPayload
    if (!payload?.verifierId || !payload?.eventId || !payload?.jti || !payload?.exp) {
      return null
    }
    if (payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function newTokenJti(): string {
  return randomBytes(16).toString('hex')
}

export function sessionExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + SESSION_TTL_MS)
}

export type VerifierTicketRow = {
  id: string
  qr_code: string
  status: 'valid' | 'used' | 'expired' | 'refunded'
  ticket_type_name: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  updated_at: string
}

export const VERIFIER_TICKET_SELECT =
  'id, qr_code, status, ticket_type_name, checked_in_at, checked_in_by, updated_at' as const
