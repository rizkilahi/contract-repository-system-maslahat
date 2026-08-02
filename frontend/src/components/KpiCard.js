import { Card } from "@/components/ui/card";

export default function KpiCard({ label, value, hint, icon: Icon, accent="teal", testid }) {
  const accents = {
    teal: { border: "border-l-teal-600", icon: "bg-teal-50 text-teal-700" },
    amber: { border: "border-l-amber-500", icon: "bg-amber-50 text-amber-700" },
    orange: { border: "border-l-orange-500", icon: "bg-orange-50 text-orange-700" },
    rose: { border: "border-l-rose-500", icon: "bg-rose-50 text-rose-700" },
  };
  const a = accents[accent] || accents.teal;
  return (
    <Card data-testid={testid} className={`p-5 border-slate-200 border-l-4 ${a.border} shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="font-heading text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.icon}`}>
          {Icon ? <Icon className="h-5 w-5" strokeWidth={2} /> : null}
        </div>
      </div>
    </Card>
  );
}
