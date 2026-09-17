import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DocumentLinks } from "@/components/document-links";
import { InvoiceTimeline } from "@/components/invoice-timeline";
import { RiskBandBadge, StatusBadge } from "@/components/status-badge";
import { formatIdr } from "@/lib/format";
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">{formatIdr(Number(invoice.amount))}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <InvoiceTimeline status={invoice.status} history={invoice.status_history ?? []} />
      <DocumentLinks documents={invoice.invoice_documents ?? []} />
      {risk ? (
        <div className="surface p-4 text-sm">
          <RiskBandBadge band={risk.risk_band as RiskBand} />
          <p className="mt-2">Skor {risk.score} · {risk.assessment_method}</p>
          <p className="mt-2 text-muted-foreground">Reason codes</p>
          <ul className="list-disc pl-5 text-slate-300">
            {(Array.isArray(risk.reason_codes) ? risk.reason_codes : []).map((r) => {
              const item = r as { code: string; message: string };
              return (
                <li key={item.code}>
                  {item.code}: {item.message}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-muted-foreground">Anomaly flags</p>
          {anomalies.length ? (
            <ul className="list-disc pl-5 text-slate-300">
              {anomalies.map((item) => (
                <li key={item.code}>
                  {item.code}: {item.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-1 text-slate-300">Tidak ada anomali terdeteksi.</p>
          )}
        </div>
      ) : (
        <div className="surface p-4 text-sm text-muted-foreground">
          Hasil asesmen risiko belum tersedia untuk invoice ini. Asesmen dibuat otomatis
          saat buyer mengonfirmasi invoice.
        </div>
      )}
      {invoice.status === "risk_review" ? <RiskDecisionForm invoiceId={invoice.id} /> : null}
    </div>
  );
}
