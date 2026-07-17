'use client';

import { useState } from 'react';
import { AdminHeader, AdminSidebar } from '@/components/admin/admin-sidebar';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_55%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="mx-auto max-w-[1320px] px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
        <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <AdminSidebar
          variant="mobile"
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="grid gap-5 sm:grid-cols-[275px_1fr] lg:gap-6">
          <div className="hidden sm:block">
            <div className="sticky top-4 h-[calc(100vh-2rem)]">
              <AdminSidebar variant="desktop" />
            </div>
          </div>
          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-6 lg:p-7">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
