import { redirect } from "next/navigation";
import { Clock3, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { getAppContext, getAuthenticatedUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/access";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { RefreshAccountStatus } from "@/components/refresh-account-status";

export const dynamic = "force-dynamic";
export default async function AccountStatusPage() {
  if (!await getAuthenticatedUser()) redirect("/sign-in");
  const ctx = await getAppContext();
  if (!ctx) redirect("/onboarding");
  const org = ctx.current.organizations;
  if (org.status === "active") redirect(homeForRole(ctx.current.role));
  const suspended = org.status === "suspended", Icon = suspended ? ShieldAlert : Clock3;
  return <AuthShell title={suspended ? "Akses organisasi ditangguhkan" : "Organisasi menunggu persetujuan"} description={suspended ? "Hubungi administrator tim InvoFin untuk meninjau status organisasi Anda." : "Data organisasi sudah tersimpan. Administrator akan memeriksa pendaftaran sebelum workspace diaktifkan."}>
    <div className="space-y-5"><Icon className="size-9 text-primary" aria-hidden="true" /><div><p className="font-semibold">{org.name}</p><p className="mt-1 text-sm text-muted-foreground">{ctx.email}</p></div><RefreshAccountStatus /><form action={signOutAction}><Button type="submit" variant="outline" className="w-full">Keluar</Button></form></div>
  </AuthShell>;
}
