import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  X,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Upload,
  UserCheck,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Student,
  Teacher,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
} from '../types';
import { parseQrDataString } from '../services/qr';
import { sound } from '../services/audio';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<AttendanceRecord>;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers,
  attendanceRecords,
  onRecordAttendance,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanStatus, setScanStatus] = useState<AttendanceStatus>('hadir');
  const [customNote, setCustomNote] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    target: Student | Teacher;
    targetType: 'siswa' | 'guru';
    time: string;
    status: AttendanceStatus;
    isUpdate?: boolean;
  } | null>(null);

  // Manual fallback search
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Clean stream on unmount or close
  const stopCamera = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Process decoded string
  const handleDecodedString = useCallback(
    async (decodedText: string) => {
      const parsed = parseQrDataString(decodedText);
      if (!parsed.valid || (!parsed.id && !parsed.code)) {
        if (soundEnabled) sound.playError();
        return;
      }

      // Find in students or teachers
      let targetStudent: Student | undefined;
      let targetTeacher: Teacher | undefined;

      if (parsed.targetType === 'siswa') {
        targetStudent = students.find(
          (s) => s.id === parsed.id || s.nisn === parsed.code || s.nis === parsed.code
        );
      } else if (parsed.targetType === 'guru') {
        targetTeacher = teachers.find(
          (t) => t.id === parsed.id || (t.nip !== '-' && t.nip === parsed.code)
        );
      } else {
        // Search in both
        targetStudent = students.find(
          (s) => s.id === parsed.id || s.nisn === parsed.code || s.nis === parsed.code
        );
        if (!targetStudent) {
          targetTeacher = teachers.find(
            (t) => t.id === parsed.id || (t.nip !== '-' && t.nip === parsed.code)
          );
        }
      }

      if (!targetStudent && !targetTeacher) {
        if (soundEnabled) sound.playError();
        alert(`Data tidak ditemukan untuk kode QR: ${decodedText}`);
        setIsScanning(true);
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const isStudent = !!targetStudent;
      const target = isStudent ? targetStudent! : targetTeacher!;
      const targetType = isStudent ? 'siswa' : 'guru';

      // Check if already scanned today (1x sehari)
      const existing = attendanceRecords.find(
        (r) => r.targetId === target.id && r.date === dateStr
      );

      // Save record (1x sehari tanpa batas waktu)
      await onRecordAttendance({
        targetType,
        targetId: target.id,
        targetName: isStudent
          ? (target as Student).name
          : `${(target as Teacher).name}, ${(target as Teacher).title}`,
        targetCode: isStudent ? (target as Student).nisn : (target as Teacher).nip,
        classOrRole: isStudent
          ? `Kelas ${(target as Student).classId}`
          : (target as Teacher).role,
        date: dateStr,
        type: 'harian',
        time: existing ? existing.time : timeStr,
        status: scanStatus,
        note: customNote.trim() || existing?.note || undefined,
      });

      // Sound & Confetti
      if (soundEnabled) {
        if (existing) {
          sound.playWarning();
        } else {
          sound.playSuccess();
        }
      }

      if (!existing && scanStatus === 'hadir') {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      }

      setScannedResult({
        target,
        targetType,
        time: existing ? existing.time : timeStr,
        status: scanStatus,
        isUpdate: !!existing,
      });
      setIsScanning(false);
    },
    [students, teachers, attendanceRecords, scanStatus, customNote, soundEnabled, onRecordAttendance]
  );

  // Scan frame loop
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleDecodedString(code.data);
        return; // stop scanning loop for this match
      }
    }

    if (isScanning) {
      animFrameId.current = requestAnimationFrame(tick);
    }
  }, [isScanning, handleDecodedString]);

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().then(() => {
          setIsScanning(true);
          animFrameId.current = requestAnimationFrame(tick);
        });
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tombol Upload Gambar QR atau Pencarian Manual di bawah.'
      );
    }
  }, [facingMode, stopCamera, tick]);

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      setScannedResult(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle image upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedString(code.data);
          } else {
            if (soundEnabled) sound.playError();
            alert('Tidak ditemukan QR Code yang valid pada gambar yang diunggah.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  // Filtered list for manual search
  const filteredManualTargets = manualSearchQuery.trim()
    ? [
        ...students
          .filter(
            (s) =>
              s.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
              s.nisn.includes(manualSearchQuery) ||
              s.classId.toLowerCase().includes(manualSearchQuery.toLowerCase())
          )
          .map((s) => ({ target: s, type: 'siswa' as const })),
        ...teachers
          .filter(
            (t) =>
              t.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
              t.nip.includes(manualSearchQuery) ||
              t.role.toLowerCase().includes(manualSearchQuery.toLowerCase())
          )
          .map((t) => ({ target: t, type: 'guru' as const })),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Scan QR Code ID Card
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">Arahkan kamera ke QR Code pada kartu pelajar/guru</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Controls */}
        <div className="px-5 py-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 1x Sehari Indicator */}
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Presensi 1x Sehari</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">(Tanpa Batas Waktu)</span>
          </div>

          {/* Status Selection */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            {(['hadir', 'sakit', 'izin', 'alfa'] as AttendanceStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => setScanStatus(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition ${
                  scanStatus === st
                    ? st === 'hadir'
                      ? 'bg-emerald-500 text-white'
                      : st === 'sakit'
                      ? 'bg-amber-500 text-slate-900'
                      : st === 'izin'
                      ? 'bg-sky-500 text-white'
                      : 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Note for Sakit / Izin */}
        {(scanStatus === 'sakit' || scanStatus === 'izin') && (
          <div className="px-5 py-2 bg-amber-950/40 border-b border-amber-900/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              placeholder={`Keterangan ${scanStatus} (cth: Demam berdarah / Acara keluarga)...`}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full bg-slate-800/90 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-amber-400 text-slate-200 placeholder-slate-500"
            />
          </div>
        )}

        {/* Camera Viewport or Result */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          {scannedResult ? (
            /* Result Modal Overlay Card */
            <div className="p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h4 className="text-lg font-bold text-white">
                {scannedResult.isUpdate ? 'Presensi Diperbarui!' : 'Presensi Berhasil Dicatat!'}
              </h4>

              <div className="mt-4 p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-left space-y-2">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-400">Nama Lengkap</span>
                  <span className="text-xs font-bold text-white">
                    {scannedResult.targetType === 'siswa'
                      ? (scannedResult.target as Student).name
                      : `${(scannedResult.target as Teacher).name}, ${(scannedResult.target as Teacher).title}`}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-400">
                    {scannedResult.targetType === 'siswa' ? 'NISN / Kelas' : 'NIP / Jabatan'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {scannedResult.targetType === 'siswa'
                      ? `${(scannedResult.target as Student).nisn} (${(scannedResult.target as Student).classId})`
                      : `${(scannedResult.target as Teacher).nip} (${(scannedResult.target as Teacher).role})`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Waktu & Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-slate-300">{scannedResult.time}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        scannedResult.status === 'hadir'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {scannedResult.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => {
                    setScannedResult(null);
                    setIsScanning(true);
                    startCamera();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Berikutnya</span>
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Video */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Scanner line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-emerald-400/90 shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-x-4 top-4 p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs text-center shadow-lg">
                  {cameraError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Flip camera */}
            <button
              onClick={() => {
                setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
              }}
              title="Ganti Kamera Depan / Belakang"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Putar Kamera</span>
            </button>

            {/* Upload QR File */}
            <label className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Foto QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Fallback Manual Search Toggle */}
          <button
            onClick={() => setShowManualSearch(!showManualSearch)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Pencarian Manual</span>
          </button>
        </div>

        {/* Manual Search Modal / Drawer */}
        {showManualSearch && (
          <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-3 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Pencarian Manual (Tanpa Kartu QR)
              </span>
              <button
                onClick={() => setShowManualSearch(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ketik Nama, NISN, atau NIP..."
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {filteredManualTargets.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-700/50">
                {filteredManualTargets.slice(0, 5).map(({ target, type }) => (
                  <div
                    key={target.id}
                    onClick={() => {
                      setShowManualSearch(false);
                      setManualSearchQuery('');
                      handleDecodedString(
                        type === 'siswa'
                          ? `SDNBK:SISWA:${target.id}:${(target as Student).nisn}`
                          : `SDNBK:GURU:${target.id}:${(target as Teacher).nip}`
                      );
                    }}
                    className="p-2 flex items-center justify-between hover:bg-slate-700/80 rounded cursor-pointer transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {type === 'siswa'
                          ? (target as Student).name
                          : `${(target as Teacher).name}, ${(target as Teacher).title}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {type === 'siswa'
                          ? `NISN: ${(target as Student).nisn} • Kelas ${(target as Student).classId}`
                          : `NIP: ${(target as Teacher).nip} • ${(target as Teacher).role}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Absen
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
