import { createClient, SupabaseClient } from '@supabase/supabase-js';

const buildUrl = (import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const buildAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

function isValidSupabaseCreds(url?: string | null, key?: string | null): boolean {
  return Boolean(
    url &&
      key &&
      url.startsWith('http') &&
      !url.includes('your-project-id') &&
      !key.includes('your-supabase')
  );
}

export let isSupabaseConfigured = isValidSupabaseCreds(buildUrl, buildAnonKey);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(buildUrl!, buildAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export async function ensureSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabase && isSupabaseConfigured) {
    return supabase;
  }

  try {
    const res = await fetch('/api/public-config');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;

    const cfg = (await res.json()) as {
      configured?: boolean;
      supabaseUrl?: string | null;
      supabaseAnonKey?: string | null;
    };

    if (cfg.configured && isValidSupabaseCreds(cfg.supabaseUrl, cfg.supabaseAnonKey)) {
      isSupabaseConfigured = true;
      supabase = createClient(cfg.supabaseUrl!, cfg.supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabase;
    }
  } catch {
    return null;
  }

  return null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Endpoint ${path} tidak mengembalikan JSON (${response.status}).`);
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Permintaan gagal (${response.status})`);
  }
  return payload as T;
}
