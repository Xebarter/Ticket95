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
