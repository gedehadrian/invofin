import type { MemberRole, OrganizationStatus } from "../database.types";

const ROLE_HOME: Record<MemberRole, string> = { vendor: "/app/vendor", buyer: "/app/buyer", lender: "/app/lender", risk_officer: "/app/risk", admin: "/app/admin" };
export function homeForRole(role: MemberRole) { return ROLE_HOME[role]; }
export function accountDestination(signedIn: boolean, membership?: { role: MemberRole; status: OrganizationStatus } | null) {
  if (!signedIn) return "/sign-in";
  if (!membership) return "/onboarding";
  return membership.status === "active" ? homeForRole(membership.role) : "/account-status";
}
