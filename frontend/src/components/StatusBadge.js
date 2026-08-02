import { Badge } from "@/components/ui/badge";

export const STATUS_META = {
  drafting: { label: "Drafting", cls: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
  submitted_for_review: { label: "Submitted for Review", cls: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" },
  under_legal_review: { label: "Under Legal Review", cls: "bg-sky-100 text-sky-700 hover:bg-sky-100" },
  revision_required: { label: "Revision Required", cls: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  ready_for_signature: { label: "Legal Approved", cls: "bg-teal-100 text-teal-700 hover:bg-teal-100" },
  pending_final_verification: { label: "Pending Final Verification", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  signed_active: { label: "Signed & Active", cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  expiring_soon: { label: "Expiring Soon", cls: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  expired: { label: "Expired", cls: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
};

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.drafting;
  return (
    <Badge data-testid={`status-badge-${status}`} className={`rounded-full font-medium px-2.5 py-1 border-0 ${m.cls}`}>
      {m.label}
    </Badge>
  );
}
