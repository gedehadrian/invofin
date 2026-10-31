import "server-only";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/database.types";
import type { DashboardData, InvoiceSummary } from "./types";

/** Authenticated, bounded reads. The session client preserves Postgres RLS. */
export async function getDashboard(role: MemberRole): Promise<DashboardData> {
  const ctx = await requireRole([role]);
  const db = await createClient();
  if (role === "lender") {
    const [opportunities, commitments] = await Promise.all([
      db.from("funding_opportunities").select("id, target_amount, created_at, invoices(invoice_number, due_date, status)").eq("status", "open").order("created_at", { ascending: false }).limit(100),
      db.from("funding_commitments").select("amount, status").eq("lender_org_id", ctx.current.organization_id).limit(1000),
    ]);
    if (opportunities.error || commitments.error) throw new Error("Pendanaan belum dapat dimuat. Silakan coba kembali.");
    return { role, invoices: (opportunities.data ?? []).flatMap(opp => opp.invoices ? [{ id: opp.id, number: opp.invoices.invoice_number, counterparty: "Peluang terverifikasi", amount: Number(opp.target_amount), date: opp.invoices.due_date, createdAt: opp.created_at, status: opp.invoices.status, href: `/app/lender/opportunities/${opp.id}` }] : []), metrics: { commitments: (commitments.data ?? []).filter(row => row.status !== "cancelled").reduce((sum, row) => sum + Number(row.amount), 0) } };
  }
  let query = db.from("invoices").select("id, invoice_number, amount, due_date, created_at, status, buyer:organizations!invoices_buyer_org_id_fkey(name), vendor:organizations!invoices_vendor_org_id_fkey(name)").order("created_at", { ascending: false }).limit(500);
  if (role === "vendor") query = query.eq("vendor_org_id", ctx.current.organization_id);
  if (role === "buyer") query = query.eq("buyer_org_id", ctx.current.organization_id);
  const { data, error } = await query;
  if (error) throw new Error("Invoice belum dapat dimuat. Silakan coba kembali.");
  const invoices: InvoiceSummary[] = (data ?? []).map(row => ({
    id: row.id, number: row.invoice_number, amount: Number(row.amount), date: row.due_date,
    createdAt: row.created_at, status: row.status,
    counterparty: (role === "buyer" ? row.vendor?.name : row.buyer?.name) ?? "Organisasi",
    href: role === "vendor" ? `/app/vendor/invoices/${row.id}` : role === "buyer" ? `/app/buyer/approvals/${row.id}` : `/app/risk/invoices/${row.id}`,
  }));
  if (role !== "admin") return { role, invoices };
  const [orgs, audit] = await Promise.all([
    db.from("organizations").select("id", { count: "exact", head: true }),
    db.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);
  if (orgs.error || audit.error) throw new Error("Ringkasan platform belum dapat dimuat.");
  return { role, invoices, metrics: { organizations: orgs.count ?? 0, auditEvents: audit.count ?? 0 } };
}
