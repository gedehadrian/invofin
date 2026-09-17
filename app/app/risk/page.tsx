import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { formatIdr } from "@/lib/format";

export default async function RiskDashboard() {
  await requireRole(["risk_officer", "admin"]);
  const supabase = await createClient();
  const [{ data: invoices }, { data: assessments }] = await Promise.all([
    supabase.from("invoices").select("id, amount, status, submitted_at, created_at, updated_at"),
    supabase.from("risk_assessments").select("requires_manual_review, anomaly_flags, decision"),
  ]);

  const submitted = invoices?.filter((i) => i.status !== "draft") ?? [];
  const queue = invoices?.filter((i) => i.status === "risk_review") ?? [];
  const flags = (assessments ?? []).filter((a) => Array.isArray(a.anomaly_flags) && a.anomaly_flags.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-semibold">Dasbor Risk Officer</h1>
        <Link className="text-sm text-primary" href="/app/risk/queue">
          Buka antrean
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Submitted volume" value={formatIdr(submitted.reduce((s, i) => s + Number(i.amount), 0))} />
        <KpiCard label="Antrean manual" value={String(queue.length)} />
        <KpiCard label="Anomaly flags" value={String(flags.length)} />
        <KpiCard label="Keputusan akhir" value="Risk Officer" />
      </div>
    </div>
  );
}
