"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, FileText, Plus, Search, Wallet, X, Building2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatIdr } from "@/lib/format";
import { roles } from "@/modules/workspace/config";
import { summarizeInvoices } from "./summary";
import type { DashboardData, InvoiceSummary } from "./types";

function exportCsv(rows: InvoiceSummary[]) {
  const cell = (value: string | number) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  const content = [
    ["Invoice", "Mitra", "Nominal IDR", "Jatuh tempo", "Status"],
    ...rows.map((row) => [row.number, row.counterparty, row.amount, row.date, row.status]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "invofin-ringkasan.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function rowActionLabel(role: DashboardData["role"], status: InvoiceSummary["status"]) {
  if (role === "vendor" && status === "extraction_review") return "Cek Hasil OCR";
  if (role === "vendor" && status === "draft") return "Lengkapi";
  if (role === "buyer" && status === "buyer_review") return "Konfirmasi";
  if (role === "risk_officer" && status === "risk_review") return "Review Risiko";
  if (role === "lender" && ["eligible_for_funding", "partially_funded"].includes(status)) return "Danai";
  return "Lihat Detail";
}

export function Dashboard({ data, demo = false, view = "overview" }: { data: DashboardData; demo?: boolean; view?: string }) {
  const { role } = data;
  const config = roles[role];
  const [rows, setRows] = useState(data.invoices);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(demo && role === "lender" && view === "portfolio" ? "funded" : "all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<InvoiceSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(demo && role === "vendor" && view === "new");
  const stats = summarizeInvoices(rows);

  const filtered = rows.filter(
    (row) =>
      `${row.number} ${row.counterparty}`.toLowerCase().includes(query.toLowerCase()) &&
      (tab === "all" ||
        (tab === "pending"
          ? ["submitted", "extraction_review", "buyer_review", "risk_review"].includes(row.status)
          : tab === "funded"
            ? ["funded", "repaid"].includes(row.status)
            : ["eligible_for_funding", "partially_funded"].includes(row.status))),
  );

  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * 6, (currentPage + 1) * 6);

  const metrics =
    role === "admin"
      ? [
          { label: "Total Tagihan Aktif", value: formatIdr(stats.total), hint: "Sedang berjalan di sistem", icon: Wallet },
          { label: "Organisasi Terdaftar", value: String(data.metrics?.organizations ?? 0), hint: "Vendor, Buyer, & Lender", icon: Building2 },
          { label: "Lagi Diverifikasi", value: String(stats.pending), hint: "Menunggu giliran cek", icon: Clock3 },
          { label: "Jejak Aktivitas", value: String(data.metrics?.auditEvents ?? 0), hint: "Tercatat di log audit", icon: ScrollText },
        ]
      : [
          {
            label: role === "lender" ? "Total Komitmenmu" : "Nilai Tagihan Aktif",
            value: formatIdr(role === "lender" ? data.metrics?.commitments ?? 0 : stats.total),
            hint: role === "lender" ? "Dana yang sudah kamu alokasikan" : "Tagihan yang sedang diproses",
            icon: Wallet,
          },
          {
            label: role === "lender" ? "Siap Didanai" : "Sudah Cair / Lunas",
            value:
              role === "lender"
                ? `${rows.filter((row) => ["eligible_for_funding", "partially_funded"].includes(row.status)).length} tagihan`
                : formatIdr(stats.funded),
            hint: role === "lender" ? "Tersedia di marketplace" : "Total nilai yang sudah beres",
            icon: CircleCheck,
          },
          {
            label: role === "risk_officer" ? "Menunggu Keputusanmu" : "Sedang Dicek",
            value: `${role === "risk_officer" ? rows.filter((row) => row.status === "risk_review").length : stats.pending} tagihan`,
            hint: "Butuh tindakan selanjutnya",
            icon: Clock3,
          },
          {
            label: "Total Semua Tagihan",
            value: `${stats.count} tagihan`,
            hint: "Sejak awal tercatat",
            icon: FileText,
          },
        ];

  function action() {
    if (demo && role === "vendor") setCreateOpen(true);
    else if (demo) {
      setTab(role === "lender" ? "eligible" : "pending");
      setPage(0);
      document.getElementById("invoice-list")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function demoDecision(status: InvoiceSummary["status"]) {
    if (!selected) return;
    setRows((current) => current.map((row) => (row.id === selected.id ? { ...row, status } : row)));
    setSelected(null);
    toast.success("Sip! Status berhasil diupdate di sesi sandbox ini.");
  }

  if (view === "settings") {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Pengaturan Akun</h1>
        <section className="surface space-y-4 p-6">
          <h2 className="font-semibold">Kamu lagi pakai akun Sandbox ({config.label})</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Semua perubahan di mode demo cuma sementara dan bakal ke-reset kalau halaman di-refresh. Mau coba alur lengkapnya?
          </p>
          <Button asChild>
            <Link href="/sign-in">
              Login ke Akun Asli <ArrowRight />
            </Link>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
            <ArrowDownToLine />
            Unduh CSV
          </Button>
          {demo ? (
            <Button size="sm" onClick={action}>
              <Plus />
              {config.action}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={config.actionHref}>
                <Plus />
                {config.action}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {view === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <section key={metric.label} className="surface p-5">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <metric.icon className="size-4" strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
            </section>
          ))}
        </div>
      )}

      <section id="invoice-list" className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-base font-semibold">
              {role === "lender" ? "Daftar Tagihan Siap Didanai" : "Daftar Tagihan"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Klik tombol di sebelah kanan baris untuk memproses atau melihat detailnya.
            </p>
          </div>
          <label className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              aria-label="Cari invoice atau mitra"
              placeholder="Cari nomor atau nama PT..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              className="h-9 w-full bg-white pl-9 text-xs sm:w-64"
            />
          </label>
        </div>

        <div className="flex gap-5 overflow-x-auto border-b px-5 text-xs">
          {[
            ["all", "Semua"],
            ["pending", "Perlu Dicek"],
            ["eligible", "Siap Didanai"],
            ["funded", "Sudah Beres"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setTab(value);
                setPage(0);
              }}
              aria-pressed={tab === value}
              className={`shrink-0 border-b-2 pb-3 font-medium transition-colors ${
                tab === value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {value === "all" && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px]">{rows.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <caption className="sr-only">Daftar invoice dan statusnya</caption>
            <thead className="bg-slate-50/80 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">No. Tagihan</th>
                <th className="px-4 py-3 font-medium">{role === "buyer" ? "Dari Vendor" : "Mitra"}</th>
                <th className="px-4 py-3 font-medium">Nominal</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                <th className="px-4 py-3 font-medium">Posisi Saat Ini</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="border-t border-border transition-colors hover:bg-blue-50/30">
                  <td className="px-5 py-3.5 font-medium">{row.number}</td>
                  <td className="max-w-[200px] truncate px-4 py-3.5 text-muted-foreground">{row.counterparty}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums">{formatIdr(row.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {demo ? (
                      <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                        {rowActionLabel(role, row.status)}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href={row.href ?? config.actionHref}>
                          {rowActionLabel(role, row.status)} <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {shown.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">
                {rows.length ? "Hmm, tagihan yang kamu cari nggak ketemu" : "Belum ada tagihan nih"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length
                  ? "Coba ketik kata kunci lain atau ganti tab filternya."
                  : "Begitu ada tagihan masuk, daftarnya bakal langsung nongol di sini."}
              </p>
              {rows.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => {
                    setQuery("");
                    setTab("all");
                    setPage(0);
                  }}
                >
                  Reset Filter <X />
                </Button>
              )}
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <p>
              Halaman {currentPage + 1} dari {pages} ({filtered.length} tagihan)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage === 0}
                aria-label="Halaman sebelumnya"
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage + 1 >= pages}
                aria-label="Halaman berikutnya"
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.number}</DialogTitle>
            <DialogDescription>Simulasi cepat sebagai {config.label}</DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                {[
                  ["Mitra", selected.counterparty],
                  ["Nominal", formatIdr(selected.amount)],
                  ["Jatuh Tempo", formatDate(selected.date)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {role === "buyer" && selected.status === "buyer_review" && (
                  <>
                    <Button onClick={() => demoDecision("risk_review")}>
                      <Check />
                      Konfirmasi Tagihan Ini
                    </Button>
                    <Button variant="outline" onClick={() => demoDecision("rejected")}>
                      Tolak / Sengketa
                    </Button>
                  </>
                )}
                {role === "risk_officer" && selected.status === "risk_review" && (
                  <>
                    <Button onClick={() => demoDecision("eligible_for_funding")}>
                      <Check />
                      Approve ke Marketplace
                    </Button>
                    <Button variant="outline" onClick={() => demoDecision("rejected")}>
                      Tolak Pengajuan
                    </Button>
                  </>
                )}
                {role === "lender" && selected.status === "eligible_for_funding" && (
                  <Button onClick={() => demoDecision("funded")}>
                    <Check />
                    Simulasikan Danai Penuh
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Tagihan Contoh</DialogTitle>
            <DialogDescription>Coba tambah 1 baris tagihan ke tabel sandbox-mu.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const amount = Number(form.get("amount"));
              const number = String(form.get("number")).trim();
              if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12)
                return toast.error("Nominal harus masuk akal ya (Rp1 sampai Rp1 triliun).");
              if (rows.some((row) => row.number === number))
                return toast.error("Nomor invoice itu sudah dipakai di tabel.");
              setRows((current) => [
                {
                  id: crypto.randomUUID(),
                  number,
                  amount,
                  counterparty: String(form.get("buyer")),
                  date: String(form.get("date")),
                  createdAt: new Date().toISOString(),
                  status: "draft",
                },
                ...current,
              ]);
              setTab("all");
              setQuery("");
              setPage(0);
              setCreateOpen(false);
              toast.success("Berhasil! Tagihan baru sudah nongol di baris paling atas.");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="demo-number">Nomor Invoice</Label>
              <Input id="demo-number" name="number" required minLength={3} maxLength={80} placeholder="INV/2026/1031" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-buyer">Nama Perusahaan Buyer</Label>
              <Input id="demo-buyer" name="buyer" required minLength={3} maxLength={120} placeholder="PT Sumber Retail Indonesia" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-amount">Nominal (Rp)</Label>
                <Input id="demo-amount" name="amount" type="number" min="1" max="1000000000000" step="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-date">Jatuh Tempo</Label>
                <Input id="demo-date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} required />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus />
              Tambahkan ke Daftar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

