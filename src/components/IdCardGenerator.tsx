import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Printer,
  Download,
  Filter,
  User,
  CheckCircle2,
  GraduationCap,
  Users,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Student, Teacher, SchoolProfile } from '../types';
import { generateQrCodeDataUrl, generateQrDataString } from '../services/qr';

interface IdCardGeneratorProps {
  students: Student[];
  teachers: Teacher[];
  schoolProfile: SchoolProfile;
  preselectedTarget?: Student | Teacher | null;
}

export const IdCardGenerator: React.FC<IdCardGeneratorProps> = ({
  students,
  teachers,
  schoolProfile,
  preselectedTarget,
}) => {
  const [targetType, setTargetType] = useState<'siswa' | 'guru'>('siswa');
  const [selectedClass, setSelectedClass] = useState<string>('1A');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');

  // Cache generated QR data URLs: { [id: string]: string }
  const [qrMap, setQrMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (preselectedTarget) {
      const isStudent = 'nisn' in preselectedTarget;
      setTargetType(isStudent ? 'siswa' : 'guru');
      if (isStudent) {
        setSelectedClass((preselectedTarget as Student).classId);
      }
      setSelectedPersonId(preselectedTarget.id);
      setPrintMode('single');
    } else {
      if (students.length > 0 && !selectedPersonId) {
        setSelectedPersonId(students[0].id);
      }
    }
  }, [preselectedTarget, students]);

  // Determine list of targets to render
  const targetList: Array<{
    id: string;
    code: string;
    subCode?: string;
    name: string;
    roleOrClass: string;
    gender: string;
    type: 'siswa' | 'guru';
  }> = [];

  if (targetType === 'siswa') {
    const list = selectedClass === 'all'
      ? students.filter((s) => s.status === 'aktif')
      : students.filter((s) => s.classId === selectedClass && s.status === 'aktif');

    list.forEach((s) => {
      targetList.push({
        id: s.id,
        code: s.nisn,
        subCode: s.nis,
        name: s.name,
        roleOrClass: `Kelas ${s.classId}`,
        gender: s.gender,
        type: 'siswa',
      });
    });
  } else {
    teachers.filter((t) => t.status === 'aktif').forEach((t) => {
      targetList.push({
        id: t.id,
        code: t.nip !== '-' ? t.nip : t.id,
        subCode: t.role,
        name: `${t.name}, ${t.title}`,
        roleOrClass: t.role,
        gender: t.gender,
        type: 'guru',
      });
    });
  }

  // Generate QR for all items in target list
  useEffect(() => {
    const generateAllQrs = async () => {
      const newMap: { [id: string]: string } = { ...qrMap };
      let changed = false;

      for (const item of targetList) {
        if (!newMap[item.id]) {
          const rawString =
            item.type === 'siswa'
              ? `SDNBK:SISWA:${item.id}:${item.code}:${item.name}`
              : `SDNBK:GURU:${item.id}:${item.code}:${item.name}`;
          try {
            const url = await generateQrCodeDataUrl(rawString, { size: 240 });
            newMap[item.id] = url;
            changed = true;
          } catch (e) {
            console.warn('QR gen error', e);
          }
        }
      }

      if (changed) {
        setQrMap(newMap);
      }
    };

    generateAllQrs();
  }, [targetList, qrMap]);

  const displayedList = printMode === 'single'
    ? targetList.filter((item) => item.id === selectedPersonId)
    : targetList;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Control Bar (hidden in print) */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Studio Cetak Kartu ID & QR Code Presensi
          </h2>
          <p className="text-xs text-slate-500">
            Cetak kartu pelajar dan ID guru dengan QR Code beresolusi tinggi, siap scan pada kamera presensi sekolah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu Sekarang</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (hidden in print) */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Target type */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setTargetType('siswa');
                setSelectedPersonId(students[0]?.id || '');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                targetType === 'siswa' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Kartu Pelajar (Siswa)
            </button>
            <button
              onClick={() => {
                setTargetType('guru');
                setSelectedPersonId(teachers[0]?.id || '');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                targetType === 'guru' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Kartu Pegawai (Guru)
            </button>
          </div>

          {/* Class (if Siswa) */}
          {targetType === 'siswa' && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
              >
                <option value="1A">Kelas 1A</option>
                <option value="1B">Kelas 1B</option>
                <option value="2A">Kelas 2A</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
                <option value="all">Semua Kelas (Cetak Masal)</option>
              </select>
            </div>
          )}

          {/* Print Mode */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Mode:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setPrintMode('single')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  printMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Perorangan
              </button>
              <button
                onClick={() => setPrintMode('batch')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  printMode === 'batch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Masal ({targetList.length} Kartu)
              </button>
            </div>
          </div>

          {/* Individual Person select if single mode */}
          {printMode === 'single' && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Pilih:</span>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 max-w-xs truncate"
              >
                {targetList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Format kartu standar (8.5 cm x 5.4 cm) sesuai holder lanyard ID Card.
        </div>
      </div>

      {/* ID Cards Rendering Canvas / Printable Area */}
      <div className="p-4 sm:p-8 bg-slate-100 rounded-2xl border border-slate-200 print:p-0 print:m-0 print:border-none print:bg-white print:shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 justify-items-center">
          {displayedList.map((item) => {
            const qrUrl = qrMap[item.id];
            const isStudent = item.type === 'siswa';

            return (
              <div
                key={item.id}
                className="w-[340px] h-[215px] bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 rounded-2xl border border-slate-300 shadow-md p-3.5 flex flex-col justify-between relative overflow-hidden select-none print:shadow-none print:border-slate-400 print:break-inside-avoid print:page-break-inside-avoid"
              >
                {/* Top Header / KOP */}
                <div className="flex items-center gap-2.5 border-b border-emerald-800/20 pb-2">
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-emerald-700/30 bg-emerald-50 shrink-0">
                    <img
                      src={schoolProfile.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                      {isStudent ? 'KARTU TANDA PELAJAR' : 'KARTU PEGAWAI & GURU'}
                    </div>
                    <div className="text-xs font-black text-slate-900 truncate">
                      {schoolProfile.name}
                    </div>
                    <div className="text-[8.5px] text-slate-500 truncate">
                      NPSN: {schoolProfile.npsn} • {schoolProfile.village}
                    </div>
                  </div>
                </div>

                {/* Body: Photo silhouette, Details, & QR Code */}
                <div className="flex items-center gap-3 my-auto pt-1">
                  {/* Avatar / Photo Box */}
                  <div className="w-16 h-20 rounded-xl bg-slate-200 border-2 border-white shadow-sm flex flex-col items-center justify-center text-slate-400 shrink-0 relative overflow-hidden">
                    <User className="w-10 h-10 text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                      {item.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                    </span>
                  </div>

                  {/* Personal info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                      {isStudent ? 'Nama Siswa' : 'Nama Lengkap'}
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 leading-tight truncate">
                      {item.name}
                    </p>

                    <div className="pt-0.5">
                      <p className="text-[8.5px] text-slate-400 font-semibold">
                        {isStudent ? 'NISN / NIS' : 'NIP / Jabatan'}
                      </p>
                      <p className="text-[11px] font-bold font-mono text-emerald-800">
                        {item.code} {item.subCode ? `(${item.subCode})` : ''}
                      </p>
                    </div>

                    <p className="text-[10px] font-semibold text-slate-700">
                      {item.roleOrClass}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="w-20 h-20 p-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-[9px] text-slate-400 animate-pulse">Membuat...</div>
                    )}
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-1.5 text-[8px] text-slate-500">
                  <span className="font-mono tracking-widest text-slate-400">
                    ID: {item.id}
                  </span>
                  <span className="italic text-emerald-800 font-medium">
                    SD Negeri Bojongkoneng Official
                  </span>
                </div>

                {/* Decorative side accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isStudent ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
