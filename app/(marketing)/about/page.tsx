export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-semibold text-white">Tentang InvoFin</h1>
      <p className="mt-4 text-slate-300">
        Banyak UMKM memiliki penjualan dan invoice yang valid, tetapi kekurangan modal kerja karena
        pembayaran buyer baru diterima 30 sampai 90 hari kemudian. InvoFin menghubungkan vendor,
        anchor buyer, dan lender pada satu sumber data.
      </p>
      <p className="mt-4 text-slate-400">
        Prototipe ini dibangun untuk validasi alur operasional. Tidak menyatakan sudah berlisensi,
        sudah menyalurkan dana riil, atau memiliki model AI yang tervalidasi di produksi.
      </p>
    </main>
  );
}
