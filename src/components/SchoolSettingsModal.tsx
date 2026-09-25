import React, { useState } from 'react';
import {
  School,
  X,
  Upload,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Shield,
} from 'lucide-react';
import { SchoolProfile } from '../types';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  onSaveProfile: (profile: SchoolProfile) => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [npsn, setNpsn] = useState(profile.npsn);
  const [address, setAddress] = useState(profile.address);
  const [village, setVillage] = useState(profile.village);
  const [district, setDistrict] = useState(profile.district);
  const [regency, setRegency] = useState(profile.regency);
  const [postalCode, setPostalCode] = useState(profile.postalCode);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [headmasterName, setHeadmasterName] = useState(profile.headmasterName);
  const [headmasterNip, setHeadmasterNip] = useState(profile.headmasterNip);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [schoolWeek, setSchoolWeek] = useState<5 | 6>(profile.schoolWeek);
  const [checkInStart, setCheckInStart] = useState(profile.checkInStart);
  const [checkInLate, setCheckInLate] = useState(profile.checkInLate);
  const [checkOutStart, setCheckOutStart] = useState(profile.checkOutStart);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      name,
      npsn,
      address,
      village,
      district,
      regency,
      province: profile.province,
      postalCode,
      email,
      phone,
      headmasterName,
      headmasterNip,
      logoUrl,
      schoolWeek,
      checkInStart,
      checkInLate,
      checkOutStart,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Profil & Pengaturan SD Negeri Bojongkoneng
              </h3>
              <p className="text-xs text-slate-500">
                Identitas sekolah, logo profil, kepala sekolah, dan kop surat laporan resmi
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-4">
          {/* Logo Upload Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-white shrink-0 shadow-sm flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Foto / Logo Profil Sekolah
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Logo ini akan ditampilkan pada kop surat laporan PDF bulanan, header aplikasi, dan ID Card siswa/guru.
              </p>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer shadow-sm transition">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Unggah Logo Baru</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* School Name & NPSN */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nama Resmi Sekolah *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NPSN *</label>
              <input
                type="text"
                required
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Sekolah</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Desa / Kelurahan</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={regency}
                onChange={(e) => setRegency(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Sekolah</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telepon Sekolah</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Headmaster info for Report Signatures */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              Informasi Kepala Sekolah (Penanda Tangan Laporan PDF)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  required
                  value={headmasterNip}
                  onChange={(e) => setHeadmasterNip(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* School Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mulai Presensi Masuk</label>
              <input
                type="time"
                value={checkInStart}
                onChange={(e) => setCheckInStart(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batas Keterlambatan</label>
              <input
                type="time"
                value={checkInLate}
                onChange={(e) => setCheckInLate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mulai Presensi Pulang</label>
              <input
                type="time"
                value={checkOutStart}
                onChange={(e) => setCheckOutStart(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition active:scale-95"
            >
              Simpan Pengaturan Profil
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
