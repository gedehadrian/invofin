# Bukti verifikasi prototipe

## Tindak lanjut SMTP, 6 November 2026

Pemilik melaporkan setup App Password/SMTP. Satu permintaan recovery cloud ke inbox yang diizinkan telah dicoba; UI menampilkan respons generik, tetapi penerima belum mendapat email dan Auth belum mencatat `recovery_sent_at`/event recovery. SMTP belum ditandai berhasil. Rincian SMTP tidak tersedia dalam snapshot config CLI yang diperiksa; konektor log terpisah tidak memiliki izin project ini.

Ditemukan bug Server Action yang mengabaikan error pengiriman selain HTTP 429. Penanganannya diperbaiki: kegagalan provider ditampilkan sebagai layanan belum tersedia, unknown-user tetap mendapat respons generik yang sama, dan log server hanya memuat status/kode yang disaring. Tes regresi memeriksa ketiga kondisi tersebut. Kredensial serta alamat penerima/pengirim tidak ditambahkan ke repository. Panduan uji ada di `SMTP.md`.

Perbaikan tersebut lulus 31 tes unit, TypeScript, lint terarah dan production build. Perubahan dependency yang sudah ada di working tree pengguna dipertahankan di luar commit ini.

Implementasi `2734b93` sudah di-push; [CI 42137026827](https://github.com/gedehadrian/invofin/actions/runs/42137026827) lulus. Deployment `dpl_68Zx5xWrsjAhkSUzPcdPsWAghFxE` Ready, dibuat dari snapshot commit bersih. Setelah pemilik mengonfirmasi project, konfigurasi SMTP dan akun pembuat App Password cocok, satu retry cloud diterima tanpa error dan `recovery_sent_at` menjadi terisi. Ini membuktikan permintaan pengiriman diproses Auth; penerimaan inbox serta penyelesaian reset oleh pemilik belum dikonfirmasi. Tidak ada password akun nyata yang diubah oleh agent.

## Pengujian yang dijalankan

- Unit: normalisasi nominal/tanggal Indonesia, confidence per field, label evaluasi OCR, rules engine, Isolation Forest, callback redirect, unggahan, ringkasan dashboard dan navigasi.
- PostgreSQL PGlite: seluruh migrasi domain, RLS lintas organisasi, larangan self-enrollment, akses dokumen lender, antrean/lease/retry, keputusan atomik dan komitmen idempotent.
- Supabase lokal nyata: Auth, PostgREST dan Storage privat; akun sintetis lima peran, signed upload, canonical storage, proteksi endpoint worker, penilaian buyer, persetujuan risk dan komitmen paralel. Tes menolak URL non-loopback.
- Supabase lokal menjalankan migrasi pg_cron/pg_net/Vault; dispatcher tanpa konfigurasi tidak mengirim request. Managed extensions ini tidak dicakup PGlite.
- Live Azure memakai invoice sintetis: nomor invoice dan nominal Rp25.000.000 diekstrak; confidence nama vendor rendah diarahkan ke `needs_review`.
- Browser lokal: login vendor, simpan draft, signed upload invoice melalui form. Preview lima peran juga diperiksa sebelumnya pada desktop dan mobile.
- TypeScript, production build serta lint pada file yang diubah diperiksa sebelum commit.

Hasil akhir implementasi: 30 unit, 14 PostgreSQL, 7 workflow lokal, 6 Auth lokal dan 3 operasi lokal lulus (60 test Node termasuk container test), serta 2 test Python. Regression test memastikan invoice OCR berstatus `needs_review`, `failed` atau `pending` mendapat band `review`, walaupun field yang terbaca cocok.

## Putaran 1, 6 November 2026

- Implementasi `dcd55ce`: pendaftaran dua tahap, organisasi dibuat setelah identitas login tersedia, RPC service-only dengan advisory lock, enrollment replay-safe dan rollback saat membership gagal.
- Middleware mempertahankan cookie refresh saat redirect. Akun tanpa membership kembali ke onboarding; organisasi pending/suspended tidak masuk ke workspace.
- Pemulihan password mendukung PKCE dan SSR token-hash; redirect dibatasi workspace serta path akun yang diizinkan. Password baru minimal 12 karakter dengan batas 72 byte dan konfirmasi yang sama.
- Supabase lokal: signup tanpa enrollment prematur, dua request onboarding bersamaan membuat satu membership, pending/suspended/active sesuai halaman; password lama serta token recovery yang dipakai ulang ditolak.
- Email recovery benar-benar dikirim ke Mailpit lokal lalu diverifikasi melalui Auth dan callback PKCE Next.js. Tidak ada email nyata yang dikirim dalam smoke cloud.
- Browser lokal: login identitas sintetis tanpa organisasi, selesaikan form onboarding, lihat halaman pending, aktifkan fixture melalui operator lokal, klik periksa status dan masuk ke workspace.
- TypeScript, lint terarah dan production build lulus. Advisor lokal tidak mengembalikan warning.
- Cloud: migrasi onboarding diterapkan tanpa reset; grant RPC hanya service-role. Deployment `dpl_FsWGQT587BRrMUneNmtYcsyZ6SBL` Ready, route pemulihan tampil. Smoke dengan satu identitas sintetis baru membuktikan onboarding, idempotensi, halaman pending serta recovery SSR.
- Batas: belum menguji deliverability email cloud ke kotak masuk nyata. Konfigurasi SMTP per lingkungan, audit menyeluruh dan promotion staging/production masuk putaran 6. Runtime prototipe tetap memakai data sintetis dan payment stub.

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

Pengujian sintetis bukan pengukuran akurasi fraud/kredit pada nasabah. BAST kini memakai Azure Layout, dengan review konservatif. Pengujian API tidak mencakup seluruh perilaku browser/permission. Belum ada transfer dana, audit keamanan menyeluruh, load test, malware scan atau model kredit nasabah tervalidasi. Lihat [runbook](OPERATIONS.md).

## Putaran 2-6, 6 November 2026

- Dataset 144 kasus: 12 sumber × invoice/PO/BAST × 4 varian; lineage, split dan checksum diuji. Dua panggilan Azure invoice heldout memberi nomor benar 1/2 dan lima field lain 2/2, keduanya review (3,54-4,06 detik). Satu BAST heldout memberi enam field benar, review item (4,70 detik). Sampel ini tidak membuktikan target proposal.
- Matching referensi/item/kuantitas dan identitas bisnis mencegah nominal berubah melewati screening. Confidence item non-finite juga diarahkan ke review.
- Browser lokal: login/dashboard lima peran dan preset invoice/PO/BAST diperiksa. Checklist UAT membedakan bukti browser dari API.
- Baseline 600 baris sintetis, pemisahan grup/waktu, lineage dan reproduksibilitas; holdout AUC sekitar 0,635, Brier 0,222. Kontribusi linear tepat terhadap log-odds, bukan SHAP. Oracle screening 12 kelompok (8 review, 4 konsisten) menguji aturan dengan field label, bukan akurasi OCR/fraud nyata.
- Next.js/eslint-config-next diperbarui ke 16.4.5; CLI shadcn dan form library yang tidak dipakai dihapus. State CSS yang dipakai disimpan sebagai subset MIT. Minimatch dev di-override ke versi yang diperbaiki. Audit npm lengkap/runtime: 0 temuan pada pemeriksaan ini; lint seluruh repo, TypeScript dan build lulus.
- Operasi lokal nyata: 35 reservasi paralel menghasilkan tepat 30 diterima dan 5 rate-limit. Dry run retensi mempertahankan byte; apply menghapus quarantine satu kali serta menjaga canonical dan metadata audit.
- PostgreSQL memverifikasi retry staff-only/idempotent/audited serta satu notifikasi per transisi kegagalan. Seluruh fungsi baru service-only. Lint PostgreSQL lokal dan cloud tidak menemukan kesalahan schema; semua tabel public cloud memiliki RLS aktif.
- Restore logical lokal ke database sementara lulus: Auth/public/metadata Storage dan 30 RLS policy dibandingkan. ACL/ownership, Vault, byte objek dan cloud tidak dicakup; sumber tidak di-reset.
- Cloud: migration `20261105200150_document_operations.sql` diterapkan aditif; Auth minimum password 12 dan secure password change diaktifkan tanpa mengganti properti lain; Vercel diberi `INVOFIN_DEPLOYMENT_ENV=staging`.
- GitHub Actions ditambahkan dengan read-only permissions dan action resmi dikunci SHA. Run [42103102837](https://github.com/gedehadrian/invofin/actions/runs/42103102837) untuk `a3dadc4` lulus. Tes Docker lokal terpisah dari CI.
- Deployment `dpl_AiGQNbTbEydUKZsh2p53BYshsU5z` Ready. `verify:staging` mengautentikasi lima peran, memeriksa 12 halaman, akses staff/lender dan worker 401. Tidak mengubah invoice, mengirim email atau memanggil Azure. Grant RPC cloud: anon/authenticated upload=false, service=true, authenticated retry=false.
- Browser cloud: vendor dashboard/form/preset sesuai dataset; desktop serta mobile 390 px diperiksa tanpa overflow horizontal. Browser lokal operator: satu fixture gagal di-retry lewat tombol dan berubah menjadi queued. Screenshot staging disimpan sebagai bukti lokal.
