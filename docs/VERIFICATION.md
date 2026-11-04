# Bukti verifikasi prototipe

## Pengujian yang dijalankan

- Unit: normalisasi nominal/tanggal Indonesia, confidence per field, label evaluasi OCR, rules engine, Isolation Forest, callback redirect, unggahan, ringkasan dashboard dan navigasi.
- PostgreSQL PGlite: seluruh migrasi domain, RLS lintas organisasi, larangan self-enrollment, akses dokumen lender, antrean/lease/retry, keputusan atomik dan komitmen idempotent.
- Supabase lokal nyata: Auth, PostgREST dan Storage privat; akun sintetis lima peran, signed upload, canonical storage, proteksi endpoint worker, penilaian buyer, persetujuan risk dan komitmen paralel. Tes menolak URL non-loopback.
- Supabase lokal menjalankan migrasi pg_cron/pg_net/Vault; dispatcher tanpa konfigurasi tidak mengirim request. Managed extensions ini tidak dicakup PGlite.
- Live Azure memakai invoice sintetis: nomor invoice dan nominal Rp25.000.000 diekstrak; confidence nama vendor rendah diarahkan ke `needs_review`.
- Browser lokal: login vendor, simpan draft, signed upload invoice melalui form. Preview lima peran juga diperiksa sebelumnya pada desktop dan mobile.
- TypeScript, production build serta lint pada file yang diubah diperiksa sebelum commit.

Hasil deployment cloud dan scheduler dicatat setelah smoke test pada project InvoFin. Riwayat baseline cloud telah dibandingkan dengan lima migrasi lokal: perbedaannya komentar dan titik koma tambahan. Nama file lokal diselaraskan dengan versi remote; tabel dan data awal dipertahankan.

## Batas bukti

Satu invoice sintetis bukan pengukuran akurasi OCR, fraud atau risiko kredit. BAST tetap manual. Pengujian API lokal tidak mencakup seluruh perilaku browser dan seluruh variasi permission. Belum ada transfer dana, audit keamanan menyeluruh, load test, pemindaian malware atau model credit scoring terlatih. Lihat prioritas lanjutan di [panduan prototipe](PROTOTYPE.md).
