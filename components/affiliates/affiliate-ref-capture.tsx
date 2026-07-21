'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AFFILIATE_REF_STORAGE_KEY } from '@/lib/affiliate-constants';

/** Captures ?ref= from the URL into localStorage for checkout attribution. */
export function AffiliateRefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = (searchParams.get('ref') || '').trim().toUpperCase();
    if (!ref || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(AFFILIATE_REF_STORAGE_KEY, ref);
    } catch {
      // ignore storage errors
    }
  }, [searchParams]);

  return null;
}

export function getStoredAffiliateCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(AFFILIATE_REF_STORAGE_KEY) || '').trim().toUpperCase();
  } catch {
    return '';
  }
}
