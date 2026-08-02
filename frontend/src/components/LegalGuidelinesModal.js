import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export default function LegalGuidelinesModal({ open, onOpenChange, institutionType }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!open || !institutionType) return;
    api.get(`/guidelines/${encodeURIComponent(institutionType)}`).then(r => setItems(r.data.items || []));
  }, [open, institutionType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" data-testid="guidelines-modal">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider">
            <Info className="h-4 w-4" /> Panduan Legal
          </div>
          <DialogTitle className="font-heading text-xl">Matriks Kelengkapan Dokumen — {institutionType || "-"}</DialogTitle>
          <DialogDescription className="text-xs">
            Referensi read-only untuk membantu Business Unit mempersiapkan kelengkapan legalitas mitra.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs">Nama Dokumen</TableHead>
                <TableHead className="text-xs">Kategori</TableHead>
                <TableHead className="text-xs">Syarat Mutlak</TableHead>
                <TableHead className="text-xs">Risiko Jika Tidak Ada</TableHead>
                <TableHead className="text-xs">Solusi / Mitigasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-sm text-slate-400 text-center py-8">Pilih Jenis Institusi terlebih dahulu.</TableCell></TableRow>
              )}
              {items.map((it, idx) => (
                <TableRow key={idx} className="text-sm">
                  <TableCell className="font-medium">{it.doc}</TableCell>
                  <TableCell>
                    <Badge className={it.kategori === "Wajib" ? "bg-rose-100 text-rose-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                      {it.kategori}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={it.cp === "YA" ? "bg-teal-100 text-teal-700 border-0" : "bg-slate-100 text-slate-700 border-0"}>
                      {it.cp}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{it.risiko}</TableCell>
                  <TableCell className="text-xs text-slate-600">{it.solusi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
