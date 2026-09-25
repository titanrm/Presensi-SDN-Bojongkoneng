import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  Student,
  Teacher,
  AttendanceRecord,
  AttendanceStatus,
  Holiday,
  SchoolProfile,
} from '../types';
import { generateMonthlyRecapPdf, MONTH_NAMES_ID } from '../services/pdfReport';

interface MonthlyRecapProps {
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  schoolProfile: SchoolProfile;
  onUpdateAttendanceRecord: (record: AttendanceRecord) => void;
  onDeleteAttendanceRecord: (id: string) => void;
}

export const MonthlyRecap: React.FC<MonthlyRecapProps> = ({
  students,
  teachers,
  attendanceRecords,
  holidays,
  schoolProfile,
  onUpdateAttendanceRecord,
  onDeleteAttendanceRecord,
}) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [targetCategory, setTargetCategory] = useState<'siswa' | 'guru'>('siswa');
  const [selectedClass, setSelectedClass] = useState<string>('1A');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{
    targetId: string;
    targetName: string;
    targetCode: string;
    classOrRole: string;
    targetType: 'siswa' | 'guru';
    date: string;
    dayNumber: number;
    currentRecord?: AttendanceRecord;
    holidayName?: string;
  } | null>(null);

  // Total days in selected month
  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Pre-calculate holidays for each day
  const holidayMap = useMemo(() => {
    const map: { [day: number]: { name: string; isSunday: boolean } } = {};
    daysArray.forEach((day) => {
      const d = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = d.getDay();
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (dayOfWeek === 0) {
        map[day] = { name: 'Hari Minggu', isSunday: true };
      } else if (schoolProfile.schoolWeek === 5 && dayOfWeek === 6) {
        map[day] = { name: 'Hari Sabtu (Libur Sekolah)', isSunday: false };
      } else {
        const hol = holidays.find((h) => h.date === dateStr);
        if (hol) {
          map[day] = { name: hol.name, isSunday: false };
        }
      }
    });
    return map;
  }, [selectedYear, selectedMonth, daysArray, schoolProfile.schoolWeek, holidays]);

  // Effective learning days (excluding holidays)
  const effectiveDaysCount = useMemo(() => {
    return daysArray.filter((d) => !holidayMap[d]).length;
  }, [daysArray, holidayMap]);

  // Target list (Siswa or Guru)
  const activeTargets = useMemo(() => {
    if (targetCategory === 'siswa') {
      const filtered = selectedClass === 'all'
        ? students.filter((s) => s.status === 'aktif')
        : students.filter((s) => s.classId === selectedClass && s.status === 'aktif');
      
      return filtered.map((s) => ({
        id: s.id,
        code: s.nisn,
        name: s.name,
        gender: s.gender,
        classOrRole: `Kelas ${s.classId}`,
        type: 'siswa' as const,
      }));
    } else {
      return teachers.filter((t) => t.status === 'aktif').map((t) => ({
        id: t.id,
        code: t.nip !== '-' ? t.nip : t.id,
        name: `${t.name}, ${t.title}`,
        gender: t.gender,
        classOrRole: t.role,
        type: 'guru' as const,
      }));
    }
  }, [targetCategory, selectedClass, students, teachers]);

  // Calculate stats for each target
  const tableData = useMemo(() => {
    return activeTargets.map((target) => {
      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alfa = 0;

      const dailyRecords: { [day: number]: AttendanceRecord | undefined } = {};

      daysArray.forEach((day) => {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = attendanceRecords.find(
          (a) => a.targetId === target.id && a.date === dateStr
        );

        dailyRecords[day] = rec;

        const isHol = !!holidayMap[day];
        if (!isHol && rec) {
          if (rec.status === 'hadir') hadir++;
          else if (rec.status === 'sakit') sakit++;
          else if (rec.status === 'izin') izin++;
          else if (rec.status === 'alfa') alfa++;
        }
      });

      const percentage = effectiveDaysCount > 0 ? Math.round((hadir / effectiveDaysCount) * 100) : 0;

      return {
        target,
        dailyRecords,
        hadir,
        sakit,
        izin,
        alfa,
        percentage,
      };
    });
  }, [activeTargets, daysArray, selectedYear, selectedMonth, attendanceRecords, holidayMap, effectiveDaysCount]);

  // Export to PDF
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateMonthlyRecapPdf({
        month: selectedMonth,
        year: selectedYear,
        category: targetCategory,
        classId: selectedClass,
        students,
        teachers,
        attendance: attendanceRecords,
        holidays,
        schoolProfile,
      });
    } catch (err: any) {
      alert(`Gagal membuat PDF: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['No', targetCategory === 'siswa' ? 'NISN' : 'NIP', 'Nama', 'L/P', 'Kelas/Jabatan'];
    daysArray.forEach((d) => headers.push(`Tgl ${d}`));
    headers.push('Hadir', 'Sakit', 'Izin', 'Alfa', 'Persentase');

    const rows = tableData.map((row, idx) => {
      const dayValues = daysArray.map((d) => {
        if (holidayMap[d]) return 'L';
        const rec = row.dailyRecords[d];
        if (!rec) return '-';
        return rec.status.toUpperCase();
      });

      return [
        idx + 1,
        `"${row.target.code}"`,
        `"${row.target.name}"`,
        row.target.gender,
        `"${row.target.classOrRole}"`,
        ...dayValues,
        row.hadir,
        row.sakit,
        row.izin,
        row.alfa,
        `"${row.percentage}%"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Presensi_${MONTH_NAMES_ID[selectedMonth]}_${selectedYear}_${targetCategory}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Rekapitulasi Presensi Bulanan
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
              Dapat Diedit
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Pilih bulan, tahun, dan kelas untuk melihat atau mengedit presensi serta unduh laporan PDF resmi sekolah.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Cetak & Unduh PDF'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setTargetCategory('siswa')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                targetCategory === 'siswa' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Siswa
            </button>
            <button
              onClick={() => setTargetCategory('guru')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                targetCategory === 'guru' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Guru & GTK
            </button>
          </div>

          {/* Class Select (if Siswa) */}
          {targetCategory === 'siswa' && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
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
            </div>
          )}

          {/* Month Select */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              {MONTH_NAMES_ID.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 font-mono"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[9px]">
              H
            </span>
            Hadir
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[9px]">
              S
            </span>
            Sakit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[9px]">
              I
            </span>
            Izin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[9px]">
              A
            </span>
            Alfa
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-200 text-red-900 font-bold flex items-center justify-center text-[9px]">
              L
            </span>
            Libur
          </span>
          <span className="text-slate-400 font-medium ml-2">
            (Hari Efektif: <strong className="text-slate-800">{effectiveDaysCount} hari</strong>)
          </span>
        </div>
      </div>

      {/* Interactive Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="py-2.5 px-3 w-10 sticky left-0 z-20 bg-slate-900">No</th>
                <th className="py-2.5 px-3 text-left w-24 sticky left-10 z-20 bg-slate-900">
                  {targetCategory === 'siswa' ? 'NISN' : 'NIP'}
                </th>
                <th className="py-2.5 px-3 text-left min-w-[160px] sticky left-34 z-20 bg-slate-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.2)]">
                  Nama Lengkap
                </th>
                {daysArray.map((day) => {
                  const hol = holidayMap[day];
                  const d = new Date(selectedYear, selectedMonth, day);
                  const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

                  return (
                    <th
                      key={day}
                      title={hol ? `${hol.name}` : `Tanggal ${day}`}
                      className={`py-2 px-1 min-w-[28px] border-l border-slate-800 text-[10px] ${
                        hol ? 'bg-red-900/80 text-red-200' : 'text-slate-300'
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-[9px] opacity-75">{dayName}</div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-2 bg-emerald-950 text-emerald-300 border-l border-slate-800">H</th>
                <th className="py-2.5 px-2 bg-amber-950 text-amber-300 border-l border-slate-800">S</th>
                <th className="py-2.5 px-2 bg-sky-950 text-sky-300 border-l border-slate-800">I</th>
                <th className="py-2.5 px-2 bg-rose-950 text-rose-300 border-l border-slate-800">A</th>
                <th className="py-2.5 px-3 bg-slate-950 text-emerald-400 font-bold border-l border-slate-800">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={totalDays + 8} className="py-12 text-slate-400 text-center">
                    Tidak ada data peserta didik atau guru di kelas ini.
                  </td>
                </tr>
              ) : (
                tableData.map((row, idx) => (
                  <tr key={row.target.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-2 px-2 sticky left-0 z-10 bg-white group-hover:bg-slate-50 font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-left sticky left-10 z-10 bg-white group-hover:bg-slate-50 font-mono text-slate-600">
                      {row.target.code}
                    </td>
                    <td className="py-2 px-3 text-left sticky left-34 z-10 bg-white group-hover:bg-slate-50 font-bold text-slate-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)] truncate max-w-[180px]">
                      <div>{row.target.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{row.target.classOrRole}</div>
                    </td>

                    {/* Days */}
                    {daysArray.map((day) => {
                      const hol = holidayMap[day];
                      const rec = row.dailyRecords[day];
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                      if (hol) {
                        return (
                          <td
                            key={day}
                            title={`${hol.name}`}
                            className="py-1.5 px-1 bg-red-50 text-red-700 font-bold text-[10px] border-l border-slate-100"
                          >
                            L
                          </td>
                        );
                      }

                      let displayChar = '-';
                      let cellColor = 'text-slate-300';
                      let cellBg = '';

                      if (rec) {
                        if (rec.status === 'hadir') {
                          displayChar = 'H';
                          cellColor = 'text-emerald-700 font-bold';
                          cellBg = 'bg-emerald-50/60';
                        } else if (rec.status === 'sakit') {
                          displayChar = 'S';
                          cellColor = 'text-amber-800 font-bold';
                          cellBg = 'bg-amber-100/70';
                        } else if (rec.status === 'izin') {
                          displayChar = 'I';
                          cellColor = 'text-sky-800 font-bold';
                          cellBg = 'bg-sky-100/70';
                        } else if (rec.status === 'alfa') {
                          displayChar = 'A';
                          cellColor = 'text-rose-800 font-bold';
                          cellBg = 'bg-rose-100/70';
                        }
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => {
                            setEditingCell({
                              targetId: row.target.id,
                              targetName: row.target.name,
                              targetCode: row.target.code,
                              classOrRole: row.target.classOrRole,
                              targetType: row.target.type,
                              date: dateStr,
                              dayNumber: day,
                              currentRecord: rec,
                              holidayName: undefined,
                            });
                          }}
                          title={`Klik untuk mengedit presensi ${row.target.name} tgl ${day}`}
                          className={`py-1.5 px-1 border-l border-slate-100 cursor-pointer hover:ring-2 hover:ring-emerald-500 hover:z-20 transition text-[11px] ${cellBg} ${cellColor}`}
                        >
                          {displayChar}
                        </td>
                      );
                    })}

                    {/* Summary Counters */}
                    <td className="py-2 px-2 font-bold text-emerald-700 bg-emerald-50/40 border-l border-slate-100">
                      {row.hadir}
                    </td>
                    <td className="py-2 px-2 font-bold text-amber-700 bg-amber-50/40 border-l border-slate-100">
                      {row.sakit}
                    </td>
                    <td className="py-2 px-2 font-bold text-sky-700 bg-sky-50/40 border-l border-slate-100">
                      {row.izin}
                    </td>
                    <td className="py-2 px-2 font-bold text-rose-700 bg-rose-50/40 border-l border-slate-100">
                      {row.alfa}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 border-l border-slate-100 font-mono">
                      {row.percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Koreksi Presensi ({editingCell.date})
              </h3>
              <button
                onClick={() => setEditingCell(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Batal
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold text-slate-900">{editingCell.targetName}</p>
              <p className="text-[11px] text-slate-500 mb-4">{editingCell.classOrRole} • {editingCell.targetCode}</p>

              <label className="block text-xs font-semibold text-slate-700 mb-2">Pilih Status Baru:</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['hadir', 'sakit', 'izin', 'alfa'] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      const recId = editingCell.currentRecord?.id || `att-recap-${editingCell.targetId}-${editingCell.date}`;
                      onUpdateAttendanceRecord({
                        id: recId,
                        targetType: editingCell.targetType,
                        targetId: editingCell.targetId,
                        targetName: editingCell.targetName,
                        targetCode: editingCell.targetCode,
                        classOrRole: editingCell.classOrRole,
                        date: editingCell.date,
                        type: 'harian',
                        time: editingCell.currentRecord?.time || '07:00:00',
                        status: st,
                        note: editingCell.currentRecord?.note || '',
                      });
                      setEditingCell(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                      editingCell.currentRecord?.status === st
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        st === 'hadir'
                          ? 'bg-emerald-500'
                          : st === 'sakit'
                          ? 'bg-amber-500'
                          : st === 'izin'
                          ? 'bg-sky-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>{st}</span>
                  </button>
                ))}
              </div>

              {editingCell.currentRecord && (
                <button
                  onClick={() => {
                    onDeleteAttendanceRecord(editingCell.currentRecord!.id);
                    setEditingCell(null);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                >
                  Hapus Presensi Tanggal Ini (Reset ke Kosong)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
