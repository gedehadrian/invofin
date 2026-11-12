import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  ["1. Vendor Ajukan & Upload", "Vendor mengisi form tagihan dan mengunggah 3 bukti sakti: Invoice, PO, dan BAST."],
  ["2. Mesin Baca Dokumen (OCR)", "Sistem mengekstrak angka dan tanggal dari dokumen secara otomatis, plus mengecek apakah file pernah dipakai sebelumnya."],
  ["3. Vendor Cek Ulang", "Karena mesin kadang bisa salah baca tulisan miring, Vendor memastikan data hasil bacaan sudah pas sebelum dikirim ke Buyer."],
  ["4. Buyer Kasih Konfirmasi", "Anchor Buyer memverifikasi bahwa barang/jasa memang sudah diterima dan nominal tagihannya tidak dilebih-lebihkan."],
  ["5. Risk Officer Mengecek", "Sistem menghitung skor risiko (cocoklogi 3 dokumen & riwayat), lalu Risk Officer memberi lampu hijau."],
  ["6. Lender Patungan Mendanai", "Invoice tayang di Marketplace! Lender bisa memilih tagihan dan berkomitmen mendanai hingga target terpenuhi."],
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <h1 className="text-2xl font-semibold md:text-3xl">Gimana Alur Kerja InvoFin?</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Nggak perlu baca buku manual setebal bantal. Intinya cuma satu: memastikan tagihan itu asli, diakui pembelinya, lalu siap didanai.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([title, body]) => (
          <Card key={title} size="sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-primary">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

