import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, GraduationCap, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  EmployeeAttendance,
  formatDateID,
  formatRoleLabel,
  formatStatusLabel,
  formatTimeID,
  getTodayISO,
} from '../../types/database';

interface DashboardStats {
  todayEmployeeRecord: EmployeeAttendance | null;
  myMonthPresentCount: number;
  totalStudents: number;
  todayStudentPresent: number;
  todayStudentTotal: number;
  totalEmployees: number;
  todayEmployeePresent: number;
  recentEmployeeLogs: EmployeeAttendance[];
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayEmployeeRecord: null,
    myMonthPresentCount: 0,
    totalStudents: 0,
    todayStudentPresent: 0,
    todayStudentTotal: 0,
    totalEmployees: 0,
    todayEmployeePresent: 0,
    recentEmployeeLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = getTodayISO();

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!supabase || !profile) return;
      setLoading(true);
      setError(null);

      try {
        const monthStart = `${today.slice(0, 7)}-01`;

        const [myTodayRes, myMonthRes] = await Promise.all([
          supabase
            .from('employee_attendance')
            .select('*')
            .eq('user_id', profile.id)
            .eq('attendance_date', today)
            .maybeSingle(),
          supabase
            .from('employee_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'hadir')
            .gte('attendance_date', monthStart),
        ]);

        let totalStudents = 0;
        let todayStudentPresent = 0;
        let todayStudentTotal = 0;

        if (profile.role === 'admin' || profile.role === 'guru') {
          const [studCountRes, studAttRes] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }),
            supabase
              .from('student_attendance')
              .select('status')
              .eq('attendance_date', today),
          ]);
          totalStudents = studCountRes.count ?? 0;
          const rows = studAttRes.data || [];
          todayStudentTotal = rows.length;
          todayStudentPresent = rows.filter((r) => r.status === 'hadir').length;
        }

        let totalEmployees = 0;
        let todayEmployeePresent = 0;
        let recentEmployeeLogs: EmployeeAttendance[] = [];

        if (profile.role === 'admin') {
          const [empCountRes, empTodayRes, empLogsRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase
              .from('employee_attendance')
              .select('status')
              .eq('attendance_date', today),
            supabase
              .from('employee_attendance')
              .select('*, profiles(id, full_name, email, nip, role)')
              .order('attendance_date', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(8),
          ]);
          totalEmployees = empCountRes.count ?? 0;
          todayEmployeePresent = (empTodayRes.data || []).filter(
            (r) => r.status === 'hadir'
          ).length;
          recentEmployeeLogs = (empLogsRes.data as EmployeeAttendance[]) || [];
        } else {
          const { data: myLogs } = await supabase
            .from('employee_attendance')
            .select('*')
            .eq('user_id', profile.id)
            .order('attendance_date', { ascending: false })
            .limit(8);
          recentEmployeeLogs = (myLogs as EmployeeAttendance[]) || [];
        }

        if (active) {
          setStats({
            todayEmployeeRecord: (myTodayRes.data as EmployeeAttendance) || null,
            myMonthPresentCount: myMonthRes.count ?? 0,
            totalStudents,
            todayStudentPresent,
            todayStudentTotal,
            totalEmployees,
            todayEmployeePresent,
            recentEmployeeLogs,
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [profile, today]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Greeting & Quick Action Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-red-600">
            {formatRoleLabel(profile.role)} · {formatDateID(today)}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Selamat datang, {profile.full_name}
          </h2>
          <p className="text-sm text-neutral-600">
            {stats.todayEmployeeRecord
              ? `Status kehadiran Anda hari ini: ${formatStatusLabel(stats.todayEmployeeRecord.status)} (Masuk ${formatTimeID(stats.todayEmployeeRecord.check_in_time)}).`
              : 'Anda belum mencatat absensi karyawan hari ini.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserCheck className="w-4 h-4" />
            <span>{stats.todayEmployeeRecord ? 'Lihat Absensi Saya' : 'Absen Sekarang'}</span>
          </Link>

          {(profile.role === 'admin' || profile.role === 'guru') && (
            <Link
              to="/app/absensi-siswa"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Absensi Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>Absen Saya Hari Ini</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {loading
              ? '...'
              : stats.todayEmployeeRecord
                ? formatStatusLabel(stats.todayEmployeeRecord.status)
                : 'Belum Absen'}
          </div>
          <div className="text-xs text-neutral-500 font-mono tabular-nums">
            Masuk: {formatTimeID(stats.todayEmployeeRecord?.check_in_time ?? null)}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>Hadir Bulan Ini</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {loading ? '...' : `${stats.myMonthPresentCount} Hari`}
          </div>
          <div className="text-xs text-neutral-500">Akumulasi kehadiran pribadi</div>
        </div>

        {(profile.role === 'admin' || profile.role === 'guru') && (
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
              <span>Kehadiran Siswa Hari Ini</span>
              <GraduationCap className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 tabular-nums">
              {loading ? '...' : `${stats.todayStudentPresent} / ${stats.todayStudentTotal}`}
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              Total siswa terdaftar: {stats.totalStudents}
            </div>
          </div>
        )}

        {profile.role === 'admin' && (
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
              <span>Karyawan Hadir Hari Ini</span>
              <Users className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 tabular-nums">
              {loading ? '...' : `${stats.todayEmployeePresent} / ${stats.totalEmployees}`}
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              Total akun karyawan: {stats.totalEmployees}
            </div>
          </div>
        )}
      </div>

      {/* Recent Attendance Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {profile.role === 'admin'
                ? 'Aktivitas Absensi Karyawan Terbaru'
                : 'Riwayat Kehadiran Pribadi Terbaru'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Catatan absensi yang tersimpan di database Supabase
            </p>
          </div>
          <Link
            to={profile.role === 'admin' ? '/app/rekap/karyawan' : '/app/absensi-karyawan'}
            className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            Lihat Selengkapnya
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <th className="py-3 px-4">Tanggal</th>
                {profile.role === 'admin' && <th className="py-3 px-4">Nama Karyawan</th>}
                {profile.role === 'admin' && <th className="py-3 px-4">Role</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={profile.role === 'admin' ? 7 : 5} className="py-3.5 px-4">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : stats.recentEmployeeLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={profile.role === 'admin' ? 7 : 5}
                    className="py-8 px-4 text-center text-sm text-neutral-500"
                  >
                    Belum ada data absensi karyawan yang tercatat.
                  </td>
                </tr>
              ) : (
                stats.recentEmployeeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                      {log.attendance_date}
                    </td>
                    {profile.role === 'admin' && (
                      <td className="py-3 px-4 font-medium text-neutral-900">
                        {log.profiles?.full_name || '—'}
                      </td>
                    )}
                    {profile.role === 'admin' && (
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {log.profiles?.role ? formatRoleLabel(log.profiles.role) : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-xs font-semibold">
                      <span
                        className={
                          log.status === 'hadir'
                            ? 'text-emerald-700'
                            : log.status === 'izin'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }
                      >
                        {formatStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeID(log.check_in_time)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeID(log.check_out_time)}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600 max-w-xs truncate">
                      {log.notes || '—'}
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
