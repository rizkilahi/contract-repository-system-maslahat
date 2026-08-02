import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import ContractDetailSheet from "@/components/ContractDetailSheet";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, TriangleAlert, XCircle, Search, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const fmtDate = (s) => s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

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
  const nav = useNavigate();

  const loadAll = async () => {
    try {
      const params = { q: q || undefined, institution_type: itype, owning_bu: obu, status };
      const [s, c, m] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/contracts", { params }),
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
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [itype, obu, status]);

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
              <p className="text-xs text-slate-500 mt-1">Menampilkan {rows.length} kontrak</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="search-input" value={q} onChange={(e)=>setQ(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === "Enter") loadAll(); }}
                placeholder="Cari No. PKS, mitra, atau judul PKS..." className="pl-10 h-10" />
            </div>
            <Select value={itype} onValueChange={setItype}>
              <SelectTrigger data-testid="filter-institution" className="h-10"><SelectValue placeholder="Jenis Institusi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Institusi</SelectItem>
                {meta.institution_types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={obu} onValueChange={setObu}>
              <SelectTrigger data-testid="filter-obu" className="h-10"><SelectValue placeholder="Owning BU" /></SelectTrigger>
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
                <TableHead className="text-xs font-semibold text-slate-600">No. PKS</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Mitra</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Jenis Institusi</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 min-w-[220px]">Judul PKS</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Tanggal Berakhir</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-16 text-sm text-slate-400">Belum ada kontrak</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="text-sm hover:bg-slate-50/60" data-testid={`contract-row-${r.contract_id}`}>
                  <TableCell className="font-mono text-xs font-semibold text-teal-700">{r.contract_id}</TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate" title={r.partner_name}>{r.partner_name}</TableCell>
                  <TableCell className="text-xs text-slate-600">{r.institution_type}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.agreement_title}>{r.agreement_title}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.expiry_date)}</TableCell>
                  <TableCell><StatusBadge status={r.derived_status || r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" data-testid={`view-${r.contract_id}`}
                      onClick={()=>{ setSelected(r.id); setSheetOpen(true); }}
                      className="h-8 text-teal-700 hover:bg-teal-50 hover:text-teal-800">
                      <Eye className="h-4 w-4 mr-1.5" /> Detail
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
