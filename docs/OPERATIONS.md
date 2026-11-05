# Operasional dan perpindahan lingkungan

Target online sekarang adalah **staging prototipe dengan data sintetis**. Istilah Production pada Vercel adalah target hosting. Ia tidak berarti sudah ada layanan produksi untuk nasabah atau uang nyata.

## Antrean dan retensi

- Admin/Risk Officer membuka `/app/admin/jobs`: 100 job terbaru, jumlah gagal dan keterlambatan antrean di atas 5 menit. Kegagalan terminal memberi notifikasi dalam aplikasi ke staf platform aktif.
- Setelah penyebab diperbaiki, tombol Coba ulang menjadwalkan ulang job gagal. RPC memeriksa membership, mencatat audit, dan tidak mengulang job yang sedang berjalan/selesai. Worker tetap memakai lease, maksimal tiga percobaan per siklus dan endpoint bearer-only.
- Reservasi upload dibatasi 30/jam/aktor dengan advisory lock di PostgreSQL; permintaan paralel tidak melewati kuota. Maksimal 10 MB/berkas, tiga jenis dokumen dan path milik invoice yang dapat diedit. Ukuran/signature/hash tetap diperiksa saat finalisasi.
- `npm run storage:retention` adalah dry run. `npm run storage:retention -- --apply` menghapus maksimal 100 objek quarantine yang reservasinya kedaluwarsa lebih dari 24 jam, lalu menandai metadata agar batch berikutnya dapat maju. Jalankan dari mesin operator dengan kredensial server lingkungan yang benar. Tidak ada secret/path dokumen di output.
- Retensi ini tidak menghapus canonical document, invoice, audit atau metadata reservasi. Objek canonical yatim akibat finalisasi gagal perlu rekonsiliasi operator; belum ada penghapusan otomatis maupun legal retention untuk data nasabah. Tidak ada pemindaian malware atau pengukuran biaya Azure otomatis.
- Notifikasi masih dalam aplikasi, bukan paging/email eksternal. Operator perlu memeriksa antrean berkala; layanan alert eksternal dan SLA belum dikonfigurasi.

## Backup dan restore

`npm run test:restore:local` membuat logical dump Auth, schema aplikasi dan metadata Storage ke file sementara **di container lokal**, memulihkannya ke database baru, membandingkan jumlah baris/policy, lalu menghapus database/file sementara tersebut. Database sumber tidak di-reset. Jalankan saat pengujian lain tidak sedang menulis.

Latihan ini tidak memulihkan byte objek Storage, Vault, konfigurasi Auth/SMTP, role global, deployment maupun cloud. Backup database Supabase tidak mencakup isi objek Storage: sebelum pilot, pilih kebijakan backup/PITR sesuai paket, cadangkan objek privat melalui kanal terenkripsi, dan dokumentasikan RPO/RTO. Jangan mengasumsikan fitur berbayar sudah aktif. Rujukan resmi: [backup Supabase](https://supabase.com/docs/guides/platform/backups).

Latihan lokal juga melewati ownership/ACL/default grants Supabase yang dikelola platform. RLS policy ikut dipulihkan, tetapi privilege/role harus diverifikasi terpisah pada target Supabase penuh.

Untuk restore cloud, buat target terisolasi, hentikan dispatcher di target, pulihkan database serta objek dari cadangan yang sama, konfigurasi secret baru melalui secret manager, verifikasi Auth/RLS/signed URL/workflow dan jumlah/hash dokumen, lalu catat durasi serta hasilnya. Jangan mengarahkan trafik sebelum verifikasi. Restore cloud dan byte objek belum diuji pada pekerjaan ini.

## Promotion staging ke produksi

Kebijakan password staging tersimpan di `supabase/environments/staging/supabase/config.toml`. Untuk mereview, gunakan `npx --yes supabase@3.0.0 config diff --remote=skwwgjjgeativyevkkpl --workdir supabase/environments/staging`. CLI 3 hanya mendorong properti yang dideklarasikan; minimum 12 dan secure password change tidak mengganti SMTP, redirect atau konfigurasi lain. Periksa diff sebelum `config push`.

1. Sediakan project Supabase dan target hosting terpisah. Jangan menyalin fixture, akun sintetis, Vault atau kredensial staging. Provisioning yang menambah biaya perlu diputuskan pemilik project.
2. Atur URL/anon key publik dan service-role server dari target baru. Set `INVOFIN_DEPLOYMENT_ENV=production`, `NEXT_PUBLIC_APP_ENV=production`, `INVOFIN_PRODUCTION_PROJECT_REF=<ref baru>`, `INVOFIN_OCR_MODE=azure`, kredensial Azure per lingkungan dan `CRON_SECRET` acak minimal 32 karakter. `npm run check:deployment` memeriksa target dan menolak project prototipe untuk produksi. Server menjalankan kebijakan yang sama saat start. Lab sintetis disembunyikan; payment provider tetap menolak pencairan nyata.
3. Backup target, review `npx --yes supabase@3.0.0 db push --remote=<ref baru> --dry-run --yes`, lalu terapkan migrasi tanpa reset. File migrasi lama tidak diubah. Terapkan schema sebelum kode yang menggunakan RPC baru.
4. Konfigurasi Auth: domain/site URL, allowlist callback yang tepat, konfirmasi email, minimum password 12, secure password change, proteksi password bocor sesuai paket, dan **SMTP sendiri**. Uji signup/recovery di mailbox tim yang disetujui sampai login dengan password baru. Jangan memakai wildcard preview sebagai redirect produksi. [Panduan SMTP resmi](https://supabase.com/docs/guides/auth/auth-smtp).
5. Konfigurasi Vault/dispatcher dengan endpoint hosting baru dan secret yang sama dengan Vercel. Script `configure-cloud-worker.mjs` sengaja hanya menerima project prototipe; **jangan menjalankannya untuk produksi**. Gunakan RPC `configure_document_worker` melalui kanal server/secret manager tanpa menulis token ke Git atau command history.
6. Jalankan CI, preflight dan smoke sintetis pada staging. Untuk produksi baru, lakukan UAT terkontrol menggunakan identitas/data yang disetujui, uji lintas organisasi, pemeriksaan operator dan restore. Deployment tidak mengaktifkan uang nyata; ledger/payment/webhook/rekonsiliasi merupakan pekerjaan terpisah.

## Rollback

Migration operasional bersifat tambahan. Jika deployment bermasalah, rollback ke deployment Vercel Ready sebelumnya dan pertahankan schema tambahan. Jangan menghapus kolom/fungsi ketika masih digunakan instance lama. Hentikan dispatcher sementara bila worker berulang kali gagal, periksa kode error tanpa log secret, lalu pulihkan deployment dan lakukan retry dari halaman operator.

Jika ada kerusakan data, jangan sekadar mengembalikan kode: pulihkan backup ke target terisolasi dan rekonsiliasi perubahan setelah titik backup sebelum switching. Simpan versi model sebelumnya; artefak baru tidak otomatis dipromosikan.

## Hal yang memerlukan konfigurasi pemilik

Belum ada project produksi terpisah, SMTP/domain terverifikasi, pengujian deliverability cloud, restore cloud/objek, paging eksternal atau kebijakan retensi data nyata. Aplikasi staging tetap dapat dipakai tim dengan data fiktif. Hal-hal ini tidak boleh ditandai selesai hanya karena kode/runbook tersedia.
