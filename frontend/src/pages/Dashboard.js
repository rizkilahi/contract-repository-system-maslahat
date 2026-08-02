import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import ContractDetailSheet from "@/components/ContractDetailSheet";
import ExportMenu from "@/components/ExportMenu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, TriangleAlert, XCircle, Search, Eye, Filter, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const fmtDate = (s) => s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

// Status filter options (as per user spec) — labels are dropdown display; value = underlying status
const STATUS_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Drafting", value: "drafting" },
  { label: "Submitted for Review", value: "submitted_for_review" },
  { label: "Under Legal Review", value: "under_legal_review" },
  { label: "Revision Required", value: "revision_required" },
  { label: "Legal Approved", value: "ready_for_signature" },
  { label: "Signed & Active", value: "signed_active" },
  { label: "Expiring Soon", value: "expiring_soon" },
  { label: "Expired", value: "expired" },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ total_active: 0, pending_verification: 0, expiring_soon: 0, expired: 0 });
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [itype, setItype] = useState("all");
  const [obu, setObu] = useState("all");
  const [status, setStatus] = useState("all");
  const [meta, setMeta] = useState({ institution_types: [], owning_bus: [], statuses: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("contract_id_display");
  const [sortDir, setSortDir] = useState("asc");
  const nav = useNavigate();

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ label, sortKey, testid }) => {
    const active = sortBy === sortKey;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        data-testid={testid}
        type="button"
        onClick={() => toggleSort(sortKey)}
        className={`flex items-center gap-1.5 text-xs font-semibold hover:text-teal-700 transition-colors ${active ? "text-teal-700" : "text-slate-600"}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-40"}`} strokeWidth={2.5} />
      </button>
    );
  };

  const loadAll = async () => {
    try {
      const [s, c, m] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/contracts"),               // load ALL once — filtering happens client-side
        api.get("/meta/options"),
      ]);
      setStats(s.data);
      setRows(c.data);
      setMeta(m.data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // Client-side filtering — instant, no reload
  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = rows.filter(r => {
      const cur = r.derived_status || r.status;
      if (status !== "all" && cur !== status) return false;
      if (itype !== "all" && r.institution_type !== itype) return false;
      if (obu !== "all" && r.owning_bu !== obu) return false;
      if (term) {
        const hay = [r.contract_id, r.reference_number, r.partner_name, r.agreement_title].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    // Sorting — column click cycles asc/desc
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a, b) => {
      let av, bv;
      if (sortBy === "contract_id_display") {
        av = (a.reference_number || a.contract_id || "").toString().toLowerCase();
        bv = (b.reference_number || b.contract_id || "").toString().toLowerCase();
      } else if (sortBy === "effective_date" || sortBy === "expiry_date") {
        av = a[sortBy] || "";
        bv = b[sortBy] || "";
      } else {
        av = a[sortBy] || "";
        bv = b[sortBy] || "";
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    };
    return [...filtered].sort(cmp);
  }, [rows, q, status, itype, obu, sortBy, sortDir]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white p-6 md:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl"></div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Dasbor Utama · CRS Maslahat</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mt-2 leading-tight">Selamat datang kembali</h1>
            <p className="text-sm text-teal-100 mt-2 max-w-lg">Monitor seluruh Perjanjian Kerja Sama BSI Maslahat secara real-time. Aksi cepat, keputusan tepat.</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu filters={{ institution_type: itype, owning_bu: obu, status }} variant="outline" />
            <Button data-testid="dashboard-new-contract" onClick={()=>nav("/submit")} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              + PKS Baru
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testid="kpi-active" label="Total Active Contracts" value={stats.total_active} hint="PKS aktif saat ini" icon={CheckCircle2} accent="teal" />
        <KpiCard testid="kpi-pending" label="Pending Verification" value={stats.pending_verification} hint="Menunggu verifikasi legal" icon={Clock} accent="amber" />
        <KpiCard testid="kpi-expiring" label="Expiring Soon" value={stats.expiring_soon} hint="Berakhir ≤ 60 hari" icon={TriangleAlert} accent="orange" />
        <KpiCard testid="kpi-expired" label="Expired" value={stats.expired} hint="Sudah kadaluarsa" icon={XCircle} accent="rose" />
      </div>

      {/* Data Grid */}
      <Card className="border-slate-200 shadow-sm bg-white p-0 overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Repositori Kontrak</h2>
              <p className="text-xs text-slate-500 mt-1">Menampilkan {filteredRows.length} dari {rows.length} kontrak</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="search-input" value={q} onChange={(e)=>setQ(e.target.value)}
                placeholder="Cari No. PKS, mitra, atau judul PKS..." className="pl-10 h-10" />
            </div>
            <div className="md:col-span-3">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="filter-status" className="h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-teal-700" />
                    <SelectValue placeholder="Filter by Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(o => (
                    <SelectItem key={o.label} value={o.value} data-testid={`status-opt-${o.value}`}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={itype} onValueChange={setItype}>
              <SelectTrigger data-testid="filter-institution" className="h-10 md:col-span-2"><SelectValue placeholder="Jenis Institusi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Institusi</SelectItem>
                {meta.institution_types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={obu} onValueChange={setObu}>
              <SelectTrigger data-testid="filter-obu" className="h-10 md:col-span-2"><SelectValue placeholder="Owning BU" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Business Unit</SelectItem>
                {meta.owning_bus.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <SortHeader label="Contract ID" sortKey="contract_id_display" testid="sort-contract-id" />
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Partner Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 min-w-[220px]">Agreement Title</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <SortHeader label="Effective Date" sortKey="effective_date" testid="sort-effective" />
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <SortHeader label="Expiry Date" sortKey="expiry_date" testid="sort-expiry" />
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Contract Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16" data-testid="empty-state">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Filter className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium text-slate-600">No contracts found for this status</p>
                      <p className="text-xs text-slate-400">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((r) => (
                <TableRow key={r.id} className="text-sm hover:bg-slate-50/60" data-testid={`contract-row-${r.contract_id}`}>
                  <TableCell className="font-mono text-xs font-semibold text-teal-700" data-testid={`row-cid-${r.contract_id}`} title={r.contract_id}>
                    {r.reference_number || r.contract_id}
                  </TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate" title={r.partner_name}>{r.partner_name}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.agreement_title}>{r.agreement_title}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.effective_date)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.expiry_date)}</TableCell>
                  <TableCell><StatusBadge status={r.derived_status || r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" data-testid={`view-${r.contract_id}`}
                      onClick={()=>{ setSelected(r.id); setSheetOpen(true); }}
                      className="h-8 text-teal-700 hover:bg-teal-50 hover:text-teal-800">
                      <Eye className="h-4 w-4 mr-1.5" /> View Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ContractDetailSheet open={sheetOpen} onOpenChange={setSheetOpen} contractId={selected} onChanged={loadAll} />
    </div>
  );
}
