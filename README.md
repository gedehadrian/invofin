# InvoFin

Platform perantara invoice financing untuk vendor UMKM, anchor buyer, dan lender. Bukan pemberi pinjaman dari neraca sendiri, tidak menjamin imbal hasil, dan tidak mengklaim lisensi operasional.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Auth, Postgres, Storage, RLS) · Vercel

## Mesin kepercayaan (prototipe)

| Fungsi | Implementasi |
| --- | --- |
| OCR | Azure Document Intelligence `prebuilt-invoice` |
| Duplikasi | SHA-256 + unique index pada file invoice |
| Konsistensi dokumen | Rules engine di Next.js (bandingkan formulir, OCR, PO, BAST) |
| Anomali transaksi | Isolation Forest setelah ≥ 20 invoice histori vendor |
| Keputusan akhir | Risk Officer (maker-checker) |

Jika kredensial Azure kosong, unggahan tetap diterima dan masuk `extraction_review`.

## Setup lokal

1. Buat project Supabase baru (jangan memakai database GiziLacak).
2. Jalankan migrasi berurutan dari `supabase/migrations/`.
3. Salin `.env.example` ke `.env.local` dan isi URL, anon key, service role.
4. `npm install`
5. `npm run dev`
6. Seed development: `npm run seed` (jangan di production)

### Akun demo setelah seed

Kata sandi semua akun: `InvofinDemo!2026`

- `vendor.a@invofin.demo` / `vendor.b@invofin.demo`
- `buyer.a@invofin.demo` / `buyer.b@invofin.demo`
- `lender.a@invofin.demo` / `lender.b@invofin.demo`
- `admin@invofin.demo`
- `risk@invofin.demo`

## Environment

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
AZURE_DOCUMENT_INTELLIGENCE_KEY
```

## Vercel

1. Hubungkan repo, framework Next.js.
2. Isi environment variables di atas (service role hanya server).
3. Deploy. Auth callback: `https://<domain>/auth/callback`.

## Skrip

- `npm run dev` — development
- `npm run lint`
- `npm run typecheck`
- `npm test` — Isolation Forest + rules engine
- `npm run build`
- `npm run seed`

## Catatan Supabase free plan

Akun ini sudah mencapai batas 2 project gratis. Pause atau upgrade project lain sebelum membuat project `invofin` baru. Jangan menerapkan migrasi ini ke database GiziLacak.
