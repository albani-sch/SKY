import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { apiRequest, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface SetupStatus {
  configured: boolean;
  hasServiceRole: boolean;
  userCount: number | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setupStatus: SetupStatus;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpFirstAdmin: (email: string, password: string, fullName: string, nip?: string) => Promise<{ needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    configured: isSupabaseConfigured,
    hasServiceRole: false,
    userCount: null,
  });

  const refreshSetupStatus = useCallback(async () => {
    try {
      const status = await apiRequest<SetupStatus>('/api/auth/setup-status');
      setSetupStatus({
        configured: isSupabaseConfigured && status.configured,
        hasServiceRole: status.hasServiceRole,
        userCount: status.userCount,
      });
    } catch {
      setSetupStatus((prev) => ({ ...prev, configured: isSupabaseConfigured }));
    }
  }, []);

  const ensureAndLoadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession || !supabase) {
      setProfile(null);
      return;
    }

    try {
      setAuthError(null);
      const data = await apiRequest<{ profile: Profile }>('/api/auth/ensure-profile', {
        method: 'POST',
        token: activeSession.access_token,
      });
      setProfile(data.profile);
    } catch (err) {
      // Fallback: try reading directly from profiles table via RLS
      const { data: directProfile, error: directErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeSession.user.id)
        .maybeSingle();

      if (directProfile) {
        setProfile(directProfile as Profile);
      } else {
        const message =
          directErr?.message ||
          (err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
        setAuthError(message);
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await refreshSetupStatus();

      if (!supabase) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession) {
        await ensureAndLoadProfile(initialSession);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    init();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession) {
        ensureAndLoadProfile(nextSession);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureAndLoadProfile, refreshSetupStatus]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (data.session) {
      await ensureAndLoadProfile(data.session);
    }
  };

  const signUpFirstAdmin = async (
    email: string,
    password: string,
    fullName: string,
    nip?: string
  ) => {
    if (!supabase) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          nip: nip?.trim() || null,
        },
      },
    });
    if (error) {
      throw new Error(error.message);
    }
    if (data.session) {
      await ensureAndLoadProfile(data.session);
      await refreshSetupStatus();
      return { needsEmailConfirm: false };
    }
    await refreshSetupStatus();
    return { needsEmailConfirm: true };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await ensureAndLoadProfile(session);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        setupStatus,
        authError,
        signIn,
        signUpFirstAdmin,
        signOut,
        refreshProfile,
        refreshSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
