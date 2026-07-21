import { Suspense } from 'react';
import AdminVerifyClient from './verify-client';

export default function AdminVerifyPage() {
  return (
    <Suspense fallback={null}>
      <AdminVerifyClient />
    </Suspense>
  );
}
