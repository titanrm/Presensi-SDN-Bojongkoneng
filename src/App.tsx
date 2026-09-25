import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ScannerModal } from './components/ScannerModal';
import { MonthlyRecap } from './components/MonthlyRecap';
import { StudentManager } from './components/StudentManager';
import { TeacherManager } from './components/TeacherManager';
import { IdCardGenerator } from './components/IdCardGenerator';
import { HolidayManager } from './components/HolidayManager';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import {
  Student,
  Teacher,
  AttendanceRecord,
  Holiday,
  SchoolProfile,
  GoogleSheetConfig,
} from './types';
import {
  getStudents,
  saveStudents,
  getTeachers,
  saveTeachers,
  getAttendanceRecords,
  saveAttendanceRecords,
  getHolidays,
  saveHolidays,
  getSchoolProfile,
  saveSchoolProfile,
  getSheetConfig,
  saveSheetConfig,
} from './services/storage';
import { initAuth, getAccessToken } from './services/auth';
import {
  syncAllToGoogleSheets,
  pullAllFromGoogleSheets,
  appendAttendanceToGoogleSheet,
  getOrCreateSchoolDriveFolder,
} from './services/googleSheets';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Application Data States
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getTeachers());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    getAttendanceRecords()
  );
  const [holidays, setHolidays] = useState<Holiday[]>(() => getHolidays());
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getSchoolProfile());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => getSheetConfig());

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [preselectedIdCardTarget, setPreselectedIdCardTarget] = useState<Student | Teacher | null>(
    null
  );

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Initialize Firebase Auth listener for Google Sheets
  useEffect(() => {
    initAuth(
      (_user, _token) => {
        // user is authenticated
      },
      () => {
        // user signed out or token expired
      }
    );
  }, []);

  // Save changes to localStorage & trigger auto-sync if connected
  const handleUpdateStudents = (updated: Student[]) => {
    setStudents(updated);
    saveStudents(updated);
    triggerAutoSync(updated, teachers, attendanceRecords, schoolProfile, holidays);
  };

  const handleUpdateTeachers = (updated: Teacher[]) => {
    setTeachers(updated);
    saveTeachers(updated);
    triggerAutoSync(students, updated, attendanceRecords, schoolProfile, holidays);
  };

  const handleUpdateAttendance = (updated: AttendanceRecord[]) => {
    setAttendanceRecords(updated);
    saveAttendanceRecords(updated);
    triggerAutoSync(students, teachers, updated, schoolProfile, holidays);
  };

  const handleUpdateHolidays = (updated: Holiday[]) => {
    setHolidays(updated);
    saveHolidays(updated);
    triggerAutoSync(students, teachers, attendanceRecords, schoolProfile, updated);
  };

  const handleUpdateProfile = (updated: SchoolProfile) => {
    setSchoolProfile(updated);
    saveSchoolProfile(updated);
    triggerAutoSync(students, teachers, attendanceRecords, updated, holidays);
  };

  const handleUpdateSheetConfig = (updated: GoogleSheetConfig) => {
    setSheetConfig(updated);
    saveSheetConfig(updated);
  };

  // Background auto-sync helper
  const triggerAutoSync = (
    currStudents: Student[],
    currTeachers: Teacher[],
    currAttendance: AttendanceRecord[],
    currProfile: SchoolProfile,
    currHolidays: Holiday[]
  ) => {
    if (sheetConfig.isConnected && sheetConfig.autoSync && sheetConfig.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && sheetConfig.spreadsheetId) {
          syncAllToGoogleSheets(
            token,
            sheetConfig.spreadsheetId,
            currStudents,
            currTeachers,
            currAttendance,
            currProfile,
            currHolidays
          ).then((res) => {
            if (res.success) {
              setSheetConfig((prev) => ({
                ...prev,
                lastSyncedAt: new Date().toISOString(),
              }));
            }
          });
        }
      });
    }
  };

  // Record Attendance Scan (1x Sehari Tanpa Batas Waktu)
  const handleRecordAttendance = useCallback(
    async (recordData: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> => {
      const newRecord: AttendanceRecord = {
        ...recordData,
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'harian',
        updatedAt: new Date().toISOString(),
      };

      // Check if existing record exists for same target and date
      setAttendanceRecords((prev) => {
        const index = prev.findIndex(
          (r) => r.targetId === newRecord.targetId && r.date === newRecord.date
        );

        let updated: AttendanceRecord[];
        if (index >= 0) {
          updated = [...prev];
          updated[index] = newRecord;
        } else {
          updated = [newRecord, ...prev];
        }

        saveAttendanceRecords(updated);
        return updated;
      });

      // Background Real-Time Google Sheet Sync
      if (sheetConfig.isConnected && sheetConfig.spreadsheetId) {
        getAccessToken().then((token) => {
          if (token && sheetConfig.spreadsheetId) {
            appendAttendanceToGoogleSheet(token, sheetConfig.spreadsheetId, newRecord);
          }
        });
      }

      return newRecord;
    },
    [sheetConfig]
  );

  // Update Single Record (from Dashboard or Monthly Recap)
  const handleUpdateSingleAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const index = prev.findIndex((r) => r.id === record.id);
      let updated: AttendanceRecord[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = { ...record, updatedAt: new Date().toISOString() };
      } else {
        updated = [record, ...prev];
      }
      saveAttendanceRecords(updated);
      triggerAutoSync(students, teachers, updated, schoolProfile, holidays);
      return updated;
    });
  };

  // Delete Attendance Record (Single)
  const handleDeleteAttendanceRecord = (id: string) => {
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveAttendanceRecords(updated);
      triggerAutoSync(students, teachers, updated, schoolProfile, holidays);
      return updated;
    });
  };

  // Bulk Delete Attendance Records
  const handleBulkDeleteAttendanceRecords = (ids: string[]) => {
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => !ids.includes(r.id));
      saveAttendanceRecords(updated);
      triggerAutoSync(students, teachers, updated, schoolProfile, holidays);
      return updated;
    });
  };

  // Student CRUD & Bulk Delete
  const handleAddStudent = (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `SIS-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    handleUpdateStudents([...students, newStudent]);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    handleUpdateStudents(
      students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleDeleteStudent = (id: string) => {
    handleUpdateStudents(students.filter((s) => s.id !== id));
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    handleUpdateStudents(students.filter((s) => !ids.includes(s.id)));
  };

  const handleBulkAddStudents = (newStudentsList: Omit<Student, 'id' | 'createdAt'>[]) => {
    const created = newStudentsList.map((item, idx) => ({
      ...item,
      id: `SIS-${Date.now().toString().slice(-4)}${idx}`,
      createdAt: new Date().toISOString().split('T')[0],
    }));
    handleUpdateStudents([...students, ...created]);
  };

  // Teacher CRUD & Bulk Delete
  const handleAddTeacher = (teacherData: Omit<Teacher, 'id' | 'createdAt'>) => {
    const newTeacher: Teacher = {
      ...teacherData,
      id: `GUR-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    handleUpdateTeachers([...teachers, newTeacher]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    handleUpdateTeachers(
      teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
    );
  };

  const handleDeleteTeacher = (id: string) => {
    handleUpdateTeachers(teachers.filter((t) => t.id !== id));
  };

  const handleBulkDeleteTeachers = (ids: string[]) => {
    handleUpdateTeachers(teachers.filter((t) => !ids.includes(t.id)));
  };

  // Holiday CRUD & Bulk Delete
  const handleAddHoliday = (holidayData: Omit<Holiday, 'id'>) => {
    const newHoliday: Holiday = {
      ...holidayData,
      id: `HOL-${Date.now().toString().slice(-4)}`,
    };
    handleUpdateHolidays([...holidays, newHoliday]);
  };

  const handleUpdateHoliday = (updatedHoliday: Holiday) => {
    handleUpdateHolidays(
      holidays.map((h) => (h.id === updatedHoliday.id ? updatedHoliday : h))
    );
  };

  const handleDeleteHoliday = (id: string) => {
    handleUpdateHolidays(holidays.filter((h) => h.id !== id));
  };

  const handleBulkDeleteHolidays = (ids: string[]) => {
    handleUpdateHolidays(holidays.filter((h) => !ids.includes(h.id)));
  };

  // Apply Pulled Data from Google Sheets into local state (Two-Way Sync Incoming)
  const handleApplyPulledData = (data: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: AttendanceRecord[];
    schoolProfile?: Partial<SchoolProfile>;
    holidays?: Holiday[];
  }) => {
    if (data.students && data.students.length > 0) {
      setStudents(data.students);
      saveStudents(data.students);
    }
    if (data.teachers && data.teachers.length > 0) {
      setTeachers(data.teachers);
      saveTeachers(data.teachers);
    }
    if (data.attendance && data.attendance.length > 0) {
      setAttendanceRecords(data.attendance);
      saveAttendanceRecords(data.attendance);
    }
    if (data.schoolProfile && Object.keys(data.schoolProfile).length > 0) {
      const mergedProfile = { ...schoolProfile, ...data.schoolProfile };
      setSchoolProfile(mergedProfile);
      saveSchoolProfile(mergedProfile);
    }
    if (data.holidays && data.holidays.length > 0) {
      setHolidays(data.holidays);
      saveHolidays(data.holidays);
    }
  };

  // Quick sync button in top bar (Pushes data to Google Sheets & Drive)
  const handleQuickSync = async () => {
    if (!sheetConfig.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setIsSheetModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncAllToGoogleSheets(
        token,
        sheetConfig.spreadsheetId,
        students,
        teachers,
        attendanceRecords,
        schoolProfile,
        holidays
      );
      if (res.success) {
        handleUpdateSheetConfig({
          ...sheetConfig,
          lastSyncedAt: new Date().toISOString(),
        });
        alert('Berhasil menyinkronkan semua data dan foto ke Google Sheets & Google Drive!');
      } else {
        alert(`Gagal: ${res.message}`);
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct ID Card Jump from student or teacher table
  const handleSelectForIdCard = (target: Student | Teacher) => {
    setPreselectedIdCardTarget(target);
    setCurrentTab('id-cards');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        schoolProfile={schoolProfile}
        sheetConfig={sheetConfig}
        onOpenGoogleSheetModal={() => setIsSheetModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        isSyncing={isSyncing}
        onQuickSync={handleQuickSync}
      />

      {/* Main Tab Views */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <Dashboard
            students={students}
            teachers={teachers}
            attendanceRecords={attendanceRecords}
            holidays={holidays}
            schoolProfile={schoolProfile}
            sheetConfig={sheetConfig}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenGoogleSheetModal={() => setIsSheetModalOpen(true)}
            onUpdateAttendanceRecord={handleUpdateSingleAttendanceRecord}
            onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
            onBulkDeleteAttendanceRecords={handleBulkDeleteAttendanceRecords}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'recap' && (
          <MonthlyRecap
            students={students}
            teachers={teachers}
            attendanceRecords={attendanceRecords}
            holidays={holidays}
            schoolProfile={schoolProfile}
            onUpdateAttendanceRecord={handleUpdateSingleAttendanceRecord}
            onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
          />
        )}

        {currentTab === 'students' && (
          <StudentManager
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBulkDeleteStudents={handleBulkDeleteStudents}
            onBulkAddStudents={handleBulkAddStudents}
            onSelectForIdCard={handleSelectForIdCard}
          />
        )}

        {currentTab === 'teachers' && (
          <TeacherManager
            teachers={teachers}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onBulkDeleteTeachers={handleBulkDeleteTeachers}
            onSelectForIdCard={handleSelectForIdCard}
          />
        )}

        {currentTab === 'id-cards' && (
          <IdCardGenerator
            students={students}
            teachers={teachers}
            schoolProfile={schoolProfile}
            preselectedTarget={preselectedIdCardTarget}
          />
        )}

        {currentTab === 'holidays' && (
          <HolidayManager
            holidays={holidays}
            schoolProfile={schoolProfile}
            onAddHoliday={handleAddHoliday}
            onUpdateHoliday={handleUpdateHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onBulkDeleteHolidays={handleBulkDeleteHolidays}
            onUpdateSchoolProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Floating Camera Button (Visible on mobile/tablet) */}
      <div className="fixed bottom-6 right-6 z-30 lg:hidden print:hidden">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-950/30 transition active:scale-95"
        >
          <span className="text-sm">Scan QR</span>
        </button>
      </div>

      {/* Camera QR Scanner Modal (1x Sehari Tanpa Batas Waktu) */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        students={students}
        teachers={teachers}
        attendanceRecords={attendanceRecords}
        onRecordAttendance={handleRecordAttendance}
      />

      {/* Google Sheets Real-Time Modal (Two-Way Push/Pull & Drive) */}
      <GoogleSheetsModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        config={sheetConfig}
        onUpdateConfig={handleUpdateSheetConfig}
        students={students}
        teachers={teachers}
        attendance={attendanceRecords}
        schoolProfile={schoolProfile}
        holidays={holidays}
        onApplyPulledData={handleApplyPulledData}
      />

      {/* School Profile Settings Modal */}
      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        profile={schoolProfile}
        onSaveProfile={handleUpdateProfile}
      />

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-200 bg-white text-slate-500 text-xs py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="font-bold text-slate-800">{schoolProfile.name}</span>
            <span>•</span>
            <span>NPSN {schoolProfile.npsn}</span>
            <span>•</span>
            <span>{schoolProfile.regency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mx-auto sm:mx-0">
            Sistem Presensi Online Siswa & Guru (1x Sehari) • Terintegrasi Google Sheets & Drive
          </div>
        </div>
      </footer>
    </div>
  );
}
