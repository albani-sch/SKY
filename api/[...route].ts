import express, { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnvVal(val?: string): string {
  return (val || '').trim().replace(/^["']|["']$/g, '');
}

function getSupabaseEnv() {
  const url = cleanEnvVal(
    process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const anonKey = cleanEnvVal(
    process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const serviceRoleKey = cleanEnvVal(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return { url, anonKey, serviceRoleKey };
}

function getAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAnonClient(accessToken?: string): SupabaseClient | null {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function requireAdmin(req: Request, res: Response) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.',
    });
    return null;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
    return null;
  }

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
    return null;
  }

  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();

  if (profileErr || !profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Fitur ini khusus Administrator.' });
    return null;
  }

  return { adminClient, caller: userData.user, profile };
}

const app = express();
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  res.json({
    ok: true,
    configured: Boolean(url && anonKey),
    supabaseUrlSet: Boolean(url),
    hasAnon: Boolean(anonKey),
    hasServiceRole: Boolean(serviceRoleKey),
  });
});

app.get('/api/public-config', (_req: Request, res: Response) => {
  const { url, anonKey } = getSupabaseEnv();
  const valid = Boolean(
    url && anonKey && url.startsWith('http') && !url.includes('your-project-id')
  );
  res.json({
    configured: valid,
    supabaseUrl: valid ? url : null,
    supabaseAnonKey: valid ? anonKey : null,
  });
});

app.get('/api/db/status', async (_req: Request, res: Response) => {
  const { url, anonKey } = getSupabaseEnv();
  const tableNames = [
    'profiles',
    'jurusan',
    'classes',
    'students',
    'employee_attendance',
    'student_attendance',
  ] as const;

  if (!url || !anonKey) {
    res.json({
      configured: false,
      connected: false,
      tables: tableNames.map((name) => ({ name, exists: false, count: null })),
    });
    return;
  }

  const client = getAdminClient() || getAnonClient();
  if (!client) {
    res.json({
      configured: false,
      connected: false,
      tables: tableNames.map((name) => ({ name, exists: false, count: null })),
    });
    return;
  }

  const results = await Promise.all(
    tableNames.map(async (name) => {
      const { count, error } = await client
        .from(name)
        .select('*', { count: 'exact', head: true });
      if (error) {
        return { name, exists: false, count: null, error: error.message };
      }
      return { name, exists: true, count: count ?? 0 };
    })
  );

  const anyExists = results.some((t) => t.exists);
  res.json({
    configured: true,
    connected: anyExists,
    tables: results,
  });
});

app.get('/api/auth/setup-status', async (_req: Request, res: Response) => {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    res.json({ configured: false, hasServiceRole: false, userCount: null });
    return;
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    res.json({ configured: true, hasServiceRole: false, userCount: null });
    return;
  }

  try {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 2 });
    if (error) {
      res.json({ configured: true, hasServiceRole: true, userCount: null });
      return;
    }
    res.json({
      configured: true,
      hasServiceRole: true,
      userCount: data.users.length,
    });
  } catch {
    res.json({ configured: true, hasServiceRole: Boolean(serviceRoleKey), userCount: null });
  }
});

app.post('/api/auth/register-first-admin', async (req: Request, res: Response) => {
  const adminClient = getAdminClient();
  if (!adminClient) {
    res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.',
    });
    return;
  }

  const { email, password, full_name, nip } = req.body || {};
  if (!email || !password || !full_name) {
    res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    return;
  }

  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (listErr) {
    res.status(500).json({ error: listErr.message });
    return;
  }

  if ((listData?.users?.length ?? 0) > 0) {
    res.status(403).json({
      error:
        'Akun Administrator pertama sudah terdaftar. Silakan masuk melalui tab Login atau hubungi Admin.',
    });
    return;
  }

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: String(email).trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: {
      full_name: String(full_name).trim(),
      nip: nip ? String(nip).trim() : null,
      role: 'admin',
    },
  });

  if (createErr || !created.user) {
    res.status(400).json({ error: createErr?.message || 'Gagal membuat akun admin.' });
    return;
  }

  const { error: profErr } = await adminClient.from('profiles').upsert({
    id: created.user.id,
    email: created.user.email || String(email).trim(),
    full_name: String(full_name).trim(),
    nip: nip ? String(nip).trim() : null,
    role: 'admin',
  });

  if (profErr) {
    res.status(500).json({ error: profErr.message });
    return;
  }

  res.status(201).json({ ok: true });
});

app.post('/api/auth/ensure-profile', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi diperlukan.' });
    return;
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    const anonClient = getAnonClient(token);
    if (!anonClient) {
      res.status(503).json({ error: 'Konfigurasi Supabase belum lengkap.' });
      return;
    }
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData.user) {
      res.status(401).json({ error: 'Token tidak valid.' });
      return;
    }
    const { data: existingProfile } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (existingProfile) {
      res.json({ profile: existingProfile });
      return;
    }

    const { data: rpcProfile, error: rpcErr } = await anonClient.rpc('ensure_my_profile');
    if (!rpcErr && rpcProfile) {
      res.json({ profile: rpcProfile });
      return;
    }

    res.status(404).json({
      error:
        'Profil belum tersedia dan SUPABASE_SERVICE_ROLE_KEY belum disetel. Pastikan SQL schema terbaru di supabase/schema.sql sudah dijalankan.',
    });
    return;
  }

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Sesi pengguna tidak valid.' });
    return;
  }

  const authUser = userData.user;

  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingProfile) {
    res.json({ profile: existingProfile });
    return;
  }

  const { count: profileCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  let isFirstUser = (profileCount ?? 0) === 0;
  if (!isFirstUser) {
    const { data: authList } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authList?.users?.length) {
      const sorted = [...authList.users].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      if (sorted[0]?.id === authUser.id) {
        isFirstUser = true;
      }
    }
  }

  const rawRole = authUser.user_metadata?.role;
  const validRoles = ['admin', 'guru', 'tenaga_kependidikan'];
  const assignedRole = isFirstUser
    ? 'admin'
    : validRoles.includes(rawRole)
      ? rawRole
      : 'tenaga_kependidikan';

  const fullName =
    (authUser.user_metadata?.full_name as string)?.trim() ||
    authUser.email?.split('@')[0] ||
    'Pengguna';

  const { data: createdProfile, error: insertErr } = await adminClient
    .from('profiles')
    .upsert({
      id: authUser.id,
      email: authUser.email || '',
      full_name: fullName,
      nip: (authUser.user_metadata?.nip as string) || null,
      role: assignedRole,
    })
    .select('*')
    .single();

  if (insertErr) {
    res.status(500).json({ error: insertErr.message });
    return;
  }

  res.json({ profile: createdProfile });
});

app.get('/api/users', async (req: Request, res: Response) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { adminClient } = auth;
  const { data: authList, error: authErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authErr) {
    res.status(500).json({ error: authErr.message });
    return;
  }

  const { data: profiles, error: profErr } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (profErr) {
    res.status(500).json({ error: profErr.message });
    return;
  }

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const combined = (authList?.users || []).map((u) => {
    const prof = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email || prof?.email || '',
      full_name: prof?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || '-',
      nip: prof?.nip || u.user_metadata?.nip || null,
      role: prof?.role || u.user_metadata?.role || 'tenaga_kependidikan',
      email_confirmed_at: u.email_confirmed_at || null,
      last_sign_in_at: u.last_sign_in_at || null,
      created_at: u.created_at,
    };
  });

  res.json({ users: combined });
});

app.post('/api/users', async (req: Request, res: Response) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { adminClient } = auth;
  const { email, password, full_name, nip, role } = req.body || {};

  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: 'Email, password, nama lengkap, dan role wajib diisi.' });
    return;
  }

  if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
    res.status(400).json({ error: 'Role tidak valid.' });
    return;
  }

  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password minimal 6 karakter.' });
    return;
  }

  const { data: createdAuth, error: createErr } = await adminClient.auth.admin.createUser({
    email: String(email).trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: {
      full_name: String(full_name).trim(),
      nip: nip ? String(nip).trim() : null,
      role,
    },
  });

  if (createErr || !createdAuth.user) {
    res.status(400).json({ error: createErr?.message || 'Gagal membuat user di Supabase Auth.' });
    return;
  }

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .upsert({
      id: createdAuth.user.id,
      email: createdAuth.user.email || String(email).trim(),
      full_name: String(full_name).trim(),
      nip: nip ? String(nip).trim() : null,
      role,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (profErr) {
    res.status(500).json({ error: profErr.message });
    return;
  }

  res.status(201).json({
    user: {
      ...profile,
      email_confirmed_at: createdAuth.user.email_confirmed_at || null,
      last_sign_in_at: createdAuth.user.last_sign_in_at || null,
    },
  });
});

app.patch('/api/users/:id', async (req: Request, res: Response) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { adminClient } = auth;
  const { id } = req.params;
  const { email, password, full_name, nip, role } = req.body || {};

  if (!email || !full_name || !role) {
    res.status(400).json({ error: 'Email, nama lengkap, dan role wajib diisi.' });
    return;
  }

  if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
    res.status(400).json({ error: 'Role tidak valid.' });
    return;
  }

  const authUpdatePayload: {
    email: string;
    password?: string;
    email_confirm: boolean;
    user_metadata: Record<string, unknown>;
  } = {
    email: String(email).trim(),
    email_confirm: true,
    user_metadata: {
      full_name: String(full_name).trim(),
      nip: nip ? String(nip).trim() : null,
      role,
    },
  };

  if (password && String(password).trim().length > 0) {
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }
    authUpdatePayload.password = String(password);
  }

  const { data: updatedAuth, error: authErr } = await adminClient.auth.admin.updateUserById(
    id,
    authUpdatePayload
  );

  if (authErr || !updatedAuth.user) {
    res.status(400).json({ error: authErr?.message || 'Gagal memperbarui user di Supabase Auth.' });
    return;
  }

  const { data: updatedProfile, error: profErr } = await adminClient
    .from('profiles')
    .upsert({
      id,
      email: String(email).trim(),
      full_name: String(full_name).trim(),
      nip: nip ? String(nip).trim() : null,
      role,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (profErr) {
    res.status(500).json({ error: profErr.message });
    return;
  }

  res.json({ user: updatedProfile });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { adminClient, caller } = auth;
  const { id } = req.params;

  if (id === caller.id) {
    res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    return;
  }

  const { error: profErr } = await adminClient.from('profiles').delete().eq('id', id);
  if (profErr) {
    res.status(500).json({ error: profErr.message });
    return;
  }

  const { error: authErr } = await adminClient.auth.admin.deleteUser(id, false);
  if (authErr) {
    res.status(500).json({
      error: `Profil dihapus, namun gagal menghapus dari Supabase Auth: ${authErr.message}`,
    });
    return;
  }

  res.json({ success: true, deletedId: id });
});

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
