import { redirect } from "next/navigation";
import { getAppContext, homeForRole } from "@/lib/auth/session";

export default async function AppIndexPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/sign-in");
  redirect(homeForRole(ctx.current.role));
}
