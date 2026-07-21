'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase-client';
import { getUserByEmail, createUser, updateUserProfile } from './supabase-db';
import type { User } from './supabase-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, role: 'customer' | 'organizer' | 'admin') => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: { profile_name?: string; profile_description?: string; profile_logo_url?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
let hasWarnedMissingAuthProvider = false;

function missingProviderError() {
  return new Error('Auth action requires AuthProvider context');
}

const fallbackAuthContext: AuthContextType = {
  user: null,
  loading: false,
  signup: async () => {
    throw missingProviderError();
  },
  login: async () => {
    throw missingProviderError();
  },
  loginWithGoogle: async () => {
    throw missingProviderError();
  },
  logout: async () => {
    throw missingProviderError();
  },
  updateProfile: async () => {
    throw missingProviderError();
  },
  resetPassword: async () => {
    throw missingProviderError();
  },
  updatePassword: async () => {
    throw missingProviderError();
  },
  resendVerificationEmail: async () => {
    throw missingProviderError();
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const claimedGuestPurchaseUserIdsRef = useRef<Set<string>>(new Set());

  const claimGuestPurchases = useCallback(async (authUserId: string, accessToken?: string | null) => {
    if (!authUserId || !accessToken) return;
    if (claimedGuestPurchaseUserIdsRef.current.has(authUserId)) return;

    try {
      const response = await fetch('/api/guest-purchases/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to claim guest purchases');
      }

      claimedGuestPurchaseUserIdsRef.current.add(authUserId);
    } catch (error) {
      console.error('Guest purchase linking failed:', error);
    }
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    if (isInitialized) return; // Prevent multiple initializations
    
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await claimGuestPurchases(session.user.id, session.access_token);
          // Fetch full user data from our users table
          const userData = await getUserByEmail(session.user.email!);
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Handle NavigatorLockAcquireTimeoutError gracefully
        if (error instanceof Error && error.message.includes('NavigatorLockAcquireTimeoutError')) {
          console.warn('Auth lock timeout - retrying in 2 seconds...');
          setTimeout(() => {
            // Retry auth check once after timeout
            checkAuth();
          }, 2000);
        }
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only process auth state changes after initial initialization
      if (!isInitialized) return;
      
      try {
        if (session?.user) {
          await claimGuestPurchases(session.user.id, session.access_token);
          const userData = await getUserByEmail(session.user.email!);
          setUser(userData || null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change failed:', error);
        // Handle NavigatorLockAcquireTimeoutError gracefully
        if (error instanceof Error && error.message.includes('NavigatorLockAcquireTimeoutError')) {
          console.warn('Auth state change lock timeout - ignoring to prevent conflicts');
          return; // Don't update state on lock timeout to prevent conflicts
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [claimGuestPurchases, isInitialized]);

  const signup = useCallback(
    async (email: string, password: string, role: 'customer' | 'organizer' | 'admin'): Promise<User> => {
      try {
        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role, // Store role in user metadata
            },
          },
        });

        if (authError) {
          console.error('Supabase auth error:', authError);
          throw new Error(authError.message || 'Failed to create account');
        }
        
        if (!authData.user) {
          throw new Error('Sign up failed - no user returned');
        }

        await claimGuestPurchases(authData.user.id, authData.session?.access_token);

        // Check if email confirmation is required
        if (authData.session === null) {
          // Email confirmation is enabled, user needs to verify email
          throw new Error('Account created! Please check your email to verify your account before signing in.');
        }

        // If we have a session, the user is automatically logged in
        // Wait for the trigger to create the user record
        // Retry fetching the user record for up to 5 seconds
        let user: User | null = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!user && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          try {
            user = await getUserByEmail(email);
          } catch (error) {
            // Ignore errors during retry, will try again
            console.log('Retrying user fetch...', attempts + 1);
          }
          attempts++;
        }

        if (!user) {
          // If trigger didn't create user yet, ask the user to check email and retry later
          throw new Error('Account created. Please verify your email, then try signing in.');
        }

        setUser(user);
        return user;
      } catch (error) {
        console.error('Signup failed:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to create account. Please try again.');
      }
    },
    [claimGuestPurchases]
  );

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      await claimGuestPurchases(authData.user.id, authData.session?.access_token);

      const userData = await getUserByEmail(email);
      if (!userData) throw new Error('User not found');

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [claimGuestPurchases]);

  const loginWithGoogle = useCallback(async (redirectTo = '/profile') => {
    const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/profile';
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', safeRedirect);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (profile: { profile_name?: string; profile_description?: string; profile_logo_url?: string }) => {
      if (!user) throw new Error('Not authenticated');

      try {
        const updatedUser = await updateUserProfile(user.id, profile);
        setUser(updatedUser);
      } catch (error) {
        console.error('Profile update failed:', error);
        throw error;
      }
    },
    [user]
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password update failed:', error);
      throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.email) {
        throw new Error('No user session found');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Resend verification failed:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, loginWithGoogle, logout, updateProfile, resetPassword, updatePassword, resendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (!hasWarnedMissingAuthProvider) {
      hasWarnedMissingAuthProvider = true;
      console.warn('useAuth called outside AuthProvider; using fallback unauthenticated context.');
    }
    return fallbackAuthContext;
  }
  return context;
}
