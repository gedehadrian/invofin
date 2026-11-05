# UAT prototipe lima peran

Putaran 4 menambahkan rincian advance/fee/advance bersih vendor, ketentuan imbal hasil lender per tenor, label komitmen simulasi, kontras teks risk dan preset pengajuan dengan tiga PNG contoh yang tersedia setelah clone. Biaya vendor memakai nominal invoice sebagai basis; angka bukan ledger atau transaksi uang nyata.

Pemeriksaan browser lokal yang dijalankan: login dan dashboard Vendor, Buyer, Lender, Risk Officer dan Admin; preset mengisi buyer, nomor SYN-2026-0001, tanggal 1 November–16 Desember 2026 serta nominal Rp625.000 sesuai fixture. Build produksi lulus. Perhitungan biaya memiliki regression test untuk basis fee, net advance, pembulatan sen dan input invalid.

Checklist sebelum demo tim:

| Peran | Langkah | Hasil yang diharapkan |
| --- | --- | --- |
| Vendor | Pilih contoh, simpan draft, download/upload Invoice/PO/BAST | Data sesuai gambar; upload privat; proses latar belakang; dokumen tidak pasti perlu review |
| Vendor | Ajukan nomor yang sama dengan file berbeda | Database menolak identitas invoice ganda dan mengarahkan ke pengajuan lama |
| Vendor | Periksa/koreksi hasil dan konfirmasi kesesuaian | Berpindah ke buyer hanya setelah ketiga dokumen selesai diperiksa |
| Buyer | Konfirmasi atau sengketakan | Hanya invoice organisasinya; nominal/tanggal dan alasan tersimpan |
| Risk | Baca bukti/reason, approve atau reject | Tidak mengabaikan data kurang pasti; keputusan serta peluang tersimpan atomik |
| Lender | Lihat ketentuan, catat komitmen dan retry request sama | Komitmen tercatat satu kali; tidak overfund; tidak ada transfer dana |
| Admin | Aktifkan/suspend organisasi dan baca audit | Status membatasi workspace dan mutasi; aksi dapat ditelusuri |

Workflow API nyata pada Supabase lokal mencakup upload, worker dan keputusan sampai komitmen paralel; checklist ini juga memandu UAT manusia. Pemeriksaan dashboard browser bukan bukti bahwa seluruh kombinasi keputusan telah diuji melalui UI. Gunakan identitas prototype, bukan akun/data nasabah.
