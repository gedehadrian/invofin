"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/auth/site-url";
import { signInSchema, signUpSchema, onboardingSchema, passwordResetRequestSchema, passwordUpdateSchema } from "@/lib/validations";

export type ActionState = { error?: string; success?: string };

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const { error } = await (await createClient()).auth.signInWithPassword(parsed.data);
    if (error) return { error: "Email atau kata sandi belum sesuai, atau email belum dikonfirmasi." };
  } catch { return { error: "Layanan masuk belum tersedia. Coba kembali sebentar lagi." }; }
  redirect("/app");
}

export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({ fullName: form.get("fullName"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let signedIn = false;
  try {
    const { data, error } = await (await createClient()).auth.signUp({ email: parsed.data.email, password: parsed.data.password,
      options: { emailRedirectTo: `${siteOrigin()}/auth/callback?next=/onboarding`, data: { full_name: parsed.data.fullName } } });
    if (error) return { error: error.status === 429 ? "Terlalu banyak percobaan. Tunggu sebelum mencoba kembali." : "Pendaftaran belum berhasil. Gunakan email yang dapat diakses dan kata sandi minimal 12 karakter. Jika sudah terdaftar, silakan masuk." };
    signedIn = Boolean(data.session);
  } catch { return { error: "Pendaftaran belum tersedia. Coba kembali sebentar lagi." }; }
  if (signedIn) redirect("/onboarding");
  return { success: "Periksa email untuk mengonfirmasi akun, lalu lanjutkan pendaftaran organisasi setelah masuk. Jika akun sudah ada, gunakan halaman masuk atau pulihkan kata sandi." };
}

export async function completeOnboardingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  const parsed = onboardingSchema.safeParse({ fullName: form.get("fullName"), organizationName: form.get("organizationName"), organizationType: form.get("organizationType"), sector: form.get("sector") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const { error } = await createAdminClient().rpc("complete_onboarding", { p_actor: user.id, p_full_name: parsed.data.fullName, p_organization_name: parsed.data.organizationName, p_type: parsed.data.organizationType, p_sector: parsed.data.sector ?? null });
    if (error) return { error: "Organisasi belum tersimpan. Data akun tetap tersedia; Anda dapat mencoba kembali di halaman ini." };
  } catch { return { error: "Pendaftaran organisasi belum tersedia. Coba kembali sebentar lagi." }; }
  redirect("/app");
}

export async function signOutAction() {
  await (await createClient()).auth.signOut();
  redirect("/sign-in");
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const { error } = await (await createClient()).auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` });
    if (error?.status === 429) return { error: "Terlalu banyak permintaan. Tunggu sebelum meminta tautan lagi." };
    // Same response for an unknown address; do not expose whether an account exists.
  } catch { return { error: "Permintaan belum terkirim. Periksa koneksi lalu coba kembali." }; }
  return { success: "Jika email terdaftar, tautan pemulihan akan dikirim. Buka tautan terbaru di browser ini dan periksa folder spam." };
}

export async function updatePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = passwordUpdateSchema.safeParse({ password: form.get("password"), confirmPassword: form.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!await getAuthenticatedUser()) return { error: "Sesi pemulihan sudah berakhir. Minta tautan pemulihan baru." };
  try {
    const client = await createClient();
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: "Kata sandi belum diperbarui. Gunakan kata sandi baru yang berbeda atau minta tautan pemulihan baru." };
    await client.auth.signOut({ scope: "global" });
  } catch { return { error: "Layanan belum tersedia. Periksa koneksi lalu coba kembali." }; }
  redirect("/sign-in?password=updated");
}
