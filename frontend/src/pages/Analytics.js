import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { PieChart as PieIcon, BarChart3, TrendingUp, Trophy, Wallet } from "lucide-react";
import { STATUS_META } from "@/components/StatusBadge";
import ExportMenu from "@/components/ExportMenu";

const COLORS = ["#0f766e", "#f59e0b", "#0891b2", "#e11d48", "#7c3aed", "#059669", "#ea580c"];
const fmtIDR = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0, notation: n > 1e9 ? "compact" : "standard" }).format(n || 0);

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/dashboard/analytics").then(r => setData(r.data)); }, []);

  if (!data) return <div className="text-sm text-slate-500">Memuat analitik...</div>;

  const statusData = data.by_status.map(s => ({ name: STATUS_META[s.status]?.label || s.status, value: s.count, status: s.status }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl"></div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Analitik Portofolio</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mt-2 leading-tight">Kinerja Kerja Sama Maslahat</h1>
            <p className="text-sm text-teal-100 mt-2 max-w-lg">Visualisasi nilai kontrak per Business Unit, sebaran status, dan mitra strategis.</p>
          </div>
          <ExportMenu variant="amber" />
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600 border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-teal-50 flex items-center justify-center"><Wallet className="h-5 w-5 text-teal-700" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Nilai Portofolio</p>
              <p className="font-heading text-2xl font-bold text-slate-900 mt-1">{fmtIDR(data.total_value)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500 border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total PKS</p>
              <p className="font-heading text-2xl font-bold text-slate-900 mt-1">{data.total_contracts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-600 border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-700" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rata-rata Nilai</p>
              <p className="font-heading text-2xl font-bold text-slate-900 mt-1">{fmtIDR(data.total_contracts ? Math.round(data.total_value/data.total_contracts) : 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nilai per Business Unit</p>
              <h3 className="font-heading text-lg font-bold text-slate-900">Distribusi Owning BU</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-teal-700" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.by_bu} margin={{ top: 5, right: 20, left: 0, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="bu" angle={-25} textAnchor="end" tick={{ fill: "#64748b", fontSize: 11 }} height={60} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v)=>fmtIDR(v)} width={80} />
              <Tooltip formatter={(v)=>fmtIDR(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="value" fill="#0f766e" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sebaran Status</p>
              <h3 className="font-heading text-lg font-bold text-slate-900">Status Kontrak Aktif</h3>
            </div>
            <PieIcon className="h-5 w-5 text-teal-700" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pengajuan PKS Bulanan</p>
              <h3 className="font-heading text-lg font-bold text-slate-900">Tren Bulanan</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthly_new}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Top 5 Mitra</p>
              <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Nilai Tertinggi</h3>
            </div>
          </div>
          <div className="space-y-3">
            {data.top_partners.map((p, i) => (
              <div key={p.contract_id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.partner_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{p.contract_id} · {p.owning_bu}</p>
                </div>
                <span className="text-xs font-bold text-teal-700">{fmtIDR(p.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Institution distribution table */}
      <Card className="p-6 border-slate-200 bg-white">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sebaran Jenis Institusi</p>
          <h3 className="font-heading text-lg font-bold text-slate-900">Berdasarkan Kategori Mitra</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.by_institution.map((it, i) => (
            <div key={it.institution_type} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{it.institution_type}</p>
              <p className="font-heading text-2xl font-bold mt-1" style={{color: COLORS[i%COLORS.length]}}>{it.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
