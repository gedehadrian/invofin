import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/modules/dashboard/dashboard";
import { demoDashboard } from "@/modules/dashboard/demo";
import { roles } from "@/modules/workspace/config";
import type { MemberRole } from "@/lib/database.types";
import { DemoDirectory } from "@/modules/dashboard/demo-directory";

export const metadata = { title: "Demo workspace · InvoFin", robots: { index: false, follow: false } };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ role?: string; view?: string }> }) {
  const params = await searchParams;
  const role: MemberRole = params.role && Object.hasOwn(roles, params.role) ? params.role as MemberRole : "vendor";
  const names = { vendor: "CV Berkah Nusantara", buyer: "PT Sumber Retail Indonesia", lender: "Nusantara Capital", risk_officer: "InvoFin Risk", admin: "InvoFin Platform" };
  return <AppShell role={role} orgName={names[role]} userName="Alex Pratama" unread={0} demo>{role === "admin" && ["organizations", "users", "audit"].includes(params.view ?? "") ? <DemoDirectory key={params.view} view={params.view!} /> : <Dashboard key={`${role}-${params.view}`} data={demoDashboard(role)} view={params.view ?? "overview"} demo />}</AppShell>;
}
