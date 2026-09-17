import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { formatIdr } from "@/lib/format";

export default async function BuyerApprovalsPage() {
  const ctx = await requireRole(["buyer"]);
  const supabase = await createClient();
  // Draf dan tahap koreksi ekstraksi masih milik vendor, belum diajukan ke buyer.
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("buyer_org_id", ctx.current.organization_id)
    .not("status", "in", "(draft,extraction_review)")
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return <EmptyState title="Tidak ada invoice" description="Belum ada pengajuan ke organisasi Anda." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Konfirmasi invoice</h1>
      <ul className="space-y-2">
        {data.map((invoice) => (
          <li key={invoice.id} className="flex items-center justify-between surface px-4 py-3">
            <Link href={`/app/buyer/approvals/${invoice.id}`} className="text-primary">
              {invoice.invoice_number} · {formatIdr(Number(invoice.amount))}
            </Link>
            <StatusBadge status={invoice.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
