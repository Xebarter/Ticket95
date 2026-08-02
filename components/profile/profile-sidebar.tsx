'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BrandLogo } from '@/components/brand/brand-logo';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/supabase-auth-context';
import {
  BarChart3,
  Calendar,
  Handshake,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  ScanLine,
  Settings,
  Ticket,
  X,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  match: string[];
  exact?: boolean;
  requiresEvents?: boolean;
};

const primaryNav: NavItem[] = [
  { href: '/profile', label: 'Overview', icon: Home, match: ['/profile'], exact: true },
  { href: '/profile/tickets', label: 'Tickets', icon: Ticket, match: ['/profile/tickets'] },
  {
    href: '/profile/affiliate',
    label: 'Affiliate',
    icon: Handshake,
    match: ['/profile/affiliate'],
  },
  {
    href: '/profile/events',
    label: 'Events',
    icon: Calendar,
    match: ['/profile/events', '/organizer/dashboard/edit'],
    requiresEvents: true,
  },
  {
    href: '/profile/verify',
    label: 'Verify',
    icon: ScanLine,
    match: ['/profile/verify'],
    requiresEvents: true,
  },
  {
    href: '/profile/analytics',
    label: 'Analytics',
    icon: BarChart3,
    match: ['/profile/analytics', '/profile/orders'],
    requiresEvents: true,
  },
];

function isNavActive(pathname: string | null, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return item.match.some((route) => pathname === route || pathname?.startsWith(`${route}/`));
}

interface ProfileSidebarProps {
  noEventsMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile';
}

export function ProfileSidebar({
  noEventsMode = false,
  isOpen = true,
  onClose,
  variant = 'desktop',
}: ProfileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayName = user?.profile_name || user?.email?.split('@')[0] || 'Account';
  const initial = displayName.charAt(0).toUpperCase();
  const isMobile = variant === 'mobile';

  const onLogout = async () => {
    onClose?.();
    await logout();
    router.push('/');
  };

  const content = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-4',
          isMobile
            ? 'border-b border-sky-200/60 bg-gradient-to-r from-sky-50/80 to-white py-3.5 dark:border-sky-500/20 dark:from-sky-950/30 dark:to-slate-950'
            : 'border-b border-slate-200/70 py-4 dark:border-slate-800'
        )}
      >
        <BrandLogo href="/" size="sm" subtitle={isMobile ? undefined : 'Profile'} />
        <div className="flex items-center gap-0.5">
          {!isMobile ? <NotificationBell /> : null}
          {isMobile && onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-500 hover:bg-sky-50 hover:text-primary"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-3 pt-3.5 sm:px-4 sm:pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200/50 bg-gradient-to-br from-sky-50/70 via-white to-indigo-50/30 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-sky-500/20 dark:from-sky-950/30 dark:via-slate-950 dark:to-indigo-950/20">
          <Avatar className="h-11 w-11 ring-2 ring-primary/15">
            <AvatarImage src={user?.profile_logo_url || undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email || '—'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3.5 sm:px-3">
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Menu
        </p>
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item);
          const disabled = Boolean(noEventsMode && item.requiresEvents);

          if (disabled) {
            return (
              <Button
                key={item.href}
                type="button"
                variant="ghost"
                disabled
                className="h-11 w-full cursor-not-allowed justify-start rounded-xl px-3 text-muted-foreground/40"
              >
                <Icon className="mr-2.5 h-4 w-4" />
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
                'h-11 w-full justify-start rounded-xl px-3 transition-colors',
                active
                  ? 'bg-primary font-medium text-primary-foreground shadow-[0_1px_3px_rgba(37,99,235,0.25)] hover:bg-primary/90 hover:text-primary-foreground'
                  : 'text-slate-600 hover:bg-sky-50/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-sky-500/10 dark:hover:text-slate-50'
              )}
            >
              <Link href={item.href} onClick={isMobile ? onClose : undefined}>
                <Icon className="mr-2.5 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-sky-200/50 bg-gradient-to-t from-sky-50/50 to-transparent p-3 dark:border-sky-500/15 dark:from-sky-950/20">
        <Button
          asChild
          className="h-11 w-full rounded-xl bg-emerald-600 text-white shadow-[0_1px_2px_rgba(5,150,105,0.25)] hover:bg-emerald-700 hover:text-white"
        >
          <Link href="/organizer/dashboard/create" onClick={isMobile ? onClose : undefined}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create event
          </Link>
        </Button>

        <div className="space-y-0.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-10 w-full justify-start rounded-xl px-3 text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/60"
          >
            <Link href="/" onClick={isMobile ? onClose : undefined}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Browse
            </Link>
          </Button>
          {user?.role === 'admin' ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 w-full justify-start rounded-xl px-3 text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/60"
            >
              <Link href="/admin" onClick={isMobile ? onClose : undefined}>
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-full justify-start rounded-xl px-3 text-slate-500 hover:bg-white/80 hover:text-destructive dark:text-slate-400"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(19.5rem,88vw)] gap-0 border-r border-sky-200/60 bg-gradient-to-b from-white via-white to-sky-50/40 p-0 dark:border-sky-500/20 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/20"
          aria-label="Profile navigation"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Profile</SheetTitle>
            <SheetDescription>Profile navigation</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-b from-white to-sky-50/40 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur supports-[backdrop-filter]:bg-white/90 md:flex md:flex-col dark:border-slate-700/60 dark:from-slate-950 dark:to-sky-950/20',
        isOpen ? 'w-60 lg:w-64' : 'w-0'
      )}
    >
      {content}
    </aside>
  );
}

interface ProfileMobileHeaderProps {
  onMenuClick: () => void;
}

export function ProfileMobileHeader({ onMenuClick }: ProfileMobileHeaderProps) {
  return (
    <header className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-slate-200/60 bg-white/80 px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur md:hidden dark:border-slate-700/50 dark:bg-slate-950/70">
      <BrandLogo href="/" size="sm" />
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl hover:bg-sky-50"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
