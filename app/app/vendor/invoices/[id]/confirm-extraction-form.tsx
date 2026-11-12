"use client";

import { useActionState } from "react";
import { confirmExtraction, type ActionState } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Invoice } from "@/lib/database.types";

const initial: ActionState = {};

export function ConfirmExtractionForm({ invoice }: { invoice: Invoice }) {
  const [state, action, pending] = useActionState(confirmExtraction, initial);
  return (
    <form action={action} className="mt-4 space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-primary">Langkah Terakhir dari Kamu: Pastikan Data Ini Pas!</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Kalau ada angka atau tanggal yang meleset dari dokumen aslimu, langsung perbaiki di bawah ini sebelum diteruskan ke Buyer.
        </p>
      </div>
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="confirm-number">Nomor Invoice</Label>
          <Input id="confirm-number" name="invoiceNumber" className="bg-white" defaultValue={invoice.invoice_number} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-amount">Nominal (Rp)</Label>
          <Input
            id="confirm-amount"
            name="amount"
            type="number"
            min={1}
            max={1e12}
            className="bg-white"
            defaultValue={Number(invoice.amount)}
            required
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="confirm-issue">Tanggal Terbit</Label>
          <Input id="confirm-issue" name="issueDate" type="date" className="bg-white" defaultValue={invoice.issue_date} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-due">Jatuh Tempo</Label>
          <Input id="confirm-due" name="dueDate" type="date" className="bg-white" defaultValue={invoice.due_date} required />
        </div>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-primary">{state.success}</p> : null}
      <label className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
        <input name="confirmAccuracy" type="checkbox" required className="mt-0.5" />
        Sudah saya cek, angkanya cocok sama dokumen asli. Yuk teruskan ke Buyer!
      </label>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Mengirim ke Buyer..." : "Konfirmasi & Kirim ke Buyer →"}
      </Button>
    </form>
  );
}

