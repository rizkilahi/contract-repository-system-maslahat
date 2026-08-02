import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import LegalGuidelinesModal from "@/components/LegalGuidelinesModal";
import { Info, UploadCloud, FileCheck, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import mammoth from "mammoth/mammoth.browser";

export default function SubmitContract() {
  const nav = useNavigate();
  const [meta, setMeta] = useState({ institution_types: [], owning_bus: [] });
  const [form, setForm] = useState({
    reference_number: "",
    partner_name: "", partner_pic_name: "", partner_pic_phone: "", partner_pic_email: "",
    institution_type: "", agreement_title: "", contract_value: 0,
    effective_date: "", expiry_date: "", owning_bu: "", bu_pic_name: "", remarks: ""
  });
  const [autoFilled, setAutoFilled] = useState(new Set());
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { api.get("/meta/options").then(r => setMeta(r.data)); }, []);

  const set = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    // User edited: remove the "auto-filled" badge so they know it's now their own value
    if (autoFilled.has(k)) {
      const next = new Set(autoFilled);
      next.delete(k);
      setAutoFilled(next);
    }
  };

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".docx")) { toast.error("Hanya file .docx yang diperbolehkan"); return; }
    setFile(f);
    setAutofilling(true);
    try {
      const buf = await f.arrayBuffer();
      const { value: raw } = await mammoth.extractRawText({ arrayBuffer: buf });

      // Normalize whitespace but keep line-breaks for section detection
      const norm = raw
        .replace(/\r/g, "")
        .split("\n")
        .map(l => l.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
      const oneLine = norm.replace(/\n/g, " ");

      const extracted = {};
      const missing = [];

      // 1) Contract ID — after "BSI Maslahat: No. "
      const mCid = oneLine.match(/BSI\s*Maslahat\s*:\s*No\s*\.?\s+([^\n]+?)(?=\s+Nama\s+Mitra|\s{2,}Pada\s+hari|\s{2,}|$)/i);
      if (mCid) extracted.reference_number = mCid[1].replace(/\s+/g, " ").trim();
      else missing.push("Contract ID");

      // 2) Agreement Title — after "Tentang"
      const mTitle = norm.match(/\bTentang\s+([^\n]+)/i);
      if (mTitle) extracted.agreement_title = mTitle[1].trim();
      else missing.push("Judul PKS");

      // 3) Partner Name — after "2." and before ", yang beralamat di"
      // Tolerates the docx template's "(NAMA LEMBAGA) , yang beralamat di" shape too.
      let mPart = oneLine.match(/(?:^|\n|\s)2\s*\.\s*([^,\n]+?)\s*,\s*yang\s+beralamat\s+di/i);
      if (!mPart) mPart = oneLine.match(/\(?\s*([A-Z][A-Z0-9 &\.\-\(\)\/]{2,140}?)\s*\)?\s*,\s*yang\s+beralamat\s+di/i);
      if (mPart) extracted.partner_name = mPart[1].replace(/[()]/g, "").replace(/\s+/g, " ").trim();
      else missing.push("Nama Mitra");

      // 4) Contract Value — after "memiliki nilai kerja sama sebesar "
      const mVal = oneLine.match(/memiliki\s+nilai\s+kerja\s+sama\s+sebesar\s+([^\n\.]+?)(?=\s+dan\b|\s+atau\b|\.\s|\n|$)/i);
      if (mVal) {
        const rawVal = mVal[1].trim();
        const numMatch = rawVal.match(/Rp\.?\s*([\d\.,]+)/i) || rawVal.match(/([\d][\d\.,]{2,})/);
        if (numMatch) {
          const num = numMatch[1].replace(/\./g, "").replace(/,/g, "");
          const parsed = parseInt(num, 10);
          if (!Number.isNaN(parsed)) extracted.contract_value = parsed;
        }
        if (!extracted.contract_value) missing.push("Nilai Kerja Sama");
      } else missing.push("Nilai Kerja Sama");

      // 5) Effective Date — after "dimulai efektif sejak tanggal "
      const mEff = oneLine.match(/dimulai\s+efektif\s+sejak\s+tanggal\s+([^\n\.]+?)(?=\s+dan\b|\s+atau\b|\.\s|\n|$)/i);
      if (mEff) {
        const rawDate = mEff[1].trim();
        const iso = parseIndoDate(rawDate);
        if (iso) extracted.effective_date = iso;
        else missing.push("Tgl Efektif (format tanggal tidak dikenali)");
      } else missing.push("Tgl Efektif");

      // 6) Partner PIC — "PIC :" under the "Mitra/Pihak Eksternal" section
      const sectionRx = /Mit\s*r?\s*a\s*\/?\s*Pihak\s+Eks?\s*t?\s*ernal/gi;
      let lastIdx = -1; let sm;
      while ((sm = sectionRx.exec(norm)) !== null) lastIdx = sm.index;
      if (lastIdx >= 0) {
        const sub = norm.slice(lastIdx);
        const pic = sub.match(/PIC\s*:\s*([^\n]+)/i);
        if (pic && pic[1].trim().length > 0 && !/^_+$/.test(pic[1].trim())) {
          extracted.partner_pic_name = pic[1].trim();
        } else missing.push("Nama PIC Mitra");
      } else missing.push("Nama PIC Mitra");

      // Apply to form — only overwrite empty fields; user may edit anytime.
      const filled = [];
      setForm(prev => {
        const next = { ...prev };
        Object.entries(extracted).forEach(([k, v]) => {
          const cur = prev[k];
          const isEmpty = cur === "" || cur === 0 || cur == null;
          if (isEmpty) {
            next[k] = v;
            filled.push(k);
          }
        });
        return next;
      });
      setAutoFilled(new Set(filled));

      if (filled.length > 0) {
        toast.success(`Auto-fill dari .docx berhasil (${filled.length} field terisi)`);
      }
      if (missing.length > 0) {
        toast.message("Beberapa data tidak ditemukan, silakan isi manual.", {
          description: `Tidak ditemukan: ${missing.join(", ")}`,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memproses .docx: " + (e?.message || "unknown"));
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
        <Card className="border-slate-200 shadow-sm bg-white p-6 ring-1 ring-teal-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-slate-900">Langkah 1 — Unggah Draft PKS (.docx)</h3>
              <p className="text-xs text-slate-500 mt-1">Unggah lebih dulu agar metadata terisi otomatis. Field bertanda <span className="font-semibold text-amber-700">✨ AUTO</span> tetap bisa diedit manual.</p>
            </div>
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

        <Card className="border-slate-200 shadow-sm bg-white p-6">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Langkah 2 — Informasi Mitra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nomor Referensi PKS (dari draft)" className="md:col-span-2" autoFilled={autoFilled.has("reference_number")}>
              <Input data-testid="f-ref-number" placeholder="Terisi otomatis dari draft, atau isi manual (contoh: 03/xxx/PKS/BSI MASLAHAT)"
                value={form.reference_number} onChange={(e)=>set("reference_number", e.target.value)} />
            </Field>
            <Field label="Nama Mitra" required autoFilled={autoFilled.has("partner_name")}>
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
            <Field label="Nama PIC Mitra" required autoFilled={autoFilled.has("partner_pic_name")}>
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
          <h3 className="font-heading font-bold text-slate-900 mb-4">Langkah 3 — Detail Kerja Sama</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Judul PKS" required className="md:col-span-2" autoFilled={autoFilled.has("agreement_title")}>
              <Input data-testid="f-title" required value={form.agreement_title} onChange={(e)=>set("agreement_title", e.target.value)} />
            </Field>
            <Field label="Nilai Kerja Sama (IDR)" autoFilled={autoFilled.has("contract_value")}>
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
            <Field label="Tanggal Efektif" required autoFilled={autoFilled.has("effective_date")}>
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

        <Card className="border-slate-200 shadow-sm bg-white p-6" style={{display:'none'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-slate-900">Draft PKS (.docx)</h3>
            {autofilling && <span className="text-xs text-teal-700 font-semibold inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Mengekstrak metadata...</span>}
          </div>
          <div
            data-testid="dropzone-legacy"
            onDragOver={(e)=>{e.preventDefault();}}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors border-slate-300`}
          />
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

function Field({ label, required, children, className = "", action, autoFilled }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
          {autoFilled && (
            <Badge className="bg-amber-100 text-amber-800 border-0 text-[9px] font-semibold uppercase tracking-wider ml-1 gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Auto
            </Badge>
          )}
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

// Parse Indonesian date formats (DD/MM/YYYY, DD Monthname YYYY) to ISO YYYY-MM-DD
function parseIndoDate(s) {
  if (!s) return null;
  const txt = String(s).trim();
  const months = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, sep: 9, okt: 10, nov: 11, des: 12,
  };
  let m = txt.match(/(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/);
  if (m) {
    let y = parseInt(m[3], 10); if (y < 100) y += 2000;
    return `${y}-${String(parseInt(m[2],10)).padStart(2,"0")}-${String(parseInt(m[1],10)).padStart(2,"0")}`;
  }
  m = txt.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2,"0")}-${String(parseInt(m[1],10)).padStart(2,"0")}`;
  }
  return null;
}
