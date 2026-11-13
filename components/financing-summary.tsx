import { settlementBreakdown } from "@/lib/funding/breakdown";
import { formatIdr } from "@/lib/format";

export function FinancingSummary({
  amount,
  advancePercent,
  feePercent,
  lenderReturnPercent,
  status,
}: {
  amount: number;
  advancePercent: number;
  feePercent?: number;
  lenderReturnPercent?: number;
  status?: string;
}) {
  const summary = settlementBreakdown(
    amount,
    advancePercent,
    feePercent ?? 3,
    lenderReturnPercent ?? 1.2,
  );
  const isSettled = status === "repaid";

  return (
    <section className="surface space-y-5 p-5">
      <div>
        <h2 className="font-semibold">Hitungan Dana Cair & Bagi Hasil (Transparan)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {feePercent == null
            ? "Estimasi awal pakai biaya layanan 3% & imbal hasil lender 1,2%. Angka final dikunci setelah Risk Officer setuju."
            : `Biaya layanan ${feePercent}% dari nilai tagihan · Imbal hasil lender ${summary.lenderReturnPercent}% untuk tenor ini.`}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tahap 1 — Pencairan Awal ke Vendor
        </p>
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            [`Pencairan Awal (${advancePercent}%)`, summary.advance],
            ["Potongan Biaya Layanan", summary.fee],
            ["Dana Bersih Diterima Vendor", summary.netAdvance],
          ].map(([label, value], i) => (
            <div key={String(label)} className={i === 2 ? "rounded-xl bg-blue-50/70 p-3" : "rounded-xl border p-3"}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`mt-1 text-lg font-semibold tabular-nums ${i === 2 ? "text-primary" : ""}`}>
                {formatIdr(Number(value))}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tahap 2 — Saat Jatuh Tempo & Pelunasan Buyer {isSettled ? "(Sudah Lunas)" : ""}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pelunasan Penuh Buyer", amount],
            ["Pokok + Imbal Hasil Lender", summary.lenderTotalPayout],
            ["Sisa Cadangan ke Vendor", summary.remainingReserve],
            ["Pendapatan Platform InvoFin", summary.platformRevenue],
          ].map(([label, value], i) => (
            <div
              key={String(label)}
              className={i === 3 ? "rounded-xl bg-emerald-50/70 p-3" : "rounded-xl border p-3"}
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`mt-1 text-base font-semibold tabular-nums ${i === 3 ? "text-emerald-700" : ""}`}>
                {formatIdr(Number(value))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

