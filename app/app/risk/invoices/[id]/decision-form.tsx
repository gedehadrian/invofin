"use client";

import { useActionState } from "react";
import { decideRisk, type ActionState } from "@/app/actions/risk";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = {};

export function RiskDecisionForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(decideRisk, initial);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <p className="text-sm font-medium text-amber-900">Keputusan akhir Risk Officer</p>
      <div className="space-y-1">
        <Label>Catatan wajib</Label>
        <Textarea name="note" required minLength={8} />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
      <div className="flex gap-2">
        <Button name="decision" value="approved" type="submit" disabled={pending}>
          Setujui ke marketplace
        </Button>
        <Button name="decision" value="rejected" type="submit" variant="destructive" disabled={pending}>
          Tolak
        </Button>
      </div>
    </form>
  );
}
