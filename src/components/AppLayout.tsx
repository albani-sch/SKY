import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel } from '../types/database';

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(() => location.pathname.startsWith('/app/rekap'));
  const [loggingOut, setLoggingOut] = useState(false);

  const role = profile?.role;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/app/dashboard')) return 'Dashboard';
    if (p.startsWith('/app/absensi-karyawan')) return 'Absensi Karyawan';
    if (p.startsWith('/app/absensi-siswa')) return 'Absensi Siswa';
    if (p.startsWith('/app/rekap/karyawan')) return 'Rekap Absensi Karyawan';
    if (p.startsWith('/app/rekap/siswa')) return 'Rekap Absensi Siswa';
    if (p.startsWith('/app/data-siswa')) return 'Data Siswa';
    if (p.startsWith('/app/users')) return 'User Management';
    return 'Portal Absensi';
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white'
        : 'text-neutral-700 hover:bg-red-50 hover:text-red-700'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 pl-10 pr-3.5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-700 font-semibold'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-neutral-900 font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-md bg-red-600 text-white flex items-center justify-center text-xs font-extrabold">
            PU
          </span>
          <span className="text-base">SMK Prima Unggul</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1.5">
        <NavLink
          to="/app/dashboard"
          className={navLinkClass}
          onClick={() => setMobileOpen(false)}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/app/absensi-karyawan"
          className={navLinkClass}
          onClick={() => setMobileOpen(false)}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {(role === 'admin' || role === 'guru') && (
          <NavLink
            to="/app/absensi-siswa"
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {(role === 'admin' || role === 'guru') && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setRekapOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                location.pathname.startsWith('/app/rekap')
                  ? 'bg-red-50 text-red-700'
                  : 'text-neutral-700 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              {rekapOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {rekapOpen && (
              <div className="space-y-1 pt-0.5">
                {role === 'admin' && (
                  <NavLink
                    to="/app/rekap/karyawan"
                    className={subLinkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Absensi Karyawan</span>
                  </NavLink>
                )}
                <NavLink
                  to="/app/rekap/siswa"
                  className={subLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>Absensi Siswa</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {role === 'admin' && (
          <>
            <NavLink
              to="/app/data-siswa"
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Data Siswa</span>
            </NavLink>

            <NavLink
              to="/app/users"
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-neutral-200 bg-neutral-50/70">
        <div className="text-xs font-semibold text-neutral-900 truncate">
          {profile?.full_name || 'Pengguna'}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
          <span>{role ? formatRoleLabel(role) : 'Memuat'}</span>
          {profile?.nip && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{profile.nip}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[272px] max-w-[85vw] h-full z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar with Logout on Top Right */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 truncate">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 whitespace-nowrap">
              <span>{todayFormatted}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-neutral-800">{profile?.full_name}</span>
              <span aria-hidden="true">/</span>
              <span className="text-red-700 font-medium">
                {role ? formatRoleLabel(role) : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
