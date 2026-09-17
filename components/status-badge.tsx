import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_LABEL } from "@/lib/format";
import type { InvoiceStatus, RiskBand } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-800 text-slate-200",
  submitted: "bg-sky-950 text-sky-200",
  extraction_review: "bg-amber-950 text-amber-200",
  buyer_review: "bg-indigo-950 text-indigo-200",
  risk_review: "bg-orange-950 text-orange-100",
  eligible_for_funding: "bg-teal-950 text-teal-200",
  partially_funded: "bg-cyan-950 text-cyan-200",
  funded: "bg-emerald-950 text-emerald-200",
  rejected: "bg-red-950 text-red-200",
  repaid: "bg-zinc-800 text-zinc-200",
};

export function StatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <Badge className={cn("border-0 font-medium", STATUS_CLASS[status] ?? "bg-slate-800")}>
      {INVOICE_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const BAND_CLASS: Record<RiskBand, string> = {
  A: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  B: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
  C: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  D: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  review: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

export function RiskBandBadge({ band }: { band: RiskBand }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", BAND_CLASS[band])}>
      Risk {band}
    </span>
  );
}
