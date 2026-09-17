import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { RiskBandBadge } from "@/components/status-badge";
import { formatIdr } from "@/lib/format";
import type { RiskBand } from "@/lib/database.types";

export default async function LenderDashboard() {
  const ctx = await requireRole(["lender"]);
  const supabase = await createClient();
  const [{ data: opps }, { data: commitments }] = await Promise.all([
    supabase.from("funding_opportunities").select("*, invoices(amount, due_date, risk_assessments(risk_band, created_at))").eq("status", "open"),
    supabase
      .from("funding_commitments")
      .select("amount, status")
      .eq("lender_org_id", ctx.current.organization_id),
  ]);

  const committed = (commitments ?? [])
    .filter((c) => c.status !== "cancelled")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dasbor lender</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total komitmen" value={formatIdr(committed)} />
        <KpiCard label="Peluang terbuka" value={String(opps?.length ?? 0)} />
        <KpiCard label="Catatan" value="Bukan pencairan riil" hint="PaymentProvider masih deferred." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(opps ?? []).slice(0, 6).map((opp) => {
          const invoice = opp.invoices as { due_date?: string; risk_assessments?: { risk_band: RiskBand; created_at: string }[] } | null;
          const band = invoice?.risk_assessments?.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]?.risk_band;
          return (
            <Link
              key={opp.id}
              href={`/app/lender/opportunities/${opp.id}`}
              className="rounded-xl border border-white/10 p-4 hover:border-teal-400/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatIdr(Number(opp.target_amount))}</p>
                {band ? <RiskBandBadge band={band} /> : null}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Terisi {formatIdr(Number(opp.committed_amount))} · return {opp.lender_return_percent}%
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
