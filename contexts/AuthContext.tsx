import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (args: { email: string; password: string; }) => Promise<{ error: AuthError | null; }>;
  signUp: (args: { email: string; password: string; username: string; }) => Promise<{ error: AuthError | null; }>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
            await fetchProfile(session.user);
        } catch (e) {
            console.error("Initial profile fetch failed:", e);
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
            await fetchProfile(session.user);
        } catch (e) {
            console.error("Profile fetch on auth state change failed:", e);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // This is a critical change. By throwing an error, we allow calling functions
      // (like handleClaimReward) to catch it and handle the UI state correctly,
      // preventing silent failures and inconsistent UI.
      throw new Error(`Could not fetch user profile: ${error.message}`);
    }
    
    if (data) {
      setProfile(data as UserProfile);
      setIsAdmin(data.role === 'admin');
    } else {
      // This case should ideally not happen if there's no error, but as a safeguard:
      throw new Error("User profile data not found.");
    }
  };

  const refetchProfile = async () => {
    if (user) {
        await fetchProfile(user);
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string; }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async ({ email, password, username }: { email: string; password: string; username: string; }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    profile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
