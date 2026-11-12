"use client";

import { useActionState } from "react";
import { Check, XCircle } from "lucide-react";
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
        <div className="space-y-1.5">
          <Label>Nominal yang Kamu Akui (Rp)</Label>
          <Input
            name="confirmedAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={amount}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tanggal Jatuh Tempo</Label>
          <Input name="confirmedDueDate" type="date" required defaultValue={dueDate} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Catatan (Wajib diisi kalau mau tolak / sengketa)</Label>
        <Textarea
          name="note"
          placeholder="Contoh: Barang sudah diterima lengkap di gudang Cikarang."
        />
        <p className="text-xs text-muted-foreground">
          Kalau pilih Tolak/Sengketa, tulis alasannya minimal 8 karakter biar vendor tahu apa yang perlu diperbaiki.
        </p>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-primary">{state.success}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button name="decision" value="confirmed" type="submit" disabled={pending}>
          <Check />
          {pending ? "Memproses..." : "Ya, Tagihan Valid & Konfirmasi"}
        </Button>
        <Button name="decision" value="disputed" type="submit" variant="destructive" disabled={pending}>
          <XCircle />
          Tolak / Sengketa
        </Button>
      </div>
    </form>
  );
}

