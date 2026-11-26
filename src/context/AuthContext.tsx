import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  apiRequest,
  ensureSupabaseClient,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';
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
  signUpFirstAdmin: (
    email: string,
    password: string,
    fullName: string,
    nip?: string
  ) => Promise<{ needsEmailConfirm: boolean }>;
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
    const client = await ensureSupabaseClient();
    const clientReady = Boolean(client);

    try {
      const status = await apiRequest<SetupStatus>('/api/auth/setup-status');
      setSetupStatus({
        configured: clientReady || Boolean(status.configured),
        hasServiceRole: Boolean(status.hasServiceRole),
        userCount: typeof status.userCount === 'number' ? status.userCount : null,
      });
    } catch {
      setSetupStatus((prev) => ({
        ...prev,
        configured: clientReady || isSupabaseConfigured,
      }));
    }
  }, []);

  const ensureAndLoadProfile = useCallback(async (activeSession: Session | null) => {
    const client = supabase || (await ensureSupabaseClient());
    if (!activeSession || !client) {
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
      const { data: directProfile, error: directErr } = await client
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
    let unsubscribe: (() => void) | null = null;

    async function init() {
      const client = await ensureSupabaseClient();
      await refreshSetupStatus();

      if (!client) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const {
        data: { session: initialSession },
      } = await client.auth.getSession();

      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession) {
        await ensureAndLoadProfile(initialSession);
      }

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession) {
          ensureAndLoadProfile(nextSession);
        } else {
          setProfile(null);
        }
      });

      unsubscribe = () => subscription.unsubscribe();

      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [ensureAndLoadProfile, refreshSetupStatus]);

  const signIn = async (email: string, password: string) => {
    const client = supabase || (await ensureSupabaseClient());
    if (!client) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    setAuthError(null);
    const { data, error } = await client.auth.signInWithPassword({
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
    const client = supabase || (await ensureSupabaseClient());
    if (!client) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    setAuthError(null);
    const { data, error } = await client.auth.signUp({
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
    const client = supabase || (await ensureSupabaseClient());
    if (client) {
      await client.auth.signOut();
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
