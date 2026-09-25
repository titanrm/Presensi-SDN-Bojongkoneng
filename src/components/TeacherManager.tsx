import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  QrCode,
  Phone,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Teacher, Gender } from '../types';

interface TeacherManagerProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onBulkDeleteTeachers: (ids: string[]) => void;
  onSelectForIdCard: (teacher: Teacher) => void;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onBulkDeleteTeachers,
  onSelectForIdCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    ids: string[];
    description: string;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form state
  const [formNip, setFormNip] = useState('');
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('S.Pd.');
  const [formGender, setFormGender] = useState<Gender>('L');
  const [formRole, setFormRole] = useState('Guru Kelas');
  const [formClassAssigned, setFormClassAssigned] = useState('1A');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  const openAddModal = () => {
    setFormNip('');
    setFormName('');
    setFormTitle('S.Pd.');
    setFormGender('L');
    setFormRole('Guru Kelas');
    setFormClassAssigned('1A');
    setFormPhone('');
    setFormStatus('aktif');
    setIsAddModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFormNip(t.nip);
    setFormName(t.name);
    setFormTitle(t.title);
    setFormGender(t.gender);
    setFormRole(t.role);
    setFormClassAssigned(t.classAssigned || '-');
    setFormPhone(t.phone);
    setFormStatus(t.status);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama guru wajib diisi');
      return;
    }
    onAddTeacher({
      nip: formNip.trim() || '-',
      name: formName.trim(),
      title: formTitle.trim(),
      gender: formGender,
      role: formRole === 'Guru Kelas' ? `Guru Kelas ${formClassAssigned}` : formRole,
      classAssigned: formRole === 'Guru Kelas' ? formClassAssigned : undefined,
      phone: formPhone.trim() || '-',
      status: formStatus,
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !formName.trim()) return;
    onUpdateTeacher({
      ...editingTeacher,
      nip: formNip.trim() || '-',
      name: formName.trim(),
      title: formTitle.trim(),
      gender: formGender,
      role: formRole.startsWith('Guru Kelas') && formClassAssigned !== '-' ? `Guru Kelas ${formClassAssigned}` : formRole,
      classAssigned: formRole.startsWith('Guru Kelas') ? formClassAssigned : undefined,
      phone: formPhone.trim(),
      status: formStatus,
    });
    setEditingTeacher(null);
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (roleFilter !== 'all' && !t.role.toLowerCase().includes(roleFilter.toLowerCase())) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.nip.includes(q) ||
          t.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, roleFilter, statusFilter, searchQuery]);

  const allFilteredSelected =
    filteredTeachers.length > 0 &&
    filteredTeachers.every((t) => selectedIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredTeachers.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newSet = new Set([...selectedIds, ...filteredTeachers.map((t) => t.id)]);
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
      onDeleteTeacher(confirmDeleteModal.ids[0]);
    } else {
      onBulkDeleteTeachers(confirmDeleteModal.ids);
    }
    setSelectedIds((prev) =>
      prev.filter((id) => !confirmDeleteModal.ids.includes(id))
    );
    setConfirmDeleteModal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Header & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Data Guru & Tenaga Kependidikan SD Negeri Bojongkoneng
          </h2>
          <p className="text-xs text-slate-500">
            Total terdaftar: <strong>{teachers.length} Pendidik & Staf</strong> • Aktif:{' '}
            <strong className="text-emerald-700">{teachers.filter((t) => t.status === 'aktif').length}</strong>
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru / Staf</span>
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
              {selectedIds.length} Guru / Staf Dipilih untuk Dihapus
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
                  description: `${selectedIds.length} data guru/staf terpilih`,
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Jabatan:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="all">Semua Jabatan</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Guru Kelas">Guru Kelas</option>
              <option value="PJOK">Guru PJOK</option>
              <option value="PAI">Guru PAI</option>
              <option value="Operator">Operator & TU</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    title="Pilih Semua Data di Halaman Ini"
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                <th className="py-3 px-4">NIP / NUPTK</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Jabatan / Tugas</th>
                <th className="py-3 px-4">No HP / WA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data guru atau staf.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const isChecked = selectedIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(t.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {t.name}, <span className="font-medium text-slate-600">{t.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">ID: {t.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {t.nip}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.gender === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {t.gender === 'L' ? 'L' : 'P'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                            t.role === 'Kepala Sekolah'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {t.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {t.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectForIdCard(t)}
                            title="Lihat & Cetak ID Card QR"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(t)}
                            title="Edit Data Guru"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDeleteModal({
                                isOpen: true,
                                ids: [t.id],
                                description: `Guru ${t.name}, ${t.title}`,
                              })
                            }
                            title="Hapus Guru Ini"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              Konfirmasi Eksekusi Hapus
            </h3>
            <p className="text-xs text-slate-600 text-center mb-4">
              Apakah Anda yakin ingin menghapus data{' '}
              <strong className="text-rose-700">{confirmDeleteModal.description}</strong>?
              Data akan terhapus dan disinkronkan ke database Google Sheets.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAndExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition active:scale-95"
              >
                Ya, Hapus Sekarang
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

      {/* Add / Edit Teacher Modal */}
      {(isAddModalOpen || editingTeacher) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingTeacher ? 'Edit Data Pendidik' : 'Tambah Guru / GTK Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Lengkapi data pendidik untuk pembuatan ID Card dan presensi SD Negeri Bojongkoneng.
            </p>

            <form onSubmit={editingTeacher ? handleSaveEdit : handleSaveAdd} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap (Tanpa Gelar) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gelar</label>
                  <input
                    type="text"
                    placeholder="S.Pd.SD"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
                  <input
                    type="text"
                    placeholder="19750918 200501 1 008 (atau - jika honorer)"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Tugas</label>
                  <select
                    value={formRole.startsWith('Guru Kelas') ? 'Guru Kelas' : formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="Guru Kelas">Guru Kelas</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Guru PJOK">Guru PJOK</option>
                    <option value="Guru PAI">Guru PAI</option>
                    <option value="Operator Dapodik & TU">Operator Dapodik & TU</option>
                    <option value="Tenaga Perpustakaan">Tenaga Perpustakaan</option>
                    <option value="Penjaga Sekolah">Penjaga Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Pengampu</label>
                  <select
                    value={formClassAssigned}
                    onChange={(e) => setFormClassAssigned(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="-">- (Bukan Guru Kelas)</option>
                    <option value="1A">Kelas 1A</option>
                    <option value="1B">Kelas 1B</option>
                    <option value="2A">Kelas 2A</option>
                    <option value="3">Kelas 3</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081324567891"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'aktif' | 'nonaktif')}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
                >
                  {editingTeacher ? 'Simpan Perubahan' : 'Tambahkan Pendidik'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTeacher(null);
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
