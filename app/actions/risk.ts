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

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: "Layanan keputusan risiko belum dikonfigurasi di server. Hubungi admin InvoFin.",
    };
  }

  const confirmation = invoice.buyer_confirmations;
  const amount = Number(confirmation?.confirmed_amount ?? invoice.amount);
  const due = confirmation?.confirmed_due_date ?? invoice.due_date;
  const tenor = tenorDays(invoice.issue_date, due);
  const fees = pricingFor({ tenorDays: tenor, riskBand: latest.risk_band });
  const target = targetAdvance(amount, invoice.requested_advance_percent);
  const { error: decisionError } = await admin.rpc("decide_risk_invoice", { p_invoice: invoice.id, p_actor: ctx.userId, p_decision: parsed.data.decision, p_note: parsed.data.note, p_target: target, p_vendor_fee: fees.vendorFeePercent, p_lender_return: fees.lenderReturnPercent });
  if (decisionError) return { error: "Keputusan belum tersimpan: periksa tahap invoice, jatuh tempo, dan pemisahan pembuat/pemeriksa." };

  revalidatePath("/app/risk/queue");
  revalidatePath(`/app/risk/invoices/${invoice.id}`);
  revalidatePath("/app/lender/marketplace");
  return { success: parsed.data.decision === "approved" ? "Invoice disetujui dan masuk marketplace." : "Invoice ditolak oleh Risk Officer." };
}
