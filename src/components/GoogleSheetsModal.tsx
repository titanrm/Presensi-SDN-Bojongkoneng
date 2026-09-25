import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  Copy,
  Check,
  FolderOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  Folder,
} from 'lucide-react';
import { GoogleSheetConfig, Student, Teacher, AttendanceRecord, SchoolProfile, Holiday } from '../types';
import { googleSignIn, getAccessToken, logoutGoogle } from '../services/auth';
import {
  createPresensiSpreadsheet,
  syncAllToGoogleSheets,
  pullAllFromGoogleSheets,
  getOrCreateSchoolDriveFolder,
  getAppsScriptTemplate,
} from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetConfig;
  onUpdateConfig: (config: GoogleSheetConfig) => void;
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  schoolProfile: SchoolProfile;
  holidays: Holiday[];
  onApplyPulledData: (data: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: AttendanceRecord[];
    schoolProfile?: Partial<SchoolProfile>;
    holidays?: Holiday[];
  }) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  students,
  teachers,
  attendance,
  schoolProfile,
  holidays,
  onApplyPulledData,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'webhook'>('oauth');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualSheetId, setManualSheetId] = useState(config.spreadsheetId || '');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSyncStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        // Also setup or get Drive folder
        let driveFolderInfo: { id: string; url: string } | null = null;
        try {
          driveFolderInfo = await getOrCreateSchoolDriveFolder(res.accessToken);
        } catch {}

        onUpdateConfig({
          ...config,
          isConnected: true,
          driveFolderId: driveFolderInfo?.id || config.driveFolderId,
          driveFolderUrl: driveFolderInfo?.url || config.driveFolderUrl,
        });

        setSyncStatusMsg({
          type: 'success',
          text: `Berhasil terhubung dengan Google: ${res.user.email || res.user.displayName}`,
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Gagal login ke Google: ${err.message || 'Izin dibatalkan'}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateNewSheet = async () => {
    setSyncStatusMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('Silakan login dengan Google terlebih dahulu.');
        return;
      }

      setIsSyncing(true);
      const newSheet = await createPresensiSpreadsheet(token, 'Database Presensi SDN Bojongkoneng');
      
      // Also get/create Drive folder
      let driveFolderInfo = { id: '', url: '' };
      try {
        driveFolderInfo = await getOrCreateSchoolDriveFolder(token);
      } catch {}

      // Initial populate
      await syncAllToGoogleSheets(
        token,
        newSheet.id,
        students,
        teachers,
        attendance,
        schoolProfile,
        holidays
      );

      onUpdateConfig({
        ...config,
        isConnected: true,
        spreadsheetId: newSheet.id,
        spreadsheetUrl: newSheet.url,
        spreadsheetName: 'Database Presensi SDN Bojongkoneng',
        driveFolderId: driveFolderInfo.id || config.driveFolderId,
        driveFolderUrl: driveFolderInfo.url || config.driveFolderUrl,
        lastSyncedAt: new Date().toISOString(),
      });

      setManualSheetId(newSheet.id);
      setSyncStatusMsg({
        type: 'success',
        text: 'Spreadsheet baru & folder Google Drive berhasil dibuat dan semua data telah disinkronkan!',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Gagal membuat Spreadsheet: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push WebApp -> Google Sheet
  const handlePushToSheets = async () => {
    const sheetId = manualSheetId.trim() || config.spreadsheetId;
    if (!sheetId) {
      alert('Masukkan ID Google Spreadsheet terlebih dahulu atau buat Spreadsheet baru.');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      alert('Sesi Google kedaluwarsa. Silakan klik Masuk dengan Google terlebih dahulu.');
      return;
    }

    const confirmed = window.confirm(
      `KIRIM DATA KE GOOGLE SHEET:\nApakah Anda yakin ingin menyinkronkan data sekolah, ${students.length} siswa, ${teachers.length} guru, ${attendance.length} log presensi, dan ${holidays.length} hari libur ke Google Sheets? Data di spreadsheet akan diperbarui.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setSyncStatusMsg(null);

    // Ensure Drive folder is ready
    let driveInfo = { id: config.driveFolderId || '', url: config.driveFolderUrl || '' };
    try {
      driveInfo = await getOrCreateSchoolDriveFolder(token);
    } catch {}

    const result = await syncAllToGoogleSheets(
      token,
      sheetId,
      students,
      teachers,
      attendance,
      schoolProfile,
      holidays
    );
    setIsSyncing(false);

    if (result.success) {
      onUpdateConfig({
        ...config,
        isConnected: true,
        spreadsheetId: sheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        driveFolderId: driveInfo.id || config.driveFolderId,
        driveFolderUrl: driveInfo.url || config.driveFolderUrl,
        lastSyncedAt: new Date().toISOString(),
      });
      setSyncStatusMsg({
        type: 'success',
        text: 'Data berhasil dikirim ke Google Sheets & Google Drive!',
      });
    } else {
      setSyncStatusMsg({
        type: 'error',
        text: result.message,
      });
    }
  };

  // Pull Google Sheet -> WebApp
  const handlePullFromSheets = async () => {
    const sheetId = manualSheetId.trim() || config.spreadsheetId;
    if (!sheetId) {
      alert('Masukkan ID Google Spreadsheet terlebih dahulu.');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      alert('Sesi Google kedaluwarsa. Silakan klik Masuk dengan Google terlebih dahulu.');
      return;
    }

    const confirmed = window.confirm(
      `TARIK DATA DARI GOOGLE SHEET:\nApakah Anda ingin memperbarui data aplikasi dengan data terbaru yang tersimpan di Google Sheet? Perubahan di spreadsheet akan diterapkan ke aplikasi.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setSyncStatusMsg(null);

    const result = await pullAllFromGoogleSheets(token, sheetId);
    setIsSyncing(false);

    if (result.success && result.pulledData) {
      onApplyPulledData(result.pulledData);
      onUpdateConfig({
        ...config,
        isConnected: true,
        spreadsheetId: sheetId,
        lastPulledAt: new Date().toISOString(),
      });
      setSyncStatusMsg({
        type: 'success',
        text: result.message,
      });
    } else {
      setSyncStatusMsg({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(getAppsScriptTemplate(config.spreadsheetId || 'SPREADSHEET_ID_ANDA'));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Integrasi Real-Time Google Sheets & Drive
              </h3>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud terpusat 2 arah untuk SDN Bojongkoneng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs my-4">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              activeTab === 'oauth' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            Koneksi Google OAuth & Drive
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              activeTab === 'webhook' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            Alternatif: Google Apps Script Webhook
          </button>
        </div>

        {/* Status Message */}
        {syncStatusMsg && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>{syncStatusMsg.text}</div>
          </div>
        )}

        {activeTab === 'oauth' ? (
          <div className="space-y-4 text-xs">
            {/* Step 1: Google Sign In Button */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                1. Masuk dengan Akun Google Sekolah
              </span>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 py-2.5 px-4 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="text-xs">
                  {isSigningIn ? 'Menghubungkan...' : 'Sign in with Google (Akun Sekolah)'}
                </span>
              </button>
            </div>

            {/* Google Drive Folder Indicator */}
            {config.driveFolderUrl && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <Folder className="w-4 h-4 text-emerald-600" />
                  <span>Folder Aset Google Drive Terhubung</span>
                </div>
                <a
                  href={config.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Buka Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Step 2: Spreadsheet Creation or Link */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                2. Buat Spreadsheet Baru Otomatis
              </span>
              <p className="text-slate-500 text-[11px]">
                Aplikasi akan membuat dokumen Google Sheet baru dengan 5 tab: Data Siswa, Data Guru, Log Presensi Harian, Data Sekolah, dan Hari Libur.
              </p>

              <button
                type="button"
                onClick={handleCreateNewSheet}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSyncing ? 'Memproses...' : 'Buat Spreadsheet SDN Bojongkoneng Baru'}</span>
              </button>
            </div>

            {/* Step 3: Two-Way Real-Time Sync Action Buttons */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                3. Sinkronisasi Real-Time Dua Arah
              </span>

              <div>
                <label className="text-slate-600 font-semibold mb-1 block">Spreadsheet ID</label>
                <input
                  type="text"
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={manualSheetId}
                  onChange={(e) => setManualSheetId(e.target.value)}
                  className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {config.spreadsheetUrl && (
                <div className="flex items-center justify-between text-xs">
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Buka Spreadsheet di Tab Baru</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <span className="text-[11px] text-slate-400">
                    {config.lastSyncedAt && `Kirim: ${new Date(config.lastSyncedAt).toLocaleTimeString('id-ID')}`}
                    {config.lastPulledAt && ` • Tarik: ${new Date(config.lastPulledAt).toLocaleTimeString('id-ID')}`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Push */}
                <button
                  type="button"
                  onClick={handlePushToSheets}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                  <span>{isSyncing ? 'Proses...' : 'Kirim Data ke Sheet'}</span>
                </button>

                {/* Pull */}
                <button
                  type="button"
                  onClick={handlePullFromSheets}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-4 h-4 text-white" />
                  <span>{isSyncing ? 'Proses...' : 'Tarik Data dari Sheet'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Webhook Tab */
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">
                Integrasi Bebas Login Per-Device via Google Apps Script
              </h4>
              <p className="text-slate-600 text-[11px]">
                Jika petugas presensi di gerbang sekolah menggunakan tablet atau HP yang tidak ingin login akun Google admin, Anda dapat men-deploy Google Apps Script berikut sebagai Web App webhook:
              </p>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {getAppsScriptTemplate(config.spreadsheetId || 'SPREADSHEET_ID_ANDA')}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 text-[10px]"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Disalin' : 'Salin Kode'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
