import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ROLE_LABEL, useAuth } from "@/context/AuthContext";
import { OWNING_BUS_MAPPING, getFullBUName } from "@/lib/utils";
import {
  Users, UserPlus, Search, KeyRound, Edit3, Shield,
  Building2, Scale, Eye, CheckCircle2, XCircle, AlertTriangle,
  SlidersHorizontal, RefreshCw, Lock, ShieldCheck, Check, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("business_unit");
  const [formBU, setFormBU] = useState("CRG");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reset password form
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.business_unit_id && u.business_unit_id.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "all" || u.role === roleFilter;

      const isActive = u.is_active !== false;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("business_unit");
    setFormBU("CRG");
    setFormActive(true);
    setCreateOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole,
        business_unit_id: formRole === "business_unit" ? formBU : null,
        is_active: formActive
      };
      await api.post("/users", payload);
      toast.success(`Pengguna ${formName} berhasil ditambahkan`);
      setCreateOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal membuat pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormBU(u.business_unit_id || "CRG");
    setFormActive(u.is_active !== false);
    setEditOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        role: formRole,
        business_unit_id: formRole === "business_unit" ? formBU : null,
        is_active: formActive
      };
      await api.put(`/users/${selectedUser.id}`, payload);
      toast.success(`Wewenang akun ${formEmail} berhasil diperbarui`);
      setEditOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal memperbarui pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Reset Password Dialog
  const handleOpenReset = (u) => {
    setSelectedUser(u);
    setNewPassword("");
    setResetOpen(true);
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      toast.success(`Password untuk ${selectedUser.email} berhasil diatur ulang`);
      setResetOpen(false);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal mengatur ulang password");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (u) => {
    if (u.id === currentUser?.id) {
      toast.error("Anda tidak dapat menonaktifkan akun Anda sendiri");
      return;
    }
    const currentActive = u.is_active !== false;
    const nextStatus = !currentActive;
    try {
      await api.put(`/users/${u.id}`, { is_active: nextStatus });
      toast.success(`Akun ${u.email} berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      loadUsers();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal mengubah status akun");
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-slate-800 text-white border-0 font-medium">Administrator</Badge>;
      case "business_unit":
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-medium">Business Unit</Badge>;
      case "legal_officer":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium">Legal Officer</Badge>;
      case "management":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-200 font-medium">Manajemen</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-0">{role}</Badge>;
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.is_active !== false).length;
  const buCount = users.filter((u) => u.role === "business_unit").length;
  const legalCount = users.filter((u) => u.role === "legal_officer").length;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 md:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Otorisasi & Tata Kelola Pengguna</span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold mt-2 leading-tight flex items-center gap-3">
              <Users className="h-7 w-7 text-teal-400" /> Manajemen Pengguna & Akses
            </h1>
            <p className="text-sm text-teal-100 max-w-2xl mt-1 leading-relaxed">
              Atur dan pantau wewenang staf BSI Maslahat — penugasan peran (Role), pemetaan unit kerja (Business Unit), pengelolaan akun aktif, dan kredensial akses sistem untuk kesiapan skala produksi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/rbac/matrix">
              <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs h-10">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-2" /> Matriks RBAC
              </Button>
            </Link>
            {currentUser?.role === "admin" && (
              <Button
                data-testid="add-user-btn"
                onClick={handleOpenCreate}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 shadow-md shadow-teal-900/40"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Tambah Pengguna Baru
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-teal-200">Total Pengguna</p>
            <p className="text-xl font-bold font-mono mt-0.5">{totalUsers}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-teal-200">Pengguna Aktif</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-teal-200">Inisiator (BU)</p>
            <p className="text-xl font-bold font-mono text-teal-300 mt-0.5">{buCount}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-teal-200">Legal & Manajemen</p>
            <p className="text-xl font-bold font-mono text-amber-300 mt-0.5">{legalCount + (totalUsers - buCount - legalCount - 1)}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="search-users-input"
              placeholder="Cari nama, email, atau unit kerja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Peran:</span>
              <select
                data-testid="filter-role-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">Semua Peran</option>
                <option value="admin">Administrator</option>
                <option value="business_unit">Business Unit</option>
                <option value="legal_officer">Legal Officer</option>
                <option value="management">Manajemen</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                data-testid="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              className="h-9 px-2.5 text-xs text-slate-600 border-slate-200"
              title="Segarkan data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table Card */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs" data-testid="users-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="p-4">Pengguna</th>
                <th className="p-4">Peran (Role)</th>
                <th className="p-4">Afiliasi Unit Kerja</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                    {loading ? "Memuat data pengguna..." : "Tidak ada pengguna yang cocok dengan filter."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.is_active !== false;
                  const initials = (u.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      data-testid={`user-row-${u.email.replace("@", "-at-")}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-teal-600/10 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-200/50">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{u.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Business Unit */}
                      <td className="p-4">
                        {u.role === "business_unit" ? (
                          <div title={getFullBUName(u.business_unit_id)}>
                            <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-mono font-bold text-[11px]">
                              {u.business_unit_id || "-"}
                            </Badge>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                              {getFullBUName(u.business_unit_id)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Akses Global</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Role & Access */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            data-testid={`edit-user-${u.id}`}
                            className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-700"
                            title="Ubah peran & wewenang"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>

                          {/* Reset Password */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReset(u)}
                            data-testid={`reset-pw-user-${u.id}`}
                            className="h-8 px-2 text-xs text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-800"
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>

                          {/* Toggle Active Status */}
                          {currentUser?.role === "admin" && u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              data-testid={`toggle-status-user-${u.id}`}
                              className={`h-8 px-2 text-xs ${
                                isActive
                                  ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              }`}
                              title={isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
                            >
                              {isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DIALOG 1: TAMBAH PENGGUNA BARU */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-700" /> Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftarkan staf baru dan berikan peran (*Role*) sesuai wewenang operasionalnya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">Nama Lengkap</Label>
              <Input
                id="create-name"
                data-testid="create-user-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Muhammad Ilham"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">Email Resmi</Label>
              <Input
                id="create-email"
                data-testid="create-user-email"
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ilham@bsimaslahat.co.id"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700">Password Awal</Label>
              <Input
                id="create-password"
                data-testid="create-user-password"
                type="password"
                required
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role" className="text-xs font-semibold text-slate-700">Peran Sistem (Role)</Label>
              <select
                id="create-role"
                data-testid="create-user-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="business_unit">Business Unit (Inisiator PKS)</option>
                <option value="legal_officer">Legal Officer / LCG (Penelaah Hukum)</option>
                <option value="management">Manajemen (Eksekutif Read-Only)</option>
                <option value="admin">Administrator (Sistem & Akses)</option>
              </select>
            </div>

            {/* Business Unit Selector if role == business_unit */}
            {formRole === "business_unit" && (
              <div className="space-y-1.5 p-3 rounded-xl bg-teal-50/50 border border-teal-200">
                <Label htmlFor="create-bu" className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-700" /> Penugasan Unit Kerja (Business Unit)
                </Label>
                <select
                  id="create-bu"
                  data-testid="create-user-bu"
                  value={formBU}
                  onChange={(e) => setFormBU(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-teal-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
                >
                  {Object.entries(OWNING_BUS_MAPPING).map(([code, full]) => (
                    <option key={code} value={code}>
                      {full}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-teal-700 leading-tight">
                  Pengguna hanya akan dapat mengakses dan melihat kontrak milik unit kerja ini.
                </p>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="create-user-submit"
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9"
              >
                {submitting ? "Menyimpan..." : "Simpan Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT WEWENANG PENGGUNA */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-teal-700" /> Edit Wewenang & Akses
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sesuaikan hak akses untuk akun <strong>{formEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-700">Nama Lengkap</Label>
              <Input
                id="edit-name"
                data-testid="edit-user-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Akun</Label>
              <Input
                disabled
                value={formEmail}
                className="h-9 text-xs bg-slate-100 text-slate-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="text-xs font-semibold text-slate-700">Peran Sistem (Role)</Label>
              <select
                id="edit-role"
                data-testid="edit-user-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="business_unit">Business Unit (Inisiator PKS)</option>
                <option value="legal_officer">Legal Officer / LCG (Penelaah Hukum)</option>
                <option value="management">Manajemen (Eksekutif Read-Only)</option>
                <option value="admin">Administrator (Sistem & Akses)</option>
              </select>
            </div>

            {/* Business Unit Selector if role == business_unit */}
            {formRole === "business_unit" && (
              <div className="space-y-1.5 p-3 rounded-xl bg-teal-50/50 border border-teal-200">
                <Label htmlFor="edit-bu" className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-700" /> Penugasan Unit Kerja (Business Unit)
                </Label>
                <select
                  id="edit-bu"
                  data-testid="edit-user-bu"
                  value={formBU}
                  onChange={(e) => setFormBU(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-teal-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
                >
                  {Object.entries(OWNING_BUS_MAPPING).map(([code, full]) => (
                    <option key={code} value={code}>
                      {full}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Aktif Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-800">Status Akses Akun</p>
                <p className="text-[11px] text-slate-500">Nonaktifkan untuk memblokir login sementara/permanen</p>
              </div>
              <input
                type="checkbox"
                id="edit-active"
                data-testid="edit-user-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="edit-user-submit"
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9"
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: RESET PASSWORD */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" /> Reset Password Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Buat password baru untuk <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold text-slate-700">Password Baru</Label>
              <Input
                id="new-password"
                data-testid="reset-user-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-9 text-xs"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              Berikan password baru ini kepada staf bersangkutan. Password akan langsung dienkripsi secara aman (bcrypt).
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="reset-user-submit"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 font-semibold"
              >
                {submitting ? "Memproses..." : "Reset Password Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
