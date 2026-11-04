# Bukti verifikasi prototipe

## Pengujian yang dijalankan

- Unit: normalisasi nominal/tanggal Indonesia, confidence per field, label evaluasi OCR, rules engine, Isolation Forest, callback redirect, unggahan, ringkasan dashboard dan navigasi.
- PostgreSQL PGlite: seluruh migrasi domain, RLS lintas organisasi, larangan self-enrollment, akses dokumen lender, antrean/lease/retry, keputusan atomik dan komitmen idempotent.
- Supabase lokal nyata: Auth, PostgREST dan Storage privat; akun sintetis lima peran, signed upload, canonical storage, proteksi endpoint worker, penilaian buyer, persetujuan risk dan komitmen paralel. Tes menolak URL non-loopback.
- Supabase lokal menjalankan migrasi pg_cron/pg_net/Vault; dispatcher tanpa konfigurasi tidak mengirim request. Managed extensions ini tidak dicakup PGlite.
- Live Azure memakai invoice sintetis: nomor invoice dan nominal Rp25.000.000 diekstrak; confidence nama vendor rendah diarahkan ke `needs_review`.
- Browser lokal: login vendor, simpan draft, signed upload invoice melalui form. Preview lima peran juga diperiksa sebelumnya pada desktop dan mobile.
- TypeScript, production build serta lint pada file yang diubah diperiksa sebelum commit.

Hasil terakhir: 21 unit test, 11 pengujian PostgreSQL dan 7 pengujian integrasi lokal lulus. Regression test memastikan invoice OCR berstatus `needs_review`, `failed` atau `pending` mendapat band `review`, walaupun field yang terbaca cocok.

## Cloud InvoFin, 4 November 2026

- Supabase `skwwgjjgeativyevkkpl` aktif. Lima migrasi tambahan diterapkan tanpa reset. Sebelas invoice sebelumnya dipertahankan.
- Riwayat baseline cloud dibandingkan dengan lima migrasi lokal: perbedaannya komentar dan titik koma tambahan. Nama file lokal diselaraskan dengan versi remote.
- Vercel Production berstatus Ready; domain `invofin-gede-hadrians-projects.vercel.app` dapat diakses. Landing, login, demo dan PDF contoh mengembalikan 200 dengan `nosniff` dan frame `DENY`.
- Browser cloud: login vendor sintetis, buat draft `PROTO-2026-001`, signed upload invoice privat, dan buka detail sesudah pemrosesan.
- Lima peran sintetis berhasil login via Supabase Auth. Smoke test API melengkapi PO/BAST, menolak akses lender ke dokumen mentah dan menolak panggilan worker tanpa token (401).
- Supabase Cron memanggil worker Vercel secara nyata: tiga respons HTTP 200; ketiga job selesai pada percobaan pertama. Invoice/PO berstatus `needs_review`, BAST menggunakan pemeriksaan manual. Secret disimpan di Vault.
- RPC vendor/buyer/risk berhasil. Dua panggilan paralel dengan request key yang sama menghasilkan satu komitmen simulasi Rp1 juta. Invoice menjadi `partially_funded`; tidak ada transfer dana riil.
- Evaluasi Azure satu fixture lama: lima dari enam field cocok dengan label independen, nama vendor berbeda. Hasil diarahkan ke review; angka ini tidak mewakili akurasi dunia nyata.
- Advisor tidak lagi menandai fungsi trigger atau helper yang dapat dijalankan anonim. Enam warning definer terautentikasi tetap sesuai desain: lima helper RLS dan RPC komitmen yang memeriksa aktor. Leaked password protection Auth masih nonaktif dan perlu ditinjau sebelum pilot.

Smoke test cloud bersifat opt-in: `node --env-file=.env.local --env-file=.env.prototype.local node_modules/tsx/dist/cli.mjs scripts/smoke-prototype.ts --apply --invoice <id>`. Script hanya menerima draft `PROTO-2026-001` milik identitas sintetis khusus, dan mengubah status serta membuat komitmen simulasi. Jangan menjalankannya pada invoice yang sudah diputuskan. Fixture cloud yang diperiksa telah selesai; gunakan antarmuka untuk meninjaunya.

## Batas bukti

Satu invoice sintetis bukan pengukuran akurasi OCR, fraud atau risiko kredit. BAST tetap manual. Pengujian API lokal tidak mencakup seluruh perilaku browser dan seluruh variasi permission. Belum ada transfer dana, audit keamanan menyeluruh, load test, pemindaian malware atau model credit scoring terlatih. Lihat prioritas lanjutan di [panduan prototipe](PROTOTYPE.md).
