import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAppContext, homeForRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/sign-in");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("read_at", null);

  return (
    <AppShell
      role={ctx.current.role}
      orgName={ctx.current.organizations.name}
      userName={ctx.profile.full_name}
      unread={count ?? 0}
    >
      {children}
    </AppShell>
  );
}

export { homeForRole };
