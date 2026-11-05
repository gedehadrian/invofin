import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/account-forms";
import { getAppContext, getAuthenticatedUser } from "@/lib/auth/session";
import { accountDestination } from "@/lib/auth/access";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  const ctx = await getAppContext();
  if (ctx) redirect(accountDestination(true, { role: ctx.current.role, status: ctx.current.organizations.status }));
  const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.slice(0, 100) : "";
  return <AuthShell title="Lengkapi organisasi Anda" description="Langkah 2 dari 2. Pendaftaran yang belum selesai dapat dilanjutkan dari halaman ini." footer={<form action={signOutAction}><Button type="submit" variant="ghost">Keluar dari akun</Button></form>}><OnboardingForm defaultName={displayName} /></AuthShell>;
}
