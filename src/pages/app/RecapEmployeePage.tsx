import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AttendanceStatus,
  EmployeeAttendance,
  UserRole,
  formatRoleLabel,
  formatStatusLabel,
  formatTimeID,
  getTodayISO,
} from '../../types/database';

export function RecapEmployeePage() {
  const today = getTodayISO();
  const [startDate, setStartDate] = useState(() => `${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('employee_attendance')
        .select('*, profiles(id, full_name, email, nip, role)')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRecords((data as EmployeeAttendance[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (roleFilter !== 'ALL' && r.profiles?.role !== (roleFilter as UserRole)) return false;
      if (statusFilter !== 'ALL' && r.status !== (statusFilter as AttendanceStatus)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = r.profiles?.full_name?.toLowerCase() || '';
        const nip = r.profiles?.nip?.toLowerCase() || '';
        const email = r.profiles?.email?.toLowerCase() || '';
        return name.includes(q) || nip.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [records, roleFilter, statusFilter, search]);

  const summary = useMemo(() => {
    return {
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      alpa: filtered.filter((r) => r.status === 'alpa').length,
    };
  }, [filtered]);

  const handleExportCsv = () => {
    const header = ['Tanggal', 'NIP', 'Nama Karyawan', 'Email', 'Role', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'];
    const rows = filtered.map((r) => [
      r.attendance_date,
      r.profiles?.nip || '-',
      r.profiles?.full_name || '-',
      r.profiles?.email || '-',
      r.profiles?.role ? formatRoleLabel(r.profiles.role) : '-',
      formatStatusLabel(r.status),
      formatTimeID(r.check_in_time),
      formatTimeID(r.check_out_time),
      (r.notes || '').replace(/"/g, '""'),
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label htmlFor="start-date" className="block text-xs font-semibold text-neutral-700">
              Dari Tanggal
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="end-date" className="block text-xs font-semibold text-neutral-700">
              Sampai Tanggal
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="role-filter" className="block text-xs font-semibold text-neutral-700">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 bg-white"
            >
              <option value="ALL">Semua Role</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="status-filter" className="block text-xs font-semibold text-neutral-700">
              Status
            </label>
            <select
              id="status-filter"
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
            <label htmlFor="emp-search" className="block text-xs font-semibold text-neutral-700">
              Cari Nama / NIP
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="emp-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari karyawan..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <span className="text-neutral-600 tabular-nums">
              Hadir: <strong className="text-emerald-700">{summary.hadir}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Izin: <strong className="text-amber-700">{summary.izin}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Sakit: <strong className="text-sky-700">{summary.sakit}</strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Alpa: <strong className="text-red-700">{summary.alpa}</strong>
            </span>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
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
                    Tidak ada catatan absensi karyawan pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-800 tabular-nums whitespace-nowrap">
                      {row.attendance_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-600 tabular-nums whitespace-nowrap">
                      {row.profiles?.nip || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                      {row.profiles?.full_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600 whitespace-nowrap">
                      {row.profiles?.role ? formatRoleLabel(row.profiles.role) : '—'}
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
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeID(row.check_in_time)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeID(row.check_out_time)}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600 max-w-xs truncate">
                      {row.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
