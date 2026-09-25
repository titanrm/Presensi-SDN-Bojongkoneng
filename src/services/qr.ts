import QRCode from 'qrcode';
import { Student, Teacher } from '../types';

export const generateQrDataString = (target: Student | Teacher, type: 'siswa' | 'guru'): string => {
  if (type === 'siswa') {
    const s = target as Student;
    return `SDNBK:SISWA:${s.id}:${s.nisn}:${s.name}`;
  } else {
    const t = target as Teacher;
    return `SDNBK:GURU:${t.id}:${t.nip}:${t.name}`;
  }
};

export const parseQrDataString = (
  rawText: string
): { valid: boolean; targetType?: 'siswa' | 'guru'; id?: string; code?: string; name?: string } => {
  const clean = rawText.trim();

  // Pattern: SDNBK:SISWA:ID:NISN:NAME or SDNBK:GURU:ID:NIP:NAME
  if (clean.startsWith('SDNBK:')) {
    const parts = clean.split(':');
    if (parts.length >= 4) {
      const type = parts[1].toLowerCase() === 'siswa' ? 'siswa' : 'guru';
      return {
        valid: true,
        targetType: type,
        id: parts[2],
        code: parts[3],
        name: parts.slice(4).join(':') || undefined,
      };
    }
  }

  // Fallback: If it's a direct ID, NISN, or NIP
  return {
    valid: true,
    id: clean,
    code: clean,
  };
};

export const generateQrCodeDataUrl = async (text: string, options?: { size?: number; colorDark?: string }): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.size || 300,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: options?.colorDark || '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR Code Data URL:', err);
    throw err;
  }
};
