import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { RiskBandBadge } from "@/components/status-badge";
import { formatIdr, tenorDays } from "@/lib/format";
import type { RiskBand } from "@/lib/database.types";

export default async function MarketplacePage() {
  await requireRole(["lender"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("funding_opportunities")
    .select(
      "*, invoices(id, invoice_number, amount, issue_date, due_date, status, risk_assessments(risk_band, reason_codes, created_at), buyer_confirmations(decision))",
    )
    .eq("status", "open")
    .order("opens_at", { ascending: false });

  if (!data?.length) {
    return <EmptyState title="Marketplace kosong" description="Invoice lolos Risk Officer akan muncul di sini." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Marketplace</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((opp) => {
          const invoice = opp.invoices as {
            id: string;
            invoice_number: string;
            amount: number;
            issue_date: string;
            due_date: string;
            risk_assessments: { risk_band: RiskBand; reason_codes: unknown; created_at: string }[];
          } | null;
          const risk = invoice?.risk_assessments?.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
          const reasons = Array.isArray(risk?.reason_codes)
            ? (risk.reason_codes as { code?: string }[])
            : [];
          return (
            <Link
              key={opp.id}
              href={`/app/lender/opportunities/${opp.id}`}
              className="surface p-5 hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{invoice?.invoice_number}</p>
                  <p className="text-xl font-semibold">{formatIdr(Number(opp.target_amount))}</p>
                </div>
                {risk ? <RiskBandBadge band={risk.risk_band} /> : null}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Tenor {invoice ? tenorDays(invoice.issue_date, invoice.due_date) : 0} hari · progress{" "}
                {Math.round((Number(opp.committed_amount) / Number(opp.target_amount)) * 100)}%
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Reason codes: {reasons.map((r) => r.code).filter(Boolean).slice(0, 4).join(", ") || "bersih"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
