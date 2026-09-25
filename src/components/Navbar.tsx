import React, { useState, useEffect } from 'react';
import {
  School,
  QrCode,
  Users,
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  Settings,
  Camera,
  CheckCircle2,
  RefreshCw,
  Menu,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { SchoolProfile, GoogleSheetConfig } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  schoolProfile: SchoolProfile;
  sheetConfig: GoogleSheetConfig;
  onOpenGoogleSheetModal: () => void;
  onOpenScanner: () => void;
  isSyncing: boolean;
  onQuickSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  schoolProfile,
  sheetConfig,
  onOpenGoogleSheetModal,
  onOpenScanner,
  isSyncing,
  onQuickSync,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: School },
    { id: 'scan', label: 'Scan QR Presensi', icon: Camera, highlight: true },
    { id: 'recap', label: 'Rekap Bulanan & PDF', icon: FileText },
    { id: 'students', label: 'Data Siswa', icon: GraduationCap },
    { id: 'teachers', label: 'Data Guru', icon: Users },
    { id: 'id-cards', label: 'Cetak ID Card QR', icon: QrCode },
    { id: 'holidays', label: 'Hari Libur', icon: CalendarDays },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      {/* Top Banner / School Info & Live Status */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              NPSN: {schoolProfile.npsn}
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-slate-300 truncate max-w-[280px]">
              {schoolProfile.village}, {schoolProfile.district}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Real-time Clock */}
            <div className="flex items-center gap-1.5 font-mono text-slate-300 text-[11px] bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700">
              <span>{currentDate}</span>
              <span className="text-emerald-400 font-bold">{currentTime}</span>
            </div>

            {/* Google Sheets Connection Pill */}
            <button
              onClick={onOpenGoogleSheetModal}
              title="Pengaturan Google Sheets Database"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                sheetConfig.isConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                  : 'bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{sheetConfig.isConnected ? 'Google Sheet Terhubung' : 'Hubungkan Sheet'}</span>
            </button>

            {sheetConfig.isConnected && (
              <button
                onClick={onQuickSync}
                disabled={isSyncing}
                title="Sinkronkan data ke Google Sheet"
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & School Branding */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-emerald-600/30 bg-emerald-50 flex items-center justify-center shadow-sm">
              <img
                src={schoolProfile.logoUrl}
                alt="Logo SDN Bojongkoneng"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <School className="w-6 h-6 text-emerald-700 absolute" style={{ zIndex: -1 }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                  {schoolProfile.name}
                </span>
                <span className="text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  E-Presensi
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Sistem Presensi Siswa & Guru Berbasis QR Code & Google Sheet
              </p>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              if (item.highlight) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab('scan');
                      onOpenScanner();
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-95 mx-1"
                  >
                    <Icon className="w-4 h-4 animate-pulse" />
                    <span>{item.label}</span>
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition ${
                    isActive
                      ? 'bg-slate-100 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => onSelectTab('settings')}
              title="Pengaturan Profil Sekolah"
              className={`p-2 rounded-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-100 ml-1 ${
                currentTab === 'settings' ? 'bg-slate-100 text-emerald-700' : ''
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow"
            >
              <Camera className="w-4 h-4" />
              <span>Scan</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                  if (item.id === 'scan') {
                    onOpenScanner();
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                onSelectTab('settings');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg w-full"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Profil Sekolah & Pengaturan</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
