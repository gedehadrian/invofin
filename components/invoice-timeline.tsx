import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { StatusHistory } from "@/lib/database.types";

const FLOW = [
  "draft",
  "submitted",
  "extraction_review",
  "buyer_review",
  "risk_review",
  "eligible_for_funding",
  "partially_funded",
  "funded",
];

export function InvoiceTimeline({
  status,
  history,
}: {
  status: string;
  history: StatusHistory[];
}) {
  const currentIdx = FLOW.indexOf(status);
  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {FLOW.map((step, idx) => {
          const done = currentIdx >= idx && status !== "rejected";
          const active = step === status;
          return (
            <li
              key={step}
              className={`rounded-lg border px-2 py-2 text-[11px] ${
                active
                  ? "border-teal-400/60 bg-teal-500/10 text-teal-200"
                  : done
                    ? "border-white/10 bg-white/5 text-slate-200"
                    : "border-white/5 text-slate-500"
              }`}
            >
              {step.replaceAll("_", " ")}
            </li>
          );
        })}
      </ol>
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <StatusBadge status={item.to_status} />
              {item.note ? <p className="mt-1 text-slate-400">{item.note}</p> : null}
            </div>
            <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
