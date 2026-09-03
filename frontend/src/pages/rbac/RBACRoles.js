import { useState, useEffect } from "react";
import RBACLayout from "./RBACLayout";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Users, ShieldAlert, CheckCircle2, XCircle, AlertTriangle,
  FileText, Scale, Eye, KeyRound, ArrowRight, Building2, HardDrive
} from "lucide-react";

export default function RBACRoles() {
  const [users, setUsers] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users").catch(() => ({ data: [] })),
      api.get("/admin/security-policy").catch(() => ({ data: null }))
    ]).then(([usersRes, policyRes]) => {
      setUsers(usersRes.data || []);
      setPolicy(policyRes.data || null);
      setLoading(false);
    });
  }, []);

  const rolesDef = [
    {
      id: "admin",
      label: "Administrator",
      subLabel: "Sistem & Keamanan",
      icon: Shield,
      color: "from-slate-800 to-slate-900 text-white",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
      accentBg: "bg-slate-50",
      description: "Bertanggung jawab atas pemeliharaan infrastruktur teknis, manajemen akun pengguna, pengaturan hak otorisasi, dan pemantauan jejak audit menyeluruh.",
      sodPrinciple: "Strict Isolation: Administrator TIDAK memiliki hak untuk mengubah klausul atau metadata kontrak per aturan kepatuhan audit (BRD Rule 3).",
      scope: "Akses Global (Seluruh Sistem)",
      capabilities: [
        "Membuat, mengaktifkan, dan menonaktifkan akun pengguna sistem",
        "Melihat seluruh log aktivitas (Audit Trail) dan histori transisi",
        "Mengelola konfigurasi sistem & memantau parameter keamanan",
        "Melihat seluruh repositori PKS untuk keperluan kepatuhan audit",
        "Dibatasi: Tidak diperbolehkan menyetujui atau mengubah isi kontrak"
      ],
      allowedUploads: ["Tidak melakukan pengunggahan dokumen legal"],
      demoAccount: "muhamadrizkiilahi03@gmail.com"
    },
    {
      id: "business_unit",
      label: "Business Unit",
      subLabel: "Inisiator PKS",
      icon: Building2,
      color: "from-teal-700 to-teal-900 text-white",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      accentBg: "bg-teal-50/50",
      description: "Unit kerja pemrakarsa kerja sama yang bertugas menyusun draft formulir awal PKS, melengkapi informasi mitra, dan mengunggah naskah rancangan (.docx).",
      sodPrinciple: "Tenant Isolation: Hanya dapat melihat, mengelola, dan mengunduh kontrak yang terafiliasi dengan unit kerjanya sendiri (Multi-tenant terisolasi).",
      scope: "Isolasi Terbatas (Hanya Unit Kerja Milik Sendiri)",
      capabilities: [
        "Mengajukan inisiasi draft PKS baru (Formulir Pengajuan)",
        "Mengunggah naskah draft rancangan berformat Word (.docx)",
        "Mengubah metadata kontrak saat berstatus 'Drafting' atau 'Revisi'",
        "Mengajukan permohonan penelaahan ke tim Legal (Kirim Review)",
        "Memberikan tanggapan/catatan pada sesi penelaahan berkas (Dual Review)"
      ],
      allowedUploads: [".docx (Microsoft Word Draft)"],
      demoAccount: "bu@bsimaslahat.co.id (Default: CRG)"
    },
    {
      id: "legal_officer",
      label: "Legal Officer / LCG",
      subLabel: "Penelaah Hukum",
      icon: Scale,
      color: "from-emerald-700 to-emerald-950 text-white",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      accentBg: "bg-emerald-50/50",
      description: "Tim ahli hukum (Legal and Compliance Group) yang memverifikasi keabsahan hukum klausul kerja sama, memimpin proses telaah ganda, dan menyetujui naskah final.",
      sodPrinciple: "Independent Verification: Memiliki hak approval/revisi, namun tidak diperbolehkan memodifikasi nilai finansial atau parameter komersial kontrak.",
      scope: "Akses Menyeluruh (Semua Unit Kerja Maslahat)",
      capabilities: [
        "Menyetujui (Approve), meminta perbaikan (Revision), atau menolak draft",
        "Menjalankan penelaahan komparatif (Dual Review side-by-side)",
        "Mengunggah naskah legal revisi (.docx) & scan hasil tandatangan (.pdf, .jpg, .png)",
        "Mengisi catatan legalitas (Legal Remarks) dan resolusi diskusi",
        "Memverifikasi dokumen akhir & mengaktifkan status PKS (Signed & Active)"
      ],
      allowedUploads: [".docx (Legal Version)", ".pdf (Scan PKS)", ".png, .jpg (Scan Gambar)"],
      demoAccount: "legal@bsimaslahat.co.id"
    },
    {
      id: "management",
      label: "Manajemen",
      subLabel: "Eksekutif & Pengawas",
      icon: Eye,
      color: "from-amber-600 to-amber-800 text-white",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      accentBg: "bg-amber-50/50",
      description: "Pimpinan eksekutif dan auditor internal yang membutuhkan visibilitas tingkat tinggi terhadap performa seluruh portofolio kerja sama BSI Maslahat secara real-time.",
      sodPrinciple: "Read-Only Observability: Akses pemantauan penuh terhadap analitik tanpa hak melakukan modifikasi data (Strict Non-Mutating Access).",
      scope: "Akses Eksekutif Read-Only (Semua Unit Kerja)",
      capabilities: [
        "Melihat Dasbor portofolio global seluruh unit kerja",
        "Mengakses grafik analitik nilai kontrak, distribusi status, dan timeline kadaluarsa",
        "Mengekspor laporan portofolio berkala ke format Excel dan PDF",
        "Melihat jejak audit dan rekaman sejarah siklus kontrak",
        "Dibatasi: Tidak dapat membuat draft, mengubah status, atau mengedit naskah"
      ],
      allowedUploads: ["Tidak melakukan pengunggahan dokumen"],
      demoAccount: "management@bsimaslahat.co.id"
    }
  ];

  return (
    <RBACLayout activeTab="/rbac/roles">
      <div className="space-y-6">
        {/* Intro summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Daftar Peran (Roles) & Matriks Wewenang
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap pengguna terikat pada satu peran eksklusif dengan pembatasan hak akses berbasis arsitektur RBAC ketat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Pengguna Terdaftar:</span>
            <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-bold px-2.5 py-0.5">
              {users.length} Akun Aktif
            </Badge>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rolesDef.map((role) => {
            const Icon = role.icon;
            const roleUsers = users.filter(u => u.role === role.id);

            return (
              <Card
                key={role.id}
                data-testid={`role-card-${role.id}`}
                className="overflow-hidden border-slate-200 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Card Header */}
                  <div className={`p-5 bg-gradient-to-r ${role.color} flex items-start justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg leading-tight text-white">{role.label}</h3>
                        <p className="text-xs text-white/80">{role.subLabel}</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
                      {roleUsers.length} Pengguna
                    </Badge>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {role.description}
                    </p>

                    {/* Scope Badge */}
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <HardDrive className="h-4 w-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Cakupan Data (Scope)</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{role.scope}</p>
                      </div>
                    </div>

                    {/* SoD Note */}
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{role.sodPrinciple}</span>
                    </div>

                    {/* Capabilities list */}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-2">Kewenangan & Fitur:</p>
                      <ul className="space-y-1.5">
                        {role.capabilities.map((cap, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            {cap.startsWith("Dibatasi") ? (
                              <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            <span className={cap.startsWith("Dibatasi") ? "text-rose-700 italic" : ""}>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Upload formats */}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-1">Format Unggah Izin:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {role.allowedUploads.map((fmt, i) => (
                          <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-200">
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Users list */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Akun Pengujian Demo:</span>
                    <span className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {role.demoAccount}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </RBACLayout>
  );
}
