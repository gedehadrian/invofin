"use client";

import { useActionState } from "react";
import { Check, XCircle } from "lucide-react";
import { decideRisk, type ActionState } from "@/app/actions/risk";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = {};

export function RiskDecisionForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(decideRisk, initial);
  return (
    <form action={action} className="surface space-y-4 p-5">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div>
        <h2 className="text-base font-semibold">Keputusan Risk Officer</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Kalau dokumen dan konfirmasi Buyer sudah klop, klik Approve agar tagihan ini langsung tayang di Marketplace Lender.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Catatan Review (Minimal 8 karakter)</Label>
        <Textarea
          name="note"
          required
          minLength={8}
          placeholder="Contoh: Dokumen Invoice, PO, dan BAST lengkap & sudah dikonfirmasi Buyer."
        />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-primary">{state.success}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button name="decision" value="approved" type="submit" disabled={pending}>
          <Check />
          {pending ? "Memproses..." : "Approve & Tayangkan ke Marketplace"}
        </Button>
        <Button name="decision" value="rejected" type="submit" variant="destructive" disabled={pending}>
          <XCircle />
          Tolak Pengajuan
        </Button>
      </div>
    </form>
  );
}

