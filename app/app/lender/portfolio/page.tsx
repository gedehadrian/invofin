import Link from "next/link";
import { Store } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatIdr } from "@/lib/format";

export default async function PortfolioPage() {
  const ctx = await requireRole(["lender"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("funding_commitments")
    .select("*, funding_opportunities(target_amount, committed_amount, status, invoices(invoice_number, due_date, status))")
    .eq("lender_org_id", ctx.current.organization_id)
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Portofolio kamu masih kosong"
          description="Yuk intip Marketplace dan pilih tagihan terverifikasi pertama yang mau kamu danai."
        />
        <Button asChild>
          <Link href="/app/lender/marketplace">
            <Store /> Buka Marketplace
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portofolio Pendanaan Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar tagihan yang sudah kamu alokasikan dananya.
        </p>
      </div>
      <div className="space-y-3">
        {data.map((row) => {
          const opp = row.funding_opportunities as {
            invoices?: { invoice_number: string; due_date: string; status: string };
            status: string;
          } | null;
          return (
            <div key={row.id} className="surface flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm">
              <div>
                <p className="font-semibold">{opp?.invoices?.invoice_number ?? "Invoice"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Jatuh tempo {formatDate(opp?.invoices?.due_date)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Komitmen Kamu</p>
                  <p className="font-semibold text-primary">{formatIdr(Number(row.amount))}</p>
                </div>
                {opp?.invoices?.status && <StatusBadge status={opp.invoices.status} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

