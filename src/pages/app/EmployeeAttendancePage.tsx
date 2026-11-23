import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogIn, LogOut as LogOutIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  AttendanceStatus,
  EmployeeAttendance,
  formatDateID,
  formatRoleLabel,
  formatStatusLabel,
  formatTimeID,
  getTodayISO,
} from '../../types/database';

export function EmployeeAttendancePage() {
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [history, setHistory] = useState<EmployeeAttendance[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'hadir' | 'izin' | 'sakit'>('hadir');
  const [notes, setNotes] = useState('');
  const [monthFilter, setMonthFilter] = useState(() => getTodayISO().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const today = getTodayISO();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!supabase || !profile) return;
    setLoading(true);
    try {
      const monthStart = `${monthFilter}-01`;
      const [y, m] = monthFilter.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const monthEnd = `${monthFilter}-${String(lastDay).padStart(2, '0')}`;

      const [todayRes, historyRes] = await Promise.all([
        supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', profile.id)
          .eq('attendance_date', today)
          .maybeSingle(),
        supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', profile.id)
          .gte('attendance_date', monthStart)
          .lte('attendance_date', monthEnd)
          .order('attendance_date', { ascending: false }),
      ]);

      if (todayRes.error) throw todayRes.error;
      if (historyRes.error) throw historyRes.error;

      setTodayRecord((todayRes.data as EmployeeAttendance) || null);
      setHistory((historyRes.data as EmployeeAttendance[]) || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat riwayat absensi.',
      });
    } finally {
      setLoading(false);
    }
  }, [profile, today, monthFilter]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const currentIso = new Date().toISOString();
      const { error } = await supabase.from('employee_attendance').upsert(
        {
          user_id: profile.id,
          attendance_date: today,
          status: selectedStatus,
          check_in_time: selectedStatus === 'hadir' ? currentIso : null,
          notes: notes.trim() || null,
        },
        { onConflict: 'user_id,attendance_date' }
      );

      if (error) throw error;
      setFeedback({
        type: 'success',
        text: `Kehadiran (${formatStatusLabel(selectedStatus)}) berhasil dicatat untuk hari ini.`,
      });
      setNotes('');
      await loadAttendance();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!supabase || !profile || !todayRecord) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('employee_attendance')
        .update({
          check_out_time: new Date().toISOString(),
        })
        .eq('id', todayRecord.id);

      if (error) throw error;
      setFeedback({
        type: 'success',
        text: 'Jam pulang berhasil dicatat.',
      });
      await loadAttendance();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mencatat jam pulang.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusText = (status: AttendanceStatus) => {
    const color =
      status === 'hadir'
        ? 'text-emerald-700'
        : status === 'izin'
          ? 'text-amber-700'
          : 'text-red-700';
    return <span className={`font-semibold ${color}`}>{formatStatusLabel(status)}</span>;
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Self-Attendance Action Card */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-red-600">
                Presensi Mandiri Karyawan
              </div>
              <h2 className="text-lg font-bold text-neutral-900">{profile.full_name}</h2>
              <div className="text-xs text-neutral-500">
                {formatRoleLabel(profile.role)}
                {profile.nip ? ` · NIP ${profile.nip}` : ''}
              </div>
            </div>
            <Clock className="w-5 h-5 text-red-600 shrink-0" />
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-500">{formatDateID(today)}</div>
              <div className="text-2xl font-mono font-bold text-neutral-900 tabular-nums mt-0.5">
                {now.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-neutral-500">Status Hari Ini</div>
              <div className="font-bold text-neutral-900 mt-0.5">
                {todayRecord ? formatStatusLabel(todayRecord.status) : 'Belum Tercatat'}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-lg text-xs sm:text-sm font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {!todayRecord ? (
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Pilih Status Kehadiran
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-lg">
                  {(['hadir', 'izin', 'sakit'] as const).map((statusOption) => (
                    <button
                      key={statusOption}
                      type="button"
                      onClick={() => setSelectedStatus(statusOption)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        selectedStatus === statusOption
                          ? 'bg-red-600 text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {formatStatusLabel(statusOption)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notes" className="block text-xs font-semibold text-neutral-700">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Hadir tepat waktu / izin keperluan dinas..."
                  className="w-full px-3.5 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Menyimpan...'
                    : selectedStatus === 'hadir'
                      ? 'Catat Absen Masuk'
                      : `Kirim Keterangan ${formatStatusLabel(selectedStatus)}`}
                </span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="border border-neutral-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Status</span>
                  {renderStatusText(todayRecord.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Jam Masuk</span>
                  <span className="font-mono text-neutral-900 tabular-nums">
                    {formatTimeID(todayRecord.check_in_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Jam Pulang</span>
                  <span className="font-mono text-neutral-900 tabular-nums">
                    {formatTimeID(todayRecord.check_out_time)}
                  </span>
                </div>
                {todayRecord.notes && (
                  <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                    Catatan: {todayRecord.notes}
                  </div>
                )}
              </div>

              {todayRecord.status === 'hadir' && !todayRecord.check_out_time ? (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Catat Absen Pulang'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Presensi Anda untuk hari ini telah selesai dicatat.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal Attendance History Table */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Riwayat Absensi Pribadi</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Filter berdasarkan bulan kalender
              </p>
            </div>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Masuk</th>
                  <th className="py-3 px-4">Pulang</th>
                  <th className="py-3 px-4">Catatan</th>
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
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-neutral-500">
                      Belum ada catatan kehadiran pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-neutral-800 tabular-nums whitespace-nowrap">
                        {row.attendance_date}
                      </td>
                      <td className="py-3 px-4 text-xs">{renderStatusText(row.status)}</td>
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
    </div>
  );
}
