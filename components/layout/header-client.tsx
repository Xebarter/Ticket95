'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/supabase-auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Settings, LogOut, LogIn, Plus, User, UserPlus, Menu } from 'lucide-react'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderSearch } from '@/components/layout/header-search'
import { EVENT_CATEGORIES } from '@/lib/event-categories'
import { cn } from '@/lib/utils'

function HeaderSearchFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'h-10 w-full animate-pulse rounded-md bg-slate-100'
          : 'h-10 w-full animate-pulse rounded-md bg-slate-100 sm:h-11'
      }
      aria-hidden
    />
  )
}

const profileTriggerClass =
  'header-profile-trigger inline-flex h-9 w-9 items-center justify-center rounded-full outline-none transition-[border-color,box-shadow,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-[#9A7B2F]/25 focus-visible:ring-offset-2'

function CategoryNavLinks({
  className,
  linkClassName,
  onNavigate,
}: {
  className?: string
  linkClassName?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = pathname === '/events' ? searchParams.get('category') : null

  return (
    <nav className={className} aria-label="Event categories">
      {EVENT_CATEGORIES.map((category) => {
        const active = activeCategory === category.id
        return (
          <Link
            key={category.id}
            href={category.href}
            onClick={onNavigate}
            className={cn(
              'whitespace-nowrap text-sm font-medium transition-colors',
              active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900',
              linkClassName
            )}
          >
            {category.label}
          </Link>
        )
      })}
    </nav>
  )
}

function GuestProfileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(profileTriggerClass, 'header-profile-trigger--guest')}
          aria-label="Account menu"
        >
          <User className="h-[1.125rem] w-[1.125rem] stroke-[1.75]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-2 py-2">
          <Link href="/login">
            <LogIn className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Sign In</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-2 py-2">
          <Link href="/signup">
            <UserPlus className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Sign Up</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserProfileMenu({
  name,
  logoUrl,
  role,
  onLogout,
  onAdmin,
}: {
  name?: string
  logoUrl?: string
  role?: string
  onLogout: () => void
  onAdmin: () => void
}) {
  const initial = (name?.charAt(0) || 'U').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(profileTriggerClass, 'header-profile-trigger--user')}
          aria-label="Account menu"
        >
          <Avatar className="h-full w-full">
            {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
            <AvatarFallback className="bg-slate-100 text-[13px] font-semibold tracking-wide text-slate-700">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {name || 'Account'}
          </p>
          {role ? (
            <p className="mt-0.5 text-[11px] font-medium capitalize text-slate-400">
              {role}
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-2 py-2">
          <Link href="/profile">
            <User className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Profile</span>
          </Link>
        </DropdownMenuItem>
        {role === 'admin' && (
          <DropdownMenuItem
            className="cursor-pointer rounded-md px-2 py-2"
            onClick={onAdmin}
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="font-medium">Admin</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer rounded-md px-2 py-2 text-slate-700"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          <span className="font-medium">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileCategoryMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Open categories menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(18rem,85vw)] p-0">
        <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-slate-900">
            Categories
          </SheetTitle>
        </SheetHeader>
        <CategoryNavLinks
          className="flex flex-col gap-1 p-3"
          linkClassName="rounded-lg px-3 py-3 hover:bg-slate-50"
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

function HeaderShell({
  search,
  categories,
  profileControl,
  createEvent,
}: {
  search: React.ReactNode
  categories: React.ReactNode
  profileControl: React.ReactNode
  createEvent?: React.ReactNode
}) {
  return (
    <>
      <header className="relative z-40 border-b border-border/40 bg-card/95 shadow-sm backdrop-blur-xl lg:sticky lg:top-0 lg:z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 sm:py-4 lg:gap-4 lg:py-4">
            <BrandLogo
              size="md"
              priority
              className="[&_img]:transition-transform [&_img]:hover:scale-105"
            />

            <div className="mx-2 hidden min-w-0 flex-1 lg:mx-4 lg:block lg:max-w-md xl:max-w-xl">
              {search}
            </div>

            <div className="ml-auto hidden shrink-0 items-center gap-4 lg:flex xl:gap-5">
              {categories}
              {createEvent}
              {profileControl}
            </div>

            <div className="ml-auto shrink-0 lg:hidden">{profileControl}</div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-50 border-b border-border/40 bg-card/95 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Menu className="h-5 w-5 text-slate-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">{search}</div>
        </div>
      </div>
    </>
  )
}

function HeaderFallback() {
  return (
    <HeaderShell
      search={<HeaderSearchFallback />}
      categories={
        <div className="hidden h-5 w-64 animate-pulse rounded bg-slate-100 lg:block" aria-hidden />
      }
      profileControl={
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" aria-hidden />
      }
    />
  )
}

function HeaderClientInner() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  const profileControl = user ? (
    <UserProfileMenu
      name={user.profile_name}
      logoUrl={user.profile_logo_url}
      role={user.role}
      onLogout={handleLogout}
      onAdmin={() => router.push('/admin')}
    />
  ) : (
    <GuestProfileMenu />
  )

  return (
    <>
      <header className="relative z-40 border-b border-border/40 bg-card/95 shadow-sm backdrop-blur-xl lg:sticky lg:top-0 lg:z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 sm:py-4 lg:gap-4 lg:py-4">
            <BrandLogo
              size="md"
              priority
              className="[&_img]:transition-transform [&_img]:hover:scale-105"
            />

            <div className="mx-2 hidden min-w-0 flex-1 lg:mx-4 lg:block lg:max-w-md xl:max-w-xl">
              <HeaderSearch />
            </div>

            <div className="ml-auto hidden shrink-0 items-center gap-4 lg:flex xl:gap-5">
              <CategoryNavLinks className="flex items-center gap-4 xl:gap-5" />

              {user ? (
                <Link href="/organizer/dashboard/create">
                  <Button size="sm" className="h-9 px-4 text-sm shadow-sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              ) : null}

              {profileControl}
            </div>

            <div className="ml-auto shrink-0 lg:hidden">{profileControl}</div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-50 border-b border-border/40 bg-card/95 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
          <MobileCategoryMenu />
          <div className="min-w-0 flex-1">
            <HeaderSearch compact />
          </div>
        </div>
      </div>
    </>
  )
}

export function HeaderClient() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderClientInner />
    </Suspense>
  )
}
