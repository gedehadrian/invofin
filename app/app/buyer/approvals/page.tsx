import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatIdr } from "@/lib/format";

export default async function BuyerApprovalsPage() {
  const ctx = await requireRole(["buyer"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("buyer_org_id", ctx.current.organization_id)
    .not("status", "in", "(draft,extraction_review)")
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return (
      <EmptyState
        title="Meja kerja bersih! ✨"
        description="Belum ada tagihan dari vendor yang menunggu konfirmasimu."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tagihan Butuh Konfirmasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cek apakah barang/jasanya memang sudah kamu terima dan angkanya sesuai.
        </p>
      </div>
      <div className="space-y-3">
        {data.map((invoice) => (
          <div
            key={invoice.id}
            className="surface flex flex-wrap items-center justify-between gap-4 px-5 py-4"
          >
            <div>
              <p className="font-semibold">{invoice.invoice_number}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nominal {formatIdr(Number(invoice.amount))} · Jatuh tempo {formatDate(invoice.due_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={invoice.status} />
              <Button asChild size="sm" variant={invoice.status === "buyer_review" ? "default" : "outline"}>
                <Link href={`/app/buyer/approvals/${invoice.id}`}>
                  {invoice.status === "buyer_review" ? "Cek & Konfirmasi" : "Lihat Detail"}{" "}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

