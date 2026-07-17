'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/supabase-auth-context';
import { useProfileData } from './use-profile-data';
import { Footer } from '@/components/layout/footer';
import { useState, Suspense } from 'react';
import {
  BarChart3,
  Calendar,
  Home,
  LogOut,
  Menu,
  Plus,
  ScanLine,
  Settings,
  Ticket,
  UserRound,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';

const navItems = [
  { href: '/profile/tickets', label: 'Tickets', icon: Ticket, match: ['/profile/tickets'] },
  { href: '/profile', label: 'Overview', icon: Home, match: ['/profile'], exact: true },
  { href: '/profile/events', label: 'Events', icon: Calendar, match: ['/profile/events', '/organizer/dashboard/edit'] },
  { href: '/profile/verify', label: 'Verify', icon: ScanLine, match: ['/profile/verify'] },
  { href: '/profile/analytics', label: 'Analytics', icon: BarChart3, match: ['/profile/analytics', '/profile/orders'] },
  { href: '/organizer/dashboard/create', label: 'Create Event', icon: Plus, match: ['/organizer/dashboard/create'] },
];

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
  const router = useRouter();
  const { user, logout } = useAuth();
  const { myEvents, loading: loadingProfileData } = useProfileData();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const verifyEventId = (searchParams.get('event') || '').trim();
  const noEventsMode = Boolean(user) && !loadingProfileData && myEvents.length === 0;

  if (pathname?.startsWith('/profile/verify') && verifyEventId) {
    return (
      <>
        {children}
        <Footer />
      </>
    );
  }

  const onLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background)))]">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-[260px_1fr] lg:gap-6">
          <aside className="hidden md:block">
            <div className="sticky top-4 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm">
              <BrandLogo size="sm" subtitle="Profile" className="mb-4" />

              <div className="mb-4 rounded-2xl border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profile_logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(user?.profile_name || user?.email || 'G').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user?.profile_name || 'Guest user'}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email || 'guest@ticket95.com'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="mt-3 rounded-full text-[10px]">
                  Profile workspace
                </Badge>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : item.match.some((route) => pathname === route || pathname?.startsWith(route + '/'));
                  const isDisabled =
                    noEventsMode &&
                    item.href !== '/profile/tickets' &&
                    item.href !== '/organizer/dashboard/create';

                  if (isDisabled) {
                    return (
                      <Button
                        key={item.href}
                        variant="ghost"
                        disabled
                        className="h-10 w-full cursor-not-allowed justify-start rounded-xl px-3 text-muted-foreground/50"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={cn(
                        'h-10 w-full justify-start rounded-xl px-3',
                        isActive ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground'
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>

              {noEventsMode ? (
                <p className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Create your first event to unlock Events, Verify, Analytics, and overview tools.
                </p>
              ) : null}

              <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                <Button asChild variant="outline" size="sm" className="w-full justify-start rounded-xl">
                  <Link href="/">
                    <Calendar className="mr-2 h-4 w-4" />
                    Browse events
                  </Link>
                </Button>
                {user?.role === 'admin' ? (
                  <Button asChild variant="outline" size="sm" className="w-full justify-start rounded-xl">
                    <Link href="/admin">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin center
                    </Link>
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="w-full justify-start rounded-xl text-muted-foreground" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm md:hidden">
              <div className="flex items-center justify-between gap-2">
                <BrandLogo size="sm" subtitle="Profile" />

                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Open profile menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0">
                    <SheetHeader className="border-b border-border/70">
                      <SheetTitle>Profile menu</SheetTitle>
                      <SheetDescription>Navigate your profile workspace.</SheetDescription>
                    </SheetHeader>

                    <div className="p-4">
                      <div className="mb-4 rounded-2xl border border-border/70 bg-muted/20 p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user?.profile_logo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <UserRound className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user?.profile_name || 'Guest user'}</p>
                            <p className="truncate text-xs text-muted-foreground">{user?.email || 'guest@ticket95.com'}</p>
                          </div>
                        </div>
                      </div>

                      <nav className="space-y-1">
                        {navItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.exact
                            ? pathname === item.href
                            : item.match.some((route) => pathname === route || pathname?.startsWith(route + '/'));
                          const isDisabled =
                            noEventsMode &&
                            item.href !== '/profile/tickets' &&
                            item.href !== '/organizer/dashboard/create';

                          if (isDisabled) {
                            return (
                              <Button
                                key={item.href}
                                variant="ghost"
                                disabled
                                className="h-10 w-full cursor-not-allowed justify-start rounded-xl px-3 text-muted-foreground/50"
                              >
                                <Icon className="mr-2 h-4 w-4" />
                                {item.label}
                              </Button>
                            );
                          }

                          return (
                            <Button
                              key={item.href}
                              asChild
                              variant={isActive ? 'default' : 'ghost'}
                              className="h-10 w-full justify-start rounded-xl px-3"
                            >
                              <Link href={item.href} onClick={() => setMobileNavOpen(false)}>
                                <Icon className="mr-2 h-4 w-4" />
                                {item.label}
                              </Link>
                            </Button>
                          );
                        })}
                      </nav>

                      {noEventsMode ? (
                        <p className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          Create your first event to unlock Events, Verify, Analytics, and overview tools.
                        </p>
                      ) : null}

                      <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                        <Button asChild variant="outline" size="sm" className="w-full justify-start rounded-xl">
                          <Link href="/" onClick={() => setMobileNavOpen(false)}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Browse events
                          </Link>
                        </Button>
                        {user?.role === 'admin' ? (
                          <Button asChild variant="outline" size="sm" className="w-full justify-start rounded-xl">
                            <Link href="/admin" onClick={() => setMobileNavOpen(false)}>
                              <Settings className="mr-2 h-4 w-4" />
                              Admin center
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start rounded-xl text-muted-foreground"
                          onClick={() => {
                            setMobileNavOpen(false);
                            onLogout();
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-6">{children}</div>
          </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
