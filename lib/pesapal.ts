const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL;
const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID;
const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3';

function ensureConfig() {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET || !PESAPAL_CALLBACK_URL || !PESAPAL_IPN_ID) {
    throw new Error('Missing Pesapal environment variables');
  }
}

export async function getPesapalToken() {
  ensureConfig();
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
    cache: 'no-store',
  });

  const payload = await res.json();
  if (!res.ok || !payload?.token) {
    throw new Error(payload?.message || 'Failed to get Pesapal token');
  }
  return payload.token as string;
}

export async function submitPesapalOrder(input: {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}) {
  ensureConfig();
  const token = await getPesapalToken();
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: input.merchantReference,
      currency: input.currency,
      amount: Number(input.amount.toFixed(2)),
      description: input.description,
      callback_url: PESAPAL_CALLBACK_URL,
      notification_id: PESAPAL_IPN_ID,
      billing_address: {
        email_address: input.email,
        phone_number: input.phone || '',
        first_name: input.firstName,
        last_name: input.lastName || input.firstName,
      },
    }),
    cache: 'no-store',
  });

  const payload = await res.json();
  if (!res.ok || !payload?.redirect_url) {
    throw new Error(payload?.error?.message || payload?.message || 'Failed to initialize Pesapal checkout');
  }
  return payload as {
    order_tracking_id: string;
    merchant_reference: string;
    redirect_url: string;
    status?: string;
  };
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  const token = await getPesapalToken();
  const url = new URL(`${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus`);
  url.searchParams.set('orderTrackingId', orderTrackingId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.message || 'Failed to fetch transaction status');
  }
  return payload as {
    payment_status_description?: string;
    payment_method?: string;
    confirmation_code?: string;
    merchant_reference?: string;
    status_code?: number;
    status?: string;
  };
}

export function isPesapalPaymentSuccessful(status?: string) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized.includes('complete') || normalized.includes('paid') || normalized.includes('successful');
}
