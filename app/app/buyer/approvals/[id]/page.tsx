import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DocumentLinks } from "@/components/document-links";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatIdr } from "@/lib/format";
import { BuyerDecisionForm } from "./decision-form";

export default async function BuyerApprovalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireRole(["buyer"]);
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_documents(*)")
    .eq("id", id)
    .eq("buyer_org_id", ctx.current.organization_id)
    .maybeSingle();
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            Tagihan {formatIdr(Number(invoice.amount))} · Jatuh tempo {formatDate(invoice.due_date)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="font-semibold">Cek 3 Dokumen dari Vendor</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pastikan Invoice, PO, dan BAST sesuai dengan catatan penerimaan barang di perusahaanmu.
          </p>
          <DocumentLinks documents={invoice.invoice_documents ?? []} />
        </div>

        <div className="surface p-5">
          <h2 className="font-semibold">Keputusan Konfirmasi Buyer</h2>
          {invoice.status === "buyer_review" ? (
            <div className="mt-3">
              <BuyerDecisionForm
                invoiceId={invoice.id}
                amount={Number(invoice.amount)}
                dueDate={invoice.due_date}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Sip, tagihan ini sudah kamu berikan keputusan sebelumnya.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

