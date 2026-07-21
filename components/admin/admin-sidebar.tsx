'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  Calendar,
  Home,
  ScanLine,
  LogOut,
  Loader2,
  Mail,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/lib/supabase-auth-context';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/events/create', label: 'Create', icon: PlusCircle },
  { href: '/admin/verify', label: 'Verify', icon: ScanLine },
  { href: '/admin/support-messages', label: 'Support', icon: Mail },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function isNavActive(pathname: string | null, href: string) {
  if (href === '/admin/dashboard') {
    return pathname === '/admin' || pathname === '/admin/dashboard';
  }
  if (href === '/admin/events') {
    return pathname === '/admin/events';
  }
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

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

  const displayName = user?.profile_name || user?.email?.split('@')[0] || 'Admin';

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-4">
        <BrandLogo href="/" size="sm" subtitle="Admin" />
        {variant === 'mobile' && onClose ? (
          <Button
            type="button"
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

      <div className="border-b border-border/60 px-4 py-3">
        <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email || '—'}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

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
      </nav>

      <div className="space-y-0.5 border-t border-border/60 p-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground"
        >
          <Link href="/" onClick={variant === 'mobile' ? onClose : undefined}>
            <Home className="mr-2.5 h-4 w-4" />
            Browse
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2.5 h-4 w-4" />
          )}
          {isLoggingOut ? 'Signing out…' : 'Log out'}
        </Button>
      </div>
    </div>
  );

  if (variant === 'mobile') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent
          side="left"
          className="w-[min(20rem,88vw)] border-r p-0"
          aria-label="Admin navigation"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Admin</SheetTitle>
            <SheetDescription>Admin navigation</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden h-full overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex sm:flex-col',
        isOpen ? 'w-56 lg:w-60' : 'w-0'
      )}
    >
      {content}
    </aside>
  );
}

interface AdminHeaderProps {
  onMenuClick: () => void;
}

/** Mobile-only chrome: logo + hamburger. Page titles live in content. */
export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-sm sm:hidden">
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
