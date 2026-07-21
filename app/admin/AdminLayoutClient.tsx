'use client';

import { useState } from 'react';
import { AdminHeader, AdminSidebar } from '@/components/admin/admin-sidebar';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <AdminSidebar
          variant="mobile"
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="grid gap-4 sm:grid-cols-[14rem_1fr] lg:grid-cols-[15rem_1fr] lg:gap-6">
          <div className="hidden sm:block">
            <div className="sticky top-4 h-[calc(100vh-2rem)]">
              <AdminSidebar variant="desktop" />
            </div>
          </div>
          <section className="min-w-0 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm sm:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
