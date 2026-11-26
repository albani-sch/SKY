import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SupabaseSetupNotice } from '../components/SupabaseSetupNotice';

export function LoginPage() {
  const { user, profile, loading, profileLoading, setupStatus, signIn, signUpFirstAdmin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !profileLoading && user && profile) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [loading, profileLoading, user, profile, navigate]);

  useEffect(() => {
    if (setupStatus.userCount === 0) {
      setMode('register');
    }
  }, [setupStatus.userCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/app/dashboard', { replace: true });
      } else {
        if (!fullName.trim()) {
          throw new Error('Nama lengkap wajib diisi.');
        }
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter.');
        }
        const res = await signUpFirstAdmin(email, password, fullName, nip);
        if (res.needsEmailConfirm) {
          setSuccessMsg(
            'Akun berhasil dibuat. Silakan cek kotak masuk email Anda untuk konfirmasi sebelum masuk.'
          );
          setMode('login');
        } else {
          navigate('/app/dashboard', { replace: true });
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Autentikasi gagal.';
      const lower = raw.toLowerCase();
      if (lower.includes('invalid login credentials')) {
        setError(
          'Email atau kata sandi salah, atau akun belum terdaftar. Jika belum punya akun, daftar terlebih dahulu di tab "Daftar Akun Pertama" atau buat user melalui Supabase Authentication.'
        );
      } else if (lower.includes('email not confirmed')) {
        setError(
          'Email belum dikonfirmasi di Supabase Authentication. Buka link konfirmasi pada inbox email Anda atau konfirmasi user secara manual di Supabase Dashboard → Authentication → Users.'
        );
      } else if (lower.includes('user already registered')) {
        setError(
          'Email tersebut sudah terdaftar di Supabase Authentication. Silakan masuk melalui tab "Masuk (Login)".'
        );
      } else {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <span className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center text-[11px] font-extrabold">
            PU
          </span>
          <span>SMK Prima Unggul</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className={setupStatus.configured ? 'w-full max-w-xl space-y-6' : 'w-full max-w-3xl space-y-6'}>
          {!setupStatus.configured ? (
            <SupabaseSetupNotice />
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-red-600">
                  Portal Sistem Absensi · SMK Prima Unggul
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {mode === 'login' ? 'Masuk ke Aplikasi Absensi' : 'Registrasi Akun Pertama (Admin)'}
                </h1>
                <p className="text-sm text-neutral-600">
                  {mode === 'login'
                    ? 'Gunakan email dan kata sandi yang terdaftar pada Supabase Authentication.'
                    : 'Akun pertama yang dibuat di Supabase Authentication otomatis ditetapkan sebagai Administrator.'}
                </p>
              </div>

              {(setupStatus.userCount === 0 || setupStatus.userCount === null) && (
                <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Masuk (Login)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Daftar Akun Pertama
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 font-medium">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="fullName" className="block text-xs font-semibold text-neutral-700">
                        Nama Lengkap
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="fullName"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Contoh: Drs. Ahmad Fauzi, M.Pd"
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="nip" className="block text-xs font-semibold text-neutral-700">
                        NIP / ID Karyawan (Opsional)
                      </label>
                      <input
                        id="nip"
                        type="text"
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        placeholder="198504122010011008"
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-neutral-700">
                    Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@smkprimaunggul.sch.id"
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-neutral-700">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-11 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Memproses...'
                    : mode === 'login'
                      ? 'Masuk ke Aplikasi'
                      : 'Buat Akun Administrator'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
