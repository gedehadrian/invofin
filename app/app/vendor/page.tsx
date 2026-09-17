import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, EmptyState } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatIdr } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/database.types";

export default async function VendorDashboard() {
  const ctx = await requireRole(["vendor"]);
  const supabase = await createClient();
  const orgId = ctx.current.organization_id;
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("vendor_org_id", orgId)
    .order("created_at", { ascending: false });

  const rows = invoices ?? [];
  const outstanding = rows.filter((i) => !["rejected", "repaid"].includes(i.status));
  const eligible = rows.filter((i) =>
    ["eligible_for_funding", "partially_funded", "funded"].includes(i.status),
  );
  const withTimes = rows.filter((i) => i.submitted_at);
  const avgHours =
    withTimes.length === 0
      ? 0
      : withTimes.reduce((sum, i) => {
          const end = new Date(i.updated_at).getTime();
          const start = new Date(i.submitted_at!).getTime();
          return sum + (end - start) / 3_600_000;
        }, 0) / withTimes.length;

  const breakdown = rows.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dasbor vendor</h1>
          <p className="text-sm text-muted-foreground">Pantau pengajuan dan status pendanaan.</p>
        </div>
        <Button asChild>
          <Link href="/app/vendor/invoices/new">Ajukan invoice</Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard label="Outstanding" value={String(outstanding.length)} />
        <KpiCard
          label="Eligible amount"
          value={formatIdr(eligible.reduce((s, i) => s + Number(i.amount), 0))}
        />
        <KpiCard label="Avg processing" value={`${avgHours.toFixed(1)} jam`} />
        <KpiCard
          label="Status mix"
          value={`${Object.keys(breakdown).length} status`}
          hint={Object.entries(breakdown)
            .map(([k, v]) => `${k}:${v}`)
            .join(" · ")}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Belum ada invoice" description="Mulai dengan unggah invoice, PO, dan BAST." />
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nomor</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((invoice) => (
                <tr key={invoice.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link className="text-primary" href={`/app/vendor/invoices/${invoice.id}`}>
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatIdr(Number(invoice.amount))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status as InvoiceStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
