"use client";

import { useActionState, useEffect, useState } from "react";
import { commitFunding, type ActionState } from "@/app/actions/funding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};

export function CommitForm({
  opportunityId,
  remaining,
}: {
  opportunityId: string;
  remaining: number;
}) {
  const [requestId, setRequestId] = useState("");
  useEffect(() => { setRequestId(crypto.randomUUID()); }, []);
  const [state, action, pending] = useActionState(commitFunding, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="space-y-1">
        <Label>Nominal komitmen (sisa {remaining})</Label>
        <Input name="amount" type="number" min={1} max={remaining} required />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
      <Button type="submit" disabled={pending || remaining <= 0 || !requestId || !!state.success}>
        Buat komitmen
      </Button>
    </form>
  );
}
