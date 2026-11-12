import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DocumentLinks } from "@/components/document-links";
import { InvoiceTimeline } from "@/components/invoice-timeline";
import { RiskBandBadge, StatusBadge } from "@/components/status-badge";
import { formatDate, formatIdr } from "@/lib/format";
import { RiskDecisionForm } from "./decision-form";
import type { RiskBand } from "@/lib/database.types";

export default async function RiskInvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["risk_officer", "admin"]);
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "*, invoice_documents(*), status_history(*), buyer_confirmations(*), risk_assessments(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();
  const risk = [...(invoice.risk_assessments ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0];
  const anomalies = (Array.isArray(risk?.anomaly_flags) ? risk.anomaly_flags : []) as {
    code: string;
    message: string;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            Nominal {formatIdr(Number(invoice.amount))} · Jatuh tempo {formatDate(invoice.due_date)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <InvoiceTimeline status={invoice.status} history={invoice.status_history ?? []} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {risk ? (
            <div className="surface space-y-4 p-5 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Hasil Cek Mesin Risiko</h2>
                <RiskBandBadge band={risk.risk_band as RiskBand} />
              </div>
              <div className="rounded-xl bg-blue-50/70 p-3.5">
                <p className="text-xs text-muted-foreground">Skor Kelayakan Awal</p>
                <p className="mt-0.5 text-2xl font-semibold text-primary">{risk.score} / 100</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Catatan Pemeriksaan:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {(Array.isArray(risk.reason_codes) ? risk.reason_codes : []).map((r) => {
                    const item = r as { code: string; message: string };
                    return <li key={item.code}>{item.message}</li>;
                  })}
                </ul>
              </div>
              {anomalies.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Perlu Perhatian Ekstra:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {anomalies.map((item) => (
                      <li key={item.code}>{item.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="surface p-5 text-sm text-muted-foreground">
              Skor risiko otomatis muncul setelah Buyer mengonfirmasi tagihan ini.
            </div>
          )}

          <div className="surface p-5">
            <h2 className="font-semibold">3 Dokumen Bukti</h2>
            <DocumentLinks documents={invoice.invoice_documents ?? []} />
          </div>
        </div>

        <div>
          {invoice.status === "risk_review" ? (
            <RiskDecisionForm invoiceId={invoice.id} />
          ) : (
            <div className="surface p-5 text-sm text-muted-foreground">
              Keputusan untuk tagihan ini sudah tercatat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

