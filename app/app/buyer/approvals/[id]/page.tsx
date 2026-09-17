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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-sm text-slate-400">
            {formatIdr(Number(invoice.amount))} · {formatDate(invoice.due_date)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <DocumentLinks documents={invoice.invoice_documents ?? []} />
      {invoice.status === "buyer_review" ? (
        <BuyerDecisionForm
          invoiceId={invoice.id}
          amount={Number(invoice.amount)}
          dueDate={invoice.due_date}
        />
      ) : (
        <p className="text-sm text-slate-400">Invoice ini sudah diputuskan.</p>
      )}
    </div>
  );
}
