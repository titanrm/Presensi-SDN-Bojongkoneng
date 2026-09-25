import React, { useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  ArrowUpRight,
  UserCheck,
  UserX,
  FileText,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  Student,
  Teacher,
  AttendanceRecord,
  AttendanceStatus,
  SchoolProfile,
  Holiday,
  GoogleSheetConfig,
} from '../types';

interface DashboardProps {
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  schoolProfile: SchoolProfile;
  sheetConfig: GoogleSheetConfig;
  onOpenScanner: () => void;
  onOpenGoogleSheetModal: () => void;
  onUpdateAttendanceRecord: (record: AttendanceRecord) => void;
  onDeleteAttendanceRecord: (id: string) => void;
  onBulkDeleteAttendanceRecords: (ids: string[]) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  teachers,
  attendanceRecords,
  holidays,
  schoolProfile,
  sheetConfig,
  onOpenScanner,
  onOpenGoogleSheetModal,
  onUpdateAttendanceRecord,
  onDeleteAttendanceRecord,
  onBulkDeleteAttendanceRecords,
  onNavigateTab,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'siswa' | 'guru'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing attendance modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Bulk selection of attendance records
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    ids: string[];
    description: string;
  } | null>(null);

  // Check if selectedDate is holiday
  const selectedDateObj = new Date(selectedDate);
  const dayOfWeek = selectedDateObj.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturdayHoliday = schoolProfile.schoolWeek === 5 && dayOfWeek === 6;
  const holidayInfo = holidays.find((h) => h.date === selectedDate);
  const isHoliday = isSunday || isSaturdayHoliday || !!holidayInfo;

  // Filter records for selected date (1x daily attendance without time limits)
  const dayRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Statistics calculation for selected date
  const activeStudents = useMemo(() => students.filter((s) => s.status === 'aktif'), [students]);
  const activeTeachers = useMemo(() => teachers.filter((t) => t.status === 'aktif'), [teachers]);

  const studentRecords = useMemo(() => dayRecords.filter((r) => r.targetType === 'siswa'), [dayRecords]);
  const teacherRecords = useMemo(() => dayRecords.filter((r) => r.targetType === 'guru'), [dayRecords]);

  const studentHadir = studentRecords.filter((r) => r.status === 'hadir').length;
  const studentSakit = studentRecords.filter((r) => r.status === 'sakit').length;
  const studentIzin = studentRecords.filter((r) => r.status === 'izin').length;
  const studentAlfa = studentRecords.filter((r) => r.status === 'alfa').length;
  const studentBelum = Math.max(0, activeStudents.length - studentRecords.length);

  const teacherHadir = teacherRecords.filter((r) => r.status === 'hadir').length;
  const teacherSakit = teacherRecords.filter((r) => r.status === 'sakit').length;
  const teacherIzin = teacherRecords.filter((r) => r.status === 'izin').length;
  const teacherAlfa = teacherRecords.filter((r) => r.status === 'alfa').length;
  const teacherBelum = Math.max(0, activeTeachers.length - teacherRecords.length);

  const totalTracked = dayRecords.length;
  const totalPeople = activeStudents.length + activeTeachers.length;
  const overallPercentage = totalPeople > 0 ? Math.round(((studentHadir + teacherHadir) / totalPeople) * 100) : 0;

  // Recent scans feed
  const recentFeed = useMemo(() => {
    return [...attendanceRecords]
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
      .slice(0, 8);
  }, [attendanceRecords]);

  // Combined people list for selected date
  const combinedPeopleList = useMemo(() => {
    let list: Array<{
      id: string;
      code: string;
      name: string;
      type: 'siswa' | 'guru';
      classOrRole: string;
      record?: AttendanceRecord;
    }> = [];

    if (categoryFilter === 'all' || categoryFilter === 'siswa') {
      let filteredStudents = activeStudents;
      if (classFilter !== 'all') {
        filteredStudents = filteredStudents.filter((s) => s.classId === classFilter);
      }
      filteredStudents.forEach((s) => {
        const rec = dayRecords.find((r) => r.targetId === s.id);
        list.push({
          id: s.id,
          code: s.nisn,
          name: s.name,
          type: 'siswa',
          classOrRole: `Kelas ${s.classId}`,
          record: rec,
        });
      });
    }

    if (categoryFilter === 'all' || categoryFilter === 'guru') {
      if (classFilter === 'all') {
        activeTeachers.forEach((t) => {
          const rec = dayRecords.find((r) => r.targetId === t.id);
          list.push({
            id: t.id,
            code: t.nip !== '-' ? t.nip : t.id,
            name: `${t.name}, ${t.title}`,
            type: 'guru',
            classOrRole: t.role,
            record: rec,
          });
        });
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.classOrRole.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'belum') {
        list = list.filter((p) => !p.record);
      } else {
        list = list.filter((p) => p.record?.status === statusFilter);
      }
    }

    return list;
  }, [activeStudents, activeTeachers, categoryFilter, classFilter, dayRecords, searchQuery, statusFilter]);

  // Available records for bulk selection on this date
  const availableDayRecords = useMemo(() => {
    return combinedPeopleList.filter((p) => p.record).map((p) => p.record!.id);
  }, [combinedPeopleList]);

  const allRecordsSelected =
    availableDayRecords.length > 0 &&
    availableDayRecords.every((id) => selectedRecordIds.includes(id));

  const toggleSelectAllRecords = () => {
    if (allRecordsSelected) {
      const dayRecordSet = new Set(availableDayRecords);
      setSelectedRecordIds((prev) => prev.filter((id) => !dayRecordSet.has(id)));
    } else {
      const newSet = new Set([...selectedRecordIds, ...availableDayRecords]);
      setSelectedRecordIds(Array.from(newSet));
    }
  };

  const toggleSelectOneRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const confirmAndExecuteDelete = () => {
    if (!confirmDeleteModal) return;
    if (confirmDeleteModal.ids.length === 1) {
      onDeleteAttendanceRecord(confirmDeleteModal.ids[0]);
    } else {
      onBulkDeleteAttendanceRecords(confirmDeleteModal.ids);
    }
    setSelectedRecordIds((prev) =>
      prev.filter((id) => !confirmDeleteModal.ids.includes(id))
    );
    setConfirmDeleteModal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Holiday Banner if selected date is holiday */}
      {isHoliday && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                Hari Libur / Akhir Pekan:{' '}
                {isSunday
                  ? 'Hari Minggu'
                  : isSaturdayHoliday
                  ? 'Hari Sabtu (Sekolah 5 Hari)'
                  : holidayInfo?.name}
              </h4>
              <p className="text-xs text-amber-800">
                Pada hari libur kegiatan belajar mengajar ditiadakan, presensi harian tidak dihitung sebagai ketidakhadiran (Alfa).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('holidays')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0"
          >
            Kelola Libur
          </button>
        </div>
      )}

      {/* Top Hero Banner & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main CTA Card */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              SISTEM PRESENSI REAL-TIME SD NEGERI BOJONGKONENG (1x SEHARI)
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
              Presensi Mandiri Siswa & Guru
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl">
              Scan QR Code pada ID Card pelajar dan guru 1x sehari tanpa batas waktu.
              Data otomatis tersinkronisasi 2 arah dengan Google Sheets & Drive secara real-time.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition"
            >
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>Buka Kamera Scan QR</span>
            </button>
            <button
              onClick={() => onNavigateTab('recap')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-900/80 text-white font-semibold text-xs border border-emerald-500/30 transition"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>Lihat Rekap & Download PDF</span>
            </button>
            <button
              onClick={() => onNavigateTab('id-cards')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-900/80 text-white font-semibold text-xs border border-emerald-500/30 transition"
            >
              <span>Cetak Kartu ID QR</span>
            </button>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-xl" />
        </div>

        {/* Google Sheet Status Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Basis Data Google Sheet & Drive
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  sheetConfig.isConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {sheetConfig.isConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Terhubung
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Belum Terkoneksi
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {sheetConfig.spreadsheetName || 'Presensi SDN Bojongkoneng'}
                </p>
                <p className="text-xs text-slate-500">
                  {sheetConfig.lastSyncedAt
                    ? `Sinkron: ${new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Penyimpanan lokal aktif'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {sheetConfig.spreadsheetUrl ? (
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Buka Google Sheet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs text-slate-400">Hubungkan untuk sinkronisasi cloud</span>
            )}

            <button
              onClick={onOpenGoogleSheetModal}
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              Pengaturan Sheet
            </button>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Delete Action Bar */}
      {selectedRecordIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedRecordIds.length}
            </span>
            <span className="text-xs font-bold text-rose-950">
              {selectedRecordIds.length} Data Presensi Dipilih untuk Dihapus
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedRecordIds([])}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              Batalkan Pilihan
            </button>
            <button
              onClick={() =>
                setConfirmDeleteModal({
                  isOpen: true,
                  ids: selectedRecordIds,
                  description: `${selectedRecordIds.length} data presensi terpilih pada tanggal ${selectedDate}`,
                })
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eksekusi Hapus ({selectedRecordIds.length} Data)</span>
            </button>
          </div>
        </div>
      )}

      {/* Date & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-[11px] font-semibold text-emerald-700 hover:underline ml-1"
              >
                Hari Ini
              </button>
            )}
          </div>

          {/* Category Tabs: Semua, Siswa, Guru */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => {
                setCategoryFilter('all');
                setClassFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Semua ({activeStudents.length + activeTeachers.length})
            </button>
            <button
              onClick={() => setCategoryFilter('siswa')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                categoryFilter === 'siswa' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Siswa ({activeStudents.length})
            </button>
            <button
              onClick={() => {
                setCategoryFilter('guru');
                setClassFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                categoryFilter === 'guru' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Guru & GTK ({activeTeachers.length})
            </button>
          </div>

          {/* Class Filter (if Siswa or All) */}
          {(categoryFilter === 'all' || categoryFilter === 'siswa') && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Kelas</option>
              <option value="1A">Kelas 1A</option>
              <option value="1B">Kelas 1B</option>
              <option value="2A">Kelas 2A</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="sakit">Sakit</option>
            <option value="izin">Izin</option>
            <option value="alfa">Alfa</option>
            <option value="belum">Belum Presensi</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari Nama, NISN, atau NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Summary Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Hadir */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Hadir</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {studentHadir + teacherHadir}
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa: {studentHadir} | Guru: {teacherHadir}
            </p>
          </div>
        </div>

        {/* Total Sakit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Sakit</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900">
              {studentSakit + teacherSakit}
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa: {studentSakit} | Guru: {teacherSakit}
            </p>
          </div>
        </div>

        {/* Total Izin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Izin</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-sky-900">
              {studentIzin + teacherIzin}
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa: {studentIzin} | Guru: {teacherIzin}
            </p>
          </div>
        </div>

        {/* Total Alfa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Alfa</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-900">
              {studentAlfa + teacherAlfa}
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa: {studentAlfa} | Guru: {teacherAlfa}
            </p>
          </div>
        </div>

        {/* Belum Presensi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Belum Absen</span>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-700">
              {studentBelum + teacherBelum}
            </div>
            <p className="text-[11px] text-slate-500">
              Siswa: {studentBelum} | Guru: {teacherBelum}
            </p>
          </div>
        </div>

        {/* Persentase Kehadiran */}
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">% Kehadiran</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800">{overallPercentage}%</div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Attendance List & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendance Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Presensi ({combinedPeopleList.length} Orang)
              </h3>
              <p className="text-xs text-slate-500">
                Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Presensi 1x sehari tanpa batas waktu
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allRecordsSelected}
                      onChange={toggleSelectAllRecords}
                      title="Pilih Semua Presensi Tercatat"
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-4">Nama Lengkap</th>
                  <th className="py-2.5 px-4">NISN / NIP</th>
                  <th className="py-2.5 px-4">Kelas / Jabatan</th>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedPeopleList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Tidak ada data yang cocok dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  combinedPeopleList.map((item, idx) => {
                    const rec = item.record;
                    const status = rec ? rec.status : 'belum';
                    const isChecked = rec ? selectedRecordIds.includes(rec.id) : false;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isChecked ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          {rec ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOneRecord(rec.id)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {rec?.note && (
                            <p className="text-[11px] text-amber-700 italic truncate max-w-xs">
                              Ket: {rec.note}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.code}</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {item.classOrRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {rec ? rec.time : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'sakit'
                                ? 'bg-amber-100 text-amber-800'
                                : status === 'izin'
                                ? 'bg-sky-100 text-sky-800'
                                : status === 'alfa'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {status === 'belum' ? 'Belum Absen' : status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (rec) {
                                  setEditingRecord(rec);
                                } else {
                                  // create new manual record for this person (1x sehari)
                                  setEditingRecord({
                                    id: `manual-${item.id}-${Date.now()}`,
                                    targetType: item.type,
                                    targetId: item.id,
                                    targetName: item.name,
                                    targetCode: item.code,
                                    classOrRole: item.classOrRole,
                                    date: selectedDate,
                                    type: 'harian',
                                    time: new Date().toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    }),
                                    status: 'hadir',
                                    note: '',
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Edit / Atur Presensi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {rec && (
                              <button
                                onClick={() =>
                                  setConfirmDeleteModal({
                                    isOpen: true,
                                    ids: [rec.id],
                                    description: `Presensi ${rec.targetName} (${rec.date})`,
                                  })
                                }
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                                title="Hapus Presensi Ini (Kembali Belum Absen)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Recent Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Aktivitas Scan Terkini
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Real-time</span>
          </div>

          <div className="mt-3 space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
            {recentFeed.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Belum ada aktivitas presensi.</p>
            ) : (
              recentFeed.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{rec.targetName}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span>{rec.classOrRole}</span>
                      <span>•</span>
                      <span className="font-mono">{rec.date} {rec.time}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        rec.status === 'hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'sakit'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'izin'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                    <button
                      onClick={() =>
                        setConfirmDeleteModal({
                          isOpen: true,
                          ids: [rec.id],
                          description: `Presensi ${rec.targetName} (${rec.date} ${rec.time})`,
                        })
                      }
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                      title="Batalkan/hapus presensi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Konfirmasi Eksekusi Hapus Presensi
            </h3>
            <p className="text-xs text-slate-600 text-center mb-4">
              Apakah Anda yakin ingin menghapus data{' '}
              <strong className="text-rose-700">{confirmDeleteModal.description}</strong>?
              Status kehadiran yang bersangkutan akan kembali menjadi "Belum Absen".
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAndExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition active:scale-95"
              >
                Ya, Hapus Presensi
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Atur / Koreksi Presensi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingRecord.targetName} ({editingRecord.classOrRole})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kehadiran</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['hadir', 'sakit', 'izin', 'alfa'] as AttendanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditingRecord({ ...editingRecord, status: st })}
                      className={`py-2 text-xs font-bold uppercase rounded-lg border transition ${
                        editingRecord.status === st
                          ? st === 'hadir'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'sakit'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : st === 'izin'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={editingRecord.date}
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Presensi</label>
                  <input
                    type="time"
                    step="1"
                    value={editingRecord.time}
                    onChange={(e) => setEditingRecord({ ...editingRecord, time: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Surat dokter / Dispensasi lomba..."
                  value={editingRecord.note || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    onUpdateAttendanceRecord(editingRecord);
                    setEditingRecord(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
                >
                  Simpan Perubahan
                </button>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
