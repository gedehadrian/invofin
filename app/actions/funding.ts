"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { fundingCommitmentSchema } from "@/lib/validations";

export type ActionState = { error?: string; success?: string };

export async function commitFunding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireRole(["lender"]);
  if (ctx.current.organizations.status !== "active") {
    return { error: "Organisasi lender belum aktif." };
  }

  const parsed = fundingCommitmentSchema.safeParse({
    requestId: formData.get("requestId"),
    opportunityId: formData.get("opportunityId"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("commit_funding_once", {
    p_opportunity: parsed.data.opportunityId,
    p_amount: parsed.data.amount,
    p_request: parsed.data.requestId,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/lender/marketplace");
  revalidatePath("/app/lender/portfolio");
  return { success: "Komitmen pendanaan tercatat. Dana sungguhan belum dicairkan." };
}
