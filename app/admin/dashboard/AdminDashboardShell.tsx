'use client';

import dynamic from 'next/dynamic';

const AdminDashboardClient = dynamic(() => import('./AdminDashboardClient'), {
  ssr: false,
});

export default function AdminDashboardShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  // If children are provided, render them with the layout wrapper
  if (children) {
    return <AdminDashboardClient>{children}</AdminDashboardClient>;
  }

  // Otherwise, render the default dashboard content
  return <AdminDashboardClient />;
}

