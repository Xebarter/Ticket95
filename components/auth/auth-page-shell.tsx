import Link from 'next/link'
import { BrandLogo } from '@/components/brand/brand-logo'
import { CalendarDays, ShieldCheck, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  {
    icon: Ticket,
    title: 'Instant ticket access',
    description: 'Receive digital tickets immediately after checkout.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    description: 'Protected checkout and encrypted account access.',
  },
  {
    icon: CalendarDays,
    title: 'Discover events',
    description: 'Concerts, sports, movies, and more in one place.',
  },
] as const

type AuthPageShellProps = {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const authInputClassName =
  'h-11 border-slate-200 bg-white shadow-none placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-slate-400/25'

export const authPrimaryButtonClassName =
  'h-11 w-full bg-slate-900 font-semibold text-white shadow-none hover:bg-slate-800 disabled:bg-slate-300'

export function AuthPageShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(154,123,47,0.18),_transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,_rgba(255,255,255,0.04),_transparent_40%)]" />
          <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-[#9A7B2F]/10 blur-3xl" />

          <div className="relative z-10 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-slate-400">
            <BrandLogo href="/" size="lg" subtitle="Event ticketing platform" />
          </div>

          <div className="relative z-10 max-w-md space-y-8 py-12">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C4A24D]">
                Ticket95.com
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
                Professional ticketing for every event experience.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Buy tickets, manage orders, and host events on a platform built for
                clarity, speed, and trust.
              </p>
            </div>

            <ul className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, title: highlightTitle, description: highlightDescription }) => (
                <li key={highlightTitle} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#C4A24D]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white">{highlightTitle}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-slate-400">
                      {highlightDescription}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Ticket95.com. All rights reserved.
          </p>
        </aside>

        <section className="flex min-h-screen flex-col px-4 py-8 sm:px-6 lg:min-h-0 lg:justify-center lg:px-10 lg:py-12 xl:px-16">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandLogo href="/" size="md" />
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Back to home
            </Link>
          </div>

          <div className={cn('mx-auto w-full max-w-md', className)}>
            <div className="mb-8 hidden lg:block">
              <Link
                href="/"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                &larr; Back to home
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] sm:p-8">
              <header className="mb-6 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                <p className="text-sm leading-relaxed text-slate-500">{description}</p>
              </header>

              {children}
            </div>

            {footer ? <footer className="mt-6 text-center text-sm text-slate-500">{footer}</footer> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
