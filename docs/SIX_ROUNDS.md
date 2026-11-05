# Rencana enam putaran InvoFin

Disepakati 6 November 2026: selesaikan prototipe tanpa uang nyata, memakai invoice sintetis yang diaugmentasi. Siapkan jalur perpindahan staging ke production; perubahan lingkungan tidak boleh otomatis mengaktifkan pembayaran atau mencampur data uji dengan data production.

| Putaran | Cakupan dan kriteria selesai | Status |
| --- | --- | --- |
| 1 | Akun dan onboarding dua tahap yang dapat dilanjutkan; organisasi pending/active/suspended; reset password lengkap; RPC atomik dan tes auth | Selesai 6 November 2026; implementasi `dcd55ce`, cloud terverifikasi |
| 2 | Generator invoice/PO/BAST sintetis bervariasi, augmentasi yang dapat diulang, ground truth, manifest dataset, split berdasarkan dokumen asal dan evaluator OCR | Berikutnya |
| 3 | OCR BAST, matching referensi/item tiga dokumen, fingerprint bisnis dan skenario duplikasi hasil ekspor/foto ulang | Belum |
| 4 | Rincian biaya/advance bersih, alasan risiko yang jelas, perapian UI dan UAT lima peran dengan fixture bervariasi | Belum |
| 5 | Baseline eksperimen fraud/kredit untuk demonstrasi, reason codes/explainability, versi dataset/model dan pipeline retraining; evaluasi sintetis ditandai dengan jelas | Belum |
| 6 | Pemeriksaan keamanan, monitoring/retry/retensi, backup/restore, konfigurasi staging/production terpisah, runbook migrasi/promotion/rollback dan verifikasi deployment akhir | Belum |

Setiap putaran mencakup implementasi, pemeriksaan yang relevan, commit dan laporan hasil. Push GitHub mengikuti instruksi pengguna. Enam putaran ini tidak mencakup payment gateway uang nyata, penyaluran/pembayaran dana, integrasi bank/ERP/e-Faktur nyata atau klaim model kredit sudah tervalidasi untuk nasabah.

Putaran 1: 23 unit test, 12 tes PostgreSQL, 7 tes workflow lokal dan 6 tes Auth lokal lulus (48 total), berikut TypeScript, lint terarah dan production build. Email sandbox Mailpit diuji sampai callback PKCE; cloud diuji dengan token recovery tanpa mengirim email. Uji pengiriman email ke kotak masuk nyata serta konfigurasi SMTP per lingkungan ditutup pada putaran 6.

## Kontrak data augmentasi dan retraining

- Buat identitas bisnis fiktif dan ground truth sebelum menambahkan perubahan visual seperti rotasi, blur, noise, crop atau perubahan template. Variasi nilai/tanggal/referensi merupakan skenario terpisah dengan label yang ikut diperbarui.
- Simpan `datasetVersion`, seed, ID dokumen asal, keluarga template, skenario dan parameter augmentasi dalam manifest. Output OCR tidak menjadi ground truth-nya sendiri.
- Pisahkan train/validation/test berdasarkan dokumen asal dan keluarga yang diuji. Semua turunan augmentasi dari satu dokumen harus berada dalam split yang sama; ukur generalisasi template secara terpisah.
- Label fraud dan hasil pembayaran sintetis hanya menguji pipeline/demonstrasi. Keduanya belum membuktikan akurasi fraud atau risiko kredit pada populasi nyata.
- Ketika data nyata tersedia: pastikan izin pemakaian, simpan di area privat di luar Git, lakukan pelabelan independen, lalu bentuk holdout berdasarkan waktu/vendor/buyer sesuai tujuan evaluasi. Jangan mencampur data tersebut ke fixture publik.
- Retraining menghasilkan artefak baru dengan versi model, skema fitur, versi dataset, commit kode, parameter/threshold dan hasil evaluasi. Model baru melewati evaluasi staging dan review sebelum dipromosikan; versi sebelumnya tersedia untuk rollback.
- Azure `prebuilt-invoice` tetap provider OCR baseline. Retraining model internal tidak mengubah model Azure prebuilt. OCR custom Azure atau kandidat Hugging Face dipilih setelah benchmark; model kredit tabular dilatih terpisah dari OCR.

## Batas lingkungan

Target online yang sekarang adalah prototipe dengan data sintetis, walaupun Vercel menyebut deployment-nya Production. Pemisahan production sungguhan belum dinyatakan selesai. Pada putaran 6, gunakan target Supabase, Storage, konfigurasi Auth/SMTP, secret worker dan provider yang berbeda untuk setiap lingkungan; uji migrasi tanpa reset dan pastikan script seed menolak target production.

Data simulasi dan secret tidak ikut promosi ke production. Payment provider tetap stub yang menolak pencairan. Kesiapan production di sini berarti jalur konfigurasi, deployment dan pemulihan yang teruji; aktivasi uang nyata memerlukan proyek lanjutan tersendiri.
