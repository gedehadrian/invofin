# InvoFin

Prototipe invoice financing dengan lima peran: vendor, buyer, lender, Risk Officer dan admin. Next.js 16, TypeScript, Tailwind, komponen Radix/shadcn, ikon Lucide, Supabase Auth/Postgres/Storage, Azure Document Intelligence dan Vercel.

- `/` — halaman pengenalan, light dan biru minimalis.
- `/demo` — contoh lima peran tanpa login; perubahan hanya di memori.
- `/app` — autentikasi, data tersimpan, dokumen privat dan workflow organisasi.
- [Panduan prototipe online dan pekerjaan berikutnya](docs/PROTOTYPE.md)
- [Kesepakatan enam putaran, augmentasi dan retraining](docs/SIX_ROUNDS.md)
- [Mereproduksi dataset augmentasi berlabel](evaluation/DATASET.md)
- [Model eksperimen dan retraining](docs/MODELS.md) · [UAT lima peran](docs/UAT.md)
- [Operasional, backup dan promotion](docs/OPERATIONS.md) · [Daftar fitur dan batasnya](docs/FEATURE_MATRIX.md)
- [Arsitektur](docs/ARCHITECTURE.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Verifikasi](docs/VERIFICATION.md)

Arsitektur berupa modular monolith dengan antrean dokumen durable. Worker dapat dipisahkan saat beban membutuhkan layanan sendiri. Komitmen pendanaan adalah simulasi pencatatan; belum ada pencairan atau pembayaran nyata.

## Menjalankan lokal

Prasyarat: Node.js 22+, npm dan Docker Desktop aktif. Konfigurasi cloud di `.env.local` tetap terpisah dari pengujian lokal. Next.js dipakai pada versi 16.4.5; GitHub Actions menjalankan lint, tes, build dan audit dependency tanpa secret cloud.

```sh
npm ci
npx --yes supabase@3.0.0 start --exclude studio,imgproxy,logflare,vector,supavisor,edge-runtime,realtime
npm run setup:local
npm run dev:local
```

Pada terminal kedua: `npm run worker:local`. URL lokal `http://127.0.0.1:3100`. Setup membuat `.env.test.local` yang diabaikan Git dengan OCR manual. Jangan memakai `db reset --remote` pada project cloud.

```sh
npm test
npm run test:db
npm run test:local
npm run test:auth:local
npm run test:operations:local
npm run test:restore:local
npm run typecheck
npm run build
```

`test:db` menjalankan migrasi pada PostgreSQL PGlite. `test:local` membutuhkan layanan lokal dan dev server, membuat akun serta invoice sintetis, dan menolak URL non-loopback. Seed development lama juga dibatasi loopback.

## OCR dan risiko

Azure `prebuilt-invoice` mengekstrak invoice/PO; `prebuilt-layout` mengekstrak BAST. Normalisasi nominal/tanggal, pencocokan referensi/item dan confidence konservatif mengarahkan hasil kosong/tidak pasti ke pemeriksaan manusia. Unggahan tidak menunggu OCR: job memakai lease/retry dan dapat diperiksa operator di `/app/admin/jobs`.

Rules engine memeriksa konsistensi, hash file dan identitas bisnis invoice; Isolation Forest digunakan jika histori vendor cukup. Lab risiko non-production menampilkan baseline kredit sintetis berversi, terpisah dari keputusan pendanaan. Belum ada model fraud/kredit yang tervalidasi pada nasabah nyata. Lihat [evaluasi OCR](evaluation/README.md) dan [model](docs/MODELS.md). `npm run eval:ocr -- --live --manifest evaluation/ocr.synthetic.json` mengirim dokumen sintetis ke Azure dan dapat memakai kuota provider. Hugging Face belum dipasang; Azure tetap baseline OCR.

## Deployment yang sudah ada

Target Supabase InvoFin: `skwwgjjgeativyevkkpl`. Target Vercel: project `invofin`. Salin nama konfigurasi dari `.env.example`; jangan commit secret. Service-role dan Azure key hanya digunakan server. `CRON_SECRET` disimpan di Vercel serta Supabase Vault, lalu Supabase Cron memanggil worker setiap menit jika ada pekerjaan.

Setelah migrasi diterapkan, `node scripts/configure-cloud-worker.mjs --apply` mengonfigurasi environment Production dan Vault melalui stdin/API tanpa mencetak secret. Deploy ulang aplikasi setelah konfigurasi. `node scripts/seed-prototype.mjs --apply` membuat lima identitas sintetis khusus pada target InvoFin dan menyimpan kredensial di `.env.prototype.local`, tanpa menimpa organisasi atau invoice lain.

File migrasi awal memakai timestamp yang sama dengan riwayat cloud yang telah diperiksa. Jangan mengubah riwayat remote menjadi reverted atau menjalankan ulang baseline.

Operator yang memiliki `.env.local` dan kredensial sintetis `.env.prototype.local` dapat menjalankan `npm run verify:staging` untuk memeriksa lima peran/halaman online, isolasi dokumen lender dan proteksi worker. Script ini tidak mengubah invoice, mengirim email atau menggunakan kuota OCR. Jangan membagikan file kredensial ke GitHub. Repository privat dapat dibagikan melalui Settings → Collaborators; tiap anggota sebaiknya memakai aksesnya sendiri.
