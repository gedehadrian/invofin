"use client";

import { startTransition, useActionState, useState } from "react";
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
    setUploadMsg("Mengunggah dan memproses OCR...");
    try {
      const result = await uploadInvoiceDocument(fd);
      setUploadMsg(result.error ?? result.success ?? null);
    } catch {
      // Tanpa penangkapan ini, kegagalan unggahan (mis. batas ukuran body) hilang
      // sebagai unhandled rejection dan pengguna tidak melihat pesan apa pun.
      setUploadMsg(
        "Unggahan gagal diproses server. Pastikan ukuran berkas di bawah 10 MB, lalu coba lagi.",
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form
        // Bukan `action={action}`: React mereset form setelah form action selesai, sehingga
        // isian hilang dan vendor mengira draf tidak tersimpan.
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => action(formData));
        }}
        className="space-y-4"
      >
        <p className="text-sm font-medium">1. Isi data invoice, lalu simpan draf</p>
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
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan draf"}
        </Button>
      </form>
      <div className="space-y-4 surface p-4">
        <h2 className="font-medium">2. Unggah dokumen, lalu ajukan</h2>
        {!currentId ? (
          <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Klik <strong>Simpan draf</strong> di kiri dulu. Kolom unggah aktif setelah draf
            tersimpan.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          SHA-256 dihitung di server. File invoice identik ditolak unique constraint.
        </p>
        <p className="text-xs text-muted-foreground">
          Belum punya file? Unduh{" "}
          <a
            href="/demo/dummy-invoice.pdf"
            download="dummy-invoice.pdf"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            contoh 1
          </a>{" "}
          (INV-DEMO-2026-001 · 17 Sep–17 Okt · Rp 25.000.000) atau{" "}
          <a
            href="/demo/dummy-invoice-2.pdf"
            download="dummy-invoice-2.pdf"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            contoh 2
          </a>{" "}
          (INV-DEMO-2026-002 · 17 Sep–1 Nov · Rp 30.000.000), lalu unggah di kolom invoice. File yang
          sama hanya bisa dipakai sekali (SHA-256 unik).
        </p>
        {(["invoice", "purchase_order", "bast"] as const).map((type) => (
          <div key={type} className="space-y-1">
            <Label>{type.replace("_", " ")}</Label>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={!currentId}
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                // Kosongkan agar berkas yang sama bisa dipilih ulang setelah gagal.
                void onUpload(type, file).finally(() => {
                  input.value = "";
                });
              }}
            />
          </div>
        ))}
        {uploadMsg ? <p className="text-sm text-amber-700">{uploadMsg}</p> : null}
        <Button
          type="button"
          variant="secondary"
          disabled={!currentId}
          onClick={async () => {
            if (!currentId) return;
            try {
              const result = await submitInvoice(currentId);
              if (result.error) setUploadMsg(result.error);
              else router.push(`/app/vendor/invoices/${currentId}`);
            } catch {
              setUploadMsg("Pengajuan gagal diproses server. Coba lagi beberapa saat.");
            }
          }}
        >
          Ajukan invoice
        </Button>
      </div>
    </div>
  );
}
