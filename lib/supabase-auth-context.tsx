'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from './supabase/browser';
import { getUserByEmail, updateUserProfile } from './supabase-db';
import { setOAuthRedirectCookie } from './auth-redirect';
import type { User } from './supabase-client';

const supabase = getSupabaseBrowserClient();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, role: 'customer' | 'organizer' | 'admin') => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: {
    profile_name?: string;
    profile_description?: string;
    profile_logo_url?: string;
  }) => Promise<void>;
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
  const claimedGuestPurchaseUserIdsRef = useRef<Set<string>>(new Set());
  const userRef = useRef<User | null>(null);
  const signingOutRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const claimGuestPurchases = useCallback(async (authUserId: string, accessToken?: string | null) => {
    if (!authUserId) return;
    if (claimedGuestPurchaseUserIdsRef.current.has(authUserId)) return;

    try {
      const headers: HeadersInit = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/guest-purchases/claim', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      // Mark attempted either way so auth refresh loops don't spam failed claims.
      claimedGuestPurchaseUserIdsRef.current.add(authUserId);

      if (response.status === 401) {
        // Session may not be ready yet; linking also runs on login/signup/callback.
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.warn(
          'Guest purchase linking skipped:',
          payload?.error || `HTTP ${response.status}`
        );
      }
    } catch (error) {
      claimedGuestPurchaseUserIdsRef.current.add(authUserId);
      console.warn('Guest purchase linking skipped:', error);
    }
  }, []);

  const syncSessionUser = useCallback(async (accessToken?: string | null) => {
    if (!accessToken) return null;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      return (payload?.user as User | undefined) || null;
    } catch (error) {
      console.error('Session sync failed:', error);
      return null;
    }
  }, []);

  const resolveAppUser = useCallback(
    async (email: string | null | undefined, accessToken?: string | null) => {
      // Always refresh the httpOnly app cookie while Supabase session is valid.
      const synced = await syncSessionUser(accessToken);
      if (synced) return synced;

      if (email) {
        try {
          return await getUserByEmail(email);
        } catch {
          // Fall through
        }
      }

      return null;
    },
    [syncSessionUser]
  );

  const applyAuthenticatedSession = useCallback(
    async (session: { user: { id: string; email?: string | null }; access_token: string }) => {
      // Establish app cookie first so claim can fall back to session auth.
      const userData = await resolveAppUser(session.user.email, session.access_token);
      await claimGuestPurchases(session.user.id, session.access_token);
      if (userData) {
        setUser(userData);
        return userData;
      }
      // Keep existing user if sync briefly fails — do not force sign-out.
      return userRef.current;
    },
    [claimGuestPurchases, resolveAppUser]
  );

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          await applyAuthenticatedSession(session);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (error instanceof Error && error.message.includes('NavigatorLockAcquireTimeoutError')) {
          console.warn('Auth lock timeout - retrying in 2 seconds...');
          window.setTimeout(() => {
            void checkAuth();
          }, 2000);
          return;
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Avoid clearing UI auth on transient events / token refresh noise.
      void (async () => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          if (signingOutRef.current) {
            setUser(null);
            return;
          }

          // Unexpected sign-out (e.g. another tab). Try to recover first.
          try {
            const {
              data: { session: recovered },
            } = await supabase.auth.getSession();
            if (recovered?.user) {
              await applyAuthenticatedSession(recovered);
              return;
            }
          } catch {
            // fall through
          }

          setUser(null);
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
          return;
        }

        if (
          (event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED' ||
            event === 'INITIAL_SESSION') &&
          session?.user
        ) {
          try {
            await applyAuthenticatedSession(session);
          } catch (error) {
            console.error('Auth state change failed:', error);
          }
        }
      })();
    });

    const refreshWhileActive = () => {
      void (async () => {
        if (document.visibilityState !== 'visible') return;
        if (signingOutRef.current) return;
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            await applyAuthenticatedSession(session);
          }
        } catch (error) {
          console.error('Session keep-alive failed:', error);
        }
      })();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshWhileActive();
    };

    window.addEventListener('focus', refreshWhileActive);
    document.addEventListener('visibilitychange', onVisibility);
    const keepAliveId = window.setInterval(refreshWhileActive, 1000 * 60 * 30);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', refreshWhileActive);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(keepAliveId);
    };
  }, [applyAuthenticatedSession]);

  const signup = useCallback(
    async (email: string, password: string, role: 'customer' | 'organizer' | 'admin'): Promise<User> => {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
            },
          },
        });

        if (authError) {
          console.error('Supabase auth error:', authError);
          throw new Error('Unable to continue. Please try again.');
        }

        if (!authData.user) {
          throw new Error('Unable to continue. Please try again.');
        }

        if (authData.session === null) {
          throw new Error('Email verification is required. Please check your email and then continue.');
        }

        const userData = await applyAuthenticatedSession(authData.session);
        if (!userData) {
          throw new Error('Your profile is not ready yet. Please try again in a moment.');
        }

        return userData;
      } catch (error) {
        console.error('Signup failed:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unable to continue. Please try again.');
      }
    },
    [applyAuthenticatedSession]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          const msg = (authError.message || '').toLowerCase();
          const looksLikeMissingUser =
            authError.code === 'invalid_grant' ||
            msg.includes('invalid login credentials') ||
            msg.includes('user not found') ||
            msg.includes('no user');

          if (looksLikeMissingUser) {
            return await signup(email, password, 'customer');
          }

          throw authError;
        }

        if (!authData.session) {
          throw new Error('Unable to sign you in right now. Please try again.');
        }

        const userData = await applyAuthenticatedSession(authData.session);
        if (!userData) {
          throw new Error('Unable to sign you in right now. Please try again.');
        }

        return userData;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    [applyAuthenticatedSession, signup]
  );

  const loginWithGoogle = useCallback(async (redirectTo = '/profile') => {
    const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/profile';
    setOAuthRedirectCookie(safeRedirect);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    signingOutRef.current = true;
    try {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  const updateProfile = useCallback(
    async (profile: {
      profile_name?: string;
      profile_description?: string;
      profile_logo_url?: string;
    }) => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
      }}
    >
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
