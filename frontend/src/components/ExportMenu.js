import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileType2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function ExportMenu({ filters = {}, variant = "outline" }) {
  const buildUrl = (kind) => {
    const params = new URLSearchParams();
    params.set("token", localStorage.getItem("crs_token") || "");
    if (filters.institution_type && filters.institution_type !== "all") params.set("institution_type", filters.institution_type);
    if (filters.owning_bu && filters.owning_bu !== "all") params.set("owning_bu", filters.owning_bu);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    return `${API_BASE}/reports/portfolio.${kind}?${params.toString()}`;
  };

  const trigger = (kind, label) => {
    try {
      const a = document.createElement("a");
      a.href = buildUrl(kind);
      a.rel = "noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Mengunduh ${label}...`);
    } catch (e) {
      toast.error("Gagal memulai unduhan");
    }
  };

  const btnClass = variant === "amber"
    ? "bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="export-menu-trigger" className={`${btnClass} gap-2`}>
          <Download className="h-4 w-4" /> Ekspor Laporan
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Format Laporan</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="export-xlsx" onClick={() => trigger("xlsx", "Excel")} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Excel (.xlsx)</p>
            <p className="text-[11px] text-slate-500">2 sheet: Data + Ringkasan</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="export-pdf" onClick={() => trigger("pdf", "PDF")} className="cursor-pointer">
          <FileType2 className="h-4 w-4 mr-2 text-rose-600" />
          <div>
            <p className="text-sm font-semibold">PDF Laporan</p>
            <p className="text-[11px] text-slate-500">Landscape, siap cetak</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
