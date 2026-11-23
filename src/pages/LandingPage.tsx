import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, GraduationCap, Monitor, ShieldCheck } from 'lucide-react';
import { BIDANG_KEAHLIAN, JURUSAN_LIST } from '../types/database';
import { useAuth } from '../context/AuthContext';

interface ImageSlotProps {
  src: string;
  alt: string;
  aspectClass?: string;
  fallbackTitle: string;
}

function ImageWithFallback({ src, alt, aspectClass = 'aspect-video', fallbackTitle }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-xl bg-gradient-to-br from-red-50 via-neutral-100 to-neutral-200 border border-neutral-200 flex flex-col items-center justify-center p-6 text-center`}
      >
        <Building2 className="w-8 h-8 text-red-600 mb-2" />
        <span className="text-sm font-semibold text-neutral-800">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${aspectClass} w-full h-full object-cover rounded-xl border border-neutral-200`}
    />
  );
}

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0"
          >
            <span className="w-7 h-7 rounded-md bg-red-600 text-white flex items-center justify-center text-xs font-extrabold">
              PU
            </span>
            <span>SMK Prima Unggul</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            <a
              href="#profil"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Profil
            </a>
            <a
              href="#bidang-keahlian"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Bidang Keahlian
            </a>
            <a
              href="#kompetensi"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Kompetensi
            </a>
            <a
              href="#sistem-absensi"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Sistem Absensi
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Buka Aplikasi' : 'Masuk Portal'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="profil" className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="text-xs font-semibold text-red-600 tracking-wide">
              Sekolah Menengah Kejuruan · Terakreditasi Unggul · Pendidikan Vokasi Modern
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 leading-[1.12] [text-wrap:balance]">
              Mencetak Lulusan Vokasi Siap Kerja dengan Disiplin Digital.
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl">
              SMK Prima Unggul adalah lembaga pendidikan kejuruan berbasis kompetensi industri yang
              memadukan kurikulum terapan, studio praktik modern, serta tata kelola presensi siswa
              dan karyawan secara real-time.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={user ? '/app/dashboard' : '/login'}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>{user ? 'Masuk ke Dashboard Absensi' : 'Masuk ke Sistem Absensi'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#kompetensi"
                className="inline-flex items-center px-5 py-3 text-sm font-semibold text-neutral-800 border border-neutral-200 hover:border-red-200 hover:bg-red-50/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Jelajahi 6 Jurusan
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <ImageWithFallback
              src="/src/assets/images/hero_smk_campus_1795061349449.jpg"
              alt="Gedung utama kampus SMK Prima Unggul dengan arsitektur modern bernuansa merah dan putih"
              aspectClass="aspect-video lg:aspect-auto lg:h-full lg:min-h-[380px]"
              fallbackTitle="Kampus SMK Prima Unggul"
            />
          </div>
        </div>

        {/* 4-Column Key Metric Strip below Hero Split */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 bg-neutral-50/50">
          <div className="p-6">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
              3 Bidang
            </div>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1">
              Rumpun Keahlian Vokasi Terpadu
            </div>
          </div>
          <div className="p-6">
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 tabular-nums">
              6 Jurusan
            </div>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1">
              TKJ · DKV · AK · BC · MPLB · BD
            </div>
          </div>
          <div className="p-6">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
              3 Peran
            </div>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1">
              Admin · Guru · Tenaga Kependidikan
            </div>
          </div>
          <div className="p-6">
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
              Real-Time
            </div>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1">
              Presensi Siswa &amp; Karyawan Terpusat
            </div>
          </div>
        </div>
      </section>

      {/* 3 Bidang Keahlian Utama + Media Showcase */}
      <section id="bidang-keahlian" className="border-t border-neutral-200 bg-neutral-50/70 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold text-red-600">
              Profil Akademik SMK Prima Unggul
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 [text-wrap:balance]">
              Tiga Rumpun Keahlian yang Membentuk Enam Kompetensi Unggulan
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
              Setiap program di SMK Prima Unggul dirancang bersama mitra industri untuk menjamin
              keterampilan teknis, portofolio nyata, dan kesiapan kerja lulusan.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {BIDANG_KEAHLIAN.map((bidang) => (
              <div
                key={bidang.number}
                className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-red-600">
                    {bidang.number}. Rumpun Keahlian
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">{bidang.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{bidang.summary}</p>
                </div>
                <div className="pt-4 border-t border-neutral-200 text-xs font-semibold text-neutral-800">
                  Program: {bidang.programs.join(' · ')}
                </div>
              </div>
            ))}
          </div>

          {/* 2-Column Lab & Studio Facilities */}
          <div className="grid md:grid-cols-2 gap-8 pt-4">
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 pb-0">
                <ImageWithFallback
                  src="/src/assets/images/lab_tkj_dkv_1795061349839.jpg"
                  alt="Laboratorium Teknik Komputer Jaringan dan Desain Komunikasi Visual SMK Prima Unggul"
                  aspectClass="aspect-[4/3]"
                  fallbackTitle="Laboratorium TKJ & DKV"
                />
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs text-neutral-500">
                  Fasilitas Praktik · Teknologi &amp; Desain
                </div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Laboratorium Jaringan Server &amp; Studio Desain Visual
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Mendukung pembelajaran praktik siswa TKJ dan DKV dengan perangkat workstation
                  standar industri serta ruang server terisolasi.
                </p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 pb-0">
                <ImageWithFallback
                  src="/src/assets/images/studio_bc_bisnis_1795061349268.jpg"
                  alt="Studio Broadcasting dan Ruang Bisnis Digital SMK Prima Unggul"
                  aspectClass="aspect-[4/3]"
                  fallbackTitle="Studio Broadcasting & Bisnis Digital"
                />
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs text-neutral-500">
                  Fasilitas Praktik · Penyiaran &amp; Manajemen
                </div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Studio Siaran Multi-Kamera &amp; Inkubator Bisnis Digital
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Fasilitas produksi audio-visual jurusan BC sekaligus ruang simulasi korporasi
                  modern bagi siswa AK, MPLB, dan BD.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Kompetensi Keahlian Section (Asymmetric Grid) */}
      <section id="kompetensi" className="max-w-7xl mx-auto px-6 py-16 lg:py-20 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold text-red-600">
              Kompetensi Keahlian
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Enam Jurusan Terakreditasi di SMK Prima Unggul
            </h2>
          </div>
          <div className="text-xs sm:text-sm text-neutral-500">
            TKJ · DKV · BC · AK · MPLB · BD
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {JURUSAN_LIST.map((jur, idx) => (
            <div
              key={jur.code}
              className={`border border-neutral-200 rounded-xl p-6 bg-white flex flex-col justify-between space-y-5 ${
                idx === 0 || idx === 3 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-red-600">{jur.code}</span>
                  <span className="text-neutral-500">{jur.bidang}</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{jur.name}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{jur.description}</p>
              </div>
              <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-500 leading-relaxed">
                {jur.skills}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alur Sistem Absensi Digital */}
      <section id="sistem-absensi" className="border-t border-neutral-200 bg-neutral-950 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-semibold text-red-400">
                Portal Kehadiran Terintegrasi
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
                Satu Sistem Presensi untuk Seluruh Civitas SMK Prima Unggul
              </h2>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <Link
                to={user ? '/app/dashboard' : '/login'}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>{user ? 'Buka Aplikasi Absensi' : 'Login Pegawai & Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-neutral-800 bg-neutral-900/70 rounded-xl p-6 space-y-3">
              <ShieldCheck className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-white">Administrator</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Mengelola data master siswa (NIS, nama, kelas), manajemen akun tersinkronisasi penuh
                dengan Supabase Authentication, serta melihat seluruh rekap absensi karyawan dan siswa.
              </p>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/70 rounded-xl p-6 space-y-3">
              <GraduationCap className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-white">Guru Pengajar</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Melakukan presensi mandiri sebagai karyawan, mencatat kehadiran siswa per kelas dan
                jurusan, serta memantau rekap absensi siswa secara langsung.
              </p>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/70 rounded-xl p-6 space-y-3">
              <Monitor className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-white">Tenaga Kependidikan</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Akses cepat untuk mencatat absensi masuk dan pulang secara mandiri serta memantau
                riwayat kehadiran pribadi setiap hari kerja.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>User pertama di Supabase Auth otomatis menjadi Admin</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>Hard delete user tersinkronisasi sampai ke Supabase Authentication</span>
            </span>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="font-semibold text-neutral-800">
            SMK Prima Unggul · Sistem Informasi Absensi Siswa &amp; Karyawan
          </div>
          <div className="flex items-center gap-6">
            <a href="#profil" className="hover:text-neutral-900 transition-colors">
              Profil Sekolah
            </a>
            <a href="#kompetensi" className="hover:text-neutral-900 transition-colors">
              Kompetensi Keahlian
            </a>
            <Link to="/login" className="text-red-600 font-medium hover:text-red-700">
              Portal Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
