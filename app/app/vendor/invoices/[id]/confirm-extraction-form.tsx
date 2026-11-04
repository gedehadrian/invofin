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
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <div className="space-y-1">
        <Label htmlFor="confirm-number">Nomor</Label>
        <Input id="confirm-number" name="invoiceNumber" defaultValue={invoice.invoice_number} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="confirm-issue">Terbit</Label>
          <Input id="confirm-issue" name="issueDate" type="date" defaultValue={invoice.issue_date} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-due">Jatuh tempo</Label>
          <Input id="confirm-due" name="dueDate" type="date" defaultValue={invoice.due_date} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-amount">Nominal</Label>
          <Input id="confirm-amount" name="amount" type="number" min={1} max={1e12} defaultValue={Number(invoice.amount)} required />
        </div>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><input name="confirmAccuracy" type="checkbox" required className="mt-0.5" />Saya sudah membandingkan data ini dengan dokumen asli dan mengonfirmasi kebenarannya.</label>
      <Button type="submit" disabled={pending}>
        Konfirmasi data hasil ekstraksi
      </Button>
    </form>
  );
}
