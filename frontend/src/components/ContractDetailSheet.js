import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge, { STATUS_META } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Download, Upload, Building2, Phone, Mail, User, DollarSign, Calendar, Briefcase, FileText, ClockAlert, ArrowRight, CheckCircle2, XCircle, SplitSquareHorizontal } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const fmtDate = (s) => s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtDT = (s) => s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const fmtIDR = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const NEXT_STATUS = {
  drafting: [{ v: "submitted_for_review", label: "Kirim untuk Legal Review", role: ["business_unit"], icon: ArrowRight }],
  submitted_for_review: [
    { v: "drafting", label: "Tarik Kembali ke Draft", role: ["business_unit"], icon: XCircle, variant: "warn" },
    { v: "revision_required", label: "Tolak di Intake", role: ["legal_officer"], icon: XCircle, variant: "warn" },
    { v: "under_legal_review", label: "Ambil untuk Review", role: ["legal_officer"], icon: ArrowRight },
  ],
  under_legal_review: [
    { v: "revision_required", label: "Minta Revisi", role: ["legal_officer"], icon: XCircle, variant: "warn" },
    { v: "ready_for_signature", label: "Setujui — Siap Ditandatangani", role: ["legal_officer"], icon: CheckCircle2 },
  ],
  revision_required: [{ v: "submitted_for_review", label: "Ajukan Ulang untuk Review", role: ["business_unit"], icon: ArrowRight }],
  ready_for_signature: [{ v: "pending_final_verification", label: "Upload Dokumen Tandatangan", role: ["business_unit"], icon: Upload }],
  pending_final_verification: [
    { v: "revision_required", label: "Tolak Scan (Perlu Scan Ulang)", role: ["legal_officer"], icon: XCircle, variant: "warn" },
    { v: "signed_active", label: "Verifikasi & Aktifkan Kontrak", role: ["legal_officer"], icon: CheckCircle2 },
  ],
};

export default function ContractDetailSheet({ open, onOpenChange, contractId, onChanged }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [contract, setContract] = useState(null);
  const [audit, setAudit] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [remarks, setRemarks] = useState("");

  const load = async () => {
    if (!contractId) return;
    try {
      const [c, a] = await Promise.all([
        api.get(`/contracts/${contractId}`),
        api.get(`/contracts/${contractId}/audit`),
      ]);
      setContract(c.data);
      setAudit(a.data);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };
  useEffect(() => { if (open) load(); }, [open, contractId]);

  const doStatus = async (v) => {
    try {
      await api.patch(`/contracts/${contractId}/status`, { status: v, remarks });
      toast.success("Status diperbarui");
      setRemarks("");
      await load();
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const handleUpload = async (file, versionLabel) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("remarks", remarks || "");
      if (versionLabel) fd.append("version_label", versionLabel);
      await api.post(`/contracts/${contractId}/versions`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File berhasil diunggah");
      setRemarks("");
      await load();
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setUploading(false); }
  };

  const downloadUrl = (fileId) => `${API_BASE}/files/${fileId}?token=${localStorage.getItem("crs_token")}`;

  const availableActions = (contract?.status && NEXT_STATUS[contract.status]) || [];
  const roleActions = availableActions.filter(a => a.role.includes(user?.role));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0" data-testid="contract-detail-sheet">
        {!contract ? (
          <div className="p-8 text-sm text-slate-500">Memuat...</div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white p-6">
              <SheetHeader>
                <div className="flex items-center gap-2 text-xs text-teal-200 uppercase font-semibold tracking-wide">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 border border-white/15">{contract.contract_id}</span>
                  <StatusBadge status={contract.derived_status || contract.status} />
                </div>
                <SheetTitle className="font-heading text-2xl font-bold text-white leading-snug mt-3">
                  {contract.agreement_title}
                </SheetTitle>
                <p className="text-sm text-teal-100 mt-1">{contract.partner_name} • {contract.institution_type}</p>
                <div className="mt-4">
                  <Button data-testid="open-dual-review" onClick={()=>{ onOpenChange(false); nav(`/review/${contract.id}`); }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold h-9">
                    <SplitSquareHorizontal className="h-4 w-4 mr-2" /> Buka Dual Review Mode
                  </Button>
                </div>
              </SheetHeader>
            </div>

            <div className="p-6">
              <Tabs defaultValue="metadata" className="w-full">
                <TabsList className="grid grid-cols-3 bg-slate-100">
                  <TabsTrigger value="metadata" data-testid="tab-metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="versions" data-testid="tab-versions">Versi Dokumen</TabsTrigger>
                  <TabsTrigger value="audit" data-testid="tab-audit">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="metadata" className="mt-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Meta icon={Building2} label="Mitra" value={contract.partner_name} />
                    <Meta icon={Briefcase} label="Jenis Institusi" value={contract.institution_type} />
                    <Meta icon={User} label="PIC Mitra" value={contract.partner_pic_name} />
                    <Meta icon={Phone} label="Telp PIC Mitra" value={contract.partner_pic_phone} />
                    <Meta icon={Mail} label="Email PIC Mitra" value={contract.partner_pic_email} />
                    <Meta icon={DollarSign} label="Nilai Kerjasama" value={fmtIDR(contract.contract_value)} />
                    <Meta icon={Calendar} label="Tanggal Efektif" value={fmtDate(contract.effective_date)} />
                    <Meta icon={ClockAlert} label="Tanggal Berakhir" value={fmtDate(contract.expiry_date)} />
                    <Meta icon={Briefcase} label="Owning BU" value={contract.owning_bu} />
                    <Meta icon={User} label="PIC Business Unit" value={contract.bu_pic_name} />
                  </div>

                  {roleActions.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Tindakan</p>
                      <Textarea data-testid="action-remarks" placeholder="Catatan (opsional)..." value={remarks} onChange={(e)=>setRemarks(e.target.value)} className="bg-white mb-3 text-sm" rows={2} />
                      <div className="flex flex-wrap gap-2">
                        {roleActions.map((a) => {
                          if (a.v === "pending_final_verification") {
                            return (
                              <label key={a.v} className="inline-flex">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="upload-signed"
                                  onChange={(e)=> { const f=e.target.files?.[0]; if(f){ handleUpload(f, "Final PDF"); doStatus(a.v);} }} />
                                <Button asChild disabled={uploading} className="bg-teal-700 hover:bg-teal-800 cursor-pointer">
                                  <span><Upload className="h-4 w-4 mr-2" /> {a.label}</span>
                                </Button>
                              </label>
                            );
                          }
                          const Icon = a.icon;
                          return (
                            <Button key={a.v} data-testid={`action-${a.v}`} onClick={() => doStatus(a.v)}
                              className={a.variant === "warn" ? "bg-amber-500 hover:bg-amber-600 text-slate-900" : "bg-teal-700 hover:bg-teal-800"}>
                              <Icon className="h-4 w-4 mr-2" /> {a.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="versions" className="mt-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Riwayat Versi Dokumen</p>
                    {(user?.role === "business_unit" || user?.role === "legal_officer") && (
                      <label className="inline-flex">
                        <input type="file" className="hidden" accept=".docx,.pdf" data-testid="upload-version"
                          onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleUpload(f, ""); }} />
                        <Button asChild size="sm" variant="outline" className="cursor-pointer border-teal-600 text-teal-700 hover:bg-teal-50">
                          <span><Upload className="h-4 w-4 mr-2" /> Unggah Versi Baru</span>
                        </Button>
                      </label>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs">Versi</TableHead>
                          <TableHead className="text-xs">Nama File</TableHead>
                          <TableHead className="text-xs">Diunggah oleh</TableHead>
                          <TableHead className="text-xs">Waktu</TableHead>
                          <TableHead className="text-xs text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.versions.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-slate-400">Belum ada file terunggah</TableCell></TableRow>
                        )}
                        {contract.versions.slice().reverse().map((v) => (
                          <TableRow key={v.id} className="text-sm">
                            <TableCell className="font-mono text-xs font-semibold text-teal-700">{v.version}</TableCell>
                            <TableCell className="max-w-[180px] truncate" title={v.original_filename}>{v.original_filename}</TableCell>
                            <TableCell className="text-xs">{v.uploader_name}</TableCell>
                            <TableCell className="text-xs">{fmtDT(v.uploaded_at)}</TableCell>
                            <TableCell className="text-right">
                              <a href={downloadUrl(v.id)} target="_blank" rel="noreferrer" data-testid={`download-${v.id}`}>
                                <Button size="sm" variant="ghost" className="h-8 text-teal-700 hover:bg-teal-50"><Download className="h-4 w-4" /></Button>
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-5">
                  <div className="relative pl-8 space-y-4">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200"></div>
                    {audit.length === 0 && <p className="text-sm text-slate-400">Belum ada aktivitas.</p>}
                    {audit.map((log) => (
                      <div key={log.id} className="relative timeline-dot rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{log.action.replaceAll("_", " ")}</p>
                          <span className="text-[11px] text-slate-500">{fmtDT(log.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{log.detail}</p>
                        <p className="text-[11px] text-teal-700 mt-2 font-medium">{log.user_name} • {log.user_role}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {label}
      </div>
      <p className="text-sm font-medium text-slate-900 mt-1 break-words">{value || "-"}</p>
    </div>
  );
}
