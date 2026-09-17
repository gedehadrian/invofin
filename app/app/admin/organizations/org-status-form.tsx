"use client";

import { useActionState } from "react";
import { updateOrganizationStatus, type ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const initial: ActionState = {};

export function OrgStatusForm({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(updateOrganizationStatus, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <select
        name="status"
        defaultValue={status}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
      >
        <option value="pending">pending</option>
        <option value="active">active</option>
        <option value="suspended">suspended</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        Simpan
      </Button>
      {state.error ? <span className="text-xs text-red-400">{state.error}</span> : null}
    </form>
  );
}
