# Panduan prototipe online

Target aplikasi: https://invofin-gede-hadrians-projects.vercel.app. Gunakan data sintetis; pendanaan tetap simulasi. Baseline kredit terlatih hanya eksperimen sintetis, terpisah dari keputusan pendanaan.

## Mencoba alur lengkap

1. Jalankan seed prototipe sekali pada mesin operator: `node scripts/seed-prototype.mjs --apply`. Akun khusus vendor/buyer/lender/risk/admin dan password acak tersimpan di `.env.prototype.local` yang diabaikan Git. Jangan membagikan akun admin secara publik.
2. Login vendor dan buka `PROTO-2026-001` yang telah disiapkan saat smoke test: Rp25.000.000, jatuh tempo 18 Desember 2026, berstatus sebagian terdanai. Untuk mencoba pengajuan baru, buat nomor dan dokumen sintetis baru; contoh berikut menjelaskan data fixture awal: buyer `Integration buyer`, tanggal 4 November 2026, advance 80%.
3. Unduh tiga dokumen sintetis dari form unggah: Invoice, PO dan BAST. Simpan draft, unggah ketiganya, lalu ajukan.
4. Tunggu pemrosesan latar belakang. OCR invoice/PO menggunakan Azure Invoice dan BAST Azure Layout. Hasil tidak pasti tetap review. Vendor memeriksa field dengan dokumen sumber lalu mencentang konfirmasi.
5. Login buyer dan konfirmasi atau sengketakan invoice. Konfirmasi membuat penilaian risiko untuk ditinjau Risk Officer.
6. Login Risk Officer, baca alasan/skor dan dokumen, lalu buat keputusan. Persetujuan menerbitkan peluang pendanaan.
7. Login lender dan buat komitmen simulasi. Retry dengan request yang sama tidak menggandakan komitmen; transaksi mencegah kelebihan pendanaan.

Invoice PDF yang sama tidak dapat diajukan kembali. Untuk demonstrasi berulang gunakan nomor dan dokumen sintetis baru; jangan menghapus jejak audit untuk mengulang demo.

## Operasi online

- Vercel melayani UI, Server Actions dan satu pekerjaan OCR per request, maksimal 60 detik.
- Supabase menyimpan autentikasi, data, dokumen privat, antrean dan jadwal worker. Jadwal setiap menit memanggil maksimal tiga request jika pekerjaan siap.
- Secret pemanggil worker berada di Vercel dan Supabase Vault, bukan browser, repo atau SQL migrasi.
- Pekerjaan menggunakan lease 90 detik dan retry maksimal tiga kali. Kegagalan final tampil sebagai dokumen yang perlu pemeriksaan.
- Tidak perlu VPS untuk prototipe ini. Worker terpisah dapat dipakai jika volume atau durasi OCR melampaui kapasitas serverless.
- Supabase Free dapat pause saat tidak aktif; pantau status project dan kuota Azure/Vercel/Supabase dari dashboard masing-masing.
- Backup dan retensi harus ditetapkan sebelum pilot. Migrasi cloud memakai `db push` setelah dry run; jangan reset database cloud.

## Pekerjaan berikutnya

[Inventaris fitur lengkap](FEATURE_MATRIX.md) dan [enam putaran](SIX_ROUNDS.md) mencatat implementasi terbaru: akun, augmentasi, BAST/matching/identitas bisnis, rincian biaya/UAT, lab sintetis, serta operasional/promotion. [Runbook](OPERATIONS.md) memisahkan konfigurasi produksi/SMTP/restore cloud yang belum tersedia. Pembayaran nyata berada di luar enam putaran.

| Prioritas | Pekerjaan | Kriteria selesai |
| --- | --- | --- |
| Sebelum pilot | Benchmark representatif | Dataset sintetis 144 kasus dan oracle rules tersedia; perlu benchmark OCR/fraud menyeluruh dengan data nyata berizin |
| Sebelum pilot | Operasi cloud | Job/retry/retensi dan restore lokal tersedia; perlu SMTP, paging, backup byte objek dan latihan restore cloud |
| Sebelum pilot | Onboarding dan akses | Validasi identitas, pencabutan sesi/akses dan pengujian permission lengkap; onboarding atomik, halaman status dan reset password dasar selesai pada putaran 1 |
| Sebelum pilot | Validasi keamanan menyeluruh | Audit scoped, dependency remediation, rate limit atomik, scan malware dan dokumen berbahaya, abuse testing |
| Sebelum pilot | Model risiko kredit | Histori pembayaran berizin, label default, split waktu, baseline, kalibrasi, explainability dan pemantauan drift |
| Sebelum transaksi nyata | Payment dan ledger | Provider, webhook terverifikasi, ledger berpasangan, rekonsiliasi, idempotensi pencairan dan review legal |

Azure tetap dipakai untuk OCR awal karena integrasinya tersedia. Model Hugging Face belum dipasang: pilih setelah benchmark dengan data representatif dan kebutuhan operasi jelas. Confidence OCR bukan probabilitas dokumen asli, dan anomali bukan bukti fraud. Ekstraksi invoice yang belum pasti memaksa band `review` pada penilaian baru; keputusan manusia tetap eksplisit. Invoice sintetis menguji alur serta parser, bukan akurasi model terhadap dokumen dunia nyata. Penilaian historis tidak ditulis ulang saat aturan berubah.
