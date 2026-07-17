export type ParsedTicketQr =
  | {
      kind: 'ticket-id';
      ticketId: string;
    }
  | {
      kind: 'opaque';
      raw: string;
    };

export function normalizeQrValue(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim();
}

export function parseTicketQr(input: unknown): ParsedTicketQr | null {
  const normalized = normalizeQrValue(input);
  if (!normalized) return null;

  try {
    const parsed = JSON.parse(normalized) as { ticketId?: string } | null;
    if (parsed && typeof parsed.ticketId === 'string' && parsed.ticketId.trim()) {
      return {
        kind: 'ticket-id',
        ticketId: parsed.ticketId.trim(),
      };
    }
  } catch {
    // Not JSON QR payload; treat as opaque payload.
  }

  return {
    kind: 'opaque',
    raw: normalized,
  };
}
