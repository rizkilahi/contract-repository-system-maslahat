import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RBACLayout from "./RBACLayout";
import { useRBAC, SYSTEM_ROLE_IDS } from "@/context/RBACContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Shield,
  SlidersHorizontal,
  KeyRound,
  AlertTriangle,
  Search,
  Plus,
  LayoutGrid,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Check,
} from "lucide-react";

export default function RBACRoles() {
  const navigate = useNavigate();

  const {
    roles,
    catalogItems,
    stats,
    isSuperAdmin,
    addRole,
    updateRole,
    deleteRole,
    toggleRBACMenuForRole,
    resetToDefault,
    isModified,
  } = useRBAC();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleCopyFrom, setNewRoleCopyFrom] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");

  const [selectedRoleDetail, setSelectedRoleDetail] = useState(null);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.desc && r.desc.toLowerCase().includes(q))
    );
  }, [roles, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + pageSize);

  // Handlers
  const handleAddRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Nama role wajib diisi");
      return;
    }

    const created = addRole({
      name: newRoleName.trim(),
      desc: newRoleDesc.trim() || "-",
      copyFromRoleId: newRoleCopyFrom || null,
    });

    if (created) {
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRoleCopyFrom("");
      setAddModalOpen(false);
    }
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.desc || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editRoleName.trim()) {
      toast.error("Nama role tidak boleh kosong");
      return;
    }

    updateRole(editingRole.id, {
      name: editRoleName.trim(),
      desc: editRoleDesc.trim(),
    });

    setEditModalOpen(false);
    setEditingRole(null);
  };

  const handleDeleteRole = (role) => {
    if (SYSTEM_ROLE_IDS.includes(role.id)) {
      toast.error(`Role "${role.name}" merupakan role sistem utama dan tidak dapat dihapus!`);
      return;
    }
    setDeleteConfirmRole(role);
  };

  const confirmDelete = () => {
    if (deleteConfirmRole) {
      deleteRole(deleteConfirmRole.id);
      setDeleteConfirmRole(null);
    }
  };

  // Action buttons rendered in breadcrumb header
  const actionButtons = (
    <div className="flex items-center gap-2">
      {isSuperAdmin && isModified && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResetConfirmOpen(true)}
          data-testid="rbac-reset-baseline-btn"
          className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg h-9 flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Standar</span>
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/rbac/banding")}
        data-testid="rbac-goto-perbandingan-btn"
        className="border border-amber-400 text-amber-600 bg-white hover:bg-amber-50 rounded-lg px-4 h-9 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <LayoutGrid className="h-4 w-4 text-amber-500" />
        <span>Perbandingan</span>
      </Button>

      {isSuperAdmin && (
        <Button
          onClick={() => setAddModalOpen(true)}
          data-testid="rbac-add-role-btn"
          className="bg-[#008A85] hover:bg-[#00706c] text-white rounded-lg px-4 h-9 text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Role</span>
        </Button>
      )}
    </div>
  );

  return (
    <RBACLayout breadcrumb="Role & Akses" actionButtons={actionButtons}>
      <div className="space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Role */}
          <Card
            data-testid="stat-total-roles"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#008A85] flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.totalRoles}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Role terdaftar
              </div>
            </div>
          </Card>

          {/* Card 2: Total Butir Akses */}
          <Card
            data-testid="stat-total-catalog"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.totalCatalog}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Butir katalog akses
              </div>
            </div>
          </Card>

          {/* Card 3: Role Tanpa Akses */}
          <Card
            data-testid="stat-zero-access"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.rolesWithoutAccess}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Role tanpa akses
              </div>
            </div>
          </Card>

          {/* Card 4: Di Luar Katalog */}
          <Card
            data-testid="stat-outside-catalog"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.outsideCatalogCount}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Akses di luar katalog
              </div>
            </div>
          </Card>
        </div>

        {/* Roles Table Card */}
        <Card className="border border-slate-200/80 shadow-xs rounded-xl overflow-hidden bg-white p-4">
          {/* Search Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">
                Cari role
              </label>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  data-testid="rbac-role-search-input"
                  placeholder="Nama atau keterangan..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 text-xs border-slate-200 rounded-lg h-9"
                />
              </div>
            </div>
          </div>

          {/* Roles Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-xs" data-testid="rbac-roles-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-12 text-slate-500">No</th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[200px]">
                    Nama Role
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[260px]">
                    Keterangan
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[160px]">
                    Akses
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[100px]">
                    Modul
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[130px]">
                    Di luar katalog
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[130px] text-center">
                    Menu RBAC
                  </th>
                  <th className="py-3 px-4 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRoles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400 italic"
                    >
                      Tidak ada role yang sesuai dengan pencarian "{search}".
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role, idx) => {
                    const rowNumber = startIndex + idx + 1;
                    const percent =
                      stats.totalCatalog > 0
                        ? Math.round((role.accessCount / stats.totalCatalog) * 100)
                        : 0;
                    const isHighAccess = percent > 50;

                    return (
                      <tr
                        key={role.id}
                        data-testid={`role-row-${role.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-slate-500 font-normal">
                          {rowNumber}
                        </td>

                        {/* Nama Role */}
                        <td className="py-3 px-4 font-semibold text-slate-800 text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            {SYSTEM_ROLE_IDS.includes(role.id) && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Sistem
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Keterangan */}
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {role.desc || "-"}
                        </td>

                        {/* Akses with progress bar */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1.5 w-32">
                            <span className="text-[11px] font-medium text-slate-600">
                              {role.accessCount} / {stats.totalCatalog}
                            </span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isHighAccess ? "bg-amber-500" : "bg-[#008A85]"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Modul count */}
                        <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                          {role.moduleCount} / 12
                        </td>

                        {/* Di luar katalog */}
                        <td className="py-3 px-4">
                          {role.outsideCatalog > 0 ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                              {role.outsideCatalog} kode
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Menu RBAC ON / OFF Toggle */}
                        <td className="py-3 px-4 text-center">
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => toggleRBACMenuForRole(role.id)}
                              data-testid={`toggle-menu-${role.id}`}
                              title={
                                role.rbacMenuEnabled
                                  ? `Menu RBAC sedang AKTIF di sidebar untuk ${role.name}. Klik untuk mematikan (OFF).`
                                  : `Menu RBAC sedang NONAKTIF di sidebar untuk ${role.name}. Klik untuk mengaktifkan (ON).`
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
                                role.rbacMenuEnabled
                                  ? "bg-teal-50 text-[#008A85] border border-teal-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-teal-50 hover:text-[#008A85] hover:border-teal-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  role.rbacMenuEnabled ? "bg-[#008A85]" : "bg-slate-400"
                                }`}
                              />
                              <span>{role.rbacMenuEnabled ? "ON (Aktif)" : "OFF"}</span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                role.rbacMenuEnabled
                                  ? "bg-teal-50 text-[#008A85] border border-teal-200"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {role.rbacMenuEnabled ? "ON" : "OFF"}
                            </span>
                          )}
                        </td>

                        {/* Action Menu */}
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`role-action-btn-${role.id}`}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 text-xs"
                            >
                              <DropdownMenuItem
                                onClick={() => setSelectedRoleDetail(role)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                <span>Lihat Detail Role</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate("/rbac/banding")}
                                className="cursor-pointer"
                              >
                                <LayoutGrid className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                <span>Bandingkan di Matriks</span>
                              </DropdownMenuItem>

                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toggleRBACMenuForRole(role.id)}
                                    className="cursor-pointer text-slate-700"
                                  >
                                    <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-teal-600" />
                                    <span>
                                      {role.rbacMenuEnabled ? "Matikan Menu RBAC (OFF)" : "Aktifkan Menu RBAC (ON)"}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEdit(role)}
                                    className="cursor-pointer text-slate-700"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 mr-2 text-sky-600" />
                                    <span>Edit Info Role</span>
                                  </DropdownMenuItem>

                                  {!SYSTEM_ROLE_IDS.includes(role.id) && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRole(role)}
                                      className="text-rose-600 cursor-pointer focus:text-rose-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      <span>Hapus Role</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Menampilkan {filteredRoles.length > 0 ? startIndex + 1 : 0} sampai{" "}
              {Math.min(startIndex + pageSize, filteredRoles.length)} dari{" "}
              {filteredRoles.length} role
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Baris per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 text-xs focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-lg"
                >
                  Sebelumnya
                </Button>
                <span className="px-2 font-medium text-slate-700">
                  {validCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="h-8 px-2.5 text-xs rounded-lg"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal: Tambah Role Baru */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Tambah Role Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Buat peran baru dalam sistem RBAC BSI Maslahat. Hak akses butir dapat diatur melalui matriks perbandingan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRole} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nama Role <span className="text-rose-500">*</span>
              </label>
              <Input
                data-testid="add-role-name-input"
                placeholder="Contoh: Manager Operasional"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Keterangan
              </label>
              <Input
                data-testid="add-role-desc-input"
                placeholder="Contoh: Bertanggung jawab atas verifikasi dokumen..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Salin Wewenang dari Role Lain (Opsional)
              </label>
              <select
                value={newRoleCopyFrom}
                onChange={(e) => setNewRoleCopyFrom(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                <option value="">Kosong (Role baru tanpa hak akses awal)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    Salin dari {r.name} ({r.accessCount} akses)
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                data-testid="submit-add-role-btn"
                className="text-xs bg-[#008A85] hover:bg-[#00706c] text-white"
              >
                Simpan Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Info Role */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Edit Data Role
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perbarui nama atau keterangan peran dalam sistem CRS Maslahat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nama Role <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Keterangan
              </label>
              <Input
                value={editRoleDesc}
                onChange={(e) => setEditRoleDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-[#008A85] hover:bg-[#00706c] text-white"
              >
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Detail Role */}
      <Dialog
        open={!!selectedRoleDetail}
        onOpenChange={(open) => !open && setSelectedRoleDetail(null)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#008A85]" />
              <span>Detail Role: {selectedRoleDetail?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informasi kapabilitas dan rincian hak akses yang dimiliki dalam sistem.
            </DialogDescription>
          </DialogHeader>

          {selectedRoleDetail && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">Keterangan:</div>
                <div className="text-slate-600 leading-relaxed">
                  {selectedRoleDetail.desc || "Tidak ada keterangan tambahan."}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 text-center">
                  <div className="text-lg font-bold text-[#008A85]">
                    {selectedRoleDetail.accessCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Butir Akses</div>
                </div>
                <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100 text-center">
                  <div className="text-lg font-bold text-sky-700">
                    {selectedRoleDetail.moduleCount} / 12
                  </div>
                  <div className="text-[11px] text-slate-500">Modul Terkait</div>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100 text-center">
                  <div className="text-lg font-bold text-amber-700">
                    {selectedRoleDetail.outsideCatalog}
                  </div>
                  <div className="text-[11px] text-slate-500">Di Luar Katalog</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-sm font-bold mt-1">
                    {selectedRoleDetail.rbacMenuEnabled ? (
                      <span className="text-[#008A85]">ON (Aktif)</span>
                    ) : (
                      <span className="text-slate-400">OFF (Nonaktif)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">Menu Sidebar RBAC</div>
                </div>
              </div>

              {/* Granted Permissions List */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">
                  Daftar Hak Akses yang Dimiliki:
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1 divide-y divide-slate-100">
                  {catalogItems
                    .filter((item) => item.roles.includes(selectedRoleDetail.id))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="py-1.5 px-2 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-medium text-slate-800">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.code || item.id}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                          {item.module}
                        </span>
                      </div>
                    ))}
                  {catalogItems.filter((item) =>
                    item.roles.includes(selectedRoleDetail.id)
                  ).length === 0 && (
                    <div className="p-4 text-center text-slate-400 italic">
                      Role ini belum memiliki hak akses apapun.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRoleDetail(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRoleDetail(null);
                    navigate("/rbac/banding");
                  }}
                  className="bg-[#008A85] hover:bg-[#00706c] text-white text-xs flex items-center gap-1"
                >
                  <span>Atur di Matriks Perbandingan</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Delete Role */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-slate-900">
              Hapus Role "{deleteConfirmRole.name}"?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Role ini akan dihapus secara permanen dari sistem dan seluruh hak akses yang terhubung akan dicabut.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmRole(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={confirmDelete}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Baseline */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-slate-900">
              Kembalikan Seluruh Role ke Standar Awal?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengembalikan seluruh daftar role, hak akses, dan matriks ke standar bawaan BRD CRS Maslahat.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetConfirmOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await resetToDefault();
                  setResetConfirmOpen(false);
                }}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Reset Standar
              </Button>
            </div>
          </div>
        </div>
      )}
    </RBACLayout>
  );
}
