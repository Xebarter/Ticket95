'use client';

// Fast, modular admin dashboard shell (client-only)
import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Sparkles, LayoutDashboard, ListChecks } from 'lucide-react';
import { AdminSidebar, AdminHeader } from '@/components/admin/admin-sidebar';

const AdminStats = dynamic(() => import('./stats'), { ssr: false });
const AdminEventList = dynamic(() => import('./event-list'), { ssr: false });

export default function AdminDashboardClient({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Mobile header with hamburger menu */}
        <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Mobile sidebar */}
        <AdminSidebar
          variant="mobile"
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="grid gap-8 sm:grid-cols-[230px,1fr]">
          {/* Desktop sidebar on the left */}
          <AdminSidebar variant="desktop" />

          {/* Main content */}
          <div>
            {children ? children : (
              <>
                <header className="hidden sm:flex flex-col gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                      Event moderation & featured curation
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                      Review new submissions, keep your catalog trustworthy, and highlight the events that
                      matter most.
                    </p>
                  </div>
                </header>

                <section id="overview" aria-labelledby="admin-stats-heading" className="mb-10">
                  <h2 id="admin-stats-heading" className="sr-only">
                    Overview
                  </h2>
                  <Suspense fallback={<div>Loading stats...</div>}>
                    <AdminStats />
                  </Suspense>
                </section>

                <Separator className="mb-8" />

                <section id="review-queue" aria-labelledby="admin-events-heading">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2
                        id="admin-events-heading"
                        className="text-lg sm:text-xl font-semibold tracking-tight"
                      >
                        Event review queue
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Approve, reject, or update existing events. All actions are logged for
                        auditability.
                      </p>
                    </div>
                  </div>
                  <Suspense fallback={<div>Loading events...</div>}>
                    <AdminEventList />
                  </Suspense>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

