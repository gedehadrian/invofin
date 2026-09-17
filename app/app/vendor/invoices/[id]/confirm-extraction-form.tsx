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
        <Label>Nomor</Label>
        <Input name="invoiceNumber" defaultValue={invoice.invoice_number} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Terbit</Label>
          <Input name="issueDate" type="date" defaultValue={invoice.issue_date} required />
        </div>
        <div className="space-y-1">
          <Label>Jatuh tempo</Label>
          <Input name="dueDate" type="date" defaultValue={invoice.due_date} required />
        </div>
        <div className="space-y-1">
          <Label>Nominal</Label>
          <Input name="amount" type="number" defaultValue={Number(invoice.amount)} required />
        </div>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        Konfirmasi data hasil ekstraksi
      </Button>
    </form>
  );
}
