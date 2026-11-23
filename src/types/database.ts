export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export type JurusanCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface ManagedUser extends Profile {
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export interface JurusanRow {
  code: JurusanCode;
  name: string;
  bidang: string;
  created_at?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan_code: JurusanCode;
  wali_kelas_id: string | null;
  created_at?: string;
}

export interface Student {
  id: string;
  nis: string;
  full_name: string;
  kelas: string;
  jurusan: JurusanCode;
  class_id?: string | null;
  jurusan_ref?: JurusanRow | null;
  class_ref?: SchoolClass | null;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeAttendance {
  id: string;
  user_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'nip' | 'role'>;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  class_id?: string | null;
  recorded_by: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  students?: Student;
  recorder?: Pick<Profile, 'id' | 'full_name'>;
}

export interface JurusanInfo {
  code: JurusanCode;
  name: string;
  bidang: string;
  description: string;
  skills: string;
}

export const JURUSAN_LIST: JurusanInfo[] = [
  {
    code: 'TKJ',
    name: 'Teknik Komputer dan Jaringan',
    bidang: 'Teknologi Informasi & Komunikasi',
    description:
      'Mempersiapkan teknisi jaringan komputer, administrasi server, keamanan infrastruktur cloud, dan pemeliharaan perangkat keras bersertifikasi industri.',
    skills: 'MikroTik & Cisco · Administrasi Server Linux · Cloud & Keamanan Jaringan',
  },
  {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    bidang: 'Teknologi Informasi & Komunikasi',
    description:
      'Mengembangkan kompetensi perancangan identitas merek, ilustrasi digital, fotografi komersial, serta desain antarmuka media interaktif.',
    skills: 'Branding & Tipografi · UI/UX & Media Interaktif · Fotografi Komersial',
  },
  {
    code: 'BC',
    name: 'Broadcasting dan Perfilman',
    bidang: 'Seni & Industri Kreatif',
    description:
      'Mencetak tenaga profesional produksi program televisi, sinematografi, penyutradaraan, tata suara, dan pascaproduksi film digital.',
    skills: 'Sinematografi & Tata Cahaya · Penyiaran Multi-Kamera · Editing & Audio',
  },
  {
    code: 'AK',
    name: 'Akuntansi',
    bidang: 'Bisnis & Manajemen',
    description:
      'Membekali siswa dengan penguasaan siklus akuntansi perusahaan jasa, dagang, manufaktur, perpajakan, dan aplikasi akuntansi komputer.',
    skills: 'Laporan Keuangan PSAK · Perpajakan Terapan · Komputer Akuntansi',
  },
  {
    code: 'MPLB',
    name: 'Manajemen Perkantoran dan Layanan Bisnis',
    bidang: 'Bisnis & Manajemen',
    description:
      'Melatih keterampilan tata kelola administrasi modern, korespondensi bisnis, manajemen arsip digital, serta layanan prima korporasi.',
    skills: 'Administrasi Digital · Tata Kelola Kearsipan · Protokoler & Layanan Bisnis',
  },
  {
    code: 'BD',
    name: 'Bisnis Digital',
    bidang: 'Bisnis & Manajemen',
    description:
      'Mengasah keahlian pemasaran digital, pengelolaan e-commerce, analisis data pelanggan, serta pengembangan model bisnis rintisan.',
    skills: 'Digital Marketing & SEO · Operasional E-Commerce · Analitik Penjualan',
  },
];

export const BIDANG_KEAHLIAN = [
  {
    number: '01',
    title: 'Teknologi Informasi & Komunikasi',
    programs: ['TKJ', 'DKV'] as JurusanCode[],
    summary:
      'Memadukan rekayasa infrastruktur jaringan dengan kreativitas komunikasi visual untuk kebutuhan industri teknologi modern.',
  },
  {
    number: '02',
    title: 'Seni & Industri Kreatif',
    programs: ['BC'] as JurusanCode[],
    summary:
      'Berfokus pada produksi konten audio-visual, penyiaran siaran langsung, dan standar produksi perfilman profesional.',
  },
  {
    number: '03',
    title: 'Bisnis & Manajemen',
    programs: ['AK', 'MPLB', 'BD'] as JurusanCode[],
    summary:
      'Mencetak lulusan yang kompeten dalam akuntansi keuangan, tata kelola perkantoran modern, dan strategi perdagangan digital.',
  },
];

export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'guru':
      return 'Guru';
    case 'tenaga_kependidikan':
      return 'Tenaga Kependidikan';
  }
}

export function formatStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'hadir':
      return 'Hadir';
    case 'izin':
      return 'Izin';
    case 'sakit':
      return 'Sakit';
    case 'alpa':
      return 'Alpa';
  }
}

export function getTodayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
}

export function formatTimeID(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
