import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { formatIdr } from "@/lib/format";

export default async function AdminDashboard() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data: invoices }, { data: orgs }, { count: auditCount }] = await Promise.all([
    supabase.from("invoices").select("amount, status, submitted_at"),
    supabase.from("organizations").select("id, status, type"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  const submitted = (invoices ?? []).filter((i) => i.status !== "draft");
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dasbor platform</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Invoice diajukan" value={String(submitted.length)} />
        <KpiCard
          label="Volume"
          value={formatIdr(submitted.reduce((s, i) => s + Number(i.amount), 0))}
        />
        <KpiCard label="Organisasi" value={String(orgs?.length ?? 0)} />
        <KpiCard label="Audit events" value={String(auditCount ?? 0)} />
      </div>
    </div>
  );
}
