import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCheck, Save, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  AttendanceStatus,
  JURUSAN_LIST,
  Student,
  StudentAttendance,
  formatStatusLabel,
  getTodayISO,
} from '../../types/database';

interface AttendanceDraft {
  status: AttendanceStatus;
  notes: string;
}

export function StudentAttendancePage() {
  const { profile } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const [attendanceDate, setAttendanceDate] = useState(getTodayISO);
  const [jurusanFilter, setJurusanFilter] = useState<string>('ALL');
  const [selectedKelas, setSelectedKelas] = useState<string>(
    kelasParam ? decodeURIComponent(kelasParam) : 'ALL'
  );
  const [search, setSearch] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setFeedback(null);

    try {
      const [studRes, attRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .order('kelas', { ascending: true })
          .order('full_name', { ascending: true }),
        supabase
          .from('student_attendance')
          .select('*')
          .eq('attendance_date', attendanceDate),
      ]);

      if (studRes.error) throw studRes.error;
      if (attRes.error) throw attRes.error;

      const studentRows = (studRes.data as Student[]) || [];
      const attendanceRows = (attRes.data as StudentAttendance[]) || [];
      const attMap = new Map(attendanceRows.map((a) => [a.student_id, a]));

      const initialDrafts: Record<string, AttendanceDraft> = {};
      for (const s of studentRows) {
        const existing = attMap.get(s.id);
        initialDrafts[s.id] = {
          status: existing?.status || 'hadir',
          notes: existing?.notes || '',
        };
      }

      setStudents(studentRows);
      setDrafts(initialDrafts);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [attendanceDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableClasses = useMemo(() => {
    const filtered =
      jurusanFilter === 'ALL'
        ? students
        : students.filter((s) => s.jurusan === jurusanFilter);
    return Array.from(new Set(filtered.map((s) => s.kelas))).sort();
  }, [students, jurusanFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (jurusanFilter !== 'ALL' && s.jurusan !== jurusanFilter) return false;
      if (selectedKelas !== 'ALL' && s.kelas !== selectedKelas) return false;
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
  }, [students, jurusanFilter, selectedKelas, search]);

  const handleKelasChange = (nextKelas: string) => {
    setSelectedKelas(nextKelas);
    if (nextKelas === 'ALL') {
      navigate('/app/absensi-siswa', { replace: true });
    } else {
      navigate(`/app/absensi-siswa/${encodeURIComponent(nextKelas)}`, { replace: true });
    }
  };

  const updateDraftStatus = (studentId: string, status: AttendanceStatus) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || '',
      },
    }));
  };

  const updateDraftNotes = (studentId: string, notes: string) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'hadir',
        notes,
      },
    }));
  };

  const markAllPresent = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of filteredStudents) {
        next[s.id] = {
          status: 'hadir',
          notes: next[s.id]?.notes || '',
        };
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!supabase || !profile || filteredStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);

    try {
      const payload = filteredStudents.map((s) => ({
        student_id: s.id,
        recorded_by: profile.id,
        attendance_date: attendanceDate,
        status: drafts[s.id]?.status || 'hadir',
        notes: drafts[s.id]?.notes.trim() || null,
      }));

      const { error } = await supabase
        .from('student_attendance')
        .upsert(payload, { onConflict: 'student_id,attendance_date' });

      if (error) throw error;

      setFeedback({
        type: 'success',
        text: `Berhasil menyimpan absensi untuk ${payload.length} siswa pada tanggal ${attendanceDate}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label htmlFor="att-date" className="block text-xs font-semibold text-neutral-700">
              Tanggal Absensi
            </label>
            <input
              id="att-date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="jurusan-filter" className="block text-xs font-semibold text-neutral-700">
              Jurusan
            </label>
            <select
              id="jurusan-filter"
              value={jurusanFilter}
              onChange={(e) => {
                setJurusanFilter(e.target.value);
                handleKelasChange('ALL');
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
            >
              <option value="ALL">Semua Jurusan</option>
              {JURUSAN_LIST.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} — {j.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="kelas-filter" className="block text-xs font-semibold text-neutral-700">
              Kelas
            </label>
            <select
              id="kelas-filter"
              value={selectedKelas}
              onChange={(e) => handleKelasChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="search-student" className="block text-xs font-semibold text-neutral-700">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-student"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="NIS atau nama siswa..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-600 tabular-nums">
            Menampilkan <span className="font-semibold text-neutral-900">{filteredStudents.length}</span> siswa
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={markAllPresent}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Tandai Semua Hadir</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Absensi Siswa'}</span>
            </button>
          </div>
        </div>
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

      {/* Attendance Input Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-3.5 px-4">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-neutral-500">
                    {students.length === 0
                      ? 'Belum ada data siswa. Admin perlu menambahkan siswa di menu Data Siswa terlebih dahulu.'
                      : 'Tidak ada siswa yang sesuai dengan filter.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const current = drafts[student.id] || { status: 'hadir', notes: '' };
                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/60">
                      <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                        {student.nis}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                        {student.full_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-700 whitespace-nowrap">
                        {student.kelas}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-red-600">
                        {student.jurusan}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg">
                          {(['hadir', 'izin', 'sakit', 'alpa'] as AttendanceStatus[]).map(
                            (st) => {
                              const active = current.status === st;
                              const activeStyles =
                                st === 'hadir'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'izin'
                                    ? 'bg-amber-500 text-white'
                                    : st === 'sakit'
                                      ? 'bg-sky-600 text-white'
                                      : 'bg-red-600 text-white';
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateDraftStatus(student.id, st)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                    active
                                      ? activeStyles
                                      : 'text-neutral-600 hover:text-neutral-900'
                                  }`}
                                >
                                  {formatStatusLabel(st)}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[180px]">
                        <input
                          type="text"
                          value={current.notes}
                          onChange={(e) => updateDraftNotes(student.id, e.target.value)}
                          placeholder="Keterangan..."
                          className="w-full px-2.5 py-1 text-xs border border-neutral-200 rounded-md focus:outline-none focus:border-red-600"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
