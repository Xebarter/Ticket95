import { Suspense } from 'react';
import VerifyClient from './verify-client';

export default function ProfileVerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <VerifyClient />
    </Suspense>
  );
}
