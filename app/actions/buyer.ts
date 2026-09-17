"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { extractedFromJson, runRiskAssessment } from "@/lib/risk/assess";
import { AzureDocumentIntelligenceProvider } from "@/lib/documents/azure";
import { buyerDecisionSchema } from "@/lib/validations";
import type { DocumentSnapshot } from "@/lib/risk/rules-engine";

export type ActionState = { error?: string; success?: string };

export async function decideBuyer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireRole(["buyer"]);
  const parsed = buyerDecisionSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    decision: formData.get("decision"),
    confirmedAmount: formData.get("confirmedAmount") || undefined,
    confirmedDueDate: formData.get("confirmedDueDate") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_documents(*)")
    .eq("id", parsed.data.invoiceId)
    .eq("buyer_org_id", ctx.current.organization_id)
    .maybeSingle();

  if (!invoice || invoice.status !== "buyer_review") {
    return { error: "Invoice tidak berada dalam antrean konfirmasi buyer." };
  }

  if (parsed.data.decision === "confirmed") {
    const { error: confError } = await supabase.from("buyer_confirmations").insert({
      invoice_id: parsed.data.invoiceId,
      buyer_org_id: ctx.current.organization_id,
      decision: "confirmed",
      confirmed_amount: parsed.data.confirmedAmount,
      confirmed_due_date: parsed.data.confirmedDueDate,
      note: parsed.data.note ?? null,
      decided_by: ctx.userId,
    });
    if (confError) return { error: confError.message };
  } else {
    const { error: confError } = await supabase.from("buyer_confirmations").insert({
      invoice_id: parsed.data.invoiceId,
      buyer_org_id: ctx.current.organization_id,
      decision: "disputed",
      note: parsed.data.note,
      decided_by: ctx.userId,
    });
    if (confError) return { error: confError.message };
    await supabase
      .from("invoices")
      .update({ status: "rejected" })
      .eq("id", parsed.data.invoiceId);
    revalidatePath("/app/buyer/approvals");
    return { success: "Invoice disengketakan." };
  }

  const admin = createAdminClient();
  const { data: history } = await admin
    .from("invoices")
    .select("amount, issue_date, due_date, requested_advance_percent")
    .eq("vendor_org_id", invoice.vendor_org_id)
    .in("status", ["funded", "repaid", "eligible_for_funding", "partially_funded"]);

  const docs = (invoice.invoice_documents ?? []) as Array<{
    document_type: DocumentSnapshot["documentType"];
    sha256: string;
    extraction_status: string;
    extracted_data: unknown;
  }>;

  const hashes = docs.map((d) => d.sha256);
  const duplicateFlags = await Promise.all(
    hashes.map(async (hash) => {
      const { data } = await admin.rpc("duplicate_document_check", { p_sha256: hash });
      return (data ?? []).filter((row) => row.invoice_id !== invoice.id);
    }),
  );

  const assessment = runRiskAssessment({
    invoice: {
      invoiceNumber: invoice.invoice_number,
      amount: parsed.data.decision === "confirmed" ? parsed.data.confirmedAmount : Number(invoice.amount),
      issueDate: invoice.issue_date,
      dueDate:
        parsed.data.decision === "confirmed" ? parsed.data.confirmedDueDate : invoice.due_date,
      requestedAdvancePercent: invoice.requested_advance_percent,
      buyerStatus: ctx.current.organizations.status,
      duplicateInvoiceHash: docs.some(
        (d, i) => d.document_type === "invoice" && duplicateFlags[i]?.length,
      ),
      duplicateSupportingHash: docs.some(
        (d, i) => d.document_type !== "invoice" && duplicateFlags[i]?.length,
      ),
    },
    documents: docs.map((d) => ({
      documentType: d.document_type,
      sha256: d.sha256,
      extractionStatus: d.extraction_status,
      extracted: extractedFromJson(d.extracted_data),
    })),
    vendorHistory: (history ?? []).map((h) => ({
      amount: Number(h.amount),
      issueDate: h.issue_date,
      dueDate: h.due_date,
      requestedAdvancePercent: h.requested_advance_percent,
    })),
    azureConfigured: new AzureDocumentIntelligenceProvider().isConfigured(),
  });

  await admin.from("risk_assessments").insert({
    invoice_id: invoice.id,
    score: assessment.score,
    risk_band: assessment.riskBand,
    reason_codes: assessment.reasonCodes,
    anomaly_flags: assessment.anomalyFlags,
    assessment_method: assessment.assessmentMethod,
    requires_manual_review: true,
  });

  await supabase.from("invoices").update({ status: "risk_review" }).eq("id", invoice.id);

  revalidatePath("/app/buyer/approvals");
  revalidatePath("/app/risk/queue");
  return {
    success: "Invoice dikonfirmasi. Keputusan akhir menunggu Risk Officer.",
  };
}
