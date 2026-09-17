import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:gap-10 md:px-6 md:py-10">
      <section className="max-w-2xl">
        <div>
          <p className="text-sm font-medium text-primary">Invoice financing untuk UMKM</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Ubah invoice yang belum jatuh tempo menjadi modal kerja.
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Cepat, tanpa agunan aset tetap, dan transparan. InvoFin menilai transaksi riil — bukan
            memberikan pinjaman dari neracanya sendiri.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/sign-up">Mulai pengajuan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/how-it-works">Lihat alur verifikasi</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
          {[
            { k: "96,49%", v: "UMKM belum punya laporan formal" },
            { k: "30–90 hari", v: "Arus kas tertahan di invoice" },
            { k: "< 48 jam", v: "Target keputusan setelah verifikasi" },
          ].map((item) => (
            <Card key={item.k} size="sm">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{item.k}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed text-muted-foreground">
                {item.v}
              </CardContent>
            </Card>
          ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Vendor UMKM", "Unggah Invoice, PO, BAST dan pantau status pendanaan."],
          ["Anchor Buyer", "Konfirmasi keabsahan, nominal, dan jatuh tempo."],
          ["Lender", "Lihat marketplace terverifikasi, risk band, dan reason codes."],
          ["Risk Officer", "Keputusan akhir atas flag duplikasi dan anomali."],
        ].map(([title, body]) => (
          <Card key={title} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
