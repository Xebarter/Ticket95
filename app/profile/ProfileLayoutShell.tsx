'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Footer } from '@/components/layout/footer';
import { ProfileMobileHeader, ProfileSidebar } from '@/components/profile/profile-sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/supabase-auth-context';
import { useProfileData } from './use-profile-data';

export default function ProfileLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ProfileLayoutShellInner>{children}</ProfileLayoutShellInner>
    </Suspense>
  );
}

function ProfileLayoutShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { myEvents, loading: loadingProfileData } = useProfileData();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const verifyEventId = (searchParams.get('event') || '').trim();
  const isVerifyList = Boolean(pathname?.startsWith('/profile/verify') && !verifyEventId);
  const noEventsMode = Boolean(user) && !loadingProfileData && myEvents.length === 0;

  // Full-bleed verify scanner — keep chrome out of the way
  if (pathname?.startsWith('/profile/verify') && verifyEventId) {
    return <>{children}</>;
  }

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.08),_transparent_55%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--muted)/0.25))]">
        <div
          className={cn(
            'mx-auto max-w-7xl',
            isVerifyList
              ? 'px-3 py-3 sm:px-5 sm:py-6 lg:px-8'
              : 'px-3 py-4 sm:px-5 sm:py-6 lg:px-8'
          )}
        >
          <ProfileMobileHeader onMenuClick={() => setMobileNavOpen(true)} />

          <ProfileSidebar
            variant="mobile"
            isOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            noEventsMode={noEventsMode}
          />

          <div className="grid gap-3 sm:gap-4 md:grid-cols-[15rem_1fr] lg:grid-cols-[16rem_1fr] lg:gap-6">
            <div className="hidden md:block">
              <div className="sticky top-4 h-[calc(100vh-2rem)]">
                <ProfileSidebar variant="desktop" noEventsMode={noEventsMode} />
              </div>
            </div>

            <section
              className={cn(
                'min-w-0',
                isVerifyList
                  ? 'md:rounded-3xl md:border md:border-border/70 md:bg-card/95 md:p-6 md:shadow-sm md:backdrop-blur md:supports-[backdrop-filter]:bg-card/90 lg:p-7'
                  : 'rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:p-6 lg:p-7'
              )}
            >
              {children}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
