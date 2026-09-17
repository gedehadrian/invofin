import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { StatusHistory } from "@/lib/database.types";

// Alur nyata yang ditulis aplikasi. Status 'submitted' masih ada di enum database
// tetapi tidak pernah dipakai kode, jadi tidak ditampilkan agar tidak menyesatkan.
const FLOW = [
  "draft",
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
  // extraction_review hanya dilewati saat OCR belum lengkap, jadi riwayat nyata
  // lebih akurat daripada sekadar posisi di FLOW.
  const reached = new Set(history.map((item) => item.to_status));
  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {FLOW.map((step, idx) => {
          const passed = reached.size > 0 ? reached.has(step) : currentIdx >= idx;
          const done = passed && status !== "rejected";
          const active = step === status;
          return (
            <li
              key={step}
              className={`rounded-lg border px-2 py-2 text-[11px] ${
                active
                  ? "border-primary/30 bg-secondary text-primary"
                  : done
                    ? "border-border bg-muted text-foreground"
                    : "border-border text-muted-foreground"
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
              {item.note ? <p className="mt-1 text-muted-foreground">{item.note}</p> : null}
            </div>
            <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
