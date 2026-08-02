import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LegalGuidelinesModal from "@/components/LegalGuidelinesModal";
import { Info, UploadCloud, FileCheck, Loader2, ArrowLeft } from "lucide-react";

export default function SubmitContract() {
  const nav = useNavigate();
  const [meta, setMeta] = useState({ institution_types: [], owning_bus: [] });
  const [form, setForm] = useState({
    partner_name: "", partner_pic_name: "", partner_pic_phone: "", partner_pic_email: "",
    institution_type: "", agreement_title: "", contract_value: 0,
    effective_date: "", expiry_date: "", owning_bu: "", bu_pic_name: "", remarks: ""
  });
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { api.get("/meta/options").then(r => setMeta(r.data)); }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".docx")) { toast.error("Hanya file .docx yang diperbolehkan"); return; }
    setFile(f);
    // Auto-fill metadata
    setAutofilling(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/contracts/extract-docx", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const filled = [];
      setForm(prev => {
        const next = { ...prev };
        if (data.agreement_title && !prev.agreement_title) { next.agreement_title = data.agreement_title; filled.push("Judul PKS"); }
        if (data.partner_name && !prev.partner_name) { next.partner_name = data.partner_name; filled.push("Nama Mitra"); }
        if (data.effective_date && !prev.effective_date) { next.effective_date = data.effective_date; filled.push("Tgl Efektif"); }
        if (data.expiry_date && !prev.expiry_date) { next.expiry_date = data.expiry_date; filled.push("Tgl Berakhir"); }
        if (data.contract_value && !prev.contract_value) { next.contract_value = data.contract_value; filled.push("Nilai"); }
        return next;
      });
      if (filled.length > 0) toast.success(`Auto-fill: ${filled.join(", ")}`);
      else toast.message("Tidak ada metadata yang bisa diekstrak otomatis dari file ini");
    } catch (e) {
      toast.error("Gagal mengekstrak metadata: " + formatApiError(e?.response?.data?.detail));
    } finally { setAutofilling(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.institution_type || !form.owning_bu) { toast.error("Lengkapi Jenis Institusi & Owning BU"); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, contract_value: Number(form.contract_value) || 0 };
      const { data } = await api.post("/contracts", payload);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("version_label", "v1.0");
        fd.append("remarks", "Draft awal (submission)");
        await api.post(`/contracts/${data.id}/versions`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(`PKS ${data.contract_id} berhasil dibuat`);
      nav("/");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <button onClick={()=>nav("/")} className="inline-flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Dasbor
        </button>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Pengajuan Baru</p>
        <h1 className="font-heading text-3xl font-bold mt-2 leading-tight">Formulir Pengajuan PKS</h1>
        <p className="text-sm text-teal-100 mt-2">Isi metadata & unggah draft .docx untuk memulai alur review legal.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-slate-200 shadow-sm bg-white p-6">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Informasi Mitra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Mitra" required>
              <Input data-testid="f-partner-name" required value={form.partner_name} onChange={(e)=>set("partner_name", e.target.value)} />
            </Field>
            <Field label="Jenis Institusi" required
              action={<button type="button" data-testid="smart-info-btn" onClick={()=>setGuideOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 font-semibold">
                <Info className="h-3.5 w-3.5" /> Panduan Legal
              </button>}>
              <Select value={form.institution_type} onValueChange={(v)=>set("institution_type", v)}>
                <SelectTrigger data-testid="f-institution-type"><SelectValue placeholder="Pilih jenis institusi" /></SelectTrigger>
                <SelectContent>
                  {meta.institution_types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nama PIC Mitra" required>
              <Input data-testid="f-pic-name" required value={form.partner_pic_name} onChange={(e)=>set("partner_pic_name", e.target.value)} />
            </Field>
            <Field label="No. Telepon PIC Mitra" required>
              <Input data-testid="f-pic-phone" required value={form.partner_pic_phone} onChange={(e)=>set("partner_pic_phone", e.target.value)} placeholder="+62812xxxxxxx" />
            </Field>
            <Field label="Email PIC Mitra" required>
              <Input data-testid="f-pic-email" required type="email" value={form.partner_pic_email} onChange={(e)=>set("partner_pic_email", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white p-6">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Detail Kerja Sama</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Judul PKS" required className="md:col-span-2">
              <Input data-testid="f-title" required value={form.agreement_title} onChange={(e)=>set("agreement_title", e.target.value)} />
            </Field>
            <Field label="Nilai Kerja Sama (IDR)">
              <Input data-testid="f-value" type="number" min="0" value={form.contract_value} onChange={(e)=>set("contract_value", e.target.value)} />
            </Field>
            <Field label="Owning BU" required>
              <Select value={form.owning_bu} onValueChange={(v)=>set("owning_bu", v)}>
                <SelectTrigger data-testid="f-owning-bu"><SelectValue placeholder="Pilih BU pemilik" /></SelectTrigger>
                <SelectContent>
                  {meta.owning_bus.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tanggal Efektif" required>
              <Input data-testid="f-effective" required type="date" value={form.effective_date} onChange={(e)=>set("effective_date", e.target.value)} />
            </Field>
            <Field label="Tanggal Berakhir" required>
              <Input data-testid="f-expiry" required type="date" value={form.expiry_date} onChange={(e)=>set("expiry_date", e.target.value)} />
            </Field>
            <Field label="Nama PIC Business Unit" required className="md:col-span-2">
              <Input data-testid="f-bu-pic" required value={form.bu_pic_name} onChange={(e)=>set("bu_pic_name", e.target.value)} />
            </Field>
            <Field label="Catatan" className="md:col-span-2">
              <Textarea data-testid="f-remarks" rows={2} value={form.remarks} onChange={(e)=>set("remarks", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-slate-900">Draft PKS (.docx)</h3>
            {autofilling && <span className="text-xs text-teal-700 font-semibold inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Mengekstrak metadata...</span>}
          </div>
          <div
            data-testid="dropzone"
            onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            onClick={()=>inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${drag ? "dropzone-active" : "border-slate-300 hover:border-teal-500 hover:bg-teal-50/30"}`}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileCheck className="h-10 w-10 text-teal-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size/1024).toFixed(1)} KB · siap diunggah</p>
                <button type="button" onClick={(e)=>{e.stopPropagation(); setFile(null);}} className="mt-3 text-xs text-rose-600 hover:underline">Hapus</button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Tarik & lepas file <span className="font-mono text-teal-700">.docx</span> di sini</p>
                <p className="text-xs text-slate-500 mt-1">atau klik untuk memilih file</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".docx" hidden onChange={(e)=>{ const f=e.target.files?.[0]; handleFile(f); }} />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={()=>nav("/")}>Batal</Button>
          <Button type="submit" data-testid="submit-contract" disabled={submitting} className="bg-teal-700 hover:bg-teal-800 font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ajukan PKS
          </Button>
        </div>
      </form>

      <LegalGuidelinesModal open={guideOpen} onOpenChange={setGuideOpen} institutionType={form.institution_type} />
    </div>
  );
}

function Field({ label, required, children, className = "", action }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500 ml-1">*</span>}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}
