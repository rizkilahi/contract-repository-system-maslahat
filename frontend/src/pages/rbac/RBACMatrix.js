import { useState, useMemo } from "react";
import RBACLayout from "./RBACLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, AlertCircle, Search, Filter,
  Shield, Building2, Scale, Eye, FileText, Check, Minus, Info
} from "lucide-react";

export default function RBACMatrix() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "Semua Kategori" },
    { id: "contract", label: "Manajemen Kontrak" },
    { id: "document", label: "Dokumen & File" },
    { id: "review", label: "Dual Review" },
    { id: "report", label: "Laporan & Analitik" },
    { id: "security", label: "Tata Kelola & Sistem" },
  ];

  const matrixData = [
    // 1. Kontrak
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Inisiasi / Pengajuan PKS Baru",
      desc: "Membuat formulir draft kerja sama awal dan menentukan mitra",
      admin: { allowed: true, note: "Bisa inisiasi sebagai superuser" },
      bu: { allowed: true, note: "Inisiator utama bagi unit kerja terkait" },
      legal: { allowed: false, note: "Fokus pada fungsi penelaahan hukum" },
      mgmt: { allowed: false, note: "Fungsi pengawasan read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Edit Metadata Komersial (Nilai, Judul, Tanggal)",
      desc: "Mengubah atribut kontrak pada status drafting / revision_required",
      admin: { allowed: false, note: "Dilarang per BRD Rule 3 (Audit Integrity)" },
      bu: { allowed: true, note: "Hanya saat status drafting/revisi" },
      legal: { allowed: false, note: "Legal dilarang mengubah nilai finansial" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Edit Catatan Legalitas (Legal Remarks)",
      desc: "Menambahkan catatan penelaahan hukum pada kontrak",
      admin: { allowed: false, note: "Bukan ranah administrator" },
      bu: { allowed: false, note: "Khusus kewenangan pejabat legal" },
      legal: { allowed: true, note: "Kewenangan eksklusif Legal Officer" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Kirim ke Legal Review (Status Transition)",
      desc: "Mengubah status drafting ➔ submitted_for_review",
      admin: { allowed: false, note: "Diinisiasi oleh unit pemilik" },
      bu: { allowed: true, note: "Hanya untuk kontrak unitnya sendiri" },
      legal: { allowed: false, note: "Penerima berkas masuk" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Legal Approval (Siap Ditandatangani)",
      desc: "Mengubah status under_legal_review ➔ ready_for_signature",
      admin: { allowed: false, note: "Wewenang yuridis tim legal" },
      bu: { allowed: false, note: "Tidak berhak approve klausul hukum" },
      legal: { allowed: true, note: "Setelah draft disetujui" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Permintaan Revisi / Penolakan Draft",
      desc: "Mengembalikan berkas ke unit kerja untuk diperbaiki",
      admin: { allowed: false, note: "Wewenang yuridis tim legal" },
      bu: { allowed: false, note: "Penerima revisi" },
      legal: { allowed: true, note: "Menolak intake atau minta revisi" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "contract",
      categoryLabel: "Manajemen Kontrak",
      action: "Verifikasi Scan & Aktivasi (Signed & Active)",
      desc: "Menyatakan PKS resmi aktif dan berlaku secara hukum",
      admin: { allowed: false, note: "Kewenangan kepatuhan hukum" },
      bu: { allowed: false, note: "Hanya mengunggah bukti tanda tangan" },
      legal: { allowed: true, note: "Verifikasi akhir dokumen tandatangan" },
      mgmt: { allowed: false, note: "Read-only" }
    },

    // 2. Dokumen
    {
      category: "document",
      categoryLabel: "Dokumen & File",
      action: "Unggah Naskah Draft Word (.docx)",
      desc: "Mengunggah file naskah kerja sama format Microsoft Word",
      admin: { allowed: false, note: "Bukan pelaksana operasional" },
      bu: { allowed: true, note: "Format .docx diizinkan" },
      legal: { allowed: true, note: "Format .docx legal version diizinkan" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "document",
      categoryLabel: "Dokumen & File",
      action: "Unggah Scan Hasil Tandatangan (.pdf/.jpg)",
      desc: "Mengunggah bukti naskah asli yang telah ditandatangani basah/elektronik",
      admin: { allowed: false, note: "Bukan pelaksana operasional" },
      bu: { allowed: false, note: "Dibatasi ke format .docx" },
      legal: { allowed: true, note: "Khusus verifikasi scan PDF/Gambar" },
      mgmt: { allowed: false, note: "Read-only" }
    },
    {
      category: "document",
      categoryLabel: "Dokumen & File",
      action: "Pratinjau Dokumen Inline (PDF/DOCX Text)",
      desc: "Melihat naskah dokumen langsung di browser tanpa unduh",
      admin: { allowed: true, note: "Akses inspeksi audit" },
      bu: { allowed: "own", note: "Terbatas pada kontrak unitnya sendiri" },
      legal: { allowed: true, note: "Akses seluruh kontrak kerja sama" },
      mgmt: { allowed: true, note: "Akses seluruh kontrak kerja sama" }
    },
    {
      category: "document",
      categoryLabel: "Dokumen & File",
      action: "Unduh Dokumen Berkas Asli",
      desc: "Mengunduh file arsip kontrak dari server penyimpanan",
      admin: { allowed: true, note: "Akses inspeksi audit" },
      bu: { allowed: "own", note: "Terbatas pada kontrak unitnya sendiri" },
      legal: { allowed: true, note: "Akses seluruh kontrak kerja sama" },
      mgmt: { allowed: true, note: "Akses seluruh kontrak kerja sama" }
    },

    // 3. Dual Review
    {
      category: "review",
      categoryLabel: "Dual Review",
      action: "Akses Layar Telaah Ganda (Side-by-Side)",
      desc: "Membuka layar perbandingan naskah draft dan scan tandatangan",
      admin: { allowed: true, note: "Pengawasan sistem" },
      bu: { allowed: "own", note: "Hanya untuk kontrak miliknya" },
      legal: { allowed: true, note: "Ruang kerja utama penelaah legal" },
      mgmt: { allowed: true, note: "Pemantauan diskusi" }
    },
    {
      category: "review",
      categoryLabel: "Dual Review",
      action: "Menulis Komentar & Catatan Diskusi",
      desc: "Memberikan masukan pasal dan catatan review",
      admin: { allowed: true, note: "Catatan administratif" },
      bu: { allowed: "own", note: "Tanggapan terhadap review" },
      legal: { allowed: true, note: "Ulasan pasal dan persyaratan hukum" },
      mgmt: { allowed: false, note: "Read-only observer" }
    },
    {
      category: "review",
      categoryLabel: "Dual Review",
      action: "Menyelesaikan Komentar (Resolve)",
      desc: "Menandai poin catatan diskusi telah tuntas disepakati",
      admin: { allowed: true, note: "Bypass administratif" },
      bu: { allowed: false, note: "Hanya penelaah yang berhak menutup" },
      legal: { allowed: true, note: "Verifikator catatan hukum" },
      mgmt: { allowed: false, note: "Read-only" }
    },

    // 4. Laporan & Analitik
    {
      category: "report",
      categoryLabel: "Laporan & Analitik",
      action: "Melihat Dasbor Seluruh Unit (Cross-BU)",
      desc: "Melihat ringkasan KPI dan tabel kontrak seluruh Maslahat",
      admin: { allowed: true, note: "Visibilitas global" },
      bu: { allowed: false, note: "Terisolasi pada unit kerjanya sendiri" },
      legal: { allowed: true, note: "Visibilitas global" },
      mgmt: { allowed: true, note: "Visibilitas global eksekutif" }
    },
    {
      category: "report",
      categoryLabel: "Laporan & Analitik",
      action: "Analitik Portofolio & Grafik Nilai PKS",
      desc: "Melihat grafik distribusi status, instansi, dan nilai rupiah",
      admin: { allowed: true, note: "Seluruh portofolio" },
      bu: { allowed: "own", note: "Grafik dihitung khusus unitnya" },
      legal: { allowed: true, note: "Seluruh portofolio" },
      mgmt: { allowed: true, note: "Seluruh portofolio" }
    },
    {
      category: "report",
      categoryLabel: "Laporan & Analitik",
      action: "Ekspor Laporan Resmi (Excel & PDF)",
      desc: "Mengunduh rekapitulasi portofolio PKS berkala",
      admin: { allowed: true, note: "Ekspor menyeluruh" },
      bu: { allowed: "own", note: "Ekspor terbatas kontrak unitnya" },
      legal: { allowed: true, note: "Ekspor menyeluruh" },
      mgmt: { allowed: true, note: "Ekspor eksekutif menyeluruh" }
    },

    // 5. Tata Kelola & Sistem
    {
      category: "security",
      categoryLabel: "Tata Kelola & Sistem",
      action: "Manajemen Akun Pengguna (Users)",
      desc: "Menambah, mengedit role, atau me-reset kredensial user",
      admin: { allowed: true, note: "Wewenang eksklusif administrator" },
      bu: { allowed: false, note: "Dilarang" },
      legal: { allowed: false, note: "Dilarang" },
      mgmt: { allowed: "view", note: "Hanya dapat melihat daftar user" }
    },
    {
      category: "security",
      categoryLabel: "Tata Kelola & Sistem",
      action: "Akses Audit Trail Kepatuhan",
      desc: "Melihat histori tamper-proof log perubahan dan transisi kontrak",
      admin: { allowed: true, note: "Akses audit penuh" },
      bu: { allowed: "own", note: "Audit log kontrak miliknya" },
      legal: { allowed: true, note: "Audit log seluruh kontrak" },
      mgmt: { allowed: true, note: "Audit log seluruh kontrak" }
    },
    {
      category: "security",
      categoryLabel: "Tata Kelola & Sistem",
      action: "Melihat Konfigurasi Kebijakan Keamanan (Security Policy)",
      desc: "Memeriksa aturan column-level lock dan batasan siklus",
      admin: { allowed: true, note: "Pemeriksa kebijakan" },
      bu: { allowed: false, note: "Dikelola oleh sistem" },
      legal: { allowed: true, note: "Pemeriksa kepatuhan" },
      mgmt: { allowed: true, note: "Pemeriksa kepatuhan eksekutif" }
    }
  ];

  const filteredData = useMemo(() => {
    return matrixData.filter((item) => {
      const matchCat = selectedCategory === "all" || item.category === selectedCategory;
      const matchSearch =
        item.action.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  const renderStatus = (val) => {
    if (val.allowed === true) {
      return (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
          <span className="text-[10px] text-emerald-800 font-medium">Diizinkan</span>
          <span className="text-[9px] text-slate-500 leading-tight mt-0.5 max-w-[120px]">{val.note}</span>
        </div>
      );
    }
    if (val.allowed === "own") {
      return (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mb-1">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] text-teal-900 font-medium">Unit Sendiri</span>
          <span className="text-[9px] text-slate-500 leading-tight mt-0.5 max-w-[120px]">{val.note}</span>
        </div>
      );
    }
    if (val.allowed === "view") {
      return (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-1">
            <Eye className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] text-amber-900 font-medium">Lihat Saja</span>
          <span className="text-[9px] text-slate-500 leading-tight mt-0.5 max-w-[120px]">{val.note}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 text-center">
        <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
        <span className="text-[10px] text-rose-700 font-medium">Dilarang</span>
        <span className="text-[9px] text-slate-400 leading-tight mt-0.5 max-w-[120px]">{val.note}</span>
      </div>
    );
  };

  return (
    <RBACLayout activeTab="/rbac/matrix">
      <div className="space-y-6">
        {/* Filter bar */}
        <Card className="p-5 border-slate-200 bg-white space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Matriks Perbandingan Hak Akses Antar-Peran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi komparatif kewenangan operasional, batasan data, dan integritas pemisahan tugas (SoD).
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                data-testid="matrix-search"
                placeholder="Cari aksi atau izin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`matrix-cat-${cat.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Legend Card */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-slate-100/80 rounded-xl text-xs text-slate-600 border border-slate-200">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-teal-700" /> Legenda:
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Diizinkan Penuh
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-teal-700" /> Terbatas ke Unit Sendiri (Multi-tenant)
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 text-amber-600" /> Lihat Saja (Read-Only)
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-rose-500" /> Dilarang / Tidak Memiliki Izin
          </span>
        </div>

        {/* Matrix Table */}
        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs" data-testid="rbac-matrix-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                  <th className="p-4 w-1/3 min-w-[260px]">Modul & Kewenangan Aksi</th>
                  <th className="p-4 text-center min-w-[140px] bg-slate-100/70 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <Shield className="h-4 w-4 text-slate-800" />
                      <span>Administrator</span>
                    </div>
                  </th>
                  <th className="p-4 text-center min-w-[140px] bg-teal-50/50 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1.5 text-teal-900">
                      <Building2 className="h-4 w-4 text-teal-700" />
                      <span>Business Unit</span>
                    </div>
                  </th>
                  <th className="p-4 text-center min-w-[140px] bg-emerald-50/50 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-950">
                      <Scale className="h-4 w-4 text-emerald-700" />
                      <span>Legal Officer</span>
                    </div>
                  </th>
                  <th className="p-4 text-center min-w-[140px] bg-amber-50/50 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1.5 text-amber-900">
                      <Eye className="h-4 w-4 text-amber-700" />
                      <span>Manajemen</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      Tidak ada izin yang sesuai dengan pencarian "{search}".
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {row.categoryLabel}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 text-xs">{row.action}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{row.desc}</p>
                      </td>
                      <td className="p-2 align-middle border-l border-slate-100 bg-slate-50/30">
                        {renderStatus(row.admin)}
                      </td>
                      <td className="p-2 align-middle border-l border-slate-100 bg-teal-50/10">
                        {renderStatus(row.bu)}
                      </td>
                      <td className="p-2 align-middle border-l border-slate-100 bg-emerald-50/10">
                        {renderStatus(row.legal)}
                      </td>
                      <td className="p-2 align-middle border-l border-slate-100 bg-amber-50/10">
                        {renderStatus(row.mgmt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </RBACLayout>
  );
}
