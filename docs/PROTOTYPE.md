# Panduan prototipe online

Target aplikasi: https://invofin-gede-hadrians-projects.vercel.app. Gunakan data sintetis; belum ada transfer dana riil atau model kredit terlatih.

## Mencoba alur lengkap

1. Jalankan seed prototipe sekali pada mesin operator: `node scripts/seed-prototype.mjs --apply`. Akun khusus vendor/buyer/lender/risk/admin dan password acak tersimpan di `.env.prototype.local` yang diabaikan Git. Jangan membagikan akun admin secara publik.
2. Login vendor dan buka `PROTO-2026-001` yang telah disiapkan saat smoke test: Rp25.000.000, jatuh tempo 18 Desember 2026, berstatus sebagian terdanai. Untuk mencoba pengajuan baru, buat nomor dan dokumen sintetis baru; contoh berikut menjelaskan data fixture awal: buyer `Integration buyer`, tanggal 4 November 2026, advance 80%.
3. Unduh tiga dokumen sintetis dari form unggah: Invoice, PO dan BAST. Simpan draft, unggah ketiganya, lalu ajukan.
4. Tunggu pemrosesan latar belakang. OCR invoice/PO menggunakan Azure; BAST diperiksa manual. Vendor memeriksa field dengan dokumen sumber lalu mencentang konfirmasi.
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

[Inventaris fitur lengkap, pencocokan proposal, dan prioritas P0-P3](FEATURE_MATRIX.md) diperbarui 6 November 2026. Aktivasi/penangguhan organisasi dasar sudah ada; yang perlu diselesaikan adalah keseluruhan onboarding dan pemulihan akses. OCR BAST, fingerprint bisnis, SHAP/model kredit, serta integrasi pembayaran/ERP masih menjadi celah terhadap proposal.

| Prioritas | Pekerjaan | Kriteria selesai |
| --- | --- | --- |
| Berikutnya | Skenario uji OCR lebih beragam | Dataset berlabel: scan buram, format Indonesia, pajak, tanggal ambigu; ukur akurasi per field dan jumlah koreksi |
| Berikutnya | Fraud evaluation | Skenario duplicate/reused PO, nilai berbeda, buyer tidak aktif; ukur false positive/false negative dengan label independen |
| Berikutnya | Monitoring dan retensi | Alert job gagal/menumpuk, biaya/latensi OCR, pembersihan unggahan yatim dengan masa retensi, pengujian restore |
| Sebelum pilot | Onboarding dan akses | Aktivasi organisasi, validasi identitas, pemulihan akun, pencabutan sesi/akses dan pengujian permission lengkap |
| Sebelum pilot | Validasi keamanan menyeluruh | Audit scoped, dependency remediation, rate limit atomik, scan malware dan dokumen berbahaya, abuse testing |
| Sebelum pilot | Model risiko kredit | Histori pembayaran berizin, label default, split waktu, baseline, kalibrasi, explainability dan pemantauan drift |
| Sebelum transaksi nyata | Payment dan ledger | Provider, webhook terverifikasi, ledger berpasangan, rekonsiliasi, idempotensi pencairan dan review legal |

Azure tetap dipakai untuk OCR awal karena integrasinya tersedia. Model Hugging Face belum dipasang: pilih setelah benchmark dengan data representatif dan kebutuhan operasi jelas. Confidence OCR bukan probabilitas dokumen asli, dan anomali bukan bukti fraud. Ekstraksi invoice yang belum pasti memaksa band `review` pada penilaian baru; keputusan manusia tetap eksplisit. Invoice sintetis menguji alur serta parser, bukan akurasi model terhadap dokumen dunia nyata. Penilaian historis tidak ditulis ulang saat aturan berubah.
