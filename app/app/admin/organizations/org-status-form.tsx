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
        className="h-8 rounded-lg border border-input bg-white px-2.5 text-xs font-medium"
      >
        <option value="pending">⏳ Menunggu (Pending)</option>
        <option value="active">✅ Aktif (Disetujui)</option>
        <option value="suspended">⛔ Ditangguhkan (Suspend)</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Menyimpan..." : "Terapkan"}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}

