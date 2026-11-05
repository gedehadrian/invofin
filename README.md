# InvoFin

Prototipe invoice financing dengan lima peran: vendor, buyer, lender, Risk Officer dan admin. Next.js 16, TypeScript, Tailwind, komponen Radix/shadcn, ikon Lucide, Supabase Auth/Postgres/Storage, Azure Document Intelligence dan Vercel.

- `/` — halaman pengenalan, light dan biru minimalis.
- `/demo` — contoh lima peran tanpa login; perubahan hanya di memori.
- `/app` — autentikasi, data tersimpan, dokumen privat dan workflow organisasi.
- [Panduan prototipe online dan pekerjaan berikutnya](docs/PROTOTYPE.md)
- [Kesepakatan enam putaran, augmentasi dan retraining](docs/SIX_ROUNDS.md)
- [Arsitektur](docs/ARCHITECTURE.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Verifikasi](docs/VERIFICATION.md)

Arsitektur berupa modular monolith dengan antrean dokumen durable. Worker dapat dipisahkan saat beban membutuhkan layanan sendiri. Komitmen pendanaan adalah simulasi pencatatan; belum ada pencairan atau pembayaran nyata.

## Menjalankan lokal

Prasyarat: Node.js, npm dan Docker Desktop aktif. Konfigurasi cloud di `.env.local` tetap terpisah dari pengujian lokal.

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
npm run typecheck
npm run build
```

`test:db` menjalankan migrasi pada PostgreSQL PGlite. `test:local` membutuhkan layanan lokal dan dev server, membuat akun serta invoice sintetis, dan menolak URL non-loopback. Seed development lama juga dibatasi loopback.

## OCR dan risiko

Azure `prebuilt-invoice` mengekstrak invoice/PO dengan normalisasi nominal, tanggal dan confidence per field. BAST masuk pemeriksaan manual. Hasil yang kosong atau tidak pasti wajib ditinjau manusia. Unggahan tidak menunggu OCR: pekerjaan disimpan di database dengan lease dan retry terbatas.

Rules engine memeriksa konsistensi dokumen dan duplikasi; Isolation Forest baru digunakan jika histori vendor cukup. Keduanya memberi sinyal pemeriksaan, belum merupakan model fraud atau credit scoring yang tervalidasi. Lihat [evaluasi OCR](evaluation/README.md). `npm run eval:ocr -- --live --manifest evaluation/ocr.synthetic.json` mengirim satu dokumen sintetis ke Azure dan dapat memakai kuota provider.

## Deployment yang sudah ada

Target Supabase InvoFin: `skwwgjjgeativyevkkpl`. Target Vercel: project `invofin`. Salin nama konfigurasi dari `.env.example`; jangan commit secret. Service-role dan Azure key hanya digunakan server. `CRON_SECRET` disimpan di Vercel serta Supabase Vault, lalu Supabase Cron memanggil worker setiap menit jika ada pekerjaan.

Setelah migrasi diterapkan, `node scripts/configure-cloud-worker.mjs --apply` mengonfigurasi environment Production dan Vault melalui stdin/API tanpa mencetak secret. Deploy ulang aplikasi setelah konfigurasi. `node scripts/seed-prototype.mjs --apply` membuat lima identitas sintetis khusus pada target InvoFin dan menyimpan kredensial di `.env.prototype.local`, tanpa menimpa organisasi atau invoice lain.

File migrasi awal memakai timestamp yang sama dengan riwayat cloud yang telah diperiksa. Jangan mengubah riwayat remote menjadi reverted atau menjalankan ulang baseline.
