import { useState, useMemo } from "react";
import RBACLayout from "./RBACLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  SlidersHorizontal, Search, Shield, KeyRound, Copy, Check,
  AlertOctagon, AlertTriangle, Info, CheckCircle2, Building2, Scale, Eye
} from "lucide-react";

export default function RBACCatalog() {
  const [search, setSearch] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [copiedSlug, setCopiedSlug] = useState(null);

  const permissions = [
    // Kontrak
    {
      slug: "contract:create",
      name: "Inisiasi Pengajuan PKS",
      module: "Manajemen Kontrak",
      endpoint: "POST /api/contracts",
      risk: "MEDIUM",
      desc: "Membuat dokumen kerja sama baru dengan nomor identifikasi unik otomatis.",
      roles: ["admin", "business_unit"]
    },
    {
      slug: "contract:read_own",
      name: "Baca Kontrak Unit Sendiri",
      module: "Manajemen Kontrak",
      endpoint: "GET /api/contracts (filtered by BU)",
      risk: "LOW",
      desc: "Melihat daftar dan rincian metadata kontrak yang terafiliasi dengan unit kerja akun login.",
      roles: ["business_unit"]
    },
    {
      slug: "contract:read_all",
      name: "Baca Kontrak Lintas Unit",
      module: "Manajemen Kontrak",
      endpoint: "GET /api/contracts",
      risk: "LOW",
      desc: "Melihat seluruh portofolio kontrak kerja sama dari seluruh unit kerja BSI Maslahat.",
      roles: ["admin", "legal_officer", "management"]
    },
    {
      slug: "contract:update_metadata",
      name: "Modifikasi Atribut Komersial",
      module: "Manajemen Kontrak",
      endpoint: "PUT /api/contracts/{id}",
      risk: "HIGH",
      desc: "Mengubah atribut non-kunci seperti judul, rekanan, dan tanggal pada status drafting atau revisi.",
      roles: ["business_unit"]
    },
    {
      slug: "contract:update_legal",
      name: "Modifikasi Catatan Legalitas",
      module: "Manajemen Kontrak",
      endpoint: "PUT /api/contracts/{id}",
      risk: "MEDIUM",
      desc: "Mengisi catatan penelaahan hukum dan rekomendasi klausul kerja sama.",
      roles: ["legal_officer"]
    },
    {
      slug: "contract:transition_review",
      name: "Pengajuan Telaah Hukum",
      module: "Manajemen Kontrak",
      endpoint: "PATCH /api/contracts/{id}/status",
      risk: "MEDIUM",
      desc: "Mengajukan draft PKS ke antrian penelaahan tim Legal and Compliance Group.",
      roles: ["business_unit"]
    },
    {
      slug: "contract:transition_approve",
      name: "Persetujuan Legalitas Draft",
      module: "Manajemen Kontrak",
      endpoint: "PATCH /api/contracts/{id}/status",
      risk: "HIGH",
      desc: "Menyetujui klausul naskah perjanjian dan memajukan status ke 'Ready for Signature'.",
      roles: ["legal_officer"]
    },
    {
      slug: "contract:transition_reject",
      name: "Penolakan / Permintaan Revisi",
      module: "Manajemen Kontrak",
      endpoint: "PATCH /api/contracts/{id}/status",
      risk: "HIGH",
      desc: "Menolak draf atau mengembalikan naskah ke inisiator untuk perbaikan klausul.",
      roles: ["legal_officer"]
    },
    {
      slug: "contract:transition_activate",
      name: "Verifikasi Akhir & Aktivasi",
      module: "Manajemen Kontrak",
      endpoint: "PATCH /api/contracts/{id}/status",
      risk: "CRITICAL",
      desc: "Mengonfirmasi keabsahan tanda tangan berkas scan dan mengaktifkan PKS secara resmi.",
      roles: ["legal_officer"]
    },

    // Dokumen
    {
      slug: "file:upload_draft",
      name: "Unggah Naskah Word (.docx)",
      module: "Dokumen & File",
      endpoint: "POST /api/contracts/{id}/versions",
      risk: "MEDIUM",
      desc: "Mengunggah naskah rancangan perjanjian berformat Microsoft Word (.docx).",
      roles: ["business_unit", "legal_officer"]
    },
    {
      slug: "file:upload_signed",
      name: "Unggah Scan Bertandatangan",
      module: "Dokumen & File",
      endpoint: "POST /api/contracts/{id}/versions",
      risk: "HIGH",
      desc: "Mengunggah dokumen scan hasil tandatangan basah/elektronik berformat PDF atau Gambar.",
      roles: ["legal_officer"]
    },
    {
      slug: "file:view_inline",
      name: "Pratinjau Dokumen Inline",
      module: "Dokumen & File",
      endpoint: "GET /api/files/{id}?inline=1",
      risk: "LOW",
      desc: "Menampilkan dokumen di dalam iframe atau browser tab dengan otentikasi token.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },
    {
      slug: "file:download",
      name: "Unduh Dokumen Berkas Asli",
      module: "Dokumen & File",
      endpoint: "GET /api/files/{id}",
      risk: "LOW",
      desc: "Mengunduh file fisik naskah kontrak dari server penyimpanan lokal.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },

    // Dual Review
    {
      slug: "review:comment_create",
      name: "Tulis Catatan Review",
      module: "Dual Review",
      endpoint: "POST /api/contracts/{id}/comments",
      risk: "LOW",
      desc: "Menulis tanggapan atau evaluasi pada pasal draft maupun berkas scan tandatangan.",
      roles: ["admin", "business_unit", "legal_officer"]
    },
    {
      slug: "review:comment_resolve",
      name: "Selesaikan Catatan Diskusi",
      module: "Dual Review",
      endpoint: "POST /api/comments/{id}/resolve",
      risk: "MEDIUM",
      desc: "Menandai bahwa rekomendasi atau perbaikan pasal telah tuntas disepakati bersama.",
      roles: ["admin", "legal_officer"]
    },

    // Laporan & Analitik
    {
      slug: "analytics:view_dashboard",
      name: "Lihat Ringkasan KPI Dasbor",
      module: "Laporan & Analitik",
      endpoint: "GET /api/dashboard/stats",
      risk: "LOW",
      desc: "Mengakses metrik 4 kartu KPI utama (Aktif, Menunggu Verifikasi, Kadaluarsa).",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },
    {
      slug: "analytics:view_portfolio",
      name: "Analitik Grafik Portofolio",
      module: "Laporan & Analitik",
      endpoint: "GET /api/dashboard/analytics",
      risk: "LOW",
      desc: "Melihat visualisasi statistik nilai rupiah, distribusi institusi, dan tren waktu.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },
    {
      slug: "report:export_excel",
      name: "Ekspor Portofolio Excel",
      module: "Laporan & Analitik",
      endpoint: "GET /api/reports/portfolio.xlsx",
      risk: "MEDIUM",
      desc: "Mengunduh rekapitulasi portofolio format spreadsheet lengkap dengan tab ringkasan.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },
    {
      slug: "report:export_pdf",
      name: "Ekspor Dokumen PDF",
      module: "Laporan & Analitik",
      endpoint: "GET /api/reports/portfolio.pdf",
      risk: "MEDIUM",
      desc: "Mengunduh cetakan ringkasan laporan portofolio berformat dokumen PDF landscape.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },

    // Administrasi
    {
      slug: "admin:user_manage",
      name: "Manajemen Akun Pengguna",
      module: "Tata Kelola & Sistem",
      endpoint: "GET, POST /api/users",
      risk: "CRITICAL",
      desc: "Mengelola hak akses, mengaktifkan akun, dan menugaskan role ke staf Maslahat.",
      roles: ["admin"]
    },
    {
      slug: "admin:audit_view",
      name: "Akses Audit Trail Kepatuhan",
      module: "Tata Kelola & Sistem",
      endpoint: "GET /api/contracts/{id}/audit",
      risk: "MEDIUM",
      desc: "Memeriksa jejak audit forensik perubahan status, pengunggahan file, dan modifikasi.",
      roles: ["admin", "business_unit", "legal_officer", "management"]
    },
    {
      slug: "admin:policy_inspect",
      name: "Inspeksi Kebijakan RBAC",
      module: "Tata Kelola & Sistem",
      endpoint: "GET /api/admin/security-policy",
      risk: "LOW",
      desc: "Melihat parameter aktif column-level lock, sliding session, dan alur transisi status.",
      roles: ["admin", "legal_officer", "management"]
    }
  ];

  const filtered = useMemo(() => {
    return permissions.filter((p) => {
      const matchRisk = selectedRisk === "all" || p.risk === selectedRisk;
      const matchRole = selectedRole === "all" || p.roles.includes(selectedRole);
      const matchSearch =
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.desc.toLowerCase().includes(search.toLowerCase()) ||
        p.endpoint.toLowerCase().includes(search.toLowerCase());
      return matchRisk && matchRole && matchSearch;
    });
  }, [search, selectedRisk, selectedRole]);

  const copySlug = (slug) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    toast.success(`Izin "${slug}" disalin ke clipboard`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case "CRITICAL":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">Kritis</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-bold">Tinggi</Badge>;
      case "MEDIUM":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">Sedang</Badge>;
      default:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Rendah</Badge>;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span key={role} className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono">Admin</span>;
      case "business_unit":
        return <span key={role} className="text-[10px] bg-teal-100 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded font-mono">Business Unit</span>;
      case "legal_officer":
        return <span key={role} className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">Legal</span>;
      case "management":
        return <span key={role} className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-mono">Manajemen</span>;
      default:
        return null;
    }
  };

  return (
    <RBACLayout activeTab="/rbac/catalog">
      <div className="space-y-6">
        {/* Filter Card */}
        <Card className="p-5 border-slate-200 bg-white space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Katalog Hak Akses & Inventaris Izin (Permission Registry)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar lengkap seluruh kapabilitas granular sistem, tingkat risiko keamanan, dan pemetaan ke endpoint API.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                data-testid="catalog-search"
                placeholder="Cari slug, nama, atau API..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            {/* Risk filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium mr-1">Tingkat Risiko:</span>
              {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRisk(r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedRisk === r
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r === "all" ? "Semua" : r}
                </button>
              ))}
            </div>

            {/* Role filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium mr-1">Filter Role:</span>
              {[
                { id: "all", label: "Semua Role" },
                { id: "admin", label: "Admin" },
                { id: "business_unit", label: "Business Unit" },
                { id: "legal_officer", label: "Legal" },
                { id: "management", label: "Manajemen" }
              ].map((rl) => (
                <button
                  key={rl.id}
                  onClick={() => setSelectedRole(rl.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedRole === rl.id
                      ? "bg-teal-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rl.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan <strong>{filtered.length}</strong> dari {permissions.length} kapabilitas izin</span>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 italic">
              Tidak ada izin yang memenuhi kriteria pencarian.
            </div>
          ) : (
            filtered.map((perm) => (
              <Card
                key={perm.slug}
                data-testid={`catalog-item-${perm.slug.replace(":", "-")}`}
                className="p-4 border-slate-200 bg-white space-y-3 shadow-sm hover:border-teal-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {perm.module}
                        </span>
                        {getRiskBadge(perm.risk)}
                      </div>
                      <h3 className="font-heading font-bold text-sm text-slate-900 mt-1">
                        {perm.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => copySlug(perm.slug)}
                      title="Salin kode izin"
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {copiedSlug === perm.slug ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {perm.desc}
                  </p>

                  {/* Slug code */}
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono text-slate-700">
                    <span className="truncate">{perm.slug}</span>
                  </div>

                  {/* Endpoint */}
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">Endpoint:</span>
                    <code className="text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded font-mono text-[10px] border border-teal-100">
                      {perm.endpoint}
                    </code>
                  </div>
                </div>

                {/* Granted Roles */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Diberikan kepada:</span>
                  <div className="flex flex-wrap gap-1">
                    {perm.roles.map((r) => getRoleBadge(r))}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </RBACLayout>
  );
}
