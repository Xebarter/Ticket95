/** Build an absolute public event URL for sharing. */
export function buildEventShareUrl(
  eventId: string,
  options?: { origin?: string; ref?: string | null }
): string {
  const origin =
    (options?.origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
      /\/$/,
      ''
    ) || ''
  const path = `/events/${eventId}`
  const ref = (options?.ref || '').trim()
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  return origin ? `${origin}${path}${query}` : `${path}${query}`
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export type ShareEventInput = {
  eventId: string
  eventName: string
  /** Preserve affiliate referral when sharing from an event page. */
  ref?: string | null
  origin?: string
}

/**
 * Prefer the native share sheet; fall back to copying the link.
 * Returns how the action completed.
 */
export async function shareEvent(
  input: ShareEventInput
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = buildEventShareUrl(input.eventId, {
    origin: input.origin,
    ref: input.ref,
  })
  const title = input.eventName
  const text = `Check out ${input.eventName} on Ticket95`

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // User dismissed the sheet — don't treat as failure.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      // fall through to clipboard
    }
  }

  const copied = await copyTextToClipboard(url)
  return copied ? 'copied' : 'failed'
}
