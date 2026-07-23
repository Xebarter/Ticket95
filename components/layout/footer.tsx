'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription logic
    setIsSubscribed(true);
    setEmail('');
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  const currentYear = new Date().getFullYear();

  const linkClass =
    'text-sm text-slate-400 transition-colors hover:text-[#d4b46a]';
  const headingClass =
    'text-xs font-semibold uppercase tracking-[0.16em] text-[#d4b46a]';

  return (
    <footer className="relative overflow-hidden border-t border-[#9A7B2F]/25 bg-[#0a0e1a] text-slate-200">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4b46a] to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#9A7B2F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#d4b46a]/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-4">
            <div className="[&_.text-foreground]:text-white [&_.text-muted-foreground]:text-slate-400 [&_.brand-gold-95]:text-[#d4b46a]">
              <BrandLogo size="md" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              Your premier destination for discovering and booking tickets to the most exciting
              events worldwide.
            </p>
            <div className="flex gap-3">
              {[
                { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
                { href: 'https://twitter.com', label: 'Twitter', Icon: Twitter },
                { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
                { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
              ].map(({ href, label, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-[#9A7B2F]/50 hover:bg-[#9A7B2F]/15 hover:text-[#d4b46a]"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={headingClass}>Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/events" className={linkClass}>
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/profile/tickets" className={linkClass}>
                  My Tickets
                </Link>
              </li>
              <li>
                <Link href="/profile/events" className={linkClass}>
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/organizer/dashboard/create" className={linkClass}>
                  Create Event
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className={headingClass}>Support & Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/help" className={linkClass}>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={linkClass}>
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className={headingClass}>Stay Updated</h3>
            <p className="text-sm text-slate-400">
              Subscribe for exclusive event updates and special offers.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#9A7B2F]/60 focus-visible:ring-[#9A7B2F]/25"
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-b from-[#d4b46a] to-[#9A7B2F] font-semibold text-[#0a0e1a] hover:from-[#ddc07a] hover:to-[#a8893a]"
              >
                {isSubscribed ? 'Subscribed!' : 'Subscribe'}
              </Button>
            </form>
            {isSubscribed ? (
              <p className="text-sm text-emerald-400">Thanks for subscribing!</p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 py-6">
          <div className="grid grid-cols-1 gap-4 text-sm text-slate-400 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#d4b46a]" />
              <span>123 Event Street, New York, NY 10001</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-[#d4b46a]" />
              <a href="tel:+1234567890" className="transition-colors hover:text-[#d4b46a]">
                +1 (234) 567-890
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#d4b46a]" />
              <a
                href="mailto:support@ticket95.com"
                className="transition-colors hover:text-[#d4b46a]"
              >
                support@ticket95.com
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 md:flex-row">
          <p className="text-center text-sm text-slate-500 md:text-left">
            © {currentYear} Ticket95.com. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/accessibility" className={linkClass}>
              Accessibility
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/cookies" className={linkClass}>
              Cookie Policy
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/sitemap" className={linkClass}>
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
