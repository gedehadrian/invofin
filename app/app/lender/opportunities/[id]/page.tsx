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
    buyer_confirmations: {
      decision: string;
      confirmed_amount: number | null;
      confirmed_due_date: string | null;
    } | null;
  } | null;
  const risk = invoice?.risk_assessments?.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const remaining = Number(opp.target_amount) - Number(opp.committed_amount);
  const pct = Math.round((Number(opp.committed_amount) / Number(opp.target_amount)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Peluang Pendanaan · {invoice?.invoice_number}</p>
          <h1 className="mt-1 text-2xl font-semibold">Target: {formatIdr(Number(opp.target_amount))}</h1>
        </div>
        {risk ? <RiskBandBadge band={risk.risk_band} /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="surface space-y-4 p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Progres Pengumpulan Dana ({pct}%)</span>
              <span className="font-medium text-primary">Sisa Kuota: {formatIdr(remaining)}</span>
            </div>
            <Progress value={pct} />
            <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Tenor Tagihan</dt>
                <dd className="mt-0.5 font-semibold">
                  {invoice ? tenorDays(invoice.issue_date, invoice.due_date) : 0} hari
                </dd>
              </div>
              <div className="rounded-xl bg-blue-50/70 p-3">
                <dt className="text-xs text-muted-foreground">Imbal Hasil Tenor Ini</dt>
                <dd className="mt-0.5 font-semibold text-primary">{opp.lender_return_percent}%</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Jatuh tempo pada {formatDate(invoice?.buyer_confirmations?.confirmed_due_date ?? invoice?.due_date)} ·{" "}
              {invoice?.buyer_confirmations?.decision === "confirmed"
                ? "✓ Sudah dikonfirmasi Buyer"
                : "Menunggu Buyer"}
            </p>
          </div>

          <div className="surface p-5 text-sm">
            <h2 className="font-semibold">Kenapa Tagihan Ini Lolos?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {(risk?.reason_codes ?? []).map((r) => (
                <li key={r.code}>{r.message}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="text-base font-semibold">Ambil Bagian Pendanaan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kamu bisa mendanai sebagian (patungan) atau langsung ambil seluruh sisa kuota yang tersedia.
          </p>
          <div className="mt-4">
            {opp.status === "open" && remaining > 0 ? (
              <CommitForm opportunityId={opp.id} remaining={remaining} requestId={crypto.randomUUID()} />
            ) : (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                🎉 Kuota pendanaan untuk invoice ini sudah terpenuhi 100%!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

