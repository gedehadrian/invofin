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
    .select(
      "*, funding_opportunities(target_amount, committed_amount, lender_return_percent, status, invoices(invoice_number, due_date, status))",
    )
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
          Pantau komitmen pokok, estimasi imbal hasil, dan total pengembalian setelah Buyer melunasi tagihan.
        </p>
      </div>
      <div className="space-y-3">
        {data.map((row) => {
          const opp = row.funding_opportunities as {
            lender_return_percent?: number;
            invoices?: { invoice_number: string; due_date: string; status: string };
            status: string;
          } | null;
          const principal = Number(row.amount);
          const returnPercent = Number(opp?.lender_return_percent ?? 1.2);
          const returnAmount = Math.round(principal * returnPercent) / 100;
          const totalPayout = principal + returnAmount;
          const isRepaid = opp?.invoices?.status === "repaid";

          return (
            <div key={row.id} className="surface flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{opp?.invoices?.invoice_number ?? "Invoice"}</p>
                  {isRepaid && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Sudah Lunas & Cair
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Jatuh tempo {formatDate(opp?.invoices?.due_date)} · Rate {returnPercent}%
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Komitmen Pokok</p>
                  <p className="font-semibold tabular-nums">{formatIdr(principal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Imbal Hasil</p>
                  <p className="font-semibold text-emerald-700 tabular-nums">+{formatIdr(returnAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Total Pengembalian</p>
                  <p className="font-semibold text-primary tabular-nums">{formatIdr(totalPayout)}</p>
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

