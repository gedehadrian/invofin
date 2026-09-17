"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signInSchema, signUpSchema } from "@/lib/validations";

export type ActionState = { error?: string; success?: string };

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect("/app");
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
    organizationType: formData.get("organizationType"),
    taxId: formData.get("taxId") || undefined,
    sector: formData.get("sector") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Gagal membuat akun." };

  await supabase.from("profiles").upsert({
    id: data.user.id,
    full_name: parsed.data.fullName,
  });

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: parsed.data.organizationName,
      type: parsed.data.organizationType,
      tax_id: parsed.data.taxId ?? null,
      sector: parsed.data.sector ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Gagal membuat organisasi." };
  }

  const role =
    parsed.data.organizationType === "vendor"
      ? "vendor"
      : parsed.data.organizationType === "buyer"
        ? "buyer"
        : "lender";

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: data.user.id,
    role,
    is_primary: true,
  });
  if (memberError) return { error: memberError.message };

  if (data.session) redirect("/app");
  return {
    success:
      "Akun dibuat. Jika konfirmasi email aktif, periksa kotak masuk lalu masuk. Organisasi menunggu persetujuan Admin.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) return { error: "Email tidak valid." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/app/settings`,
  });
  if (error) return { error: error.message };
  return { success: "Tautan reset kata sandi dikirim jika email terdaftar." };
}
