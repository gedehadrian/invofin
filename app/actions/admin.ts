"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import type { OrganizationStatus } from "@/lib/database.types";

export type ActionState = { error?: string; success?: string };

export async function updateOrganizationStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin"]);
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "") as OrganizationStatus;
  if (!organizationId || !["pending", "active", "suspended"].includes(status)) {
    return { error: "Data organisasi tidak valid." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ status })
    .eq("id", organizationId);
  if (error) return { error: error.message };
  revalidatePath("/app/admin/organizations");
  return { success: "Status organisasi diperbarui." };
}

export async function markNotificationRead(id: string) {
  const { requireUser } = await import("@/lib/auth/session");
  const ctx = await requireUser();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ctx.userId);
  revalidatePath("/app");
}
