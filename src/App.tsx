import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { SupabaseSetupNotice } from './components/SupabaseSetupNotice';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/app/DashboardPage';
import { EmployeeAttendancePage } from './pages/app/EmployeeAttendancePage';
import { StudentAttendancePage } from './pages/app/StudentAttendancePage';
import { RecapEmployeePage } from './pages/app/RecapEmployeePage';
import { RecapStudentPage } from './pages/app/RecapStudentPage';
import { StudentsPage } from './pages/app/StudentsPage';
import { UserManagementPage } from './pages/app/UserManagementPage';
import { UserRole } from './types/database';

function ProtectedApp({ children }: { children: React.ReactNode }) {
  const {
    user,
    profile,
    loading,
    profileLoading,
    setupStatus,
    authError,
    signOut,
    refreshProfile,
  } = useAuth();

  if (loading || (user && profileLoading && !profile)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-neutral-600">Memuat sesi &amp; profil aplikasi...</div>
      </div>
    );
  }

  if (!setupStatus.configured) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <SupabaseSetupNotice />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-900">
                Profil Pengguna Belum Tersedia di Tabel Relasional
              </h2>
              <p className="text-sm text-neutral-600">
                {authError ||
                  'Pastikan skema SQL terbaru di supabase/schema.sql sudah dijalankan pada proyek Supabase Anda.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refreshProfile()}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Muat Ulang Profil
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Keluar &amp; Coba Lagi
              </button>
            </div>
          </div>
          <SupabaseSetupNotice />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  if (!profile) return null;
  if (!allowed.includes(profile.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedApp>
                <AppLayout />
              </ProtectedApp>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />

            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />
            <Route
              path="absensi-siswa/:kelas"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowed={['admin']}>
                  <RecapEmployeePage />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <RecapStudentPage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa/:kelas"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <RecapStudentPage />
                </RoleGuard>
              }
            />

            <Route
              path="data-siswa"
              element={
                <RoleGuard allowed={['admin']}>
                  <StudentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa/:id"
              element={
                <RoleGuard allowed={['admin']}>
                  <StudentsPage />
                </RoleGuard>
              }
            />

            <Route
              path="users"
              element={
                <RoleGuard allowed={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
