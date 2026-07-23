/** sessionStorage key for free-checkout ticket payload (SPA handoff). */
export const FREE_CHECKOUT_STORAGE_PREFIX = 'ticket95:freeCheckout:';

export function freeCheckoutStorageKey(orderId: string) {
  return `${FREE_CHECKOUT_STORAGE_PREFIX}${orderId}`;
}

export type FreeCheckoutStash = {
  orderId: string;
  tickets: unknown[];
  event: unknown;
  order?: {
    isGuest?: boolean;
    customerEmail?: string | null;
    isFree?: boolean;
  };
};

export function stashFreeCheckoutPayload(payload: FreeCheckoutStash) {
  if (typeof window === 'undefined' || !payload.orderId) return;
  try {
    sessionStorage.setItem(freeCheckoutStorageKey(payload.orderId), JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to stash free checkout payload:', error);
  }
}

export function takeFreeCheckoutPayload(orderId: string): FreeCheckoutStash | null {
  if (typeof window === 'undefined' || !orderId) return null;
  try {
    const key = freeCheckoutStorageKey(orderId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as FreeCheckoutStash;
  } catch (error) {
    console.error('Failed to read free checkout payload:', error);
    return null;
  }
}
