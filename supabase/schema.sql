-- ============================================================================
-- SKEMA DATABASE RELASIONAL SUPABASE — SMK PRIMA UNGGUL
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor
-- ============================================================================

-- Ekstensi UUID
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABEL PROFILES (Relasi 1-to-1 ke auth.users Supabase Authentication)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  nip text,
  role text not null default 'tenaga_kependidikan'
    check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. TRIGGER OTOMATIS: User Pertama di Supabase Auth Menjadi ADMIN
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_count integer;
  assigned_role text;
  user_full_name text;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');
    if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
      assigned_role := 'tenaga_kependidikan';
    end if;
  end if;

  user_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, nip, role)
  values (
    new.id,
    new.email,
    user_full_name,
    nullif(trim(new.raw_user_meta_data->>'nip'), ''),
    assigned_role
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 3. TABEL MASTER JURUSAN (Relasi ke classes & students)
-- ============================================================================
create table if not exists public.jurusan (
  code text primary key check (code in ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text not null,
  bidang text not null,
  created_at timestamptz not null default now()
);

insert into public.jurusan (code, name, bidang) values
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Komunikasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Komunikasi'),
  ('BC', 'Broadcasting dan Perfilman', 'Seni & Industri Kreatif'),
  ('AK', 'Akuntansi', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
on conflict (code) do update
  set name = excluded.name,
      bidang = excluded.bidang;

-- ============================================================================
-- 4. TABEL MASTER KELAS (Relasi ke jurusan & wali kelas di profiles)
-- ============================================================================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tingkat text not null default 'X' check (tingkat in ('X', 'XI', 'XII')),
  jurusan_code text not null references public.jurusan(code) on update cascade on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. TABEL DATA MASTER SISWA (Relasi ke classes & jurusan)
-- ============================================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  full_name text not null,
  kelas text not null,
  jurusan text not null references public.jurusan(code) on update cascade on delete restrict,
  class_id uuid references public.classes(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger otomatis menyinkronkan kolom kelas -> tabel public.classes & class_id
create or replace function public.sync_student_class()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_class_id uuid;
  v_tingkat text;
begin
  v_tingkat := case
    when upper(trim(new.kelas)) like 'XII%' then 'XII'
    when upper(trim(new.kelas)) like 'XI%' then 'XI'
    else 'X'
  end;

  insert into public.classes (name, tingkat, jurusan_code)
  values (trim(new.kelas), v_tingkat, new.jurusan)
  on conflict (name) do update
    set jurusan_code = excluded.jurusan_code,
        tingkat = excluded.tingkat
  returning id into v_class_id;

  new.class_id := v_class_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_class on public.students;
create trigger trg_sync_student_class
  before insert or update of kelas, jurusan on public.students
  for each row execute procedure public.sync_student_class();

-- ============================================================================
-- 6. TABEL ABSENSI KARYAWAN (Relasi Many-to-One ke profiles)
-- ============================================================================
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  check_in_time timestamptz,
  check_out_time timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

-- ============================================================================
-- 7. TABEL ABSENSI SISWA (Relasi ke students, classes, & profiles pencatat)
-- ============================================================================
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  attendance_date date not null default current_date,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  notes text,
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

-- Trigger otomatis mengisi class_id pada student_attendance dari data siswa
create or replace function public.sync_attendance_class()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.class_id is null then
    select class_id into new.class_id
    from public.students
    where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_attendance_class on public.student_attendance;
create trigger trg_sync_attendance_class
  before insert or update of student_id on public.student_attendance
  for each row execute procedure public.sync_attendance_class();

-- ============================================================================
-- 8. INDEX PERFORMA QUERY RELASIONAL
-- ============================================================================
create index if not exists idx_classes_jurusan on public.classes(jurusan_code);
create index if not exists idx_students_jurusan on public.students(jurusan);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_emp_att_user_date on public.employee_attendance(user_id, attendance_date desc);
create index if not exists idx_emp_att_date on public.employee_attendance(attendance_date desc);
create index if not exists idx_stud_att_student_date on public.student_attendance(student_id, attendance_date desc);
create index if not exists idx_stud_att_date on public.student_attendance(attendance_date desc);

-- ============================================================================
-- 9. HELPER ROLE & ROW LEVEL SECURITY (RLS)
-- ============================================================================
create or replace function public.get_my_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.jurusan enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Policies: profiles
drop policy if exists "Users can view own profile or admin can view all" on public.profiles;
create policy "Users can view own profile or admin can view all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "Admin can manage profiles" on public.profiles;
create policy "Admin can manage profiles"
  on public.profiles for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Policies: jurusan & classes
drop policy if exists "Authenticated can read jurusan" on public.jurusan;
create policy "Authenticated can read jurusan"
  on public.jurusan for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can read classes" on public.classes;
create policy "Authenticated can read classes"
  on public.classes for select
  to authenticated
  using (true);

drop policy if exists "Admin can manage classes" on public.classes;
create policy "Admin can manage classes"
  on public.classes for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Policies: students
drop policy if exists "Authenticated users can view students" on public.students;
create policy "Authenticated users can view students"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Only admin can insert students" on public.students;
create policy "Only admin can insert students"
  on public.students for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

drop policy if exists "Only admin can update students" on public.students;
create policy "Only admin can update students"
  on public.students for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "Only admin can delete students" on public.students;
create policy "Only admin can delete students"
  on public.students for delete
  to authenticated
  using (public.get_my_role() = 'admin');

-- Policies: employee_attendance
drop policy if exists "View own or admin views all employee attendance" on public.employee_attendance;
create policy "View own or admin views all employee attendance"
  on public.employee_attendance for select
  to authenticated
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "Users can insert own employee attendance" on public.employee_attendance;
create policy "Users can insert own employee attendance"
  on public.employee_attendance for insert
  to authenticated
  with check (user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "Users can update own employee attendance" on public.employee_attendance;
create policy "Users can update own employee attendance"
  on public.employee_attendance for update
  to authenticated
  using (user_id = auth.uid() or public.get_my_role() = 'admin')
  with check (user_id = auth.uid() or public.get_my_role() = 'admin');

-- Policies: student_attendance
drop policy if exists "Admin and Guru can view student attendance" on public.student_attendance;
create policy "Admin and Guru can view student attendance"
  on public.student_attendance for select
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Admin and Guru can insert student attendance" on public.student_attendance;
create policy "Admin and Guru can insert student attendance"
  on public.student_attendance for insert
  to authenticated
  with check (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Admin and Guru can update student attendance" on public.student_attendance;
create policy "Admin and Guru can update student attendance"
  on public.student_attendance for update
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'))
  with check (public.get_my_role() in ('admin', 'guru'));
