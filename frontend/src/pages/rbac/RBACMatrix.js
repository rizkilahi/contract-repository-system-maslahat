import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RBACLayout from "./RBACLayout";
import { useRBAC } from "@/context/RBACContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Check,
  Search,
  FileText,
  ShieldCheck,
  RotateCcw,
  Plus,
  X,
  SlidersHorizontal,
  Info,
} from "lucide-react";

export default function RBACMatrix() {
  const navigate = useNavigate();

  const {
    roles,
    catalogItems,
    modules,
    isSuperAdmin,
    editMode,
    setEditMode,
    togglePermission,
    bulkToggleModule,
    resetToDefault,
    isModified,
    saving,
  } = useRBAC();

  // Filter states
  const [selectedModule, setSelectedModule] = useState("PKS & KONTRAK");
  const [selectedRoleId, setSelectedRoleId] = useState("all");
  const [search, setSearch] = useState("");
  const [roleColumnFilter, setRoleColumnFilter] = useState("has_access"); // "has_access" or "all"
  const [rowAccessFilter, setRowAccessFilter] = useState("all"); // "all", "has_access", "no_access"

  // Quick action state
  const [quickRoleTarget, setQuickRoleTarget] = useState("");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // 1. Filter items by module, search, and row access
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
        if (!matchName && !matchCode) return false;
      }
      // Row access filter
      if (rowAccessFilter === "has_access" && item.roles.length === 0) {
        return false;
      }
      if (rowAccessFilter === "no_access" && item.roles.length > 0) {
        return false;
      }
      return true;
    });
  }, [catalogItems, selectedModule, search, rowAccessFilter]);

  // 2. Identify all roles that have access in the current module / filtered items
  const rolesWithAccessInCurrentModule = useMemo(() => {
    const roleIdSet = new Set();
    filteredItems.forEach((item) => {
      item.roles.forEach((rId) => roleIdSet.add(rId));
    });
    return roles.filter((r) => roleIdSet.has(r.id));
  }, [filteredItems, roles]);

  // 3. Determine visible columns for roles
  const visibleRoles = useMemo(() => {
    // If user specifically picked a single role
    if (selectedRoleId !== "all") {
      return roles.filter((r) => r.id === selectedRoleId);
    }
    // If "Punya akses" is selected
    if (roleColumnFilter === "has_access") {
      return rolesWithAccessInCurrentModule.length > 0
        ? rolesWithAccessInCurrentModule
        : roles.slice(0, 8);
    }
    // "Semua role"
    return roles;
  }, [selectedRoleId, roleColumnFilter, rolesWithAccessInCurrentModule, roles]);

  // Summary counts for footer
  const summaryModule = selectedModule === "all" ? "SEMUA MODUL" : selectedModule;
  const summaryAksesCount = filteredItems.length;
  const summaryRoleCount = rolesWithAccessInCurrentModule.length;
  const summaryOtherRoleCount = Math.max(0, roles.length - summaryRoleCount);

  // Top action buttons
  const actionButtons = (
    <div className="flex items-center gap-2">
      {isSuperAdmin && (
        <>
          {isModified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmResetOpen(true)}
              data-testid="rbac-reset-btn"
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg h-9 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset ke Standar</span>
            </Button>
          )}

          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            data-testid="rbac-toggle-edit-mode-btn"
            className={`rounded-lg px-3 h-9 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              editMode
                ? "bg-[#008A85] text-white hover:bg-[#00706c]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{editMode ? "Mode Edit Aktif" : "Aktifkan Edit"}</span>
          </Button>
        </>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/rbac")}
        data-testid="rbac-matrix-goto-roles-btn"
        className="border border-amber-400 text-amber-600 bg-white hover:bg-amber-50 rounded-lg px-4 h-9 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <FileText className="h-4 w-4 text-amber-500" />
        <span>Daftar Role</span>
      </Button>
    </div>
  );

  return (
    <RBACLayout
      breadcrumb="Perbandingan Akses"
      actionButtons={actionButtons}
    >
      <Card className="border border-slate-200/80 shadow-xs rounded-xl overflow-hidden bg-white">
        {/* Super Admin Edit Notification Banner */}
        {isSuperAdmin && editMode && (
          <div className="bg-teal-50/80 border-b border-teal-200/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-[#008A85] animate-pulse" />
              <ShieldCheck className="h-4 w-4 text-[#008A85]" />
              <span>
                <strong>Mode Pengubahan Super Admin Aktif:</strong> Klik langsung pada kotak izin di tabel untuk mengaktifkan atau mencabut hak akses role.
              </span>
            </div>

            {/* Quick Bulk Actions for Module */}
            {selectedModule !== "all" && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Aksi Cepat Modul:</span>
                <select
                  value={quickRoleTarget}
                  onChange={(e) => setQuickRoleTarget(e.target.value)}
                  className="text-[11px] border border-teal-300 rounded px-2 py-1 bg-white text-slate-700"
                >
                  <option value="">Pilih Role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <Button
                  size="xs"
                  variant="outline"
                  disabled={!quickRoleTarget}
                  onClick={() => {
                    if (quickRoleTarget) bulkToggleModule(quickRoleTarget, selectedModule, true);
                  }}
                  className="h-6 text-[11px] px-2 text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50"
                >
                  Beri Semua
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={!quickRoleTarget}
                  onClick={() => {
                    if (quickRoleTarget) bulkToggleModule(quickRoleTarget, selectedModule, false);
                  }}
                  className="h-6 text-[11px] px-2 text-rose-700 border-rose-300 bg-white hover:bg-rose-50"
                >
                  Cabut Semua
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filter 1: Modul */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Modul</label>
              <select
                data-testid="matrix-module-select"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full text-xs font-semibold uppercase tracking-wide border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                <option value="all">SEMUA MODUL</option>
                {modules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Role yang dibandingkan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Role yang dibandingkan</label>
              <select
                data-testid="matrix-role-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                <option value="all">Semua role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Cari akses */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Cari akses</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  data-testid="matrix-search-input"
                  placeholder="Keterangan atau kode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs border-slate-200 rounded-lg h-[34px] bg-white"
                />
              </div>
            </div>

            {/* Filter 4: Kolom role */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Kolom role</label>
              <select
                data-testid="matrix-role-col-filter"
                value={roleColumnFilter}
                onChange={(e) => setRoleColumnFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                <option value="has_access">Punya akses</option>
                <option value="all">Semua</option>
              </select>
            </div>

            {/* Filter 5: Baris akses */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Baris akses</label>
              <select
                data-testid="matrix-row-filter"
                value={rowAccessFilter}
                onChange={(e) => setRowAccessFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#008A85]"
              >
                <option value="all">Semua</option>
                <option value="has_access">Hanya yang punya akses</option>
                <option value="no_access">Belum ada akses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Matrix Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" data-testid="rbac-matrix-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold">
                {/* Column: Akses */}
                <th className="py-3 px-4 min-w-[260px] text-slate-700 font-semibold sticky left-0 bg-slate-50/95 z-10 border-r border-slate-200/80">
                  Akses
                </th>

                {/* Column: Punya */}
                <th className="py-3 px-3 w-16 text-center text-slate-700 font-semibold border-r border-slate-200/80">
                  Punya
                </th>

                {/* Dynamic Role Columns */}
                {visibleRoles.map((role) => (
                  <th
                    key={role.id}
                    className="py-3 px-3 min-w-[120px] text-center text-slate-700 font-semibold border-r border-slate-100 last:border-r-0 whitespace-nowrap"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + visibleRoles.length}
                    className="py-12 text-center text-slate-400 italic"
                  >
                    Tidak ada butir akses yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const itemCode = item.code || item.id;
                  return (
                    <tr
                      key={item.id}
                      data-testid={`matrix-row-${itemCode}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Akses Title & Monospace Code */}
                      <td className="py-3 px-4 align-middle sticky left-0 bg-white hover:bg-slate-50/60 z-10 border-r border-slate-200/80">
                        <div className="font-medium text-slate-800 text-xs">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {itemCode}
                        </div>
                      </td>

                      {/* Count of Roles Having Access */}
                      <td className="py-3 px-3 text-center align-middle font-semibold text-slate-700 border-r border-slate-200/80">
                        {item.roles.length}
                      </td>

                      {/* Role Checkbox Cells */}
                      {visibleRoles.map((role) => {
                        const hasAccess = item.roles.includes(role.id);

                        return (
                          <td
                            key={role.id}
                            className={`py-2 px-3 text-center align-middle border-r border-slate-100 last:border-r-0 transition-colors ${
                              hasAccess ? "bg-emerald-50/30" : "bg-white"
                            }`}
                          >
                            {isSuperAdmin && editMode ? (
                              <button
                                type="button"
                                onClick={() => togglePermission(role.id, item.id)}
                                data-testid={`toggle-cell-${role.id}-${item.id}`}
                                title={
                                  hasAccess
                                    ? `Klik untuk MENCABUT izin "${item.name}" dari ${role.name}`
                                    : `Klik untuk MEMBERIKAN izin "${item.name}" kepada ${role.name}`
                                }
                                className="group inline-flex items-center justify-center p-1 rounded-md hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[#008A85]"
                              >
                                {hasAccess ? (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 group-hover:bg-rose-100 group-hover:text-rose-700 group-hover:border-rose-400 transition-colors shadow-2xs">
                                    <Check className="h-4 w-4 group-hover:hidden" />
                                    <X className="h-4 w-4 hidden group-hover:inline text-rose-600" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded border border-dashed border-slate-300 bg-slate-50/50 text-slate-300 group-hover:border-emerald-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                    <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div>
                                {hasAccess ? (
                                  <span
                                    title={`${role.name} memiliki izin`}
                                    className="inline-flex items-center justify-center h-5 w-5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                ) : (
                                  <span
                                    title={`${role.name} tidak memiliki izin`}
                                    className="inline-flex items-center justify-center h-5 w-5 rounded border border-slate-200 bg-slate-50/50 text-slate-300"
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div
          data-testid="matrix-footer-summary"
          className="p-4 border-t border-slate-100 bg-slate-50/40 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2"
        >
          <div>
            <span className="font-semibold text-slate-700 uppercase tracking-wide">
              {summaryModule}
            </span>{" "}
            · {summaryAksesCount} akses · {summaryRoleCount} role
            {summaryOtherRoleCount > 0 && (
              <span>
                {" "}
                · {summaryOtherRoleCount} role lain belum punya akses di modul ini
              </span>
            )}
          </div>

          {isSuperAdmin && isModified && (
            <div className="flex items-center gap-1.5 text-teal-700 text-[11px] font-medium">
              <Info className="h-3.5 w-3.5" />
              <span>Perubahan tersimpan otomatis di database & browser</span>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Modal for Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-slate-900">
              Reset ke Konfigurasi Standar?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengembalikan seluruh matriks hak akses, daftar role, dan katalog izin kembali ke baseline standar BRD BSI Maslahat. Perubahan kustom Anda akan dihapus.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmResetOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await resetToDefault();
                  setConfirmResetOpen(false);
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
