import { Student, Teacher, AttendanceRecord, Holiday, SchoolProfile } from '../types';

export interface SheetSyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  pulledData?: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: AttendanceRecord[];
    holidays?: Holiday[];
    schoolProfile?: Partial<SchoolProfile>;
  };
}

// 1. Google Drive Helper: Create or get school assets folder
export const getOrCreateSchoolDriveFolder = async (
  accessToken: string,
  folderName: string = 'Aset Presensi SDN Bojongkoneng'
): Promise<{ id: string; url: string }> => {
  try {
    // Search existing folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        folderName
      )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          url: data.files[0].webViewLink || `https://drive.google.com/drive/folders/${data.files[0].id}`,
        };
      }
    }

    // Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error('Gagal membuat folder di Google Drive');
    }

    const folder = await createRes.json();
    return {
      id: folder.id,
      url: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    };
  } catch (err: any) {
    console.warn('Drive folder error:', err);
    throw err;
  }
};

// 2. Upload photo / logo to Google Drive
export const uploadPhotoToGoogleDrive = async (
  accessToken: string,
  folderId: string,
  dataUrlOrBase64: string,
  filename: string
): Promise<string> => {
  try {
    // Extract mime type and base64
    const matches = dataUrlOrBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = dataUrlOrBase64;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Multipart upload to Google Drive
    const metadata = {
      name: filename,
      parents: [folderId],
      mimeType,
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', blob);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.error?.message || 'Gagal mengunggah foto ke Google Drive');
    }

    const file = await uploadRes.json();

    // Make viewable
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch {}

    return `https://drive.google.com/uc?id=${file.id}`;
  } catch (error: any) {
    console.warn('Gagal upload foto ke drive, gunakan fallback URL/base64:', error);
    return dataUrlOrBase64;
  }
};

// 3. Create Google Spreadsheet with all required sheets
export const createPresensiSpreadsheet = async (
  accessToken: string,
  title: string = 'Database Presensi SDN Bojongkoneng'
): Promise<{ id: string; url: string }> => {
  const requestBody = {
    properties: {
      title: `${title} - ${new Date().getFullYear()}`,
    },
    sheets: [
      {
        properties: {
          title: 'Log Presensi Harian',
          gridProperties: { rowCount: 1000, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Data Siswa',
          gridProperties: { rowCount: 500, columnCount: 11, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Data Guru',
          gridProperties: { rowCount: 100, columnCount: 11, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Data Sekolah',
          gridProperties: { rowCount: 30, columnCount: 3, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Hari Libur',
          gridProperties: { rowCount: 100, columnCount: 5, frozenRowCount: 1 },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { id: spreadsheetId, url: spreadsheetUrl };
};

// 4. Push all data from WebApp to Google Sheets (Two-Way Sync: Outgoing)
export const syncAllToGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string,
  students: Student[],
  teachers: Teacher[],
  attendance: AttendanceRecord[],
  schoolProfile?: SchoolProfile,
  holidays?: Holiday[]
): Promise<SheetSyncResult> => {
  try {
    // 1. Data Siswa
    const studentRows = [
      [
        'ID Siswa',
        'NISN',
        'NIS',
        'Nama Siswa',
        'L/P',
        'Kelas',
        'Nama Orang Tua/Wali',
        'No HP/WA Ortu',
        'Foto URL/Drive',
        'Status',
        'Tanggal Terdaftar',
      ],
      ...students.map((s) => [
        s.id,
        s.nisn,
        s.nis,
        s.name,
        s.gender,
        s.classId,
        s.parentName,
        s.parentPhone,
        s.photoUrl || '',
        s.status,
        s.createdAt,
      ]),
    ];

    // 2. Data Guru
    const teacherRows = [
      [
        'ID Guru',
        'NIP / NUPTK',
        'Nama Lengkap & Gelar',
        'L/P',
        'Jabatan / Tugas',
        'Kelas Pengampu',
        'No HP/WA',
        'Foto URL/Drive',
        'Status',
        'Tanggal Terdaftar',
      ],
      ...teachers.map((t) => [
        t.id,
        t.nip,
        `${t.name}, ${t.title}`,
        t.gender,
        t.role,
        t.classAssigned || '-',
        t.phone,
        t.photoUrl || '',
        t.status,
        t.createdAt,
      ]),
    ];

    // 3. Log Presensi Harian (1x sehari)
    const sortedAttendance = [...attendance].sort((a, b) => {
      const dateDiff =
        new Date(`${b.date}T${b.time}`).getTime() -
        new Date(`${a.date}T${a.time}`).getTime();
      return isNaN(dateDiff) ? 0 : dateDiff;
    });

    const attendanceRows = [
      [
        'ID Presensi',
        'Kategori',
        'Kode (NISN/NIP)',
        'Nama Lengkap',
        'Kelas / Jabatan',
        'Tanggal',
        'Waktu',
        'Status',
        'Keterangan',
        'Update Terakhir',
      ],
      ...sortedAttendance.map((a) => [
        a.id,
        a.targetType.toUpperCase(),
        a.targetCode,
        a.targetName,
        a.classOrRole,
        a.date,
        a.time,
        a.status.toUpperCase(),
        a.note || '-',
        a.updatedAt || new Date().toISOString(),
      ]),
    ];

    // 4. Data Sekolah
    const schoolRows = schoolProfile
      ? [
          ['Pengaturan', 'Nilai'],
          ['Nama Sekolah', schoolProfile.name],
          ['NPSN', schoolProfile.npsn],
          ['Alamat', schoolProfile.address],
          ['Desa/Kelurahan', schoolProfile.village],
          ['Kecamatan', schoolProfile.district],
          ['Kabupaten/Kota', schoolProfile.regency],
          ['Provinsi', schoolProfile.province],
          ['Kode Pos', schoolProfile.postalCode],
          ['Email', schoolProfile.email],
          ['Telepon', schoolProfile.phone],
          ['Nama Kepala Sekolah', schoolProfile.headmasterName],
          ['NIP Kepala Sekolah', schoolProfile.headmasterNip],
          ['Logo URL', schoolProfile.logoUrl],
          ['Hari Sekolah Mingguan', String(schoolProfile.schoolWeek)],
          ['Jam Masuk', schoolProfile.checkInStart],
          ['Batas Telat', schoolProfile.checkInLate],
          ['Jam Pulang', schoolProfile.checkOutStart],
        ]
      : [];

    // 5. Hari Libur
    const holidayRows = holidays
      ? [
          ['ID Libur', 'Tanggal', 'Nama Hari Libur', 'Kategori', 'Keterangan'],
          ...holidays.map((h) => [h.id, h.date, h.name, h.type, h.description || '-']),
        ]
      : [];

    // Batch update values
    const batchData: Array<{ range: string; values: any[][] }> = [
      { range: "'Data Siswa'!A1", values: studentRows },
      { range: "'Data Guru'!A1", values: teacherRows },
      { range: "'Log Presensi Harian'!A1", values: attendanceRows },
    ];

    if (schoolRows.length > 0) {
      batchData.push({ range: "'Data Sekolah'!A1", values: schoolRows });
    }
    if (holidayRows.length > 0) {
      batchData.push({ range: "'Hari Libur'!A1", values: holidayRows });
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gagal menyinkronkan data ke Google Sheet.');
    }

    return {
      success: true,
      message: 'Berhasil menyinkronkan data ke Google Sheet & Drive.',
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan saat sinkronisasi Google Sheet.',
    };
  }
};

// 5. Pull all data from Google Sheets into WebApp (Two-Way Sync: Incoming)
export const pullAllFromGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string
): Promise<SheetSyncResult> => {
  try {
    const ranges = [
      "'Data Siswa'!A2:K500",
      "'Data Guru'!A2:K100",
      "'Log Presensi Harian'!A2:J1000",
      "'Data Sekolah'!A2:B25",
      "'Hari Libur'!A2:E100",
    ];

    const queryParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gagal membaca data dari Google Sheet.');
    }

    const data = await response.json();
    const valueRanges = data.valueRanges || [];

    // 1. Data Siswa
    const studentRows = valueRanges[0]?.values || [];
    const students: Student[] = studentRows
      .filter((r: any[]) => r && r[0] && r[1])
      .map((r: any[], idx: number) => ({
        id: r[0] || `SIS-${idx}`,
        nisn: r[1] || '',
        nis: r[2] || '',
        name: r[3] || '',
        gender: (r[4]?.toUpperCase() === 'P' ? 'P' : 'L') as any,
        classId: r[5] || '1A',
        parentName: r[6] || '',
        parentPhone: r[7] || '',
        photoUrl: r[8] || undefined,
        status: (r[9]?.toLowerCase() === 'nonaktif' ? 'nonaktif' : 'aktif') as any,
        createdAt: r[10] || new Date().toISOString().split('T')[0],
      }));

    // 2. Data Guru
    const teacherRows = valueRanges[1]?.values || [];
    const teachers: Teacher[] = teacherRows
      .filter((r: any[]) => r && r[0] && r[2])
      .map((r: any[], idx: number) => {
        const fullName = r[2] || '';
        const nameParts = fullName.split(',');
        const name = nameParts[0]?.trim() || fullName;
        const title = nameParts.slice(1).join(',').trim() || 'S.Pd.';

        return {
          id: r[0] || `GUR-${idx}`,
          nip: r[1] || '-',
          name,
          title,
          gender: (r[3]?.toUpperCase() === 'P' ? 'P' : 'L') as any,
          role: r[4] || 'Guru',
          classAssigned: r[5] !== '-' ? r[5] : undefined,
          phone: r[6] || '',
          photoUrl: r[7] || undefined,
          status: (r[8]?.toLowerCase() === 'nonaktif' ? 'nonaktif' : 'aktif') as any,
          createdAt: r[9] || new Date().toISOString().split('T')[0],
        };
      });

    // 3. Log Presensi Harian
    const attendanceRows = valueRanges[2]?.values || [];
    const attendance: AttendanceRecord[] = attendanceRows
      .filter((r: any[]) => r && r[0] && r[5])
      .map((r: any[]) => ({
        id: r[0],
        targetType: (r[1]?.toLowerCase() === 'guru' ? 'guru' : 'siswa') as any,
        targetCode: r[2] || '',
        targetName: r[3] || '',
        classOrRole: r[4] || '',
        targetId: r[0].replace(/^att-[st]-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, ''),
        date: r[5] || '',
        type: 'harian',
        time: r[6] || '07:00:00',
        status: (r[7]?.toLowerCase() || 'hadir') as any,
        note: r[8] !== '-' ? r[8] : undefined,
        updatedAt: r[9] || undefined,
      }));

    // 4. Data Sekolah
    const schoolRows = valueRanges[3]?.values || [];
    const schoolProfile: Partial<SchoolProfile> = {};
    schoolRows.forEach((r: any[]) => {
      const key = r[0];
      const val = r[1];
      if (key === 'Nama Sekolah') schoolProfile.name = val;
      if (key === 'NPSN') schoolProfile.npsn = val;
      if (key === 'Alamat') schoolProfile.address = val;
      if (key === 'Desa/Kelurahan') schoolProfile.village = val;
      if (key === 'Kecamatan') schoolProfile.district = val;
      if (key === 'Kabupaten/Kota') schoolProfile.regency = val;
      if (key === 'Provinsi') schoolProfile.province = val;
      if (key === 'Kode Pos') schoolProfile.postalCode = val;
      if (key === 'Email') schoolProfile.email = val;
      if (key === 'Telepon') schoolProfile.phone = val;
      if (key === 'Nama Kepala Sekolah') schoolProfile.headmasterName = val;
      if (key === 'NIP Kepala Sekolah') schoolProfile.headmasterNip = val;
      if (key === 'Logo URL') schoolProfile.logoUrl = val;
      if (key === 'Hari Sekolah Mingguan') schoolProfile.schoolWeek = Number(val) === 5 ? 5 : 6;
      if (key === 'Jam Masuk') schoolProfile.checkInStart = val;
      if (key === 'Batas Telat') schoolProfile.checkInLate = val;
      if (key === 'Jam Pulang') schoolProfile.checkOutStart = val;
    });

    // 5. Hari Libur
    const holidayRows = valueRanges[4]?.values || [];
    const holidays: Holiday[] = holidayRows
      .filter((r: any[]) => r && r[0] && r[1])
      .map((r: any[]) => ({
        id: r[0],
        date: r[1],
        name: r[2],
        type: (r[3]?.toLowerCase() === 'nasional' ? 'nasional' : 'sekolah') as any,
        description: r[4] !== '-' ? r[4] : undefined,
      }));

    return {
      success: true,
      message: `Berhasil menarik data: ${students.length} siswa, ${teachers.length} guru, ${attendance.length} log presensi.`,
      pulledData: {
        students: students.length > 0 ? students : undefined,
        teachers: teachers.length > 0 ? teachers : undefined,
        attendance: attendance.length > 0 ? attendance : undefined,
        schoolProfile: Object.keys(schoolProfile).length > 0 ? schoolProfile : undefined,
        holidays: holidays.length > 0 ? holidays : undefined,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal menarik data dari Google Sheet.',
    };
  }
};

// 6. Append single record in background
export const appendAttendanceToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  record: AttendanceRecord
): Promise<boolean> => {
  try {
    const row = [
      record.id,
      record.targetType.toUpperCase(),
      record.targetCode,
      record.targetName,
      record.classOrRole,
      record.date,
      record.time,
      record.status.toUpperCase(),
      record.note || '-',
      record.updatedAt || new Date().toISOString(),
    ];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Log Presensi Harian'!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    return res.ok;
  } catch (err) {
    console.warn('Gagal append ke Google Sheet di latar belakang:', err);
    return false;
  }
};

export const getAppsScriptTemplate = (spreadsheetId: string = 'YOUR_SPREADSHEET_ID_HERE') => {
  return `/**
 * SCRIPT GOOGLE APPS SCRIPT DUA ARAH UNTUK SDN BOJONGKONENG PRESENSI
 * 1. Buka https://script.google.com lalu buat New Project
 * 2. Paste kode di bawah ini
 * 3. Ganti SPREADSHEET_ID dengan ID Spreadsheet Anda
 * 4. Klik Deploy > New Deployment > Web app
 * 5. Pilih "Execute as: Me" dan "Who has access: Anyone"
 * 6. Copy URL Deployment ke pengaturan Web App Presensi
 */

const SPREADSHEET_ID = "${spreadsheetId}";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {
      status: "success",
      students: ss.getSheetByName("Data Siswa")?.getDataRange()?.getValues() || [],
      teachers: ss.getSheetByName("Data Guru")?.getDataRange()?.getValues() || [],
      attendance: ss.getSheetByName("Log Presensi Harian")?.getDataRange()?.getValues() || [],
      school: ss.getSheetByName("Data Sekolah")?.getDataRange()?.getValues() || [],
      holidays: ss.getSheetByName("Hari Libur")?.getDataRange()?.getValues() || []
    };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (data.action === "LOG_ATTENDANCE") {
      const sheet = ss.getSheetByName("Log Presensi Harian") || ss.insertSheet("Log Presensi Harian");
      sheet.appendRow([
        data.id,
        data.targetType,
        data.targetCode,
        data.targetName,
        data.classOrRole,
        data.date,
        data.time,
        data.status,
        data.note || "-",
        new Date().toISOString()
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
};
