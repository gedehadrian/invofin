import { financingBreakdown } from "@/lib/funding/breakdown";
import { formatIdr } from "@/lib/format";

export function FinancingSummary({
  amount,
  advancePercent,
  feePercent,
}: {
  amount: number;
  advancePercent: number;
  feePercent?: number;
}) {
  const summary = financingBreakdown(amount, advancePercent, feePercent ?? 3);
  return (
    <section className="surface space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Hitungan Dana Cair (Transparan di Depan)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {feePercent == null
            ? "Estimasi awal pakai biaya 3%. Angka pastinya dikunci setelah Risk Officer kasih persetujuan."
            : `Biaya layanan ${feePercent}% dari nilai tagihan untuk tenor ini.`}
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          ["Pencairan Awal (" + advancePercent + "%)", summary.advance],
          ["Potongan Biaya Layanan", summary.fee],
          ["Dana Bersih yang Kamu Terima", summary.netAdvance],
        ].map(([label, value], i) => (
          <div key={String(label)} className={i === 2 ? "rounded-xl bg-blue-50/70 p-3" : "p-3"}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={`mt-1 text-lg font-semibold ${i === 2 ? "text-primary" : ""}`}>
              {formatIdr(Number(value))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

