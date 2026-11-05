import {financingBreakdown} from "@/lib/funding/breakdown";
import {formatIdr} from "@/lib/format";
export function FinancingSummary({amount,advancePercent,feePercent}:{amount:number;advancePercent:number;feePercent?:number}) {
  const summary=financingBreakdown(amount,advancePercent,feePercent??3);
  return <section className="surface space-y-4 p-5"><div><h2 className="font-semibold">Rincian pendanaan simulasi</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feePercent==null?"Biaya final menunggu penilaian risiko. Perhitungan ini memakai batas biaya 3%.":`Biaya ${feePercent}% dihitung dari nominal invoice, untuk tenor invoice ini.`}</p></div><dl className="grid gap-4 sm:grid-cols-3">{[["Advance sebelum biaya",summary.advance],["Biaya vendor",summary.fee],["Estimasi advance bersih",summary.netAdvance]].map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold">{formatIdr(Number(value))}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Belum ada pencairan atau transfer dana riil.</p></section>;
}
