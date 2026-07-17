'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, LogIn, Plus } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

export function HeaderClient() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <header className="sticky top-0 z-50 border-b border-border/40 bg-card/95 backdrop-blur-xl shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4 sm:py-5 gap-4">
                    <BrandLogo
                        size="md"
                        priority
                        className="[&_img]:transition-transform [&_img]:hover:scale-105"
                    />

                    {/* Right Section - User Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {user ? (
                            <>
                                <Link href="/organizer/dashboard/create">
                                    <Button size="sm" className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm shadow-sm">
                                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                                        <span className="hidden sm:inline">Create Event</span>
                                        <span className="sm:hidden">Create</span>
                                    </Button>
                                </Link>

                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-muted/50 transition-colors"
                                    aria-label="Go to profile"
                                >
                                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-primary/10">
                                        <AvatarImage src="/placeholder-user.jpg" />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                                            {(user?.profile_name?.charAt(0) || 'U').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden md:block text-left leading-tight">
                                        <p className="text-xs font-semibold max-w-[140px] truncate">
                                            {user.profile_name || 'Account'}
                                        </p>
                                        {(user.role === 'admin' || user.role === 'organizer') && (
                                            <p className="text-[10px] text-muted-foreground">
                                                {user.role === 'admin' ? 'Administrator' : 'Organizer'}
                                            </p>
                                        )}
                                    </div>
                                </Link>

                                {user.role === 'admin' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 sm:h-9 w-8 sm:w-9 px-0"
                                        onClick={() => router.push('/admin')}
                                        aria-label="Admin"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="h-8 sm:h-9 w-8 sm:w-9 px-0"
                                    aria-label="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
                                        <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline text-xs sm:text-sm">Sign In</span>
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm" className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm shadow-lg">
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
