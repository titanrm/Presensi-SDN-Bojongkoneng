import { Student, Teacher, AttendanceRecord, Holiday, SchoolProfile, GoogleSheetConfig } from '../types';
import schoolLogoImg from '../assets/images/sdn_bojongkoneng_logo_1790326789737.jpg';

const STORAGE_KEYS = {
  STUDENTS: 'sdnbk_students_v1',
  TEACHERS: 'sdnbk_teachers_v1',
  ATTENDANCE: 'sdnbk_attendance_v1',
  HOLIDAYS: 'sdnbk_holidays_v1',
  SCHOOL_PROFILE: 'sdnbk_school_profile_v1',
  SHEET_CONFIG: 'sdnbk_sheet_config_v1',
};

export const INITIAL_SCHOOL_PROFILE: SchoolProfile = {
  name: 'SD NEGERI BOJONGKONENG',
  npsn: '20206145',
  address: 'Jl. Bojongkoneng Raya No. 42, RT 03 / RW 07',
  village: 'Desa Bojongkoneng',
  district: 'Kecamatan Ngamprah',
  regency: 'Kabupaten Bandung Barat',
  province: 'Jawa Barat',
  postalCode: '40552',
  email: 'sdnbojongkoneng@disdik.bandungbaratkab.go.id',
  phone: '(022) 6862341',
  website: 'https://sdnbojongkoneng.sch.id',
  headmasterName: 'Hj. Siti Nurhasanah, S.Pd., M.M.Pd.',
  headmasterNip: '19680512 199103 2 004',
  logoUrl: schoolLogoImg,
  schoolWeek: 6, // Senin - Sabtu
  checkInStart: '06:30',
  checkInLate: '07:15',
  checkOutStart: '12:30',
};

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'GUR-001',
    nip: '19680512 199103 2 004',
    name: 'Hj. Siti Nurhasanah',
    title: 'S.Pd., M.M.Pd.',
    gender: 'P',
    role: 'Kepala Sekolah',
    phone: '081223344551',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-002',
    nip: '19750918 200501 1 008',
    name: 'Ahmad Fauzi',
    title: 'S.Pd.SD',
    gender: 'L',
    role: 'Guru Kelas 1A',
    classAssigned: '1A',
    phone: '081324567891',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-003',
    nip: '19820314 200801 2 015',
    name: 'Dewi Lestari',
    title: 'S.Pd.',
    gender: 'P',
    role: 'Guru Kelas 1B',
    classAssigned: '1B',
    phone: '085721123456',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-004',
    nip: '19801122 201001 1 012',
    name: 'Bambang Suryono',
    title: 'S.Pd.SD',
    gender: 'L',
    role: 'Guru Kelas 2A',
    classAssigned: '2A',
    phone: '081298765432',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-005',
    nip: '19870619 201101 2 009',
    name: 'Rina Handayani',
    title: 'S.Pd.',
    gender: 'P',
    role: 'Guru Kelas 3',
    classAssigned: '3',
    phone: '082123456780',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-006',
    nip: '19900824 201903 1 005',
    name: 'Agus Priyanto',
    title: 'S.Pd.Gr',
    gender: 'L',
    role: 'Guru PJOK',
    phone: '087823451122',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-007',
    nip: '19850410 201402 2 003',
    name: 'Siti Aisyah',
    title: 'S.Pd.I',
    gender: 'P',
    role: 'Guru PAI',
    phone: '081399887766',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
  {
    id: 'GUR-008',
    nip: '-',
    name: 'Hendra Gunawan',
    title: 'S.Kom',
    gender: 'L',
    role: 'Operator Dapodik & TU',
    phone: '085811223344',
    status: 'aktif',
    createdAt: '2024-01-10',
  },
];

export const INITIAL_STUDENTS: Student[] = [
  // Kelas 1A
  {
    id: 'SIS-101',
    nisn: '0165432101',
    nis: '242501001',
    name: 'Aditya Pratama Putra',
    gender: 'L',
    classId: '1A',
    parentName: 'Budi Pratama',
    parentPhone: '081234567801',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-102',
    nisn: '0165432102',
    nis: '242501002',
    name: 'Anindya Putri Salma',
    gender: 'P',
    classId: '1A',
    parentName: 'Dani Supardi',
    parentPhone: '081234567802',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-103',
    nisn: '0165432103',
    nis: '242501003',
    name: 'Dimas Ardiansyah',
    gender: 'L',
    classId: '1A',
    parentName: 'Ardi Gunawan',
    parentPhone: '081234567803',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-104',
    nisn: '0165432104',
    nis: '242501004',
    name: 'Fatimah Zahra',
    gender: 'P',
    classId: '1A',
    parentName: 'Muhammad Ridwan',
    parentPhone: '081234567804',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-105',
    nisn: '0165432105',
    nis: '242501005',
    name: 'Gilang Ramadhan',
    gender: 'L',
    classId: '1A',
    parentName: 'Agus Sobirin',
    parentPhone: '081234567805',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  // Kelas 1B
  {
    id: 'SIS-106',
    nisn: '0165432106',
    nis: '242501006',
    name: 'Hafiz Al-Fathir',
    gender: 'L',
    classId: '1B',
    parentName: 'Deden Koswara',
    parentPhone: '081234567806',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-107',
    nisn: '0165432107',
    nis: '242501007',
    name: 'Intan Nuraini',
    gender: 'P',
    classId: '1B',
    parentName: 'Asep Suhendar',
    parentPhone: '081234567807',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  {
    id: 'SIS-108',
    nisn: '0165432108',
    nis: '242501008',
    name: 'Muhammad Rizky Ramadhan',
    gender: 'L',
    classId: '1B',
    parentName: 'Rahmat Hidayat',
    parentPhone: '081234567808',
    status: 'aktif',
    createdAt: '2024-07-15',
  },
  // Kelas 2A
  {
    id: 'SIS-201',
    nisn: '0155432201',
    nis: '232402001',
    name: 'Keisha Amanda Salsabila',
    gender: 'P',
    classId: '2A',
    parentName: 'Dadang Irawan',
    parentPhone: '081234567809',
    status: 'aktif',
    createdAt: '2023-07-15',
  },
  {
    id: 'SIS-202',
    nisn: '0155432202',
    nis: '232402002',
    name: 'Luthfi Fauzan',
    gender: 'L',
    classId: '2A',
    parentName: 'Yayan Sopian',
    parentPhone: '081234567810',
    status: 'aktif',
    createdAt: '2023-07-15',
  },
  {
    id: 'SIS-203',
    nisn: '0155432203',
    nis: '232402003',
    name: 'Nabila Syakira',
    gender: 'P',
    classId: '2A',
    parentName: 'Cecep Kurnia',
    parentPhone: '081234567811',
    status: 'aktif',
    createdAt: '2023-07-15',
  },
  // Kelas 3
  {
    id: 'SIS-301',
    nisn: '0145432301',
    nis: '222303001',
    name: 'Rafi Ahmad Fauzi',
    gender: 'L',
    classId: '3',
    parentName: 'Tatang Sutisna',
    parentPhone: '081234567812',
    status: 'aktif',
    createdAt: '2022-07-15',
  },
  {
    id: 'SIS-302',
    nisn: '0145432302',
    nis: '222303002',
    name: 'Siti Sarah Nurhaliza',
    gender: 'P',
    classId: '3',
    parentName: 'Ujang Saepudin',
    parentPhone: '081234567813',
    status: 'aktif',
    createdAt: '2022-07-15',
  },
  // Kelas 4
  {
    id: 'SIS-401',
    nisn: '0135432401',
    nis: '212204001',
    name: 'Teuku Danu Dirgantara',
    gender: 'L',
    classId: '4',
    parentName: 'Iskandar',
    parentPhone: '081234567814',
    status: 'aktif',
    createdAt: '2021-07-15',
  },
  // Kelas 5
  {
    id: 'SIS-501',
    nisn: '0125432501',
    nis: '202105001',
    name: 'Vina Aulia Rahmah',
    gender: 'P',
    classId: '5',
    parentName: 'Wawan Hermawan',
    parentPhone: '081234567815',
    status: 'aktif',
    createdAt: '2020-07-15',
  },
  // Kelas 6
  {
    id: 'SIS-601',
    nisn: '0115432601',
    nis: '192006001',
    name: 'Zaki Mubarak',
    gender: 'L',
    classId: '6',
    parentName: 'Zainuddin',
    parentPhone: '081234567816',
    status: 'aktif',
    createdAt: '2019-07-15',
  },
];

export const INITIAL_HOLIDAYS: Holiday[] = [
  // 2026 / 2025 Calendar
  { id: 'HOL-001', date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'nasional' },
  { id: 'HOL-002', date: '2026-01-16', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'nasional' },
  { id: 'HOL-003', date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'nasional' },
  { id: 'HOL-004', date: '2026-03-20', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'nasional' },
  { id: 'HOL-005', date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 H (Hari 1)', type: 'nasional' },
  { id: 'HOL-006', date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 H (Hari 2)', type: 'nasional' },
  { id: 'HOL-007', date: '2026-03-23', name: 'Cuti Bersama Hari Raya Idul Fitri', type: 'nasional' },
  { id: 'HOL-008', date: '2026-03-24', name: 'Cuti Bersama Hari Raya Idul Fitri', type: 'nasional' },
  { id: 'HOL-009', date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'nasional' },
  { id: 'HOL-010', date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'nasional' },
  { id: 'HOL-011', date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'nasional' },
  { id: 'HOL-012', date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 H', type: 'nasional' },
  { id: 'HOL-013', date: '2026-05-31', name: 'Hari Raya Waisak 2570', type: 'nasional' },
  { id: 'HOL-014', date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'nasional' },
  { id: 'HOL-015', date: '2026-06-16', name: 'Tahun Baru Islam 1448 H', type: 'nasional' },
  { id: 'HOL-016', date: '2026-08-17', name: 'Hari Kemerdekaan RI ke-81', type: 'nasional' },
  { id: 'HOL-017', date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'nasional' },
  { id: 'HOL-018', date: '2026-09-21', name: 'Libur Khusus Persiapan Ujian Tengah Semester', type: 'sekolah' },
  { id: 'HOL-019', date: '2026-11-25', name: 'Peringatan Hari Guru Nasional', type: 'sekolah' },
  { id: 'HOL-020', date: '2026-12-25', name: 'Hari Raya Natal', type: 'nasional' },
];

export const INITIAL_SHEET_CONFIG: GoogleSheetConfig = {
  isConnected: false,
  autoSync: true,
  spreadsheetName: 'Database Presensi SDN Bojongkoneng',
};

// Generate realistic attendance records for today and recent days
export const generateSeedAttendance = (students: Student[], teachers: Teacher[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Format YYYY-MM-DD in local time
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dates: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // skip Sunday (day 0)
    if (d.getDay() !== 0) {
      dates.push(formatDate(d));
    }
  }

  dates.forEach((dateStr) => {
    const isToday = dateStr === formatDate(today);
    
    // Seed for Teachers
    teachers.forEach((teacher, idx) => {
      // most teachers hadir
      let status: 'hadir' | 'sakit' | 'izin' | 'alfa' = 'hadir';
      let note = '';
      if (idx === 3 && dateStr === dates[0]) {
        status = 'izin';
        note = 'Dinas Luar / Workshop Kurikulum Merdeka';
      }

      records.push({
        id: `att-t-${teacher.id}-${dateStr}`,
        targetType: 'guru',
        targetId: teacher.id,
        targetName: `${teacher.name}, ${teacher.title}`,
        targetCode: teacher.nip !== '-' ? teacher.nip : teacher.id,
        classOrRole: teacher.role,
        date: dateStr,
        type: 'harian',
        time: `06:${String(45 + (idx % 15)).padStart(2, '0')}:22`,
        status,
        note,
      });
    });

    // Seed for Students
    students.forEach((student, idx) => {
      let status: 'hadir' | 'sakit' | 'izin' | 'alfa' = 'hadir';
      let note = '';
      
      // small realistic variance
      if (idx === 2 && isToday) {
        status = 'sakit';
        note = 'Demam dan flu (Surat izin orang tua terlampir)';
      } else if (idx === 6 && dateStr === dates[1]) {
        status = 'izin';
        note = 'Acara keluarga';
      } else if (idx === 9 && dateStr === dates[2]) {
        status = 'alfa';
        note = 'Tanpa keterangan';
      }

      records.push({
        id: `att-s-${student.id}-${dateStr}`,
        targetType: 'siswa',
        targetId: student.id,
        targetName: student.name,
        targetCode: student.nisn,
        classOrRole: `Kelas ${student.classId}`,
        date: dateStr,
        type: 'harian',
        time: `06:${String(50 + (idx % 22)).padStart(2, '0')}:40`,
        status,
        note,
      });
    });
  });

  return records;
};

// Storage helper functions
export const getStudents = (): Student[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_STUDENTS;
  }
};

export const saveStudents = (students: Student[]) => {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
};

export const getTeachers = (): Teacher[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    return INITIAL_TEACHERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TEACHERS;
  }
};

export const saveTeachers = (teachers: Teacher[]) => {
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
};

export const getAttendanceRecords = (): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (!data) {
    const students = getStudents();
    const teachers = getTeachers();
    const seed = generateSeedAttendance(students, teachers);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveAttendanceRecords = (records: AttendanceRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
};

export const getHolidays = (): Holiday[] => {
  const data = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(INITIAL_HOLIDAYS));
    return INITIAL_HOLIDAYS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_HOLIDAYS;
  }
};

export const saveHolidays = (holidays: Holiday[]) => {
  localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
};

export const getSchoolProfile = (): SchoolProfile => {
  const data = localStorage.getItem(STORAGE_KEYS.SCHOOL_PROFILE);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(INITIAL_SCHOOL_PROFILE));
    return INITIAL_SCHOOL_PROFILE;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_SCHOOL_PROFILE;
  }
};

export const saveSchoolProfile = (profile: SchoolProfile) => {
  localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(profile));
};

export const getSheetConfig = (): GoogleSheetConfig => {
  const data = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(INITIAL_SHEET_CONFIG));
    return INITIAL_SHEET_CONFIG;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_SHEET_CONFIG;
  }
};

export const saveSheetConfig = (config: GoogleSheetConfig) => {
  localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
};
