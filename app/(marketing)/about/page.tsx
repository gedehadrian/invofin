export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
      <h1 className="text-2xl font-semibold md:text-3xl">Tentang InvoFin</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Banyak UMKM memiliki penjualan dan invoice yang valid, tetapi kekurangan modal kerja karena
        pembayaran buyer baru diterima 30 sampai 90 hari kemudian. InvoFin menghubungkan vendor,
        anchor buyer, dan lender pada satu sumber data.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Prototipe ini dibangun untuk validasi alur operasional. Tidak menyatakan sudah berlisensi,
        sudah menyalurkan dana riil, atau memiliki model AI yang tervalidasi di produksi.
      </p>
    </main>
  );
}
