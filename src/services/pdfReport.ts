import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Teacher, AttendanceRecord, Holiday, SchoolProfile } from '../types';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Helper to convert image URL or import to base64 for jsPDF
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to load image for PDF:', e);
    return null;
  }
};

export interface MonthlyRecapPdfOptions {
  month: number; // 0 to 11
  year: number;
  category: 'siswa' | 'guru';
  classId?: string; // e.g. '1A'
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  schoolProfile: SchoolProfile;
}

export const generateMonthlyRecapPdf = async (options: MonthlyRecapPdfOptions) => {
  const { month, year, category, classId, students, teachers, attendance, holidays, schoolProfile } = options;

  // Days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Targets
  let targets: { id: string; code: string; name: string; gender: string; subtitle: string }[] = [];
  let categoryLabel = '';

  if (category === 'siswa') {
    const filtered = classId && classId !== 'all' 
      ? students.filter((s) => s.classId === classId && s.status === 'aktif')
      : students.filter((s) => s.status === 'aktif');
    
    targets = filtered.map((s) => ({
      id: s.id,
      code: s.nisn,
      name: s.name,
      gender: s.gender,
      subtitle: `Kelas ${s.classId}`,
    }));
    categoryLabel = classId && classId !== 'all' ? `Siswa - Kelas ${classId}` : 'Seluruh Siswa';
  } else {
    targets = teachers.filter((t) => t.status === 'aktif').map((t) => ({
      id: t.id,
      code: t.nip !== '-' ? t.nip : t.id,
      name: `${t.name}, ${t.title}`,
      gender: t.gender,
      subtitle: t.role,
    }));
    categoryLabel = 'Guru dan Tenaga Kependidikan';
  }

  // Pre-calculate holiday days map
  const holidayMap: { [day: number]: string } = {};
  daysArray.forEach((day) => {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Sunday is holiday
    if (dayOfWeek === 0) {
      holidayMap[day] = 'Minggu';
    } else if (schoolProfile.schoolWeek === 5 && dayOfWeek === 6) {
      // 5-day school week: Saturday is holiday
      holidayMap[day] = 'Sabtu Libur';
    } else {
      const hol = holidays.find((h) => h.date === dateStr);
      if (hol) {
        holidayMap[day] = hol.name;
      }
    }
  });

  // Count effective school days
  const effectiveDays = daysArray.filter((day) => !holidayMap[day]).length;

  // Create jsPDF instance (Landscape for wide attendance matrix)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Try to load school logo
  let logoBase64: string | null = null;
  if (schoolProfile.logoUrl) {
    logoBase64 = await getBase64ImageFromUrl(schoolProfile.logoUrl);
  }

  // 1. KOP SURAT RESMI
  let startY = 10;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 14, startY, 20, 20);
    } catch {
      // ignore image render failure
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('PEMERINTAH KABUPATEN BANDUNG BARAT', pageWidth / 2, startY + 4, { align: 'center' });
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, startY + 9, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolProfile.name, pageWidth / 2, startY + 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const subAddress = `NPSN: ${schoolProfile.npsn} | ${schoolProfile.address}, ${schoolProfile.village}, ${schoolProfile.district}`;
  const subContact = `Telp: ${schoolProfile.phone} | Email: ${schoolProfile.email} | Kode Pos: ${schoolProfile.postalCode}`;
  doc.text(subAddress, pageWidth / 2, startY + 20, { align: 'center' });
  doc.text(subContact, pageWidth / 2, startY + 24, { align: 'center' });

  // Kop border lines
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(14, startY + 27, pageWidth - 14, startY + 27);
  doc.setLineWidth(0.2);
  doc.line(14, startY + 28, pageWidth - 14, startY + 28);

  // 2. Report Title & Meta
  startY = startY + 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI PRESENSI BULANAN', pageWidth / 2, startY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const monthTitle = `Bulan: ${MONTH_NAMES_ID[month]} ${year} | Kategori: ${categoryLabel} | Hari Belajar Efektif: ${effectiveDays} Hari`;
  doc.text(monthTitle, pageWidth / 2, startY + 5, { align: 'center' });

  // 3. Table Columns & Data
  const headDays = daysArray.map((d) => String(d));
  const headRow = ['No', category === 'siswa' ? 'NISN' : 'NIP', 'Nama Lengkap', ...headDays, 'H', 'S', 'I', 'A', '%'];

  const rows = targets.map((target, idx) => {
    let hadirCount = 0;
    let sakitCount = 0;
    let izinCount = 0;
    let alfaCount = 0;

    const dayCells = daysArray.map((day) => {
      const isHoliday = !!holidayMap[day];
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const record = attendance.find(
        (a) => a.targetId === target.id && a.date === dateStr
      );

      if (isHoliday) {
        return 'L';
      }

      if (record) {
        if (record.status === 'hadir') {
          hadirCount++;
          return 'H';
        } else if (record.status === 'sakit') {
          sakitCount++;
          return 'S';
        } else if (record.status === 'izin') {
          izinCount++;
          return 'I';
        } else if (record.status === 'alfa') {
          alfaCount++;
          return 'A';
        }
      }

      // If past date and no record found on an effective day, mark as '-' or alfa if past
      const recordDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (recordDate < today) {
        alfaCount++;
        return 'A';
      }
      return '-';
    });

    const totalTracked = hadirCount + sakitCount + izinCount + alfaCount;
    const percentage = effectiveDays > 0 ? Math.round((hadirCount / effectiveDays) * 100) : 0;

    return [
      String(idx + 1),
      target.code,
      target.name,
      ...dayCells,
      String(hadirCount),
      String(sakitCount),
      String(izinCount),
      String(alfaCount),
      `${percentage}%`,
    ];
  });

  // Calculate Column Widths
  const dayColWidth = Math.max(3.2, (pageWidth - 28 - 6 - 22 - 45 - 28) / totalDays);

  autoTable(doc, {
    startY: startY + 8,
    margin: { left: 14, right: 14 },
    head: [headRow],
    body: rows,
    styles: {
      fontSize: 6.5,
      cellPadding: 1,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 58, 138], // Indigo 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' }, // No
      1: { cellWidth: 20, halign: 'center' }, // NISN
      2: { cellWidth: 42, halign: 'left' }, // Name
      // days will auto calculate
    },
    didParseCell: (data) => {
      // Color holiday days and status badges
      const colIndex = data.column.index;
      if (colIndex >= 3 && colIndex < 3 + totalDays) {
        const dayNumber = colIndex - 2;
        if (holidayMap[dayNumber]) {
          if (data.section === 'head') {
            data.cell.styles.fillColor = [220, 38, 38]; // Red
          } else if (data.section === 'body') {
            data.cell.styles.fillColor = [254, 226, 226]; // Soft red
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (data.section === 'body') {
          const val = data.cell.raw;
          if (val === 'H') {
            data.cell.styles.textColor = [22, 101, 52]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'S') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [180, 83, 9]; // Amber
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'I') {
            data.cell.styles.fillColor = [224, 242, 254];
            data.cell.styles.textColor = [3, 105, 161]; // Sky
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'A') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  // Footer & Official Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const signatureY = finalY > pageHeight - 45 ? 18 : finalY;
  
  if (finalY > pageHeight - 45) {
    doc.addPage();
  }

  // Legend
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Keterangan Status: H = Hadir | S = Sakit | I = Izin | A = Alfa / Tanpa Keterangan | L = Hari Libur / Akhir Pekan', 14, signatureY);

  // Signatures
  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sigBlockY = signatureY + 8;

  // Left Signature: Wali Kelas / Guru Piket
  const leftX = 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Mengetahui,', leftX, sigBlockY, { align: 'center' });
  doc.text(category === 'siswa' && classId ? `Wali Kelas ${classId}` : 'Guru Piket / Operator', leftX, sigBlockY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('_________________________', leftX, sigBlockY + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. ........................................', leftX, sigBlockY + 28, { align: 'center' });

  // Right Signature: Kepala Sekolah
  const rightX = pageWidth - 45;
  doc.text(`Bojongkoneng, ${dateFormatted}`, rightX, sigBlockY, { align: 'center' });
  doc.text('Kepala Sekolah SD Negeri Bojongkoneng', rightX, sigBlockY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(schoolProfile.headmasterName, rightX, sigBlockY + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${schoolProfile.headmasterNip}`, rightX, sigBlockY + 28, { align: 'center' });

  // Save / Trigger Download
  const filename = `Rekap_Presensi_${categoryLabel.replace(/\s+/g, '_')}_${MONTH_NAMES_ID[month]}_${year}.pdf`;
  doc.save(filename);
};
