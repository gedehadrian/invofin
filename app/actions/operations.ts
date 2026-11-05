"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
export async function retryDocumentJob(
  _previous: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const ctx = await requireRole(["admin", "risk_officer"]),
    id = z.string().uuid().safeParse(form.get("jobId"));
  if (!id.success) return { error: "Pekerjaan tidak dikenali." };
  const { data, error } = await createAdminClient().rpc("retry_document_job", {
    p_job: id.data,
    p_actor: ctx.userId,
  });
  if (error || !data)
    return { error: "Pekerjaan tidak lagi gagal atau belum bisa diulang." };
  revalidatePath("/app/admin/jobs");
  return { success: "Pekerjaan kembali ke antrean." };
}
