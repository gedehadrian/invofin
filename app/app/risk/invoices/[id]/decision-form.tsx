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
    <form action={action} className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <p className="text-sm font-medium text-amber-100">Keputusan akhir Risk Officer</p>
      <div className="space-y-1">
        <Label>Catatan wajib</Label>
        <Textarea name="note" required minLength={8} />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-teal-300">{state.success}</p> : null}
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
