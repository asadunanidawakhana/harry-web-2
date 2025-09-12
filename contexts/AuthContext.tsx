
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../services/supabase';
// FIX: In some environments, Supabase types are not correctly re-exported.
// Importing directly from `@supabase/auth-js` (the successor to `@supabase/gotrue-js`) resolves this.
// This fix also resolves the method errors (e.g., onAuthStateChange) because TypeScript
// can now correctly infer the type of the `supabase.auth` object.
import type { Session, User, AuthError } from '@supabase/auth-js';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (args: { email: string; password: string; }) => Promise<{ error: AuthError | null; }>;
  signUp: (args: { email: string; password: string; username: string; referralCode?: string }) => Promise<{ error: AuthError | null; }>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (user: User) => {
    // Join with plans table to get plan details
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(*)')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Don't throw error here, as it might crash the app on intermittent network issues
      // Just log it and maybe set profile to null
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    
    if (data) {
       // Calculate if plan is active and not expired
      let isPlanActive = false;
      if (data.plan_id && data.plan_activated_at && data.plans) {
          const activationDate = new Date(data.plan_activated_at);
          const expiryDate = new Date(activationDate);
          expiryDate.setDate(activationDate.getDate() + data.plans.validity_days);
          
          if (new Date() < expiryDate) {
              isPlanActive = true;
          }
      }
      
      const profileWithStatus: UserProfile = { 
          ...data, 
          isPlanCurrentlyActive: isPlanActive 
      };

      setProfile(profileWithStatus as UserProfile);
      setIsAdmin(data.role === 'admin');
    } else {
        // Handle case where user exists in auth but not in public.users table
        setProfile(null);
        setIsAdmin(false);
    }
  };


  useEffect(() => {
    // This timeout is a fallback, in case onAuthStateChange never fires.
    const timer = setTimeout(() => {
        if (loading) {
            console.warn("Auth state check timed out. Forcing UI to load.");
            setLoading(false);
        }
    }, 5000); // 5-second timeout is a safe fallback

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timer); // Clear the fallback timer once the listener responds.

      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser); // Update user immediately

        if (currentUser) {
            // Fetch profile in the background. The rest of the app will update when it's ready.
            fetchProfile(currentUser).catch(err => {
                console.error("Failed to fetch profile in background", err);
                // On failure, ensure profile state is cleared to avoid inconsistencies
                setProfile(null);
                setIsAdmin(false);
            });
        } else {
            setProfile(null);
            setIsAdmin(false);
        }
      } catch (e) {
         console.error("Error during auth state change:", e);
         // Reset state on error to be safe
         setUser(null);
         setProfile(null);
         setIsAdmin(false);
      } finally {
        // This is the key fix: The main app loader is hidden as soon as the auth state is known.
        // The profile information will load in asynchronously.
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      authSubscription?.unsubscribe();
    };
  }, []);


  useEffect(() => {
    // Subscribe to profile changes in realtime
    if (!user) return;

    const profileChannel = supabase
        .channel(`public:users:id=eq.${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, 
        (payload) => {
            console.log('Profile change detected, refetching profile.', payload);
            refetchProfile();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(profileChannel);
    };
  }, [user]);


  const refetchProfile = async () => {
    if (user) {
        try {
            await fetchProfile(user);
        } catch(e) {
             console.error("Refetch profile failed:", e);
        }
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string; }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  // --- DEVELOPER NOTE ---
  // The `signUp` function below is correctly configured. It passes the `username`
  // and `referral_code_used` to Supabase within the `options.data` object.
  //
  // The error "Database error saving new user" is NOT a frontend error.
  // It is a specific error message that comes from the Supabase backend when the
  // database trigger function (e.g., `handle_new_user`) fails after a user is
  // authenticated.
  //
  // This failure is almost always caused by:
  //   1. Missing columns in the `public.users` table (like `referral_code` or `referred_by`).
  //   2. An incorrect or outdated SQL trigger function.
  //
  // TO FIX THIS ERROR: The database itself must be repaired. You need to run the
  // full SQL script provided in the chat to add the missing columns and create the
  // correct trigger function in your Supabase project's SQL Editor.
  // The frontend code does not need to be changed for this fix.
  // --------------------
  const signUp = async ({ email, password, username, referralCode }: { email: string; password: string; username: string; referralCode?: string; }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          referral_code_used: referralCode, // Pass referral code for backend trigger to process
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