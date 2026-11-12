"use client";

import { useActionState, useState } from "react";
import { commitFunding, type ActionState } from "@/app/actions/funding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIdr } from "@/lib/format";

const initial: ActionState = {};

export function CommitForm({
  opportunityId,
  remaining,
  requestId,
}: {
  opportunityId: string;
  remaining: number;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(commitFunding, initial);
  const [amount, setAmount] = useState<number>(remaining);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="space-y-2">
        <Label htmlFor="commitment-amount">Nominal yang Mau Kamu Danai (Rp)</Label>
        <Input
          id="commitment-amount"
          name="amount"
          type="number"
          min={1}
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            ["25%", Math.max(1, Math.round(remaining * 0.25))],
            ["50%", Math.max(1, Math.round(remaining * 0.5))],
            ["100% (Ambil Semua Sisa)", remaining],
          ].map(([label, val]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() => setAmount(Number(val))}
              className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-100"
            >
              {label} ({formatIdr(Number(val))})
            </button>
          ))}
        </div>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-primary">{state.success}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || remaining <= 0 || !requestId || !!state.success}>
        {pending ? "Mencatat Komitmen..." : "Konfirmasi Pendanaan Sekarang"}
      </Button>
    </form>
  );
}

