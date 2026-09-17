import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { formatIdr } from "@/lib/format";

export default async function PortfolioPage() {
  const ctx = await requireRole(["lender"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("funding_commitments")
    .select("*, funding_opportunities(target_amount, committed_amount, status, invoices(invoice_number, due_date, status))")
    .eq("lender_org_id", ctx.current.organization_id)
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return <EmptyState title="Portofolio kosong" description="Komitmen marketplace akan tampil di sini." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Portofolio</h1>
      <ul className="space-y-3">
        {data.map((row) => {
          const opp = row.funding_opportunities as {
            invoices?: { invoice_number: string; due_date: string; status: string };
            status: string;
          } | null;
          return (
            <li key={row.id} className="surface px-4 py-3 text-sm">
              <p className="font-medium">{formatIdr(Number(row.amount))}</p>
              <p className="text-muted-foreground">
                {opp?.invoices?.invoice_number ?? "Invoice"} · {row.status} · opportunity {opp?.status}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
