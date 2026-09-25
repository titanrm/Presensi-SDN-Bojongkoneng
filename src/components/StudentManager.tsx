import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  QrCode,
  Upload,
  UserCheck,
  UserX,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Student, Gender } from '../types';

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkDeleteStudents: (ids: string[]) => void;
  onBulkAddStudents: (students: Omit<Student, 'id' | 'createdAt'>[]) => void;
  onSelectForIdCard: (student: Student) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkDeleteStudents,
  onBulkAddStudents,
  onSelectForIdCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected for bulk deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    ids: string[];
    description: string;
  } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');

  // Form state
  const [formNisn, setFormNisn] = useState('');
  const [formNis, setFormNis] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<Gender>('L');
  const [formClass, setFormClass] = useState('1A');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  const openAddModal = () => {
    setFormNisn('');
    setFormNis('');
    setFormName('');
    setFormGender('L');
    setFormClass('1A');
    setFormParentName('');
    setFormParentPhone('');
    setFormStatus('aktif');
    setIsAddModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormNisn(s.nisn);
    setFormNis(s.nis);
    setFormName(s.name);
    setFormGender(s.gender);
    setFormClass(s.classId);
    setFormParentName(s.parentName);
    setFormParentPhone(s.parentPhone);
    setFormStatus(s.status);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formNisn.trim()) {
      alert('Nama dan NISN wajib diisi');
      return;
    }
    onAddStudent({
      nisn: formNisn.trim(),
      nis: formNis.trim() || formNisn.trim().slice(-6),
      name: formName.trim(),
      gender: formGender,
      classId: formClass,
      parentName: formParentName.trim() || 'Orang Tua / Wali',
      parentPhone: formParentPhone.trim() || '-',
      status: formStatus,
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !formName.trim() || !formNisn.trim()) return;
    onUpdateStudent({
      ...editingStudent,
      nisn: formNisn.trim(),
      nis: formNis.trim(),
      name: formName.trim(),
      gender: formGender,
      classId: formClass,
      parentName: formParentName.trim(),
      parentPhone: formParentPhone.trim(),
      status: formStatus,
    });
    setEditingStudent(null);
  };

  // Bulk import parse
  const handleProcessBulk = () => {
    if (!bulkCsvText.trim()) return;
    const lines = bulkCsvText.trim().split('\n');
    const newStudents: Omit<Student, 'id' | 'createdAt'>[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 3) {
        const nisn = parts[0];
        const name = parts[1];
        const gender = parts[2]?.toUpperCase() === 'P' ? 'P' : 'L';
        const classId = parts[3] || '1A';
        const parentName = parts[4] || 'Orang Tua / Wali';
        const parentPhone = parts[5] || '-';

        if (nisn && name && nisn.toLowerCase() !== 'nisn') {
          newStudents.push({
            nisn,
            nis: nisn.slice(-6),
            name,
            gender: gender as Gender,
            classId,
            parentName,
            parentPhone,
            status: 'aktif',
          });
        }
      }
    });

    if (newStudents.length > 0) {
      onBulkAddStudents(newStudents);
      alert(`Berhasil menambahkan ${newStudents.length} siswa baru!`);
      setIsBulkModalOpen(false);
      setBulkCsvText('');
    } else {
      alert('Format CSV tidak valid. Pastikan format: NISN, Nama, Gender (L/P), Kelas');
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          s.nis.includes(q) ||
          s.parentName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, classFilter, genderFilter, statusFilter, searchQuery]);

  // Bulk Selection Logic
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect all filtered
      const filteredIdSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Select all filtered
      const newSet = new Set([...selectedIds, ...filteredStudents.map((s) => s.id)]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDeleteModal({
      isOpen: true,
      ids: selectedIds,
      description: `${selectedIds.length} data siswa terpilih`,
    });
  };

  const confirmAndExecuteDelete = () => {
    if (!confirmDeleteModal) return;
    if (confirmDeleteModal.ids.length === 1) {
      onDeleteStudent(confirmDeleteModal.ids[0]);
    } else {
      onBulkDeleteStudents(confirmDeleteModal.ids);
    }
    // Remove from selected
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
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            Manajemen Data Siswa SD Negeri Bojongkoneng
          </h2>
          <p className="text-xs text-slate-500">
            Total terdaftar: <strong>{students.length} Siswa</strong> • Aktif:{' '}
            <strong className="text-emerald-700">
              {students.filter((s) => s.status === 'aktif').length}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-rose-950">
              {selectedIds.length} Siswa Dipilih untuk Tindakan Masal
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
              onClick={handleExecuteBulkDelete}
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
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Kelas:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="all">Semua Kelas</option>
              <option value="1A">Kelas 1A</option>
              <option value="1B">Kelas 1B</option>
              <option value="2A">Kelas 2A</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="all">Semua</option>
              <option value="L">Laki-Laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          {/* Status Filter */}
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, NISN, atau orang tua..."
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
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN / NIS</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Orang Tua / No HP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data siswa.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isChecked = selectedIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-400">ID: {s.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-800">{s.nisn}</div>
                        <div className="text-[11px] text-slate-400">NIS: {s.nis}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.gender === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {s.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          Kelas {s.classId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{s.parentName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.parentPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectForIdCard(s)}
                            title="Lihat & Cetak ID Card QR"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            title="Edit Data Siswa"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDeleteModal({
                                isOpen: true,
                                ids: [s.id],
                                description: `Siswa ${s.name} (${s.nisn})`,
                              })
                            }
                            title="Hapus Siswa Ini"
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

      {/* Delete Confirmation Modal (Both Single and Bulk) */}
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
              Data yang dihapus akan segera disinkronkan ke database Google Sheet.
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

      {/* Add / Edit Student Modal */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Lengkapi informasi identitas siswa untuk pembuatan ID Card dan basis data sekolah.
            </p>

            <form onSubmit={editingStudent ? handleSaveEdit : handleSaveAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aditya Pratama Putra"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NISN (10 Digit) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="0165432101"
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIS Sekolah</label>
                  <input
                    type="text"
                    placeholder="242501001"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="1A">Kelas 1A</option>
                    <option value="1B">Kelas 1B</option>
                    <option value="2A">Kelas 2A</option>
                    <option value="3">Kelas 3</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Pratama"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No HP / WhatsApp Ortu</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingStudent(null);
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

      {/* Bulk CSV Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Import Masal Data Siswa (CSV / Excel)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Salin dan tempel baris data siswa dengan format berikut per baris:
              <br />
              <code className="text-[11px] font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800">
                NISN, Nama Siswa, Gender (L/P), Kelas, Nama Ortu, No WA
              </code>
            </p>

            <textarea
              rows={8}
              placeholder={`0165432110, Ahmad Maulana, L, 1A, Supardi, 081234567801\n0165432111, Citra Kirana, P, 1A, Hendra, 081234567802`}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full text-xs p-3 font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={handleProcessBulk}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition"
              >
                Proses & Simpan Siswa
              </button>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
