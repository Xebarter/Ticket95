import type { ReactNode } from 'react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { cn } from '@/lib/utils';

export type LegalTocItem = {
  id: string;
  label: string;
};

type LegalDocumentLayoutProps = {
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated: string;
  toc: LegalTocItem[];
  children: ReactNode;
};

export function LegalDocumentLayout({
  title,
  description,
  effectiveDate,
  lastUpdated,
  toc,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <StaticPageLayout
      title={title}
      description={description}
      lastUpdated={`Effective ${effectiveDate} · Last updated ${lastUpdated}`}
    >
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="mb-8 lg:mb-0">
          <nav
            aria-label="Table of contents"
            className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              On this page
            </p>
            <ul className="mt-4 space-y-1 border-l border-slate-200 pl-4">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={cn(
                      'block py-1.5 text-sm text-slate-600 transition-colors hover:text-slate-900',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40'
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 hidden rounded-xl border border-slate-200 bg-slate-50 p-4 lg:block">
              <p className="text-xs font-medium text-slate-700">Related policies</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Contact support
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <article className="min-w-0">{children}</article>
      </div>
    </StaticPageLayout>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-slate-200/80 py-8 last:border-b-0">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[0.9375rem]">
        {children}
      </div>
    </section>
  );
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm leading-6 text-amber-950 sm:px-5">
      {children}
    </div>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-800">{children}</h3>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-slate-400">{children}</ul>;
}

export function LegalDefinitionList({ children }: { children: ReactNode }) {
  return <dl className="space-y-3">{children}</dl>;
}

export function LegalDefinitionTerm({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <dt className="text-sm font-semibold text-slate-900">{term}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-600">{children}</dd>
    </div>
  );
}
