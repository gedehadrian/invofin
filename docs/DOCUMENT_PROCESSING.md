# Pemrosesan dokumen putaran 3

Invoice dan PO memakai Azure `prebuilt-invoice`; BAST kini memakai `prebuilt-layout` dengan `features=keyValuePairs`. Layout memetakan label Indonesia/Inggris dan tabel description/quantity/unit price/amount. Field dan confidence yang tidak tersedia tidak dianggap benar: dokumen tetap masuk review. Payload provider mentah tidak disimpan oleh worker.

Rules membandingkan PO reference pada tiga dokumen, invoice reference BAST jika tersedia, agregat item/kuantitas/harga, nominal dan nama pihak. Perbedaan nominal di atas satu sen tidak lagi tersembunyi dalam toleransi persentase. Item atau referensi tidak lengkap memaksa tinjauan manusia. Selisih diskon/pajak atau deskripsi berbeda bisa memerlukan koreksi manusia; ini indikator konsistensi, bukan bukti fraud.

Unique index `(vendor, buyer, normalized invoice number)` mencegah invoice yang sama diajukan ulang dengan file lain atau nominal berbeda. Normalisasi hanya case/whitespace, bukan penghapusan tanda baca. Ini tidak mendeteksi double financing pada platform lain atau invoice yang sengaja memakai nomor baru; OCR, matching dan konfirmasi manusia tetap diperlukan.

Tes unit mencakup BAST layout/confidence kosong, referensi, kuantitas/harga, dan kenaikan nominal kecil. Tes PostgreSQL memastikan perubahan case/whitespace/nominal tidak melewati unique index. Cloud sebelum migrasi tidak memiliki grup identitas ganda. Satu BAST holdout sintetis dibaca melalui API layout dalam sekitar 4,70 detik: enam field kunci cocok, tetapi tetap needs_review karena item belum cukup pasti. Belum merupakan evaluasi BAST representatif.

Rujukan API: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/general-document?view=doc-intel-4.0.0.
