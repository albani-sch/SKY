import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JURUSAN_LIST, JurusanCode, Student } from '../../types/database';

interface StudentFormState {
  nis: string;
  full_name: string;
  kelas: string;
  jurusan: JurusanCode;
}

const EMPTY_FORM: StudentFormState = {
  nis: '',
  full_name: '',
  kelas: '',
  jurusan: 'TKJ',
};

export function StudentsPage() {
  const { id: studentIdParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState('ALL');

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from('students')
        .select('*, jurusan_ref:jurusan(code, name, bidang), class_ref:classes(id, name, tingkat)')
        .order('kelas', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) {
        const fallback = await supabase
          .from('students')
          .select('*')
          .order('kelas', { ascending: true })
          .order('full_name', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setStudents((data as Student[]) || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Support dynamic route /app/data-siswa/:id
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const found = students.find((s) => s.id === studentIdParam);
      if (found) {
        setEditingStudent(found);
        setForm({
          nis: found.nis,
          full_name: found.full_name,
          kelas: found.kelas,
          jurusan: found.jurusan,
        });
        setModalMode('edit');
      }
    }
  }, [studentIdParam, students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (jurusanFilter !== 'ALL' && s.jurusan !== jurusanFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, jurusanFilter, search]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditingStudent(null);
    setModalMode('create');
    setFeedback(null);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setForm({
      nis: student.nis,
      full_name: student.full_name,
      kelas: student.kelas,
      jurusan: student.jurusan,
    });
    setModalMode('edit');
    navigate(`/app/data-siswa/${student.id}`, { replace: true });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingStudent(null);
    if (studentIdParam) {
      navigate('/app/data-siswa', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        nis: form.nis.trim(),
        full_name: form.full_name.trim(),
        kelas: form.kelas.trim(),
        jurusan: form.jurusan,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'create') {
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
        setFeedback({ type: 'success', text: `Siswa ${payload.full_name} berhasil ditambahkan.` });
      } else if (modalMode === 'edit' && editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id);
        if (error) throw error;
        setFeedback({ type: 'success', text: `Data siswa ${payload.full_name} diperbarui.` });
      }

      closeModal();
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !deletingStudent) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await supabase.from('students').delete().eq('id', deletingStudent.id);
      if (error) throw error;
      setFeedback({
        type: 'success',
        text: `Data siswa ${deletingStudent.full_name} berhasil dihapus.`,
      });
      setDeletingStudent(null);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIS, nama, atau kelas..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <select
            value={jurusanFilter}
            onChange={(e) => setJurusanFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
          >
            <option value="ALL">Semua Jurusan</option>
            {JURUSAN_LIST.map((j) => (
              <option key={j.code} value={j.code}>
                {j.code} — {j.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa</span>
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
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-3.5 px-4">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-sm text-neutral-500">
                    {students.length === 0
                      ? 'Belum ada data siswa. Klik "Tambah Siswa" untuk mulai mengisi data.'
                      : 'Tidak ada siswa yang sesuai pencarian.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {student.nis}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900">{student.full_name}</td>
                    <td className="py-3 px-4 text-xs text-neutral-700">{student.kelas}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-red-600">
                      {student.jurusan}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                          title="Edit siswa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(student)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Hapus siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                {modalMode === 'create' ? 'Tambah Data Siswa' : 'Edit Data Siswa'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">NIS</label>
                <input
                  type="text"
                  required
                  value={form.nis}
                  onChange={(e) => setForm((f) => ({ ...f, nis: e.target.value }))}
                  placeholder="Contoh: 20261001"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Contoh: Siti Rahmawati"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700">Jurusan</label>
                  <select
                    value={form.jurusan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jurusan: e.target.value as JurusanCode }))
                    }
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700">Kelas</label>
                  <input
                    type="text"
                    required
                    value={form.kelas}
                    onChange={(e) => setForm((f) => ({ ...f, kelas: e.target.value }))}
                    placeholder="Contoh: X TKJ 1"
                    className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Hapus Data Siswa</h3>
            <p className="text-sm text-neutral-600">
              Apakah Anda yakin ingin menghapus data siswa{' '}
              <strong className="text-neutral-900">{deletingStudent.full_name}</strong> (NIS{' '}
              <span className="font-mono">{deletingStudent.nis}</span>)? Riwayat absensi siswa ini
              juga akan terhapus.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
