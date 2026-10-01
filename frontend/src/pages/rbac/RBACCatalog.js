import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RBACLayout from "./RBACLayout";
import { useRBAC } from "@/context/RBACContext";
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
  SlidersHorizontal,
  Folder,
  Wrench,
  AlertTriangle,
  Search,
  Plus,
  FileText,
  MoreVertical,
  Copy,
  LayoutGrid,
  Trash2,
  Edit3,
  RotateCcw,
  Check,
} from "lucide-react";

export default function RBACCatalog() {
  const navigate = useNavigate();

  const {
    catalogItems,
    roles,
    modules,
    stats,
    isSuperAdmin,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    resetToDefault,
    isModified,
  } = useRBAC();

  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newItemModule, setNewItemModule] = useState("PKS & KONTRAK");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemRoles, setNewItemRoles] = useState(["super_admin"]);

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemModule, setEditItemModule] = useState("");
  const [editItemRoles, setEditItemRoles] = useState([]);

  // Delete confirm
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // 4 Metric Card statistics matching Screenshot 3
  const catalogStats = useMemo(() => {
    return {
      totalItems: catalogItems.length,
      totalModules: modules.length,
      unassignedItems: catalogItems.filter((i) => i.roles.length === 0).length,
      outsideCatalog: stats.outsideCatalogCount,
    };
  }, [catalogItems, modules, stats]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      // Module filter
      if (selectedModule !== "all" && item.module !== selectedModule) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = (item.code || item.id).toLowerCase().includes(q);
        const matchModule = item.module.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchModule) return false;
      }
      return true;
    });
  }, [catalogItems, selectedModule, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Kode akses "${code}" disalin ke clipboard`);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCode.trim()) {
      toast.error("Nama butir dan kode akses wajib diisi");
      return;
    }

    const created = addCatalogItem({
      code: newItemCode.trim(),
      id: newItemCode.trim(),
      module: newItemModule,
      name: newItemName.trim(),
      desc: newItemDesc.trim() || "-",
      roles: newItemRoles,
    });

    if (created) {
      setNewItemName("");
      setNewItemCode("");
      setNewItemDesc("");
      setNewItemRoles(["super_admin"]);
      setAddModalOpen(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemDesc(item.desc || "");
    setEditItemModule(item.module);
    setEditItemRoles([...item.roles]);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editItemName.trim()) {
      toast.error("Nama butir akses tidak boleh kosong");
      return;
    }

    updateCatalogItem(editingItem.id, {
      name: editItemName.trim(),
      desc: editItemDesc.trim(),
      module: editItemModule,
      roles: editItemRoles,
    });

    setEditModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (item) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = () => {
    if (deleteConfirmItem) {
      deleteCatalogItem(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  const toggleRoleInEdit = (roleId) => {
    if (editItemRoles.includes(roleId)) {
      setEditItemRoles(editItemRoles.filter((id) => id !== roleId));
    } else {
      setEditItemRoles([...editItemRoles, roleId]);
    }
  };

  const toggleRoleInAdd = (roleId) => {
    if (newItemRoles.includes(roleId)) {
      setNewItemRoles(newItemRoles.filter((id) => id !== roleId));
    } else {
      setNewItemRoles([...newItemRoles, roleId]);
    }
  };

  // Action buttons
  const actionButtons = (
    <div className="flex items-center gap-2">
      {isSuperAdmin && isModified && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResetConfirmOpen(true)}
          data-testid="rbac-catalog-reset-btn"
          className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg h-9 flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Standar</span>
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/rbac")}
        data-testid="rbac-catalog-goto-roles-btn"
        className="border border-amber-400 text-amber-600 bg-white hover:bg-amber-50 rounded-lg px-4 h-9 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <FileText className="h-4 w-4 text-amber-500" />
        <span>Daftar Role</span>
      </Button>

      {isSuperAdmin && (
        <Button
          onClick={() => setAddModalOpen(true)}
          data-testid="rbac-catalog-add-btn"
          className="bg-[#008A85] hover:bg-[#00706c] text-white rounded-lg px-4 h-9 text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Akses</span>
        </Button>
      )}
    </div>
  );

  return (
    <RBACLayout breadcrumb="Katalog Akses" actionButtons={actionButtons}>
      <div className="space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Butir Akses */}
          <Card
            data-testid="stat-catalog-total-items"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#008A85] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {catalogStats.totalItems}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Butir katalog akses
              </div>
            </div>
          </Card>

          {/* Card 2: Total Modul */}
          <Card
            data-testid="stat-catalog-total-modules"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Folder className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {catalogStats.totalModules}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Modul terdaftar
              </div>
            </div>
          </Card>

          {/* Card 3: Akses Belum Di-assign */}
          <Card
            data-testid="stat-catalog-unassigned"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {catalogStats.unassignedItems}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Akses belum di-assign
              </div>
            </div>
          </Card>

          {/* Card 4: Di Luar Katalog */}
          <Card
            data-testid="stat-catalog-outside"
            className="p-5 border border-slate-200/80 shadow-xs rounded-xl flex items-center gap-4 bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {catalogStats.outsideCatalog}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Akses di luar katalog
              </div>
            </div>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="border border-slate-200/80 shadow-xs rounded-xl overflow-hidden bg-white p-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Module Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">
                  Modul
                </label>
                <select
                  data-testid="catalog-module-filter"
                  value={selectedModule}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-48 text-xs font-semibold uppercase tracking-wide border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
                >
                  <option value="all">SEMUA MODUL</option>
                  {modules.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">
                  Cari butir akses
                </label>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    data-testid="catalog-search-input"
                    placeholder="Nama, kode, atau modul..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-xs border-slate-200 rounded-lg h-[38px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-xs" data-testid="rbac-catalog-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-12 text-slate-500">No</th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[220px]">
                    Nama Butir Akses
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[180px]">
                    Kode Akses
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[150px]">
                    Modul
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold min-w-[120px] text-center">
                    Pemegang
                  </th>
                  <th className="py-3 px-4 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-400 italic"
                    >
                      Tidak ada butir akses yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const rowNumber = startIndex + idx + 1;
                    const itemCode = item.code || item.id;
                    const assignedCount = item.roles.length;

                    return (
                      <tr
                        key={item.id}
                        data-testid={`catalog-row-${itemCode}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-slate-500 font-normal">
                          {rowNumber}
                        </td>

                        {/* Nama Butir */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs md:text-sm">
                            {item.name}
                          </div>
                          {item.desc && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.desc}
                            </div>
                          )}
                        </td>

                        {/* Kode Akses */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleCopyCode(itemCode)}
                            title="Klik untuk menyalin kode"
                            className="group font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200/80 hover:bg-teal-50 hover:text-[#008A85] hover:border-teal-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{itemCode}</span>
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#008A85]" />
                          </button>
                        </td>

                        {/* Modul Badge */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-[#008A85] border border-teal-200/70">
                            {item.module}
                          </span>
                        </td>

                        {/* Pemegang Role */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center font-semibold text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {assignedCount} role
                          </span>
                        </td>

                        {/* Action Menu */}
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`catalog-action-btn-${itemCode}`}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 text-xs"
                            >
                              <DropdownMenuItem
                                onClick={() => handleCopyCode(itemCode)}
                                className="cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                <span>Salin Kode Akses</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => navigate("/rbac/banding")}
                                className="cursor-pointer"
                              >
                                <LayoutGrid className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                <span>Lihat di Matriks</span>
                              </DropdownMenuItem>

                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEdit(item)}
                                    className="cursor-pointer text-slate-700"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 mr-2 text-sky-600" />
                                    <span>Edit Butir Akses</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleDeleteItem(item)}
                                    className="text-rose-600 cursor-pointer focus:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    <span>Hapus Butir Akses</span>
                                  </DropdownMenuItem>
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
              Menampilkan {filteredItems.length > 0 ? startIndex + 1 : 0} sampai{" "}
              {Math.min(startIndex + pageSize, filteredItems.length)} dari{" "}
              {filteredItems.length} butir
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

      {/* Modal: Tambah Butir Akses */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Tambah Butir Akses Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tambahkan wewenang izin baru ke dalam katalog sistem RBAC CRS Maslahat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddItem} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Modul <span className="text-rose-500">*</span>
              </label>
              <select
                value={newItemModule}
                onChange={(e) => setNewItemModule(e.target.value)}
                className="w-full text-xs uppercase border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Kode Akses (Granular Code) <span className="text-rose-500">*</span>
              </label>
              <Input
                data-testid="add-item-code-input"
                placeholder="Contoh: contract:export_custom_pdf"
                value={newItemCode}
                onChange={(e) => setNewItemCode(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nama Butir Akses <span className="text-rose-500">*</span>
              </label>
              <Input
                data-testid="add-item-name-input"
                placeholder="Contoh: Ekspor Berkas Custom PDF"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Keterangan Teknis
              </label>
              <Input
                placeholder="Contoh: Mengizinkan download bundel PDF terenkripsi..."
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Initial Role Assignment */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Role Awal Pemegang Izin
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                {roles.map((r) => {
                  const checked = newItemRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoleInAdd(r.id)}
                        className="rounded border-slate-300 text-[#008A85] focus:ring-[#008A85]"
                      />
                      <span className="text-slate-800 font-medium">
                        {r.name}
                      </span>
                    </label>
                  );
                })}
              </div>
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
                data-testid="submit-add-item-btn"
                className="text-xs bg-[#008A85] hover:bg-[#00706c] text-white"
              >
                Simpan Butir Akses
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Butir Akses */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Edit Butir Akses: {editingItem?.code || editingItem?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ubah rincian wewenang atau perbarui daftar role pemegang akses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nama Butir Akses <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Modul
              </label>
              <select
                value={editItemModule}
                onChange={(e) => setEditItemModule(e.target.value)}
                className="w-full text-xs uppercase border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Keterangan
              </label>
              <Input
                value={editItemDesc}
                onChange={(e) => setEditItemDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Edit Assigned Roles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Role Pemegang Izin ({editItemRoles.length} role dipilih)
              </label>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                {roles.map((r) => {
                  const checked = editItemRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoleInEdit(r.id)}
                        className="rounded border-slate-300 text-[#008A85] focus:ring-[#008A85]"
                      />
                      <span className="text-slate-800 font-medium">
                        {r.name}
                      </span>
                    </label>
                  );
                })}
              </div>
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

      {/* Confirmation Modal for Delete Catalog Item */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-slate-900">
              Hapus Butir Akses "{deleteConfirmItem.name}"?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Butir ini akan dihapus dari katalog dan dicabut dari seluruh role di matriks perbandingan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmItem(null)}
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
              Kembalikan Seluruh Katalog ke Standar Awal?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengembalikan seluruh katalog butir hak akses ke standar awal BRD BSI Maslahat.
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
