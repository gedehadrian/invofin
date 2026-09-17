import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, EmptyState } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { formatIdr } from "@/lib/format";

export default async function BuyerDashboard() {
  const ctx = await requireRole(["buyer"]);
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("buyer_org_id", ctx.current.organization_id);

  const rows = invoices ?? [];
  const pending = rows.filter((i) => i.status === "buyer_review");
  const confirmed = rows.filter((i) =>
    ["risk_review", "eligible_for_funding", "partially_funded", "funded"].includes(i.status),
  );
  const disputed = rows.filter((i) => i.status === "rejected");
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const horizonDate = horizon.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const soon = rows.filter((i) => i.due_date >= today && i.due_date <= horizonDate);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dasbor buyer</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Menunggu konfirmasi" value={String(pending.length)} />
        <KpiCard label="Terkonfirmasi" value={String(confirmed.length)} />
        <KpiCard label="Disengketakan" value={String(disputed.length)} />
        <KpiCard label="Jatuh tempo 30 hari" value={String(soon.length)} />
      </div>
      {pending.length === 0 ? (
        <EmptyState title="Tidak ada antrean" description="Invoice baru akan muncul setelah vendor mengajukan." />
      ) : (
        <ul className="space-y-2 text-sm">
          {pending.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <Link className="text-primary" href={`/app/buyer/approvals/${invoice.id}`}>
                {invoice.invoice_number} · {formatIdr(Number(invoice.amount))}
              </Link>
              <StatusBadge status={invoice.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
