/** Canonical public site origin for absolute OG / social URLs. */
export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '');
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;

  return 'http://localhost:3000';
}

/** Make image URLs absolute so social crawlers can fetch them. */
export function toAbsoluteUrl(url: string | null | undefined, base = getSiteUrl()): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${base}${path}`;
}

export function getEventShareImage(event: {
  name?: string;
  image_url?: string | null;
  image_urls?: string[] | null;
}): { url: string; alt: string } | null {
  const candidate =
    (event.image_url || '').trim() ||
    (Array.isArray(event.image_urls) ? event.image_urls.find((u) => Boolean(u?.trim())) : '') ||
    '';

  const absolute = toAbsoluteUrl(candidate);
  if (!absolute) return null;

  return {
    url: absolute,
    alt: event.name ? `${event.name} — Ticket95` : 'Ticket95 event',
  };
}
