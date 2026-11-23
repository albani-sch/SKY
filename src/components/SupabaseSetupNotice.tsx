import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Database, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/supabase';

interface TableStatus {
  name: string;
  exists: boolean;
  count: number | null;
}

interface DbStatusResponse {
  configured: boolean;
  connected: boolean;
  tables: TableStatus[];
}

const RELATION_MAP = [
  {
    table: 'profiles',
    pk: 'id (uuid)',
    fk: 'id → auth.users(id) ON DELETE CASCADE',
    desc: 'Menyimpan role (admin, guru, tenaga_kependidikan) dan NIP tersinkronisasi ke Supabase Auth.',
  },
  {
    table: 'jurusan',
    pk: 'code (text)',
    fk: '— (Master 6 Jurusan)',
    desc: 'Referensi resmi kompetensi keahlian: TKJ, DKV, BC, AK, MPLB, BD.',
  },
  {
    table: 'classes',
    pk: 'id (uuid)',
    fk: 'jurusan_code → jurusan(code), wali_kelas_id → profiles(id)',
    desc: 'Master kelas per tingkat (X, XI, XII) yang terhubung ke jurusan dan wali kelas.',
  },
  {
    table: 'students',
    pk: 'id (uuid)',
    fk: 'jurusan → jurusan(code), class_id → classes(id)',
    desc: 'Data master siswa (NIS unik, nama lengkap, kelas, dan jurusan).',
  },
  {
    table: 'employee_attendance',
    pk: 'id (uuid)',
    fk: 'user_id → profiles(id) ON DELETE CASCADE',
    desc: 'Rekaman absensi masuk/pulang mandiri seluruh karyawan (unique per user per tanggal).',
  },
  {
    table: 'student_attendance',
    pk: 'id (uuid)',
    fk: 'student_id → students(id), class_id → classes(id), recorded_by → profiles(id)',
    desc: 'Rekaman absensi harian siswa yang dicatat oleh guru atau admin.',
  },
];

export function SupabaseSetupNotice() {
  const [sqlText, setSqlText] = useState<string>('');
  const [loadingSql, setLoadingSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  const checkDbStatus = async () => {
    setCheckingDb(true);
    try {
      const data = await apiRequest<DbStatusResponse>('/api/db/status');
      setDbStatus(data);
    } catch {
      setDbStatus(null);
    } finally {
      setCheckingDb(false);
    }
  };

  useEffect(() => {
    checkDbStatus();
  }, []);

  const handleLoadSchema = async () => {
    if (sqlText) {
      setShowSql((prev) => !prev);
      return;
    }
    setLoadingSql(true);
    try {
      const data = await apiRequest<{ sql: string }>('/api/schema');
      setSqlText(data.sql);
      setShowSql(true);
    } catch {
      setSqlText('-- Buka file /supabase/schema.sql di repositori proyek.');
      setShowSql(true);
    } finally {
      setLoadingSql(false);
    }
  };

  const handleCopy = async () => {
    let text = sqlText;
    if (!text) {
      try {
        const data = await apiRequest<{ sql: string }>('/api/schema');
        text = data.sql;
        setSqlText(data.sql);
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusMap = new Map((dbStatus?.tables || []).map((t) => [t.name, t]));

  return (
    <div className="border border-neutral-200 bg-white rounded-xl p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-neutral-900">
              Skema Database Relasional Supabase
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Aplikasi menggunakan 6 tabel relasional PostgreSQL yang terhubung langsung ke{' '}
              <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                auth.users
              </code>{' '}
              Supabase Authentication melalui foreign key dan trigger otomatis.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkDbStatus}
          disabled={checkingDb}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
          <span>Cek Koneksi</span>
        </button>
      </div>

      {/* Environment Variable Requirements */}
      <div className="border-t border-neutral-200 pt-5 space-y-2">
        <p className="text-xs font-semibold text-neutral-900">
          01. Konfigurasi Variabel Lingkungan (Secrets / .env)
        </p>
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 font-mono text-xs text-neutral-800 space-y-1.5 overflow-x-auto">
          <div>VITE_SUPABASE_URL=&quot;https://project-ref.supabase.co&quot;</div>
          <div>VITE_SUPABASE_ANON_KEY=&quot;eyJ...&quot;</div>
          <div>SUPABASE_SERVICE_ROLE_KEY=&quot;eyJ...&quot;</div>
        </div>
      </div>

      {/* Relational Table Blueprint + Live Verification */}
      <div className="border-t border-neutral-200 pt-5 space-y-3">
        <p className="text-xs font-semibold text-neutral-900">
          02. Arsitektur Tabel &amp; Relasi Foreign Key
        </p>
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="py-2.5 px-3">Tabel</th>
                  <th className="py-2.5 px-3">Relasi Foreign Key</th>
                  <th className="py-2.5 px-3">Status Supabase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {RELATION_MAP.map((item) => {
                  const st = statusMap.get(item.table);
                  return (
                    <tr key={item.table}>
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-mono font-semibold text-neutral-900">
                          public.{item.table}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">PK: {item.pk}</div>
                      </td>
                      <td className="py-2.5 px-3 align-top text-neutral-700">
                        <div className="font-mono text-[11px] text-red-700">{item.fk}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</div>
                      </td>
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        {!dbStatus?.configured ? (
                          <span className="text-neutral-500">Menunggu env</span>
                        ) : st?.exists ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif ({st.count} baris)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Belum dimigrasi</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SQL Migration Viewer */}
      <div className="border-t border-neutral-200 pt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-neutral-900">
            03. Migrasi SQL di Supabase SQL Editor
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'SQL Tersalin' : 'Salin schema.sql'}</span>
            </button>
            <button
              type="button"
              onClick={handleLoadSchema}
              disabled={loadingSql}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingSql
                ? 'Memuat SQL...'
                : showSql
                  ? 'Sembunyikan SQL'
                  : 'Lihat Script SQL'}
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Supabase SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {showSql && sqlText && (
          <div className="relative border border-neutral-200 rounded-lg bg-neutral-950 text-neutral-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900">
              <span className="font-mono text-xs text-neutral-400">supabase/schema.sql</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-200 hover:text-white cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
              {sqlText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
