"use client";

import { useState } from "react";
import { monthlyVolume } from "./summary";
import type { InvoiceSummary } from "./types";
import { formatIdr } from "@/lib/format";

const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function VolumeChart({ rows }: { rows: InvoiceSummary[] }) {
  const years = [...new Set(rows.map(row => Number(row.createdAt.slice(0, 4))))].sort((a, b) => b - a);
  if (!years.length) years.push(new Date().getFullYear());
  const [year, setYear] = useState(years[0]);
  const [half, setHalf] = useState("second");
  const points = monthlyVolume(rows, year).slice(half === "first" ? 0 : 6, half === "first" ? 6 : 12);
  const max = Math.max(...points.map(point => point.submitted), 1000000);
  return <section className="surface min-w-0 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Aktivitas invoice</h2><p className="mt-1 text-xs text-muted-foreground">Nilai invoice berdasarkan bulan pengajuan</p></div><select aria-label="Tahun aktivitas" value={year} onChange={event => setYear(Number(event.target.value))} className="rounded-lg border bg-white px-3 py-1.5 text-xs">{years.map(value => <option key={value}>{value}</option>)}</select></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px]"><div className="flex gap-4 text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Diajukan</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-200" />Terdanai / lunas</span></div><div className="rounded-lg bg-muted p-0.5">{[["first", "Jan–Jun"], ["second", "Jul–Des"]].map(([value, label]) => <button key={value} onClick={() => setHalf(value)} aria-pressed={half === value} className={`rounded-md px-2 py-1 ${half === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</div></div>
    <div className="relative mt-6 pl-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between text-[9px] text-muted-foreground">{[1, .75, .5, .25, 0].map(ratio => <div key={ratio} className="flex items-center gap-2"><span className="w-8 text-right">{Math.round(max * ratio / 1000000)} jt</span><span className="flex-1 border-t border-dashed border-border" /></div>)}</div>
      <div className="relative grid h-[195px] grid-cols-6 gap-3 sm:gap-6" role="img" aria-label={`Grafik nilai invoice tahun ${year}. Rincian tersedia di tabel di bawah grafik.`}>{points.map(point => <div key={point.month} className="flex flex-col items-center justify-end"><div className="flex h-[175px] w-full max-w-12 items-end justify-center gap-1"><div title={`Diajukan ${formatIdr(point.submitted)}`} style={{ height: `${point.submitted / max * 100}%`, minHeight: point.submitted ? 3 : 0 }} className="w-1/2 rounded-t-[4px] bg-primary transition-all duration-300" /><div title={`Terdanai ${formatIdr(point.funded)}`} style={{ height: `${point.funded / max * 100}%`, minHeight: point.funded ? 3 : 0 }} className="w-1/2 rounded-t-[4px] bg-blue-200 transition-all duration-300" /></div><span className="mt-3 text-[10px] text-muted-foreground">{months[point.month]}</span></div>)}</div>
    </div>
    <details className="mt-4 text-[10px] text-muted-foreground"><summary className="cursor-pointer">Lihat rincian angka</summary><table className="mt-2 w-full text-left"><caption className="sr-only">Nilai invoice per bulan</caption><thead><tr><th>Bulan</th><th>Diajukan</th><th>Terdanai / lunas</th></tr></thead><tbody>{points.map(point => <tr key={point.month}><td>{months[point.month]}</td><td>{formatIdr(point.submitted)}</td><td>{formatIdr(point.funded)}</td></tr>)}</tbody></table></details>
  </section>;
}
