import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatIdr } from "@/lib/format";
import { EmptyState } from "@/components/kpi-card";

export default async function VendorInvoicesPage() {
  const ctx = await requireRole(["vendor"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("vendor_org_id", ctx.current.organization_id)
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return (
      <EmptyState
        title="Tidak ada invoice"
        description="Buat pengajuan baru untuk memulai verifikasi."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoice vendor</h1>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3">Jatuh tempo</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((invoice) => (
              <tr key={invoice.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <Link className="text-teal-300" href={`/app/vendor/invoices/${invoice.id}`}>
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(invoice.due_date)}</td>
                <td className="px-4 py-3">{formatIdr(Number(invoice.amount))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
