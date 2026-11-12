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
import { FinancingSummary } from "@/components/financing-summary";

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
  const processing = (invoice.invoice_documents ?? []).some((doc) =>
    ["pending", "processing"].includes(doc.extraction_status),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            {formatIdr(Number(invoice.amount))} · Jatuh tempo {formatDate(invoice.due_date)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <InvoiceTimeline status={invoice.status} history={invoice.status_history ?? []} />

      {invoice.status === "extraction_review" && (
        <div className="surface p-5">
          <h2 className="text-base font-semibold">Cek Hasil Bacaan Dokumen (OCR)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {processing
              ? "Mesin sedang membaca dokumenmu. Tunggu sebentar ya..."
              : "Mesin sudah selesai membaca dokumenmu. Yuk pastikan angkanya sudah sesuai sebelum dikirim ke Buyer."}
          </p>
          <ExtractionProgress processing={processing} />
          {!processing && <ConfirmExtractionForm invoice={invoice} />}
        </div>
      )}

      <FinancingSummary
        amount={Number(invoice.amount)}
        advancePercent={invoice.requested_advance_percent ?? 80}
        feePercent={invoice.funding_opportunities?.vendor_fee_percent}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface p-5">
          <h2 className="font-semibold">3 Dokumen Lampiran</h2>
          <DocumentLinks documents={invoice.invoice_documents ?? []} />
        </div>

        <div className="surface p-5">
          <h2 className="font-semibold">Status dari Buyer</h2>
          {invoice.buyer_confirmations ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium text-primary">
                {invoice.buyer_confirmations.decision === "confirmed"
                  ? "✓ Sudah Dikonfirmasi Buyer"
                  : "⚠ Disengketakan oleh Buyer"}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoice.buyer_confirmations.confirmed_amount
                  ? `Nominal disetujui: ${formatIdr(Number(invoice.buyer_confirmations.confirmed_amount))}`
                  : invoice.buyer_confirmations.note}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {invoice.status === "extraction_review"
                ? "Menunggu kamu klik tombol konfirmasi di atas dulu."
                : "Sedang menunggu Buyer mengecek dan memberi konfirmasi."}
            </p>
          )}
        </div>

        <div className="surface p-5">
          <h2 className="font-semibold">Review Tim Risiko</h2>
          {latestRisk ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <RiskBandBadge band={latestRisk.risk_band as RiskBand} />
                <span className="text-xs font-medium">Skor: {latestRisk.score}/100</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Status:{" "}
                {latestRisk.decision === "approved"
                  ? "Disetujui & Tayang di Marketplace 🎉"
                  : latestRisk.decision === "rejected"
                    ? "Belum disetujui oleh Risk Officer"
                    : "Sedang ditinjau Risk Officer"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Skor risiko otomatis dihitung begitu Buyer mengonfirmasi tagihan ini.
            </p>
          )}
        </div>
      </section>

      {extracted && Object.keys(extracted).length > 0 && (
        <details className="surface p-4 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Lihat detail mentah hasil bacaan OCR
          </summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              ["Nomor Invoice", "invoiceNumber"],
              ["Vendor", "vendorName"],
              ["Buyer", "buyerName"],
              ["Nominal", "amount"],
              ["Terbit", "issueDate"],
              ["Jatuh Tempo", "dueDate"],
            ].map(([label, key]) => (
              <div key={key} className="rounded-lg border p-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium">
                  {extracted?.[key] == null
                    ? "—"
                    : key === "amount"
                      ? formatIdr(Number(extracted[key]))
                      : String(extracted[key])}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

