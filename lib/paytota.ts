const PAYTOTA_SECRET_KEY = process.env.PAYTOTA_SECRET_KEY;
const PAYTOTA_BRAND_ID = process.env.PAYTOTA_BRAND_ID;
const PAYTOTA_BASE_URL = (process.env.PAYTOTA_BASE_URL || 'https://gate.paytota.com').replace(/\/$/, '');

export type PaytotaPurchaseProduct = {
  name: string;
  price: number;
};

export type CreatePaytotaPurchaseInput = {
  reference: string;
  currency: string;
  totalAmount: number;
  products: PaytotaPurchaseProduct[];
  email: string;
  phone?: string;
  fullName?: string;
  country?: string;
  successRedirect: string;
  failureRedirect: string;
  cancelRedirect?: string;
};

export type PaytotaPurchaseResponse = {
  id: string;
  checkout_url: string;
  status: string;
  reference: string;
  event_type?: string;
};

function getPaytotaConfig() {
  if (!PAYTOTA_SECRET_KEY || !PAYTOTA_BRAND_ID) {
    throw new Error('Payment is not configured. Please contact support.');
  }

  return {
    secretKey: PAYTOTA_SECRET_KEY,
    brandId: PAYTOTA_BRAND_ID,
    baseUrl: PAYTOTA_BASE_URL,
  };
}

export async function createPaytotaPurchase(
  input: CreatePaytotaPurchaseInput
): Promise<PaytotaPurchaseResponse> {
  const { secretKey, brandId, baseUrl } = getPaytotaConfig();

  const payload = {
    client: {
      email: input.email,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.fullName ? { full_name: input.fullName } : {}),
      country: input.country || 'UG',
    },
    purchase: {
      currency: input.currency,
      products: input.products.map((product) => ({
        name: product.name,
        price: String(Math.round(product.price)),
      })),
      total: Math.round(input.totalAmount),
    },
    reference: input.reference,
    skip_capture: false,
    brand_id: brandId,
    success_redirect: input.successRedirect,
    failure_redirect: input.failureRedirect,
    cancel_redirect: input.cancelRedirect || input.failureRedirect,
  };

  const res = await fetch(`${baseUrl}/api/v1/purchases/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : `Payment initialization failed (${res.status})`;
    throw new Error(message);
  }

  if (!data?.id || !data?.checkout_url) {
    throw new Error('Payment provider did not return a checkout URL.');
  }

  return {
    id: String(data.id),
    checkout_url: String(data.checkout_url),
    status: String(data.status || 'created'),
    reference: String(data.reference || input.reference),
    event_type: data.event_type ? String(data.event_type) : undefined,
  };
}

export async function getPaytotaPurchaseStatus(purchaseId: string) {
  const { secretKey, baseUrl } = getPaytotaConfig();

  const res = await fetch(`${baseUrl}/api/v1/purchases/${encodeURIComponent(purchaseId)}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : `Payment status check failed (${res.status})`;
    throw new Error(message);
  }

  return data as {
    id?: string;
    status?: string;
    reference?: string;
    event_type?: string;
  };
}

export function isPaytotaPaymentSuccessful(status?: string | null) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'paid' || normalized === 'captured' || normalized === 'preauthorized';
}

// ---------------------------------------------------------------------------
// Disbursements / payouts
// ---------------------------------------------------------------------------

export type CreatePaytotaPayoutInput = {
  email: string;
  phone: string;
  country?: string;
  currency: string;
  amount: number;
  description: string;
  reference: string;
};

export type PaytotaPayoutResponse = {
  id: string;
  status: string;
  reference: string;
  execution_url?: string;
  event_type?: string;
  raw: Record<string, unknown>;
};

export type PaytotaAccountBalance = {
  available_balance?: number | string;
  available_payout_balance?: number | string;
  payout_balance?: number | string;
  pending_payouts?: number | string;
  pending_outgoing?: number | string;
  reserved?: number | string;
  currency?: string;
  [key: string]: unknown;
};

function paytotaErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === 'string') return nested.message;
  }
  return fallback;
}

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

export async function getPaytotaAccountBalance(): Promise<PaytotaAccountBalance> {
  const { secretKey, baseUrl } = getPaytotaConfig();

  const res = await fetch(`${baseUrl}/api/v1/account/json/balance/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(paytotaErrorMessage(data, `Balance check failed (${res.status})`));
  }

  return data as PaytotaAccountBalance;
}

export async function createPaytotaPayout(
  input: CreatePaytotaPayoutInput
): Promise<PaytotaPayoutResponse> {
  const { secretKey, brandId, baseUrl } = getPaytotaConfig();
  const phone = normalizeUgandaMomoPhone(input.phone);
  if (!phone) {
    throw new Error('Enter a valid Uganda mobile money number (e.g. 2567XXXXXXXX).');
  }

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Invalid payout amount.');
  }

  const payload = {
    client: {
      email: input.email,
      phone,
      country: input.country || 'UG',
    },
    payment: {
      currency: (input.currency || 'UGX').toUpperCase(),
      amount: String(amount),
      description: input.description.slice(0, 200),
    },
    reference: input.reference,
    brand_id: brandId,
  };

  const res = await fetch(`${baseUrl}/api/v1/payouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(paytotaErrorMessage(data, `Payout initialization failed (${res.status})`));
  }

  const id = data.id != null ? String(data.id) : '';
  if (!id) {
    throw new Error('Payment provider did not return a payout id.');
  }

  return {
    id,
    status: String(data.status || 'initialized'),
    reference: String(data.reference || input.reference),
    execution_url: data.execution_url ? String(data.execution_url) : undefined,
    event_type: data.event_type ? String(data.event_type) : undefined,
    raw: data,
  };
}

export async function executePaytotaPayout(executionUrl: string): Promise<Record<string, unknown>> {
  const { secretKey } = getPaytotaConfig();

  if (!executionUrl) {
    throw new Error('Missing payout execution URL.');
  }

  const res = await fetch(executionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payout_type: 'mobile' }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(paytotaErrorMessage(data, `Payout execution failed (${res.status})`));
  }

  const status = String(data.status || '').toLowerCase();
  if (status === 'error') {
    throw new Error(paytotaErrorMessage(data, 'Payout execution returned an error.'));
  }

  return data;
}

export async function getPaytotaPayoutStatus(payoutId: string) {
  const { secretKey, baseUrl } = getPaytotaConfig();

  const res = await fetch(`${baseUrl}/api/v1/payouts/${encodeURIComponent(payoutId)}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(paytotaErrorMessage(data, `Payout status check failed (${res.status})`));
  }

  return data as {
    id?: string;
    status?: string;
    reference?: string;
    event_type?: string;
    execution_url?: string;
    [key: string]: unknown;
  };
}

export function isPaytotaPayoutSuccessful(status?: string | null) {
  if (!status) return false;
  return status.toLowerCase() === 'success';
}

export function isPaytotaPayoutFailed(status?: string | null) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'error' || normalized === 'failed';
}
