import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

const ROLE_HOME: Record<MemberRole, string> = {
  vendor: "/app/vendor",
  buyer: "/app/buyer",
  lender: "/app/lender",
  risk_officer: "/app/risk",
  admin: "/app/admin",
};

export function homeForRole(role: MemberRole) {
  return ROLE_HOME[role];
}

export async function getAppContext(): Promise<AppContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
}

export async function requireUser() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/sign-in");
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
