import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  ["Unggah", "Vendor mengirim Invoice, PO, dan BAST ke storage privat."],
  ["OCR", "Azure Document Intelligence prebuilt-invoice mengekstrak data."],
  ["Duplikasi", "SHA-256 + unique constraint menolak file invoice identik."],
  ["Konsistensi", "Rules engine membandingkan formulir, OCR, PO, dan BAST."],
  ["Buyer", "Anchor buyer mengonfirmasi atau menolak keabsahan."],
  ["Anomali", "Isolation Forest jalan setelah histori vendor mencukupi."],
  ["Risk Officer", "Keputusan akhir: setujui ke marketplace atau tolak."],
  ["Pendanaan", "Lender berkomitmen hingga target terisi. Bukan pencairan sungguhan."],
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-12">
      <h1 className="text-2xl font-semibold md:text-3xl">Cara kerja InvoFin</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Risk assessment awal, bukan keputusan kredit otomatis final. Setiap risk band punya reason
        codes, dan kasus berisiko tetap ke manusia.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {STEPS.map(([title, body], i) => (
          <Card key={title} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">
                <span className="mr-2 text-primary">{String(i + 1).padStart(2, "0")}</span>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
