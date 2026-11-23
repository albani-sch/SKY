import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AttendanceStatus,
  JURUSAN_LIST,
  StudentAttendance,
  formatStatusLabel,
  getTodayISO,
} from '../../types/database';

export function RecapStudentPage() {
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const today = getTodayISO();
  const [startDate, setStartDate] = useState(() => `${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [jurusanFilter, setJurusanFilter] = useState('ALL');
  const [kelasFilter, setKelasFilter] = useState(
    kelasParam ? decodeURIComponent(kelasParam) : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'logs' | 'summary'>('logs');

  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kelasParam) {
      setKelasFilter(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadRecords = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('student_attendance')
        .select('*, students(*), recorder:profiles(id, full_name)')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRecords((data as StudentAttendance[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.students?.kelas) {
        if (jurusanFilter === 'ALL' || r.students.jurusan === jurusanFilter) {
          set.add(r.students.kelas);
        }
      }
    }
    return Array.from(set).sort();
  }, [records, jurusanFilter]);

  const handleKelasChange = (nextKelas: string) => {
    setKelasFilter(nextKelas);
    if (nextKelas === 'ALL') {
      navigate('/app/rekap/siswa', { replace: true });
    } else {
      navigate(`/app/rekap/siswa/${encodeURIComponent(nextKelas)}`, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (jurusanFilter !== 'ALL' && r.students?.jurusan !== jurusanFilter) return false;
      if (kelasFilter !== 'ALL' && r.students?.kelas !== kelasFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== (statusFilter as AttendanceStatus)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = r.students?.full_name?.toLowerCase() || '';
        const nis = r.students?.nis?.toLowerCase() || '';
        const cls = r.students?.kelas?.toLowerCase() || '';
        return name.includes(q) || nis.includes(q) || cls.includes(q);
      }
      return true;
    });
  }, [records, jurusanFilter, kelasFilter, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      alpa: filtered.filter((r) => r.status === 'alpa').length,
    };
  }, [filtered]);

  const perStudentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        nis: string;
        full_name: string;
        kelas: string;
        jurusan: string;
        hadir: number;
        izin: number;
        sakit: number;
        alpa: number;
        total: number;
      }
    >();

    for (const r of filtered) {
      if (!r.students) continue;
      const existing = map.get(r.student_id) || {
        nis: r.students.nis,
        full_name: r.students.full_name,
        kelas: r.students.kelas,
        jurusan: r.students.jurusan,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        total: 0,
      };
      existing[r.status] += 1;
      existing.total += 1;
      map.set(r.student_id, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.kelas.localeCompare(b.kelas) || a.full_name.localeCompare(b.full_name));
  }, [filtered]);

  const handleExportCsv = () => {
    if (viewMode === 'logs') {
      const header = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Dicatat Oleh', 'Catatan'];
      const rows = filtered.map((r) => [
        r.attendance_date,
        r.students?.nis || '-',
        r.students?.full_name || '-',
        r.students?.kelas || '-',
        r.students?.jurusan || '-',
        formatStatusLabel(r.status),
        r.recorder?.full_name || '-',
        (r.notes || '').replace(/"/g, '""'),
      ]);
      const csvContent =
        '\uFEFF' +
        [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const header = ['NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total Pertemuan', 'Persentase Hadir'];
      const rows = perStudentSummary.map((s) => {
        const pct = s.total > 0 ? Math.round((s.hadir / s.total) * 100) : 0;
        return [s.nis, s.full_name, s.kelas, s.jurusan, s.hadir, s.izin, s.sakit, s.alpa, s.total, `${pct}%`];
      });
      const csvContent =
        '\uFEFF' +
        [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ringkasan-absensi-siswa-${startDate}-sd-${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label htmlFor="s-start" className="block text-xs font-semibold text-neutral-700">
              Dari Tanggal
            </label>
            <input
              id="s-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="s-end" className="block text-xs font-semibold text-neutral-700">
              Sampai Tanggal
            </label>
            <input
              id="s-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="s-jur" className="block text-xs font-semibold text-neutral-700">
              Jurusan
            </label>
            <select
              id="s-jur"
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
                  {j.code}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-kelas" className="block text-xs font-semibold text-neutral-700">
              Kelas
            </label>
            <select
              id="s-kelas"
              value={kelasFilter}
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
            <label htmlFor="s-status" className="block text-xs font-semibold text-neutral-700">
              Status
            </label>
            <select
              id="s-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-search" className="block text-xs font-semibold text-neutral-700">
              Cari NIS / Nama
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="s-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <span className="text-neutral-600 tabular-nums">
              Hadir: <strong className="text-emerald-700">{counts.hadir}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Izin: <strong className="text-amber-700">{counts.izin}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Sakit: <strong className="text-sky-700">{counts.sakit}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Alpa: <strong className="text-red-700">{counts.alpa}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('logs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'logs'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Log Harian
              </button>
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'summary'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Ringkasan Siswa
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'logs' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Jurusan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dicatat Oleh</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="py-3.5 px-4">
                        <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-4 text-center text-sm text-neutral-500">
                      Belum ada data rekap absensi siswa pada rentang filter ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-neutral-800 tabular-nums whitespace-nowrap">
                        {row.attendance_date}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                        {row.students?.nis || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                        {row.students?.full_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-700 whitespace-nowrap">
                        {row.students?.kelas || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-red-600">
                        {row.students?.jurusan || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <span
                          className={
                            row.status === 'hadir'
                              ? 'text-emerald-700'
                              : row.status === 'izin'
                                ? 'text-amber-700'
                                : row.status === 'sakit'
                                  ? 'text-sky-700'
                                  : 'text-red-700'
                          }
                        >
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 whitespace-nowrap">
                        {row.recorder?.full_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 max-w-xs truncate">
                        {row.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Jurusan</th>
                  <th className="py-3 px-4 text-right">Hadir</th>
                  <th className="py-3 px-4 text-right">Izin</th>
                  <th className="py-3 px-4 text-right">Sakit</th>
                  <th className="py-3 px-4 text-right">Alpa</th>
                  <th className="py-3 px-4 text-right">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="py-3.5 px-4">
                        <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : perStudentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 px-4 text-center text-sm text-neutral-500">
                      Belum ada data ringkasan siswa.
                    </td>
                  </tr>
                ) : (
                  perStudentSummary.map((row) => {
                    const pct = row.total > 0 ? Math.round((row.hadir / row.total) * 100) : 0;
                    return (
                      <tr key={row.nis} className="hover:bg-neutral-50/70">
                        <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                          {row.nis}
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-900">{row.full_name}</td>
                        <td className="py-3 px-4 text-xs text-neutral-700">{row.kelas}</td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-red-600">
                          {row.jurusan}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-emerald-700 tabular-nums">
                          {row.hadir}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-amber-700 tabular-nums">
                          {row.izin}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-sky-700 tabular-nums">
                          {row.sakit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-red-700 tabular-nums">
                          {row.alpa}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold text-neutral-900 tabular-nums">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
