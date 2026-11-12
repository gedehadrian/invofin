import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, FileCheck2, FileText, ScanLine, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Home() {
  return (
    <main className="overflow-hidden bg-white">
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Selamat tinggal drama nunggu cair 90 hari
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
            Barang sudah dikirim,
            <br />
            masa modalnya nyangkut{" "}
            <span className="text-primary">tiga bulan?</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Kita tahu rasanya: orderan ramai, tapi kas seret gara-gara tempo pembayaran buyer masih lama. Di InvoFin, ubah tagihan aktifmu jadi modal kerja segar tanpa drama.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Cairkan Tagihan Sekarang <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">
                Intip Demo Dulu <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" />
              Hitungan biaya terang-terangan di depan
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" />
              Cukup Invoice, PO, & BAST asli
            </span>
          </div>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-8 rounded-full bg-blue-50/80 blur-3xl" />
          <div className="relative rounded-3xl border border-blue-100 bg-[#f4f7fc] p-5 shadow-lg sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold">Simulasi Dapur Kas Kamu</span>
              <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-primary">
                Live Preview
              </span>
            </div>
            <div className="rounded-2xl bg-primary p-5 text-white">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-100">Tagihan Siap Dicairkan</p>
                <Wallet className="size-4 text-blue-100" />
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">Rp 245.000.000</p>
              <p className="mt-2 text-xs text-blue-100">
                Daripada nganggur di laci, mending diputar buat produksi lagi.
              </p>
            </div>
            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold">Lacak Posisi Tagihan</p>
                <span className="font-mono text-[11px] font-medium text-primary">INV/2026/1024</span>
              </div>
              {[
                {
                  icon: FileText,
                  title: "1. Upload 3 Dokumen",
                  detail: "Invoice, PO, dan BAST beres diunggah",
                  done: true,
                },
                {
                  icon: Building2,
                  title: "2. Di-acc Anchor Buyer",
                  detail: '"Yap, barang sudah diterima & tagihan bener!"',
                  done: true,
                },
                {
                  icon: ShieldCheck,
                  title: "3. Siap Didanai Lender",
                  detail: "Lolos cek risiko, langsung tayang di marketplace",
                  done: false,
                },
              ].map((step, index) => (
                <div key={step.title} className="relative flex items-center gap-3 pb-4 last:pb-0">
                  {index < 2 && <i className="absolute bottom-0 left-[14px] top-7 w-px bg-border" />}
                  <span
                    className={`relative flex size-7 shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-blue-50 text-primary"
                        : "border border-blue-200 bg-white text-primary"
                    }`}
                  >
                    {step.done ? <Check className="size-3.5" /> : <step.icon className="size-3.5" />}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-3">
          {[
            [
              "Buat Vendor UMKM",
              "Nggak perlu nunggu jatuh tempo berbulan-bulan buat belanja bahan baku atau gajian tim.",
            ],
            [
              "Buat Anchor Buyer",
              "Supplier senang, stok lancar. Cukup klik konfirmasi kalau tagihan dan barangnya memang sesuai.",
            ],
            [
              "Buat Lender",
              "Danai tagihan riil yang sudah diakui pembelinya dan dicek tim risiko. Jelas angkanya, jelas tenornya.",
            ],
          ].map(([title, text]) => (
            <div key={title} className="sm:border-l sm:pl-6 first:border-0 first:pl-0">
              <p className="text-xs font-semibold text-primary">{title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold tracking-wider text-primary">CARA KERJA TANPA RIBET</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-lg text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Cuma 3 langkah simpel dari kertas tagihan jadi modal jalan.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Biar mesin OCR kami yang baca dokumenmu, dan tim kami yang urus verifikasinya.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: ScanLine,
              title: "Upload & Biar Mesin Baca",
              text: "Unggah Invoice, PO, dan BAST. Sistem otomatis mengekstrak angkanya—kamu tinggal cek dan klik oke.",
            },
            {
              icon: FileCheck2,
              title: "Buyer & Risk Kasih Jempol",
              text: "Buyer mengonfirmasi tagihan memang valid, lalu Risk Officer memastikan semuanya aman tanpa celah.",
            },
            {
              icon: Wallet,
              title: "Tayang & Didanai!",
              text: "Tagihanmu masuk ke Marketplace dan siap didanai secara patungan maupun penuh oleh para Lender.",
            },
          ].map((item, index) => (
            <article key={item.title} className="rounded-2xl border p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <item.icon className="size-5" strokeWidth={1.7} />
                </span>
                <span className="font-mono text-xs font-semibold text-slate-300">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-7 sm:p-9">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Penasaran gimana rasanya jadi 5 peran sekaligus?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Langsung coba mode sandbox tanpa perlu login. Bebas klik sana-sini, nggak bakal ngerusak apa-apa!
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/demo">
              Mainkan Mode Sandbox <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

