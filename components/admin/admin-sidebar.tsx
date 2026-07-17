'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/supabase-auth-context';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  Menu,
  X,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Clock3,
  Home,
  ScanLine,
  LogOut,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Overview',
    description: 'Moderation queue and approvals',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/events',
    label: 'Events',
    description: 'Browse and manage all listings',
    icon: Calendar,
  },
  {
    href: '/admin/events/create',
    label: 'Create event',
    description: 'Launch a new event manually',
    icon: PlusCircle,
  },
  {
    href: '/admin/verify',
    label: 'Verify tickets',
    description: 'Scan QR codes and check entry',
    icon: ScanLine,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    description: 'Admin profile and platform controls',
    icon: Settings,
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile';
}

export function AdminSidebar({ isOpen = true, onClose, variant = 'desktop' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      await fetch('/api/auth/logout', { method: 'POST' });
      onClose?.();
      router.push('/login?redirect=/admin');
      router.refresh();
    } catch (error) {
      console.error('Admin sidebar logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const content = (
    <div className="flex h-full flex-col bg-gradient-to-b from-card via-card to-muted/20">
      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex items-center gap-2" onClick={variant === 'mobile' ? onClose : undefined}>
            <BrandLogo href={null} size="sm" subtitle="Administration" />
          </Link>
          {variant === 'mobile' && onClose ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user?.profile_name || user?.email || 'Administrator'}</p>
            <p className="text-[11px] text-muted-foreground">Signed in workspace</p>
          </div>
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-[10px] text-primary">
            Admin
          </Badge>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        <p className="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </p>
        {navItems.map((item) => {
          const isAnchor = item.href.startsWith('#');
          const Icon = item.icon;
          const isDashboardNav = item.href === '/admin/dashboard' && (pathname === '/admin' || pathname === '/admin/dashboard');
          const isActiveRoute =
            !isAnchor && (pathname === item.href || pathname?.startsWith(item.href + '/'));
          const isActive = isDashboardNav || isActiveRoute;

          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                'group h-auto w-full justify-start rounded-xl px-2.5 py-2.5 transition-all',
                isActive
                  ? 'bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/15 hover:bg-primary/15'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              onClick={variant === 'mobile' ? onClose : undefined}
            >
              <Link href={item.href}>
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border',
                    isActive ? 'border-primary/30 bg-primary/15 text-primary' : 'border-border/80 bg-background text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="ml-3 flex min-w-0 flex-col text-left">
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ChevronRight className={cn('ml-auto h-4 w-4 transition-opacity', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')} />
                {item.badge ? <span className="ml-auto text-xs">{item.badge}</span> : null}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border/70 p-3">
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium">Operational note</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Approvals and feature changes are applied to the marketplace immediately.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="justify-between rounded-xl">
            <Link href="/admin/events/create" onClick={variant === 'mobile' ? onClose : undefined}>
              Quick create
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-between rounded-xl">
            <Link href="/" onClick={variant === 'mobile' ? onClose : undefined}>
              Storefront
              <Home className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between rounded-xl border border-border/70 bg-background/70 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <span className="inline-flex items-center gap-2">
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {isLoggingOut ? 'Signing out...' : 'Log out'}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  if (variant === 'mobile') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-sm border-r p-0"
          aria-label="Admin navigation"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Admin Navigation</SheetTitle>
            <SheetDescription>Navigation menu for administration</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside className={cn(
      'hidden h-full overflow-hidden sm:flex sm:flex-col rounded-3xl border border-border/70 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80',
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>
      {content}
    </aside>
  );
}

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const pageMap: Record<string, { title: string; subtitle: string }> = {
    '/admin/dashboard': {
      title: 'Operations dashboard',
      subtitle: 'Moderate events, control listing quality, and track approvals.',
    },
    '/admin/events': {
      title: 'Event management',
      subtitle: 'Review all events, update records, and maintain listing standards.',
    },
    '/admin/settings': {
      title: 'Administration settings',
      subtitle: 'Manage profile, notifications, and security preferences.',
    },
    '/admin/verify': {
      title: 'Ticket verification',
      subtitle: 'Validate event-specific QR tickets and mark check-ins as used.',
    },
    '/admin/events/create': {
      title: 'Create event',
      subtitle: 'Publish a new event with complete ticketing and media details.',
    },
  };
  const current = pageMap[pathname ?? ''] ?? pageMap['/admin/dashboard'];

  return (
    <div className="mb-5 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm sm:mb-7 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
              Trusted Admin Workspace
            </Badge>
            <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
              Live moderation
            </Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {current.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {current.subtitle}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 sm:hidden"
          onClick={onMenuClick}
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-3 py-1.5 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Marketplace reflects admin updates in real time
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
          <Link href="/">
            <Home className="mr-1.5 h-3.5 w-3.5" />
            View storefront
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="hidden h-8 rounded-full px-3 text-xs sm:inline-flex">
          <Link href="/admin/events/create">
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            New event
          </Link>
        </Button>
      </div>
    </div>
  );
}
