"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShieldCheck, Users, Star } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Professional, modern, and trustworthy hero section with event image collage
interface HeroServerProps {
  onSearch?: (query: string) => void;
}

export function HeroServer({ onSearch }: HeroServerProps) {
  // For dynamic search, this is now a client component
  const [search, setSearch] = useState('');
  const router = useRouter();
  // Optionally, you can fetch images client-side or pass as props
  // For demo, use static images or fetch on mount if needed
  const images: string[] = [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(search.trim());
      // Scroll to events section
      setTimeout(() => {
        document.querySelector('section.py-12')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (search.trim()) {
      router.push(`/events?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden border-b min-h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Collage background */}
      <div className="absolute inset-0 w-full h-full flex flex-wrap opacity-20 pointer-events-none select-none">
        {images.length > 0 ? (
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] w-full h-full">
                <Image
                  src={img!}
                  alt="Event preview"
                  fill
                  className="object-cover rounded-lg shadow-md"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 33vw"
                  priority={i < 3}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-background" />
        )}
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col items-center">
        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm">Secure & Trusted</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm">10k+ Happy Attendees</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-sm">4.9/5 Rating</span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-12 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Discover Unforgettable <span className="text-primary">Events</span> Near You
          </h1>
          <p className="mt-4 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Find, book, and experience amazing events with our secure and trusted platform.
            Join thousands of satisfied customers enjoying memorable moments.
          </p>
        </div>

        {/* Dynamic Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-2 flex">
          <Input
            type="text"
            value={search}
            onChange={handleInputChange}
            placeholder="Search events by name, location, or category..."
            className="flex-1 border-0 focus-visible:ring-0 rounded-l-lg text-lg py-6 px-6"
            aria-label="Search events"
          />
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-r-lg px-6 py-6 text-lg font-medium">
            <Search className="mr-2 h-5 w-5" /> Search
          </Button>
        </form>

        {/* Call to action buttons */}
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link href="/events" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-4 rounded-lg shadow-lg hover:bg-primary/90 transition font-semibold text-lg">
            Browse Events
          </Link>
          <Link href="/organizer/dashboard/create" className="inline-flex items-center justify-center bg-white text-primary px-8 py-4 rounded-lg shadow-lg hover:bg-gray-50 transition font-semibold text-lg border border-primary/30">
            Create Event
          </Link>
        </div>
      </div>
    </section>
  );
}
