import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { RiskBandBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
    return (
      <EmptyState
        title="Belum ada peluang baru di etalase"
        description="Tagihan yang sudah dikonfirmasi Buyer dan disetujui Risk Officer bakal langsung tayang di sini."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace Pendanaan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua tagihan di sini sudah melewati 3 dokumen wajib, di-acc Buyer, dan lolos review tim Risiko.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
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
          const pct = Math.round((Number(opp.committed_amount) / Number(opp.target_amount)) * 100);
          const remaining = Number(opp.target_amount) - Number(opp.committed_amount);

          return (
            <div key={opp.id} className="surface flex flex-col justify-between space-y-4 p-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{invoice?.invoice_number}</p>
                    <p className="mt-0.5 text-xl font-semibold">{formatIdr(Number(opp.target_amount))}</p>
                  </div>
                  {risk ? <RiskBandBadge band={risk.risk_band} /> : null}
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Terkumpul {pct}%</span>
                    <span>Sisa {formatIdr(remaining)}</span>
                  </div>
                  <Progress value={pct} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                    Tenor {invoice ? tenorDays(invoice.issue_date, invoice.due_date) : 0} hari
                  </span>
                  <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-primary">
                    Imbal hasil {opp.lender_return_percent}%
                  </span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href={`/app/lender/opportunities/${opp.id}`}>
                  Lihat & Danai <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

