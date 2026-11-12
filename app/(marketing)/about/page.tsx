export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="text-2xl font-semibold md:text-3xl">Kenapa InvoFin Dibuat?</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Cerita klasik UMKM: orderan dari perusahaan besar ramai, barang sudah dikirim, BAST sudah ditandatangani... tapi uangnya baru cair 60 sampai 90 hari lagi. Sementara itu, gaji karyawan dan tagihan bahan baku nggak mau nunggu.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        InvoFin hadir buat menjembatani celah itu. Kami mempertemukan <strong>Vendor UMKM</strong> yang butuh perputaran kas cepat, <strong>Anchor Buyer</strong> yang mengonfirmasi keaslian tagihan, dan <strong>Lender</strong> yang siap mendanai tagihan terverifikasi.
      </p>
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-muted-foreground">
        💡 <strong>Catatan Jujur:</strong> Aplikasi ini adalah prototipe fungsional untuk simulasi alur <em>invoice financing</em>. Seluruh angka komitmen dan pencairan di sini masih berupa simulasi (belum ada uang beneran yang berpindah rekening).
      </div>
    </main>
  );
}

