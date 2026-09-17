"use client";

import { useActionState } from "react";
import { decideBuyer, type ActionState } from "@/app/actions/buyer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = {};

export function BuyerDecisionForm({
  invoiceId,
  amount,
  dueDate,
}: {
  invoiceId: string;
  amount: number;
  dueDate: string;
}) {
  const [state, action, pending] = useActionState(decideBuyer, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nominal dikonfirmasi</Label>
          <Input name="confirmedAmount" type="number" defaultValue={amount} />
        </div>
        <div className="space-y-1">
          <Label>Jatuh tempo dikonfirmasi</Label>
          <Input name="confirmedDueDate" type="date" defaultValue={dueDate} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Catatan / alasan sengketa</Label>
        <Textarea name="note" />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-teal-300">{state.success}</p> : null}
      <div className="flex gap-2">
        <Button name="decision" value="confirmed" type="submit" disabled={pending}>
          Konfirmasi
        </Button>
        <Button name="decision" value="disputed" type="submit" variant="destructive" disabled={pending}>
          Sengketa
        </Button>
      </div>
    </form>
  );
}
