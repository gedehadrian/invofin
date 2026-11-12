import { Check } from "lucide-react";
import { INVOICE_STATUS_LABEL } from "@/lib/format";
import type { StatusHistory } from "@/lib/database.types";

const STEPS = [
  { key: "draft", label: "1. Draf" },
  { key: "extraction_review", label: "2. Cek OCR" },
  { key: "buyer_review", label: "3. Konfirmasi Buyer" },
  { key: "risk_review", label: "4. Review Risiko" },
  { key: "eligible_for_funding", label: "5. Tayang Marketplace" },
  { key: "funded", label: "6. Terdanai!" },
];

export function InvoiceTimeline({
  status,
  history,
}: {
  status: string;
  history: StatusHistory[];
}) {
  const normalizedStatus = status === "partially_funded" ? "eligible_for_funding" : status === "repaid" ? "funded" : status;
  const currentIdx = STEPS.findIndex((s) => s.key === normalizedStatus);
  const reached = new Set(history.map((item) => item.to_status));

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold">Progres Tagihan</span>
        <span className="text-muted-foreground">Status saat ini: {INVOICE_STATUS_LABEL[status] ?? status}</span>
      </div>
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step, idx) => {
          const passed = reached.size > 0 ? reached.has(step.key) || currentIdx > idx : currentIdx >= idx;
          const active = step.key === normalizedStatus;
          const done = passed && !active && status !== "rejected";
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                active
                  ? "border-primary bg-blue-50 text-primary"
                  : done
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                    : "border-border text-muted-foreground"
              }`}
            >
              {done && <Check className="size-3.5 shrink-0" />}
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

