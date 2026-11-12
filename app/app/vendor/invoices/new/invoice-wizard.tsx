"use client";

import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Sparkles } from "lucide-react";
import { saveInvoiceDraft, submitInvoice, type ActionState } from "@/app/actions/invoices";
import { prepareDocumentUpload, finalizeDocumentUpload } from "@/app/actions/uploads";
import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/lib/documents/hash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import demoSample from "@/lib/documents/demo-sample.json";

const initial: ActionState = {};

type Buyer = { id: string; name: string };

const DOC_TYPES = [
  { key: "invoice" as const, label: "1. File Invoice", hint: "Tagihan resmi yang kamu kirim ke Buyer" },
  { key: "purchase_order" as const, label: "2. Purchase Order (PO)", hint: "Bukti pesanan resmi dari Buyer" },
  { key: "bast" as const, label: "3. BAST / Surat Jalan", hint: "Bukti barang atau jasa sudah diterima" },
];

export function InvoiceWizard({
  buyers,
  invoiceId,
}: {
  buyers: Buyer[];
  invoiceId?: string;
}) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(invoiceId);
  const [uploading, setUploading] = useState(false);
  const [uploadedTypes, setUploadedTypes] = useState<string[]>([]);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [example, setExample] = useState(false);

  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveInvoiceDraft(prev, formData);
    if (result.invoiceId) {
      setCurrentId(result.invoiceId);
    }
    return result;
  }, initial);

  async function onUpload(documentType: "invoice" | "purchase_order" | "bast", file: File) {
    if (!currentId) {
      setUploadMsg("Simpan Langkah 1 dulu ya sebelum upload file.");
      return;
    }
    setUploading(true);
    setUploadMsg("Sedang mengecek file...");
    try {
      await validateUpload(file);
      const reservation = await prepareDocumentUpload({
        invoiceId: currentId,
        documentType,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (reservation.error || !reservation.path || !reservation.token || !reservation.uploadId) {
        throw new Error(reservation.error ?? "Gagal menyiapkan slot upload.");
      }
      setUploadMsg("Mengunggah dokumen...");
      const { error } = await createClient()
        .storage.from("invoice-uploads")
        .uploadToSignedUrl(reservation.path, reservation.token, file, { contentType: file.type });
      if (error) throw new Error("Koneksi terputus saat upload. Coba lagi ya.");
      setUploadMsg("Menyimpan dokumen...");
      const result = await finalizeDocumentUpload(reservation.uploadId);
      if (result.error) throw new Error(result.error);
      setUploadedTypes((current) => [...new Set([...current, documentType])]);
      setUploadMsg("Mantap! Dokumen berhasil tersimpan.");
    } catch (error) {
      setUploadMsg(error instanceof Error ? error.message : "Upload gagal, coba lagi ya.");
    } finally {
      setUploading(false);
    }
  }

  const allDocsUploaded = DOC_TYPES.every((d) => uploadedTypes.includes(d.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Mau ngetes alurnya dengan cepat?
          </p>
          <p className="text-xs text-muted-foreground">
            Isi form otomatis dengan klik tombol di samping, lalu unduh 3 file sampel ini buat di-upload:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {(
              [
                ["invoice", "Unduh Contoh Invoice"],
                ["purchase_order", "Unduh Contoh PO"],
                ["bast", "Unduh Contoh BAST"],
              ] as const
            ).map(([file, label]) => (
              <a
                key={file}
                href={`/demo/sample-${file}.png`}
                download
                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-blue-50"
              >
                <Download className="size-3" />
                {label}
              </a>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!currentId || pending}
          onClick={() => setExample(true)}
        >
          Isi Form Pakai Data Contoh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          key={example ? "example" : "blank"}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => action(formData));
          }}
          className="surface space-y-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Langkah 1: Detail Tagihan</h2>
            {currentId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <Check className="size-3" /> Tersimpan
              </span>
            )}
          </div>
          {currentId ? <input type="hidden" name="invoiceId" value={currentId} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="buyerOrgId">Ditagihkan ke siapa? (Anchor Buyer)</Label>
            <select
              id="buyerOrgId"
              name="buyerOrgId"
              required
              defaultValue={example ? (buyers.find((buyer) => buyer.name === demoSample.buyerName)?.id ?? buyers[0]?.id) : undefined}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Pilih perusahaan buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoiceNumber">Nomor Invoice</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              placeholder="Contoh: INV-2026-001"
              required
              defaultValue={example ? demoSample.invoiceNumber : undefined}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Tanggal Terbit</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                defaultValue={example ? demoSample.issueDate : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Tanggal Jatuh Tempo</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                defaultValue={example ? demoSample.dueDate : undefined}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Nilai Tagihan (Rp)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                placeholder="625000"
                required
                defaultValue={example ? demoSample.amount : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requestedAdvancePercent">Mau cairkan berapa % di depan?</Label>
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
          <div className="space-y-1.5">
            <Label htmlFor="description">Catatan Singkat (Opsional)</Label>
            <Textarea id="description" name="description" placeholder="Misal: Pengiriman bahan baku batch November" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm font-medium text-primary">{state.success}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan..." : currentId ? "Perbarui Data Tagihan" : "Simpan & Lanjut Upload Dokumen →"}
          </Button>
        </form>

        <div className="surface flex flex-col justify-between space-y-4 p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Langkah 2: Upload 3 Dokumen Bukti</h2>
              <span className="text-xs text-muted-foreground">{uploadedTypes.length}/3 terunggah</span>
            </div>

            {!currentId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                👈 Selesaikan dan klik tombol <strong>Simpan</strong> di Langkah 1 sebelah kiri dulu, baru slot upload di bawah ini terbuka.
              </div>
            ) : null}

            <div className="space-y-3">
              {DOC_TYPES.map((doc) => {
                const isDone = uploadedTypes.includes(doc.key);
                return (
                  <div
                    key={doc.key}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      isDone ? "border-emerald-200 bg-emerald-50/40" : "border-border"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label htmlFor={`upload-${doc.key}`} className="font-medium">
                        {doc.label}
                      </Label>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Check className="size-3.5" /> Beres!
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{doc.hint}</p>
                    <Input
                      id={`upload-${doc.key}`}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      disabled={!currentId || uploading}
                      onChange={(e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;
                        void onUpload(doc.key, file).finally(() => {
                          input.value = "";
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {uploadMsg ? (
              <p role="status" aria-live="polite" className="rounded-lg bg-muted p-2.5 text-xs font-medium text-foreground">
                {uploadMsg}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!currentId || uploading || !allDocsUploaded}
            onClick={async () => {
              if (!currentId) return;
              try {
                const result = await submitInvoice(currentId);
                if (result.error) setUploadMsg(result.error);
                else router.push(`/app/vendor/invoices/${currentId}`);
              } catch {
                setUploadMsg("Waduh, server lagi sibuk. Coba klik sekali lagi ya.");
              }
            }}
          >
            {allDocsUploaded ? "Kirim Pengajuan Sekarang 🚀" : "Upload Ketiga Dokumen Dulu untuk Mengirim"}
          </Button>
        </div>
      </div>
    </div>
  );
}

