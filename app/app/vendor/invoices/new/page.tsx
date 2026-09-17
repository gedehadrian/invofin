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
        <h1 className="text-2xl font-semibold">Ajukan invoice</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi data, unggah dokumen, lalu ajukan. OCR memakai Azure prebuilt-invoice bila
          kredensial tersedia.
        </p>
      </div>
      <InvoiceWizard buyers={buyers ?? []} />
    </div>
  );
}
