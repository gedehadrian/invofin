import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { RiskBandBadge, StatusBadge } from "@/components/status-badge";
import { formatIdr } from "@/lib/format";
import type { RiskBand } from "@/lib/database.types";

export default async function RiskQueuePage() {
  await requireRole(["risk_officer", "admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, risk_assessments(risk_band, anomaly_flags, created_at)")
    .eq("status", "risk_review")
    .order("updated_at", { ascending: true });

  if (!data?.length) {
    return <EmptyState title="Antrean kosong" description="Invoice terkonfirmasi buyer akan menunggu keputusan Anda." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Antrean Risk Officer</h1>
      <ul className="space-y-3">
        {data.map((invoice) => {
          const risk = [...(invoice.risk_assessments ?? [])].sort((a, b) =>
            a.created_at < b.created_at ? 1 : -1,
          )[0];
          const flags = Array.isArray(risk?.anomaly_flags) ? risk.anomaly_flags.length : 0;
          return (
            <li key={invoice.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <Link href={`/app/risk/invoices/${invoice.id}`} className="text-teal-300">
                {invoice.invoice_number} · {formatIdr(Number(invoice.amount))} · {flags} anomaly
              </Link>
              <div className="flex items-center gap-2">
                {risk ? <RiskBandBadge band={risk.risk_band as RiskBand} /> : null}
                <StatusBadge status={invoice.status} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
