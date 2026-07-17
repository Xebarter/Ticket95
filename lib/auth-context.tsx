import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './db';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: 'customer' | 'organizer') => Promise<void>;
  logout: () => void;
  updateProfile: (profile: { name: string; description?: string; logo?: string }) => Promise<void>;
  isAdmin: () => boolean;
  isOrganizer: () => boolean;
  isCustomer: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from session storage
  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('current_user') : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { hashPassword, verifyPassword } = await import('./auth');
    const { getUserByEmail } = await import('./db');

    const existingUser = getUserByEmail(email);
    if (!existingUser || !(await verifyPassword(password, existingUser.passwordHash))) {
      throw new Error('Invalid email or password');
    }

    setUser(existingUser);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_user', JSON.stringify(existingUser));
    }
  };

  const signup = async (email: string, password: string, role: 'customer' | 'organizer') => {
    const { hashPassword } = await import('./auth');
    const { getUserByEmail, createUser } = await import('./db');

    if (getUserByEmail(email)) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const newUser = createUser(email, passwordHash, role);

    setUser(newUser);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('current_user');
    }
  };

  const updateProfile = async (profile: { name: string; description?: string; logo?: string }) => {
    if (!user) throw new Error('No user logged in');
    const { updateUserProfile } = await import('./db');
    const updatedUser = updateUserProfile(user.id, profile);
    if (updatedUser) {
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isOrganizer = () => user?.role === 'organizer';
  const isCustomer = () => user?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        isAdmin,
        isOrganizer,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
