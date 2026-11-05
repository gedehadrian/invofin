import { redirect } from "next/navigation";
import { requireUser, homeForRole } from "@/lib/auth/session";

export default async function AppIndexPage() {
  const ctx = await requireUser();
  redirect(homeForRole(ctx.current.role));
}
