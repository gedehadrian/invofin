import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs tracking-[0.2em] text-teal-300 uppercase">AI for Good · UMKM Indonesia</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Ubah invoice yang belum jatuh tempo menjadi modal kerja.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Cepat, tanpa agunan aset tetap, dan transparan. InvoFin menilai transaksi riil — bukan
            memberikan pinjaman dari neracanya sendiri.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">Mulai pengajuan</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/how-it-works">Lihat alur verifikasi</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { k: "96,49%", v: "UMKM belum punya laporan formal" },
            { k: "30–90 hari", v: "arus kas tertahan di invoice" },
            { k: "< 48 jam", v: "target keputusan setelah verifikasi" },
          ].map((item) => (
            <Card key={item.k} className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-2xl text-amber-300">{item.k}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{item.v}</CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Vendor UMKM", "Unggah Invoice, PO, BAST dan pantau status pendanaan."],
          ["Anchor Buyer", "Konfirmasi keabsahan, nominal, dan jatuh tempo."],
          ["Lender", "Lihat marketplace terverifikasi, risk band, dan reason codes."],
          ["Risk Officer", "Keputusan akhir atas flag duplikasi dan anomali."],
        ].map(([title, body]) => (
          <Card key={title} className="border-white/10 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400">{body}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
