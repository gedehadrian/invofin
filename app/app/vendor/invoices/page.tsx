import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-4">
        <EmptyState
          title="Belum ada invoice yang diajukan"
          description="Punya tagihan yang jatuh temponya masih lama? Yuk ajukan sekarang biar modal kerjamu langsung muter."
        />
        <Button asChild>
          <Link href="/app/vendor/invoices/new">
            <Plus /> Buat Pengajuan Pertama
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Daftar Invoice Saya</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau posisi tagihanmu, mulai dari pengecekan dokumen sampai siap didanai.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/app/vendor/invoices/new">
            <Plus /> Ajukan Invoice Baru
          </Link>
        </Button>
      </div>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nomor Invoice</th>
              <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
              <th className="px-4 py-3 font-medium">Nominal</th>
              <th className="px-4 py-3 font-medium">Posisi</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.due_date)}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatIdr(Number(invoice.amount))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/vendor/invoices/${invoice.id}`}>
                      {invoice.status === "extraction_review" ? "Cek Hasil OCR" : "Buka Detail"} <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

