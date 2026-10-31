# Design system InvoFin

## Arah visual

Light, minimalis, tenang, dan berorientasi informasi. Biru untuk aksi utama dan identitas, warna semantik hanya untuk status. Hindari warna status untuk dekorasi atau label risiko tanpa teks.

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| Primary | `#2563eb` | Tombol, link, pilihan aktif, data utama grafik |
| Background | `#f5f7fa` | Canvas aplikasi |
| Surface | `#ffffff` | Kartu, sidebar, dialog |
| Foreground | `#18263e` | Judul dan nilai utama |
| Muted text | `#64748b` | Label dan penjelasan |
| Border | `#e7ecf3` | Pembatas ringan |
| Active surface | `#edf3ff` | Navigasi dan konteks aksi |

Sumber kebenaran token ada di `app/globals.css`. Font Plus Jakarta Sans untuk teks, angka tabular untuk nominal. Judul halaman 25–28px, judul section 14–16px, body 13–15px, metadata 10–12px. Spasi memakai grid 4px. Radius komponen 8–12px, surface 16–20px. Shadow tipis, hindari kartu bertumpuk tanpa tujuan.

## Komponen dan ikon

- `Logo`, `AppShell`, `Dashboard`, `VolumeChart`, `StatusBadge`, `RiskBandBadge`, `KpiCard`, serta primitif `components/ui/*` digunakan ulang.
- Lucide adalah satu keluarga ikon. Ukuran navigasi 18px, aksi 16px, ilustrasi komponen 20px; stroke 1.6–2. Ikon tanpa label wajib mempunyai accessible name.
- Satu aksi utama per konteks. Tombol outline untuk ekspor dan aksi sekunder, ghost untuk aksi kecil.
- Status tampil sebagai teks dan warna, tidak hanya titik berwarna. Warna biru untuk proses, amber untuk tinjauan, hijau untuk selesai, merah untuk penolakan.
- Tabel memiliki header, caption untuk pembaca layar, pencarian berlabel, filter, empty state, pagination dan detail. Scroll horizontal di layar kecil.
- Dialog dan drawer memakai Radix untuk focus trapping dan Escape. Form memakai label yang terkait input; validasi browser dilengkapi validasi server pada transaksi asli.

## Responsif dan aksesibilitas

Sidebar desktop pada 1024px ke atas; drawer pada mobile/tablet. KPI 1/2/4 kolom sesuai ruang. Semua interaksi keyboard memiliki focus ring; tersedia skip link ke konten. Animasi menghormati reduced motion. Grafik mempunyai tabel angka alternatif. Hindari mengandalkan hover untuk informasi penting.

## Dependency

Memakai dependency yang sudah terpasang: React/Next.js, Tailwind, Radix/shadcn, Lucide, Zod, Supabase. Tidak menambahkan library baru. Grafik ringkasan menggunakan CSS karena hanya memerlukan dua seri sederhana; tidak memuat chart runtime tambahan untuk halaman ini.
