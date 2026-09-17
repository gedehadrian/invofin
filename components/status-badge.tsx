import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_LABEL } from "@/lib/format";
import type { InvoiceStatus, RiskBand } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky-50 text-sky-700",
  extraction_review: "bg-amber-50 text-amber-800",
  buyer_review: "bg-indigo-50 text-indigo-700",
  risk_review: "bg-orange-50 text-orange-800",
  eligible_for_funding: "bg-emerald-50 text-emerald-800",
  partially_funded: "bg-cyan-50 text-cyan-800",
  funded: "bg-[#439a86]/12 text-[#2f7a6a]",
  rejected: "bg-red-50 text-[#bb4430]",
  repaid: "bg-muted text-foreground",
};

export function StatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <Badge className={cn("border-0 font-medium", STATUS_CLASS[status] ?? "bg-muted")}>
      {INVOICE_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const BAND_CLASS: Record<RiskBand, string> = {
  A: "bg-emerald-50 text-emerald-800",
  B: "bg-[#197bbd]/10 text-[#197bbd]",
  C: "bg-amber-50 text-amber-800",
  D: "bg-orange-50 text-orange-800",
  review: "bg-red-50 text-[#bb4430]",
};

export function RiskBandBadge({ band }: { band: RiskBand }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", BAND_CLASS[band])}>
      Risk {band}
    </span>
  );
}
