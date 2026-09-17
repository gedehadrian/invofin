"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { pricingFor, targetAdvance } from "@/lib/funding/pricing";
import { tenorDays } from "@/lib/format";
import { riskDecisionSchema } from "@/lib/validations";

export type ActionState = { error?: string; success?: string };

export async function decideRisk(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireRole(["risk_officer", "admin"]);
  const parsed = riskDecisionSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, buyer_confirmations(*), risk_assessments(*)")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle();

  if (!invoice || invoice.status !== "risk_review") {
    return { error: "Invoice tidak berada di antrean Risk Officer." };
  }

  const assessments = [...(invoice.risk_assessments ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
  const latest = assessments[0];
  if (!latest) return { error: "Hasil asesmen risiko belum tersedia." };

  const admin = createAdminClient();
  await admin
    .from("risk_assessments")
    .update({
      decision: parsed.data.decision,
      decision_note: parsed.data.note,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", latest.id);

  if (parsed.data.decision === "rejected") {
    await admin
      .from("invoices")
      .update({ status: "rejected" })
      .eq("id", invoice.id);
    revalidatePath("/app/risk/queue");
    return { success: "Invoice ditolak oleh Risk Officer." };
  }

  const confirmation = invoice.buyer_confirmations;
  const amount = Number(confirmation?.confirmed_amount ?? invoice.amount);
  const due = confirmation?.confirmed_due_date ?? invoice.due_date;
  const tenor = tenorDays(invoice.issue_date, due);
  const fees = pricingFor({ tenorDays: tenor, riskBand: latest.risk_band });
  const target = targetAdvance(amount, invoice.requested_advance_percent);
  const now = new Date();
  const closes = new Date(now.getTime() + 14 * 86_400_000);

  const { error: oppError } = await admin.from("funding_opportunities").insert({
    invoice_id: invoice.id,
    target_amount: target,
    vendor_fee_percent: fees.vendorFeePercent,
    lender_return_percent: fees.lenderReturnPercent,
    opens_at: now.toISOString(),
    closes_at: closes.toISOString(),
    status: "open",
  });
  if (oppError) return { error: oppError.message };

  await admin
    .from("invoices")
    .update({ status: "eligible_for_funding" })
    .eq("id", invoice.id);

  revalidatePath("/app/risk/queue");
  revalidatePath("/app/lender/marketplace");
  return { success: "Invoice disetujui dan masuk marketplace." };
}
