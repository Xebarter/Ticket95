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
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/supabase-auth-context';
import {
  BarChart3,
  Calendar,
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

  const onLogout = async () => {
    onClose?.();
    await logout();
    router.push('/');
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-4">
        <BrandLogo href="/" size="sm" subtitle="Profile" />
        {variant === 'mobile' && onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profile_logo_url || undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || '—'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
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
                className="h-10 w-full cursor-not-allowed justify-start rounded-xl px-3 text-muted-foreground/40"
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
                'h-10 w-full justify-start rounded-xl px-3 transition-colors',
                active
                  ? 'bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Link href={item.href} onClick={variant === 'mobile' ? onClose : undefined}>
                <Icon className="mr-2.5 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}

        <div className="my-2 border-t border-border/60" />

        <Button
          asChild
          variant="ghost"
          className={cn(
            'h-10 w-full justify-start rounded-xl px-3',
            pathname?.startsWith('/organizer/dashboard/create')
              ? 'bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Link href="/organizer/dashboard/create" onClick={variant === 'mobile' ? onClose : undefined}>
            <Plus className="mr-2.5 h-4 w-4" />
            Create
          </Link>
        </Button>
      </nav>

      <div className="space-y-0.5 border-t border-border/60 p-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground"
        >
          <Link href="/" onClick={variant === 'mobile' ? onClose : undefined}>
            <LayoutGrid className="mr-2.5 h-4 w-4" />
            Browse
          </Link>
        </Button>
        {user?.role === 'admin' ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground"
          >
            <Link href="/admin" onClick={variant === 'mobile' ? onClose : undefined}>
              <Settings className="mr-2.5 h-4 w-4" />
              Admin
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  if (variant === 'mobile') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-[min(20rem,88vw)] border-r p-0" aria-label="Profile navigation">
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
        'hidden h-full overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 md:flex md:flex-col',
        isOpen ? 'w-56 lg:w-60' : 'w-0'
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
    <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-sm md:hidden">
      <BrandLogo href="/" size="sm" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-xl"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </header>
  );
}
