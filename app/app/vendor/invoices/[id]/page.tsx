import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InvoiceTimeline } from "@/components/invoice-timeline";
import { RiskBandBadge, StatusBadge } from "@/components/status-badge";
import { formatIdr, formatDate } from "@/lib/format";
import { ConfirmExtractionForm } from "./confirm-extraction-form";
import { DocumentLinks } from "@/components/document-links";
import type { RiskBand } from "@/lib/database.types";
import { ExtractionProgress } from "@/components/extraction-progress";

export default async function VendorInvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireRole(["vendor"]);
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "*, invoice_documents(*), status_history(*), buyer_confirmations(*), risk_assessments(*), funding_opportunities(*)",
    )
    .eq("id", id)
    .eq("vendor_org_id", ctx.current.organization_id)
    .maybeSingle();

  if (!invoice) notFound();
  const latestRisk = [...(invoice.risk_assessments ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0];
  const invoiceDoc = invoice.invoice_documents?.find((d) => d.document_type === "invoice");
  const extracted = (invoiceDoc?.extracted_data as { fields?: Record<string, unknown> } | null)
    ?.fields;
  const processing = (invoice.invoice_documents ?? []).some(doc => ["pending", "processing"].includes(doc.extraction_status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            {formatIdr(Number(invoice.amount))} · jatuh tempo {formatDate(invoice.due_date)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <InvoiceTimeline status={invoice.status} history={invoice.status_history ?? []} />
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-4">
          <h2 className="font-medium">Dokumen</h2>
          <DocumentLinks documents={invoice.invoice_documents ?? []} />
        </div>
        <div className="surface p-4">
          <h2 className="font-medium">Ekstraksi OCR</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {processing ? "Pemeriksaan dokumen sedang berjalan." : invoiceDoc?.extraction_status === "completed" ? "Ekstraksi selesai. Tinjau data sebelum mengonfirmasi." : "Hasil ekstraksi memerlukan pemeriksaan manual."}
          </p>
          <ExtractionProgress processing={processing} />
          <dl className="mt-4 space-y-3 text-xs">{[["Nomor invoice", "invoiceNumber"], ["Vendor", "vendorName"], ["Buyer", "buyerName"], ["Nominal", "amount"], ["Terbit", "issueDate"], ["Jatuh tempo", "dueDate"]].map(([label, key]) => <div key={key} className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{extracted?.[key] == null ? "Perlu diperiksa" : key === "amount" ? formatIdr(Number(extracted[key])) : String(extracted[key])}</dd></div>)}</dl>
          {!processing && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Periksa semua field terhadap dokumen asli. Field yang kosong atau kurang pasti perlu dilengkapi sebelum konfirmasi.</p>}
          {invoice.status === "extraction_review" && !processing ? (
            <ConfirmExtractionForm invoice={invoice} />
          ) : null}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-4">
          <h2 className="font-medium">Konfirmasi buyer</h2>
          {invoice.buyer_confirmations ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {invoice.buyer_confirmations.decision} ·{" "}
              {invoice.buyer_confirmations.confirmed_amount
                ? formatIdr(Number(invoice.buyer_confirmations.confirmed_amount))
                : invoice.buyer_confirmations.note}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada keputusan buyer.</p>
          )}
        </div>
        <div className="surface p-4">
          <h2 className="font-medium">Penilaian risiko awal</h2>
          {latestRisk ? (
            <div className="mt-2 space-y-2 text-sm">
              <RiskBandBadge band={latestRisk.risk_band as RiskBand} />
              <p>Skor aturan awal: {latestRisk.score}/100</p>
              <p className="text-xs text-muted-foreground">Indikator prototipe, belum merupakan model risiko kredit yang tervalidasi.</p>
              <p className="text-muted-foreground">
                Keputusan akhir: Risk Officer
                {latestRisk.decision === "approved" ? " (disetujui)" : latestRisk.decision === "rejected" ? " (ditolak)" : " (menunggu)"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Belum dinilai.</p>
          )}
        </div>
      </section>
    </div>
  );
}
