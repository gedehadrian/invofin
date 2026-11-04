"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { extractedFromJson, runRiskAssessment } from "@/lib/risk/assess";
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

  if (parsed.data.decision === "disputed") {
    const { error } = await createAdminClient().rpc("decide_buyer_invoice", { p_invoice: invoice.id, p_actor: ctx.userId, p_buyer: ctx.current.organization_id, p_decision: "disputed", p_amount: null, p_due: null, p_note: parsed.data.note, p_assessment: null });
    if (error) return { error: "Keputusan belum tersimpan. Muat ulang untuk memeriksa status invoice." };
    revalidatePath("/app/buyer/approvals");
    return { success: "Invoice disengketakan." };
  }

  // Asesmen dihitung sebelum menulis apa pun: kalau service role atau RPC bermasalah,
  // tidak ada baris konfirmasi yatim yang mengunci invoice di buyer_review.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Mesin penilaian risiko belum dikonfigurasi di server. Hubungi admin InvoFin sebelum mengonfirmasi.",
    };
  }

  const docs = (invoice.invoice_documents ?? []) as Array<{
    document_type: DocumentSnapshot["documentType"];
    sha256: string;
    extraction_status: string;
    extraction_provider: string | null;
    extracted_data: unknown;
  }>;

  let assessment: ReturnType<typeof runRiskAssessment>;
  try {
    const { data: history, error: historyError } = await admin
      .from("invoices")
      .select("amount, issue_date, due_date, requested_advance_percent")
      .eq("vendor_org_id", invoice.vendor_org_id)
      .in("status", ["funded", "repaid", "eligible_for_funding", "partially_funded"]);
    if (historyError) throw new Error(historyError.message);

    const { data: vendorOrg, error: vendorOrgError } = await admin
      .from("organizations")
      .select("name")
      .eq("id", invoice.vendor_org_id)
      .maybeSingle();
    if (vendorOrgError) throw new Error(vendorOrgError.message);

    const duplicateFlags = await Promise.all(
      docs.map(async (doc) => {
        const { data, error } = await admin.rpc("duplicate_document_check", {
          p_sha256: doc.sha256,
        });
        if (error) throw new Error(error.message);
        return (data ?? []).filter((row) => row.invoice_id !== invoice.id);
      }),
    );

    assessment = runRiskAssessment({
      invoice: {
        invoiceNumber: invoice.invoice_number,
        amount: parsed.data.confirmedAmount,
        issueDate: invoice.issue_date,
        dueDate: parsed.data.confirmedDueDate,
        requestedAdvancePercent: invoice.requested_advance_percent,
        buyerStatus: ctx.current.organizations.status,
        buyerName: ctx.current.organizations.name,
        vendorName: vendorOrg?.name ?? null,
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
      azureConfigured: docs.some(doc => doc.extraction_provider?.startsWith("azure-document-intelligence")),
    });
  } catch (error) {
    return {
      error: `Penilaian risiko gagal dijalankan: ${
        error instanceof Error ? error.message : "kesalahan tidak dikenal"
      }`,
    };
  }

  const { error: decisionError } = await admin.rpc("decide_buyer_invoice", { p_invoice: invoice.id, p_actor: ctx.userId, p_buyer: ctx.current.organization_id, p_decision: "confirmed", p_amount: parsed.data.confirmedAmount, p_due: parsed.data.confirmedDueDate, p_note: parsed.data.note ?? null, p_assessment: JSON.parse(JSON.stringify(assessment)) });
  if (decisionError) return { error: "Keputusan dan asesmen belum tersimpan. Muat ulang untuk memeriksa status invoice." };

  revalidatePath("/app/buyer/approvals");
  revalidatePath(`/app/buyer/approvals/${invoice.id}`);
  revalidatePath("/app/risk/queue");
  return {
    success: "Invoice dikonfirmasi. Keputusan akhir menunggu Risk Officer.",
  };
}

