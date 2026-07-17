import type { ReactNode } from 'react';
import { FooterServer } from '@/components/layout/footer-server';
import { HeaderClient } from '@/components/layout/header-client';

interface StaticPageLayoutProps {
  title: string;
  description: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function StaticPageLayout({ title, description, lastUpdated, children }: StaticPageLayoutProps) {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HeaderClient />

      <section className="w-full border-b border-border/50 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
          {lastUpdated ? (
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">Last updated: {lastUpdated}</p>
          ) : null}
        </div>
      </section>

      <section className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
      </section>

      <FooterServer />
    </main>
  );
}
