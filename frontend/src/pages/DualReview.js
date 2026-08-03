import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullBUName } from "@/lib/utils";
import { api, API_BASE, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, FileText, FileCheck2, MessageSquarePlus, CheckCircle2, Sparkles, Clock } from "lucide-react";

const fmtDT = (s) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function DualReview() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [draftFile, setDraftFile] = useState(null);
  const [signedFile, setSignedFile] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [section, setSection] = useState("draft");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const c = await api.get(`/contracts/${id}`);
      setContract(c.data);
      const versions = c.data.versions || [];
      const draft = [...versions].reverse().find(v => v.original_filename.toLowerCase().endsWith(".docx"));
      const signed = [...versions].reverse().find(v => !v.original_filename.toLowerCase().endsWith(".docx"));
      setDraftFile(draft || null);
      setSignedFile(signed || null);
      if (draft) {
        const t = await api.get(`/files/${draft.id}/text`);
        setDraftText(t.data.text || "");
      } else {
        setDraftText("");
      }
      const cm = await api.get(`/contracts/${id}/comments`);
      setComments(cm.data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/contracts/${id}/comments`, { text: newComment, section, version_id: section === "draft" ? draftFile?.id : signedFile?.id });
      setComments([...comments, data]);
      setNewComment("");
      toast.success("Komentar ditambahkan");
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const resolve = async (cid) => {
    try {
      await api.post(`/comments/${cid}/resolve`);
      setComments(comments.map(c => c.id === cid ? { ...c, resolved: true } : c));
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  if (loading) return <div className="text-sm text-slate-500 p-8">Memuat viewer...</div>;
  if (!contract) return <div className="text-sm text-slate-500 p-8">Kontrak tidak ditemukan</div>;

  const signedUrl = signedFile ? `${API_BASE}/files/${signedFile.id}?token=${localStorage.getItem("crs_token")}` : null;
  const isPdf = signedFile?.original_filename?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-4">
      <button onClick={()=>nav("/")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 transition-colors" data-testid="review-back">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dasbor
      </button>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-200 uppercase font-semibold tracking-wide">
              <Sparkles className="h-4 w-4 text-amber-300" /> Dual Review Mode
              <span className="rounded-full bg-white/10 px-2 py-0.5 border border-white/15 font-mono">{contract.contract_id}</span>
              <StatusBadge status={contract.derived_status || contract.status} />
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold mt-2 leading-tight">{contract.agreement_title}</h1>
            <p className="text-sm text-teal-100 mt-1">{contract.partner_name} · {contract.institution_type} · {getFullBUName(contract.owning_bu)}</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          data-testid="review-tab-draft"
          onClick={()=>setSection("draft")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${section==="draft" ? "bg-teal-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5 inline" /> Komentari Draft
        </button>
        <button
          data-testid="review-tab-signed"
          onClick={()=>setSection("signed")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${section==="signed" ? "bg-teal-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          <FileCheck2 className="h-3.5 w-3.5 mr-1.5 inline" /> Komentari Scan Tandatangan
        </button>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Draft (docx text) */}
        <Card className={`border-slate-200 bg-white overflow-hidden ${section==="draft"?"ring-2 ring-teal-400":""}`}>
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              <p className="text-sm font-semibold text-slate-900">Draft PKS (.docx)</p>
            </div>
            {draftFile ? <Badge className="bg-teal-100 text-teal-700 border-0 font-mono">{draftFile.version}</Badge> : <span className="text-xs text-slate-400">Belum diunggah</span>}
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {draftText ? (
              <pre className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed font-sans">{draftText}</pre>
            ) : (
              <p className="text-sm text-slate-400 italic">Belum ada draft .docx untuk direview.</p>
            )}
          </div>
        </Card>

        {/* Signed (PDF) */}
        <Card className={`border-slate-200 bg-white overflow-hidden ${section==="signed"?"ring-2 ring-teal-400":""}`}>
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-700" />
              <p className="text-sm font-semibold text-slate-900">Scan Tandatangan</p>
            </div>
            {signedFile ? <Badge className="bg-emerald-100 text-emerald-700 border-0 font-mono">{signedFile.version}</Badge> : <span className="text-xs text-slate-400">Belum diunggah</span>}
          </div>
          <div className="max-h-[70vh] overflow-hidden bg-slate-100">
            {signedUrl && isPdf ? (
              <iframe title="Scan PDF" src={signedUrl} className="w-full h-[70vh] border-0" />
            ) : signedUrl ? (
              <div className="p-4"><img alt="Scan" src={signedUrl} className="w-full rounded" /></div>
            ) : (
              <div className="p-8 text-sm text-slate-400 italic text-center">Belum ada scan hasil tandatangan.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Comment panel */}
      <Card className="border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Diskusi Review</p>
            <h3 className="font-heading text-lg font-bold text-slate-900">Komentar & Catatan Legal ({comments.length})</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600">Menambahkan komentar untuk <span className="font-semibold text-teal-700">{section === "draft" ? "Draft (.docx)" : "Scan Tandatangan"}</span></p>
          </div>
          <Textarea data-testid="comment-input" rows={2} value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Tuliskan catatan review..." className="bg-white text-sm" />
          <div className="flex justify-end mt-2">
            <Button data-testid="comment-submit" onClick={addComment} disabled={!newComment.trim()} className="bg-teal-700 hover:bg-teal-800" size="sm">
              <MessageSquarePlus className="h-4 w-4 mr-1.5" /> Tambah Komentar
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {comments.length === 0 && <p className="text-sm text-slate-400 italic text-center py-6">Belum ada komentar.</p>}
          {comments.map((c) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.resolved ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{c.user_name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{c.user_role}</span>
                    <span className="text-slate-400">·</span>
                    <Badge className={c.section === "draft" ? "bg-teal-100 text-teal-700 border-0 text-[10px]" : "bg-emerald-100 text-emerald-700 border-0 text-[10px]"}>
                      {c.section === "draft" ? "Draft" : "Scan"}
                    </Badge>
                    <span className="text-slate-400 text-xs inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDT(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1.5">{c.text}</p>
                  {c.resolved && <p className="text-[11px] text-emerald-700 mt-1 font-semibold">✓ Diselesaikan oleh {c.resolved_by}</p>}
                </div>
                {!c.resolved && (user?.role === "legal_officer" || user?.role === "admin") && (
                  <Button data-testid={`resolve-${c.id}`} onClick={()=>resolve(c.id)} size="sm" variant="ghost" className="h-7 text-emerald-700 hover:bg-emerald-50 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Selesai
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
