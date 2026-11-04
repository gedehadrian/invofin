# Evaluasi OCR dan risiko

`ocr.synthetic.json` adalah contoh kontrak label. Hasil pada satu dokumen sintetis tidak mengukur akurasi produk, deteksi fraud atau risiko kredit.

Jalankan `npm run eval:ocr -- --manifest evaluation/ocr.synthetic.json --live` untuk mengirim contoh ini ke resource Azure yang dikonfigurasi. Perintah memerlukan kredensial server di `.env.local` dan memakai kuota API. Laporan hanya berisi agregat per field, jumlah field hilang, kegagalan dan kasus yang perlu tinjauan. Confidence model tidak dihitung sebagai akurasi.

Untuk evaluasi pilot, kumpulkan dahulu dokumen yang boleh diproses tim, dengan label manusia untuk nomor, nominal, tanggal, buyer dan vendor. Mulai dengan variasi PDF digital, hasil scan, foto ponsel, format rupiah dan kualitas gambar. Simpan dataset privat di `evaluation/private/` yang diabaikan Git. Ganti `datasetKind` menjadi `representative` hanya bila sumbernya benar-benar representatif. Pisahkan vendor/template/periode antara pengembangan dan pengujian untuk mengurangi kebocoran data.

Bandingkan Azure dengan kandidat lain pada input dan label yang sama. Ukur akurasi tiap field, persentase koreksi manusia, latensi, kegagalan, dan biaya per dokumen. Jangan menentukan pemenang dari satu contoh atau angka leaderboard.

Dataset fraud harus membedakan indikasi, sengketa, dan fraud yang sudah dikonfirmasi. Catat bukti keputusan manusia serta versi aturan/model. Ukur precision, recall dan false positive pada kasus normal dan bermasalah, termasuk invoice ulang yang difoto/diekspor kembali. Rules dan SHA-256 saat ini tidak membuktikan kemampuan mendeteksi pemalsuan gambar atau pembiayaan lintas platform.

Credit scoring belum dilatih. Ia memerlukan histori serta hasil pembayaran, definisi target, pemisahan data berdasarkan waktu, pemeriksaan kalibrasi dan evaluasi sebelum dipakai untuk keputusan nyata. Jangan menyebut skor aturan sebagai probabilitas gagal bayar atau melaporkan evaluasi sintetis sebagai validasi kredit.
