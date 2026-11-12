import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { evaluateDemoModel } from "@/lib/risk/demo-model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function RiskLab({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; tenor?: string; advance?: string }>;
}) {
  await requireRole(["risk_officer", "admin"]);
  if (process.env.INVOFIN_DEPLOYMENT_ENV === "production") notFound();
  const params = await searchParams,
    amount = Number(params.amount ?? 25000000),
    tenor = Number(params.tenor ?? 45),
    advance = Number(params.advance ?? 80);
  let result: ReturnType<typeof evaluateDemoModel> | null = null;
  try {
    result = evaluateDemoModel(amount, tenor, advance);
  } catch {}
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Laboratorium model sintetis</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tempat bermain buat ngetes gimana nominal, lama tenor, dan persentase pencairan memengaruhi skor risiko di model simulasi kita.
        </p>
      </div>
      <form className="surface grid gap-4 p-5 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="lab-amount">Nominal Invoice (Rp)</Label>
          <Input id="lab-amount" name="amount" type="number" min={1} max={1e12} defaultValue={amount} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lab-tenor">Tenor (Hari)</Label>
          <Input id="lab-tenor" name="tenor" type="number" min={1} max={365} defaultValue={tenor} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lab-advance">Pencairan (%)</Label>
          <Input id="lab-advance" name="advance" type="number" min={10} max={90} defaultValue={advance} required />
        </div>
        <Button type="submit" className="self-end">
          Hitung Simulasi
        </Button>
      </form>
      {result ? (
        <section className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Skor Simulasi: {(result.index * 100).toFixed(1)} / 100</h2>
          {result.outsideTrainingRange && (
            <p className="text-sm text-destructive">Angka yang kamu masukkan di luar batas wajar dataset latihan.</p>
          )}
          <dl className="grid gap-3 sm:grid-cols-3">
            {result.contributions.map((x) => (
              <div className="rounded-xl border p-3 text-sm" key={x.feature}>
                <dt className="text-xs text-muted-foreground">{x.feature}</dt>
                <dd className="mt-1 font-mono font-semibold">{x.value.toFixed(3)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <p role="alert">Input tidak valid.</p>
      )}
    </div>
  );
}

