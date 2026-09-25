import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Holiday, SchoolProfile } from '../types';

interface HolidayManagerProps {
  holidays: Holiday[];
  schoolProfile: SchoolProfile;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onUpdateHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
  onBulkDeleteHolidays: (ids: string[]) => void;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  schoolProfile,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onBulkDeleteHolidays,
  onUpdateSchoolProfile,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'nasional' | 'sekolah'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    ids: string[];
    description: string;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'nasional' | 'sekolah'>('sekolah');
  const [formDesc, setFormDesc] = useState('');

  const openAddModal = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormName('');
    setFormType('sekolah');
    setFormDesc('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setFormDate(h.date);
    setFormName(h.name);
    setFormType(h.type);
    setFormDesc(h.description || '');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formName.trim()) {
      alert('Tanggal dan nama hari libur wajib diisi');
      return;
    }
    onAddHoliday({
      date: formDate,
      name: formName.trim(),
      type: formType,
      description: formDesc.trim() || undefined,
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday || !formDate || !formName.trim()) return;
    onUpdateHoliday({
      ...editingHoliday,
      date: formDate,
      name: formName.trim(),
      type: formType,
      description: formDesc.trim() || undefined,
    });
    setEditingHoliday(null);
  };

  const sortedHolidays = useMemo(() => {
    return [...holidays]
      .filter((h) => (filterType === 'all' ? true : h.type === filterType))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, filterType]);

  const allFilteredSelected =
    sortedHolidays.length > 0 &&
    sortedHolidays.every((h) => selectedIds.includes(h.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(sortedHolidays.map((h) => h.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newSet = new Set([...selectedIds, ...sortedHolidays.map((h) => h.id)]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmAndExecuteDelete = () => {
    if (!confirmDeleteModal) return;
    if (confirmDeleteModal.ids.length === 1) {
      onDeleteHoliday(confirmDeleteModal.ids[0]);
    } else {
      onBulkDeleteHolidays(confirmDeleteModal.ids);
    }
    setSelectedIds((prev) =>
      prev.filter((id) => !confirmDeleteModal.ids.includes(id))
    );
    setConfirmDeleteModal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Header & Policy */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            Manajemen Hari Libur & Kalender Pendidikan
          </h2>
          <p className="text-xs text-slate-500">
            Atur hari libur nasional dan libur khusus sekolah agar presensi tidak tercatat sebagai ketidakhadiran (Alfa).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Hari Libur</span>
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-rose-950">
              {selectedIds.length} Hari Libur Dipilih untuk Dihapus
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              Batalkan Pilihan
            </button>
            <button
              onClick={() =>
                setConfirmDeleteModal({
                  isOpen: true,
                  ids: selectedIds,
                  description: `${selectedIds.length} hari libur terpilih`,
                })
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eksekusi Hapus ({selectedIds.length} Data)</span>
            </button>
          </div>
        </div>
      )}

      {/* School Week Setting Pill */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-emerald-700" />
          <div>
            <h4 className="font-bold text-slate-900">Kebijakan Hari Efektif Sekolah</h4>
            <p className="text-slate-600">
              Hari Minggu otomatis ditetapkan sebagai hari libur. Tentukan apakah hari Sabtu juga dihitung libur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-emerald-300 shadow-sm">
          <button
            onClick={() => onUpdateSchoolProfile({ ...schoolProfile, schoolWeek: 5 })}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              schoolProfile.schoolWeek === 5
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5 Hari Sekolah (Senin - Jumat)
          </button>
          <button
            onClick={() => onUpdateSchoolProfile({ ...schoolProfile, schoolWeek: 6 })}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              schoolProfile.schoolWeek === 6
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Hari Sekolah (Senin - Sabtu)
          </button>
        </div>
      </div>

      {/* Filter and List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Pilih Semua</span>
            </label>

            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Semua Libur ({holidays.length})
              </button>
              <button
                onClick={() => setFilterType('nasional')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterType === 'nasional' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
                }`}
              >
                Libur Nasional ({holidays.filter((h) => h.type === 'nasional').length})
              </button>
              <button
                onClick={() => setFilterType('sekolah')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterType === 'sekolah' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
                }`}
              >
                Libur Khusus Sekolah ({holidays.filter((h) => h.type === 'sekolah').length})
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {sortedHolidays.map((h) => {
            const dateObj = new Date(h.date);
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            const isChecked = selectedIds.includes(h.id);

            return (
              <div
                key={h.id}
                className={`py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition ${
                  isChecked ? 'bg-emerald-50/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectOne(h.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />

                  <div
                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${
                      h.type === 'nasional'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <span>{dateObj.getDate()}</span>
                    <span className="text-[8px] uppercase">
                      {dateObj.toLocaleDateString('id-ID', { month: 'short' })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{h.name}</h4>
                    <p className="text-[11px] text-slate-500">{dateFormatted}</p>
                    {h.description && (
                      <p className="text-[10px] text-slate-400 italic">{h.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      h.type === 'nasional'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}
                  >
                    {h.type}
                  </span>

                  <button
                    onClick={() => openEditModal(h)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                    title="Edit Libur"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      setConfirmDeleteModal({
                        isOpen: true,
                        ids: [h.id],
                        description: `Hari Libur ${h.name} (${h.date})`,
                      })
                    }
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                    title="Hapus Libur Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Konfirmasi Eksekusi Hapus Hari Libur
            </h3>
            <p className="text-xs text-slate-600 text-center mb-4">
              Apakah Anda yakin ingin menghapus data{' '}
              <strong className="text-rose-700">{confirmDeleteModal.description}</strong>?
              Hari tersebut akan kembali dihitung sebagai hari sekolah aktif.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAndExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition active:scale-95"
              >
                Ya, Hapus Hari Libur
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      {(isAddModalOpen || editingHoliday) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Hari libur akan otomatis ditandai di kalender presensi dan rekapitulasi bulanan.
            </p>

            <form onSubmit={editingHoliday ? handleSaveEdit : handleSaveAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Libur *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Hari Libur *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Libur Awal Ramadhan / Ujian Khusus"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Libur</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'nasional' | 'sekolah')}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                >
                  <option value="sekolah">Libur Khusus Sekolah / Cuti Bersama</option>
                  <option value="nasional">Hari Libur Nasional Resmi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Berdasarkan Surat Edaran Disdik No..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
                >
                  {editingHoliday ? 'Simpan Perubahan' : 'Tambahkan Libur'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingHoliday(null);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
