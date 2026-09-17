"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInvoiceDraft, submitInvoice, uploadInvoiceDocument, type ActionState } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = {};

type Buyer = { id: string; name: string };

export function InvoiceWizard({
  buyers,
  invoiceId,
}: {
  buyers: Buyer[];
  invoiceId?: string;
}) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(invoiceId);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveInvoiceDraft(prev, formData);
    if (result.invoiceId) {
      setCurrentId(result.invoiceId);
    }
    return result;
  }, initial);

  async function onUpload(documentType: "invoice" | "purchase_order" | "bast", file: File) {
    if (!currentId) {
      setUploadMsg("Simpan data invoice terlebih dahulu.");
      return;
    }
    const fd = new FormData();
    fd.set("invoiceId", currentId);
    fd.set("documentType", documentType);
    fd.set("file", file);
    const result = await uploadInvoiceDocument(fd);
    setUploadMsg(result.error ?? result.success ?? null);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form action={action} className="space-y-4">
        {currentId ? <input type="hidden" name="invoiceId" value={currentId} /> : null}
        <div className="space-y-2">
          <Label htmlFor="buyerOrgId">Anchor buyer</Label>
          <select
            id="buyerOrgId"
            name="buyerOrgId"
            required
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Pilih buyer</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Nomor invoice</Label>
          <Input id="invoiceNumber" name="invoiceNumber" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="issueDate">Tanggal terbit</Label>
            <Input id="issueDate" name="issueDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Jatuh tempo</Label>
            <Input id="dueDate" name="dueDate" type="date" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Nominal (IDR)</Label>
            <Input id="amount" name="amount" type="number" min={1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requestedAdvancePercent">% pencairan</Label>
            <Input
              id="requestedAdvancePercent"
              name="requestedAdvancePercent"
              type="number"
              min={10}
              max={90}
              defaultValue={80}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea id="description" name="description" />
        </div>
        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-teal-300">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </Button>
      </form>
      <div className="space-y-4 rounded-xl border border-white/10 p-4">
        <h2 className="font-medium">Unggah dokumen</h2>
        <p className="text-xs text-slate-400">
          SHA-256 dihitung di server. File invoice identik ditolak unique constraint.
        </p>
        {(["invoice", "purchase_order", "bast"] as const).map((type) => (
          <div key={type} className="space-y-1">
            <Label>{type.replace("_", " ")}</Label>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(type, file);
              }}
            />
          </div>
        ))}
        {uploadMsg ? <p className="text-sm text-amber-200">{uploadMsg}</p> : null}
        <Button
          type="button"
          variant="secondary"
          disabled={!currentId}
          onClick={async () => {
            if (!currentId) return;
            const result = await submitInvoice(currentId);
            if (result.error) setUploadMsg(result.error);
            else router.push(`/app/vendor/invoices/${currentId}`);
          }}
        >
          Ajukan invoice
        </Button>
      </div>
    </div>
  );
}
