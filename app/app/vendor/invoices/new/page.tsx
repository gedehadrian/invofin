import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InvoiceWizard } from "./invoice-wizard";

export default async function NewInvoicePage() {
  await requireRole(["vendor"]);
  const supabase = await createClient();
  const { data: buyers } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("type", "buyer")
    .eq("status", "active")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajukan Pencairan Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cukup 2 langkah: isi detail tagihanmu, lalu lampirkan 3 bukti dokumennya (Invoice, PO, dan BAST).
        </p>
      </div>
      <InvoiceWizard buyers={buyers ?? []} />
    </div>
  );
}

