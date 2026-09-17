import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RiskBandBadge } from "@/components/status-badge";
import { formatDate, formatIdr, tenorDays } from "@/lib/format";
import { CommitForm } from "./commit-form";
import { Progress } from "@/components/ui/progress";
import type { RiskBand } from "@/lib/database.types";

export default async function OpportunityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["lender"]);
  const supabase = await createClient();
  const { data: opp } = await supabase
    .from("funding_opportunities")
    .select(
      "*, invoices(invoice_number, amount, issue_date, due_date, status, description, risk_assessments(score, risk_band, reason_codes, anomaly_flags, created_at), buyer_confirmations(decision, confirmed_amount, confirmed_due_date))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!opp) notFound();

  const invoice = opp.invoices as {
    invoice_number: string;
    amount: number;
    issue_date: string;
    due_date: string;
    description: string | null;
    status: string;
    risk_assessments: {
      score: number;
      risk_band: RiskBand;
      reason_codes: { code: string; message: string }[];
      anomaly_flags: { code: string }[];
      created_at: string;
    }[];
    buyer_confirmations: { decision: string; confirmed_amount: number | null; confirmed_due_date: string | null } | null;
  } | null;
  const risk = invoice?.risk_assessments?.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const remaining = Number(opp.target_amount) - Number(opp.committed_amount);
  const pct = Math.round((Number(opp.committed_amount) / Number(opp.target_amount)) * 100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">{invoice?.invoice_number}</p>
        <h1 className="text-2xl font-semibold">{formatIdr(Number(opp.target_amount))}</h1>
        {risk ? <div className="mt-2"><RiskBandBadge band={risk.risk_band} /></div> : null}
      </div>
      <Progress value={pct} />
      <p className="text-sm text-slate-400">
        Tenor {invoice ? tenorDays(invoice.issue_date, invoice.due_date) : 0} hari · buyer{" "}
        {invoice?.buyer_confirmations?.decision ?? "—"} · jatuh tempo{" "}
        {formatDate(invoice?.buyer_confirmations?.confirmed_due_date ?? invoice?.due_date)}
      </p>
      <div className="rounded-xl border border-white/10 p-4 text-sm">
        <p className="font-medium">Reason codes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
          {(risk?.reason_codes ?? []).map((r) => (
            <li key={r.code}>{r.code}: {r.message}</li>
          ))}
        </ul>
      </div>
      {opp.status === "open" ? (
        <CommitForm opportunityId={opp.id} remaining={remaining} />
      ) : (
        <p className="text-sm text-slate-400">Peluang {opp.status}.</p>
      )}
    </div>
  );
}
