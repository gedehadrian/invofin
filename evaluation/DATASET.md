# Dataset augmentasi sintetis v1

Install Python dependencies dari `tools/requirements.txt` dan Poppler, lalu jalankan dari root repo:

```sh
python tools/generate_dataset.py
npm run eval:ocr -- --live --manifest evaluation/generated/documents-v1/manifest.json --split test --type invoice --limit 2
```

Jika Poppler belum ada di PATH, gunakan `--pdftoppm /path/to/pdftoppm`. Generator default menghasilkan 12 sumber invoice, masing-masing Invoice/PO/BAST, dengan versi PDF, scan PNG, rotasi, dan blur/contrast/noise: 144 kasus. Semua nama dan transaksi fiktif; folder hasil diabaikan Git dan deployment. Teman tim dapat mereproduksinya menggunakan seed 42 tanpa membagikan data nyata.

Manifest v2 menyimpan source ID, template family, split, parameter augmentasi, SHA-256 dan label sebelum augmentasi. Keluarga template dan seluruh turunan sumber berada pada satu split saja. Skenario meliputi konsisten, nominal PO berbeda dan referensi BAST berbeda. Label tersebut merupakan ekspektasi screening sintetis, bukan fraud terkonfirmasi atau label gagal bayar nyata.

Evaluator memvalidasi lineage, checksum dan real path, membatasi default enam panggilan Azure dan memerlukan `--live`. Pilih `--split`, `--type` dan `--limit` eksplisit. Laporan hanya agregat per field dan latency p50/p95; tidak mencetak teks invoice/credential. Latensi ini waktu panggilan OCR, bukan waktu antrean aplikasi.

Verifikasi putaran 2: 144 checksum cocok, regenerasi PDF pertama byte-identical, preview tiga variasi diperiksa. Benchmark terbatas dua invoice holdout: 0 gagal API, keduanya perlu review; nomor invoice cocok 1/2, nama vendor/buyer, nominal serta tanggal masing-masing 2/2. Waktu sekitar 3,54-4,06 detik. Sampel kecil ini belum membuktikan akurasi pada dokumen nyata atau pencapaian target proposal.
