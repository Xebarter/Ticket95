/** Normalize Uganda mobile numbers to 256XXXXXXXXX (no +). */
export function normalizeUgandaMomoPhone(input: string): string | null {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = `256${normalized.slice(1)}`;
  } else if (normalized.startsWith('7') && normalized.length === 9) {
    normalized = `256${normalized}`;
  } else if (normalized.startsWith('+')) {
    normalized = normalized.replace(/^\+/, '');
  }

  if (!/^256\d{9}$/.test(normalized)) return null;
  return normalized;
}
