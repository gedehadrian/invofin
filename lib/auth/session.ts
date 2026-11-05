import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountDestination, homeForRole } from "./access";
export { homeForRole } from "./access";
import type {
  MemberRole,
  MembershipWithOrg,
  Organization,
  Profile,
} from "@/lib/database.types";

export type AppContext = {
  userId: string;
  email: string | null;
  profile: Profile;
  memberships: MembershipWithOrg[];
  current: MembershipWithOrg;
};

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
});

export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false });

  const list = (memberships ?? []) as unknown as MembershipWithOrg[];
  if (!profile || list.length === 0) {
    return null;
  }

  const current =
    list.find((m) => m.is_primary) ??
    list[0];

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    memberships: list,
    current,
  };
});

export async function requireUser() {
  const ctx = await getAppContext();
  if (!ctx) redirect(accountDestination(Boolean(await getAuthenticatedUser())));
  if (ctx.current.organizations.status !== "active") redirect("/account-status");
  return ctx;
}

export async function requireRole(roles: MemberRole[]) {
  const ctx = await requireUser();
  if (!roles.includes(ctx.current.role) && ctx.current.role !== "admin") {
    redirect(homeForRole(ctx.current.role));
  }
  return ctx;
}

export function orgOf(ctx: AppContext): Organization {
  return ctx.current.organizations;
}
