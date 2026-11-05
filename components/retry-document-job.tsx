"use client";
import { useActionState } from "react";
import { retryDocumentJob } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
export function RetryDocumentJob({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(retryDocumentJob, {});
  return (
    <form action={action}>
      <input type="hidden" name="jobId" value={jobId} />
      <Button variant="outline" size="sm" disabled={pending}>
        {pending ? "Menjadwalkan..." : "Coba ulang"}
      </Button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-1 text-xs text-primary">
          {state.success}
        </p>
      )}
    </form>
  );
}
