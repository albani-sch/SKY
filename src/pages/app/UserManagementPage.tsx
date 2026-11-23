import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/supabase';
import { ManagedUser, UserRole, formatRoleLabel } from '../../types/database';

interface UserFormState {
  email: string;
  password: string;
  full_name: string;
  nip: string;
  role: UserRole;
}

const EMPTY_FORM: UserFormState = {
  email: '',
  password: '',
  full_name: '',
  nip: '',
  role: 'guru',
};

export function UserManagementPage() {
  const { session, profile, setupStatus, refreshProfile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ users: ManagedUser[] }>('/api/users', {
        token: session.access_token,
      });
      setUsers(data.users || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.',
      });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.nip || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, search]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setModalMode('create');
    setFeedback(null);
  };

  const openEditModal = (u: ManagedUser) => {
    setEditingUser(u);
    setForm({
      email: u.email,
      password: '',
      full_name: u.full_name,
      nip: u.nip || '',
      role: u.role,
    });
    setModalMode('edit');
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      if (modalMode === 'create') {
        await apiRequest('/api/users', {
          method: 'POST',
          token: session.access_token,
          body: JSON.stringify(form),
        });
        setFeedback({
          type: 'success',
          text: `User ${form.full_name} berhasil dibuat dan tersinkronisasi ke Supabase Authentication.`,
        });
      } else if (modalMode === 'edit' && editingUser) {
        await apiRequest(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          token: session.access_token,
          body: JSON.stringify(form),
        });
        setFeedback({
          type: 'success',
          text: `Data user ${form.full_name} berhasil diperbarui di database & Supabase Auth.`,
        });
        if (editingUser.id === profile?.id) {
          await refreshProfile();
        }
      }

      setModalMode(null);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data user.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHardDelete = async () => {
    if (!session?.access_token || !deletingUser) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiRequest(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        token: session.access_token,
      });
      setFeedback({
        type: 'success',
        text: `User ${deletingUser.full_name} telah dihapus permanen (hard delete) hingga ke Supabase Authentication.`,
      });
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus user.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!setupStatus.hasServiceRole && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-900">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>SUPABASE_SERVICE_ROLE_KEY belum diatur.</strong> Tambahkan key tersebut di
            Secrets / environment server agar fitur tambah, edit, dan hard delete user tersinkronisasi
            penuh dengan Supabase Authentication.
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau NIP..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
          >
            <option value="ALL">Semua Role</option>
            <option value="admin">Administrator</option>
            <option value="guru">Guru</option>
            <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={!setupStatus.hasServiceRole}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status Auth</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-3.5 px-4">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-neutral-500">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === profile?.id;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                        {u.full_name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-neutral-500">(Anda)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-700">{u.email}</td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-600 tabular-nums">
                        {u.nip || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-red-700 whitespace-nowrap">
                        {formatRoleLabel(u.role)}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 whitespace-nowrap">
                        {u.email_confirmed_at ? 'Terverifikasi' : 'Menunggu Konfirmasi'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hard delete user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                {modalMode === 'create' ? 'Tambah User Baru' : 'Edit Data User'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="budi@smkprimaunggul.sch.id"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={form.nip}
                    onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))}
                    placeholder="19900101..."
                    className="w-full px-3.5 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  {modalMode === 'create'
                    ? 'Kata Sandi'
                    : 'Kata Sandi Baru (Kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  minLength={modalMode === 'create' ? 6 : undefined}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Sinkronkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-red-700">
              Konfirmasi Hard Delete Pengguna
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Tindakan ini akan menghapus akun{' '}
              <strong className="text-neutral-900">{deletingUser.full_name}</strong> (
              {deletingUser.email}) secara permanen dari tabel profil, riwayat absensi karyawan,
              dan <strong>Supabase Authentication</strong>. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
