export type Gender = 'L' | 'P';

export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alfa' | 'libur';

export type AttendanceType = 'harian' | 'masuk' | 'pulang';

export interface Student {
  id: string;
  nisn: string;
  nis: string;
  name: string;
  gender: Gender;
  classId: string; // '1A', '1B', '2A', '2B', '3', '4', '5', '6'
  parentName: string;
  parentPhone: string;
  photoUrl?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface Teacher {
  id: string;
  nip: string; // NIP atau NUPTK atau -
  name: string;
  gender: Gender;
  title: string; // Gelar (e.g. S.Pd., M.Pd.)
  role: string; // 'Kepala Sekolah', 'Guru Kelas 1', 'Guru PJOK', 'Guru PAI', 'Operator Dapodik', 'Staf TU'
  classAssigned?: string;
  phone: string;
  photoUrl?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  targetType: 'siswa' | 'guru';
  targetId: string;
  targetName: string;
  targetCode: string; // NISN or NIP
  classOrRole: string;
  date: string; // YYYY-MM-DD
  type: AttendanceType;
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  note?: string;
  photoProofUrl?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'nasional' | 'sekolah';
  description?: string;
}

export interface SchoolProfile {
  name: string;
  npsn: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  website?: string;
  headmasterName: string;
  headmasterNip: string;
  logoUrl: string;
  schoolWeek: 5 | 6; // 5 hari (Senin-Jumat) atau 6 hari (Senin-Sabtu)
  checkInStart: string; // '06:30'
  checkInLate: string;  // '07:15'
  checkOutStart: string;// '12:30'
}

export interface GoogleSheetConfig {
  isConnected: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  lastSyncedAt?: string;
  lastPulledAt?: string;
  autoSync: boolean;
  appsScriptUrl?: string;
}
