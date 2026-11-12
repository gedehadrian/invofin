import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { RiskBandBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatIdr } from "@/lib/format";
import type { RiskBand } from "@/lib/database.types";

export default async function RiskQueuePage() {
  await requireRole(["risk_officer", "admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, risk_assessments(score, risk_band, anomaly_flags, created_at)")
    .eq("status", "risk_review")
    .order("updated_at", { ascending: true });

  if (!data?.length) {
    return (
      <EmptyState
        title="Antrean review bersih! ☕"
        description="Belum ada invoice yang menunggu keputusan Risk Officer. Begitu Buyer mengonfirmasi tagihan, datanya langsung masuk ke sini."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Antrean Review Risiko</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tagihan di bawah ini sudah di-acc oleh Buyer dan dianalisis otomatis oleh mesin. Tinggal tunggu lampu hijau darimu!
        </p>
      </div>
      <div className="space-y-3">
        {data.map((invoice) => {
          const risk = [...(invoice.risk_assessments ?? [])].sort((a, b) =>
            a.created_at < b.created_at ? 1 : -1,
          )[0];
          const flags = Array.isArray(risk?.anomaly_flags) ? risk.anomaly_flags.length : 0;
          return (
            <div
              key={invoice.id}
              className="surface flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="font-semibold">{invoice.invoice_number}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Nominal {formatIdr(Number(invoice.amount))} · Skor {risk?.score ?? "—"}/100 ·{" "}
                  {flags === 0 ? "Tidak ada anomali" : `${flags} catatan perlu dicek`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {risk ? <RiskBandBadge band={risk.risk_band as RiskBand} /> : null}
                <StatusBadge status={invoice.status} />
                <Button asChild size="sm">
                  <Link href={`/app/risk/invoices/${invoice.id}`}>
                    Review & Putuskan <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

