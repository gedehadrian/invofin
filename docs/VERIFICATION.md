# Hasil verifikasi implementasi

## Pemeriksaan otomatis

- Production build Next.js 16.3.5: lulus, termasuk TypeScript dan generasi route.
- `npm run typecheck`: lulus.
- `npm test`: 15 tes lulus. Cakupan: rules engine, Isolation Forest, callback redirect, signature/ukuran unggahan, tanggal dan nominal, ringkasan dashboard dan navigasi aktif.
- Lint terarah pada modul baru, shell, logo, halaman demo dan file keamanan yang diubah: tanpa error/warning setelah perbaikan navigasi memakai router.
- HTTP: landing, demo lima peran, organisasi demo admin, panduan dan sign-in mengembalikan 200. Header `nosniff` dan frame `DENY` terkonfirmasi.

## Pemeriksaan browser dengan data sintetis

- Draf invoice baru tampil dalam tabel dan jumlah invoice bertambah.
- Pencarian nomor invoice menyaring tabel ke hasil yang benar.
- Perpindahan Vendor, Buyer, Lender, Risk Officer, Admin berhasil.
- Konfirmasi Buyer mengubah status contoh menjadi tinjauan Risk Officer.
- Persetujuan Risk Officer mengubah status contoh menjadi siap pendanaan.
- Drawer navigasi terbuka; link Organisasi menampilkan daftar organisasi contoh.
- Aksi tangguhkan contoh mengubah status organisasi dalam sesi demo.
- Ekspor CSV menghasilkan unduhan `invofin-ringkasan.csv`.
- Console pada alur yang diperiksa tidak memuat warning/error.
- Layout 390px: overflow halaman diperbaiki; `scrollWidth` sama dengan `clientWidth` (375px konten + scrollbar). Tabel tetap dapat digulir horizontal di dalam kontainernya.
- Layout desktop 1440px: sidebar, empat KPI, grafik, dan alur pengajuan tampil; tidak ada overflow halaman.

## Belum diverifikasi

Login dengan akun nyata, backend RLS lintas organisasi, upload Storage privat, integrasi Azure OCR, aksi keputusan produksi dan transaksi komitmen di database tidak dijalankan. Tidak ada migrasi atau perubahan database live. Demo tidak membuktikan keamanan backend produksi. AI credit scoring terlatih dan transfer dana riil belum diimplementasikan.

Untuk mencoba lokal: jalankan `npm run dev` dari folder project, lalu buka `/demo` pada URL yang dicetak Next.js. Data contoh di-reset saat reload/pergantian halaman.
