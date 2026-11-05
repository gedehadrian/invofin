# Inventaris fitur dan kecocokan proposal

Ditinjau 6 November 2026, diperbarui setelah putaran 1 pada commit implementasi `dcd55ce`. Acuan: proposal InvoFin AI for Good bagian 3-7 dan Value Proposition Canvas. Verifikasi akun terbaru tercatat 6 November 2026 di `VERIFICATION.md`; ini belum audit keamanan menyeluruh.

Status **Ada** berarti tersedia dalam prototipe. **Parsial** berarti hanya sebagian alur/kebutuhan terpenuhi. **Belum** berarti belum ada implementasi operasional. Seluruh pendanaan masih simulasi.

## Fitur pengguna

| Area | Fitur tersedia | Batas yang perlu diketahui |
| --- | --- | --- |
| Publik | Landing page, tentang produk, panduan alur, demo lima peran tanpa login | Demo menggunakan state di memori, terpisah dari data aplikasi |
| Autentikasi | Daftar, login, logout, callback email/PKCE/token hash, reset password sampai penyimpanan password baru, profil dan membership | Pengiriman email sandbox diuji; SMTP/deliverability cloud per lingkungan belum diuji ke kotak masuk nyata |
| Onboarding | Akun diverifikasi lalu organisasi pending dibuat lewat RPC atomik/idempotent; pendaftaran terputus dapat dilanjutkan; halaman pending/suspended dan aktivasi admin | Belum e-KYC, assisted onboarding atau invitation tim |
| Lima peran | Vendor, anchor buyer, lender, Risk Officer, admin; menu dan halaman sesuai peran | Daftar pengguna admin masih baca saja; belum editor membership/undangan tim |
| Dashboard | KPI, grafik bulanan, filter tahun, daftar invoice, pencarian, filter status, pagination tampilan, ekspor CSV | Ringkasan dibatasi subset data, bukan agregasi keuangan/ledger menyeluruh |
| Vendor | Simpan draft, pilih buyer, isi nomor/tanggal/nominal/advance/deskripsi; upload invoice/PO/BAST; ajukan; tinjau/koreksi hasil ekstraksi; lihat detail dan timeline | Ketiga dokumen wajib; status tidak bisa dilompati melalui update client |
| Buyer | Antrean invoice terkait organisasinya, dokumen, konfirmasi nominal/jatuh tempo atau sengketa dengan alasan | Satu keputusan buyer; belum approval bertingkat di dalam tim buyer |
| Risk Officer | Antrean, bukti dokumen, reason codes, anomaly flags, keputusan approve/reject dan catatan | Keputusan manusia; skor saat ini dari aturan, belum probabilitas gagal bayar |
| Lender | Marketplace, detail invoice terverifikasi, reason codes, target/progres pendanaan, komitmen fraksional, portofolio komitmen | Tidak ada pencairan, pembayaran kembali atau imbal hasil nyata |
| Admin | Daftar organisasi dan pengguna, aktivasi/penangguhan organisasi, ringkasan platform, halaman audit | Belum case management fraud atau konfigurasi lengkap dari UI |
| Notifikasi | Notifikasi dalam aplikasi dari perubahan workflow dan tandai dibaca | Belum email/WhatsApp transaksional, reminder jatuh tempo, atau SLA delivery |
| Design system | Light blue, token warna/spacing, komponen Radix/shadcn, ikon Lucide, navigasi responsif, empty/loading/error state | Beberapa halaman operasional lama masih memerlukan perapian bahasa, kontras dan detail UX |

## Dokumen, AI dan infrastruktur

| Fitur | Status | Implementasi sekarang |
| --- | --- | --- |
| OCR invoice dan PO | Ada | Azure Document Intelligence `prebuilt-invoice`; normalisasi Rupiah/tanggal dan confidence per field |
| OCR BAST otomatis | Belum | BAST disimpan privat dan diarahkan ke pemeriksaan manual |
| Konfirmasi manusia | Ada | Vendor mengoreksi dan menyatakan kesesuaian; buyer/risk memberi keputusan eksplisit |
| Antrean OCR | Ada | Job durable, lease, retry terbatas; Supabase Cron + Vault memanggil worker Vercel |
| Upload privat | Ada | Signed upload ke quarantine; validasi server, ukuran/signature/hash, salin ke canonical privat, signed URL untuk membaca |
| Duplikasi file | Ada | SHA-256 byte file; invoice identik ditolak, pengulangan supporting document ditandai |
| Duplikasi berdasarkan isi | Belum | Belum business fingerprint atau pencarian semantik untuk hasil foto/ekspor ulang |
| Konsistensi dokumen | Parsial | Rules nomor, nominal, tanggal, buyer/vendor, PO/BAST jika field tersedia; BAST belum diekstrak otomatis |
| Penilaian awal dan alasan | Ada | Rules engine, skor/band dan reason codes; invoice OCR tidak pasti memaksa band review |
| Deteksi anomali ML | Parsial | Isolation Forest tersedia dan baru berjalan dengan minimal 20 invoice histori vendor; belum tervalidasi pada data representatif |
| Model kredit terlatih | Belum | Belum XGBoost/LightGBM, label gagal bayar, kalibrasi, validasi waktu atau SHAP |
| Model Hugging Face | Belum | Tidak ada integrasi/inference model Hugging Face dalam aplikasi |
| Transaksi workflow | Ada | RPC dengan row lock, pemeriksaan aktor/membership aktif, maker-checker dan audit |
| Komitmen aman terhadap retry | Ada | Idempotency key, locking, pembatasan overfunding; bukan eksekusi transfer dana |
| Isolasi organisasi | Ada | RLS, pembatasan dokumen lender, fungsi internal dibatasi; belum audit akses menyeluruh |
| Deployment | Ada | Vercel + Supabase cloud; VPS tidak diperlukan oleh runtime prototipe yang sekarang |
| Evaluasi teknis | Ada | 23 unit, 12 PostgreSQL, 7 workflow lokal, 6 Auth lokal tercatat lulus; smoke cloud sintetis dan evaluator OCR berlabel |
| Arsitektur | Parsial terhadap istilah proposal | Modular monolith dengan batas modul dan worker; belum microservices yang dideploy independen |

## Kecocokan dengan proposal dan canvas

| Kebutuhan proposal | Status | Kekurangan yang harus ditutup |
| --- | --- | --- |
| Portal tiga pihak dan dashboard/notifikasi | Ada sebagai prototipe | Lima peran termasuk dua peran operasional sudah tersedia; monitoring finansial belum lengkap |
| Upload dan OCR invoice/BAST | Parsial | Invoice/PO memakai Azure; BAST otomatis dan preprocessing deskew/denoise/contrast belum dibuat sendiri |
| Target OCR MVP >=85%, <10 detik/dokumen | Belum dibuktikan | Satu fixture tidak mewakili akurasi; ukur waktu antrean terpisah dari waktu OCR, p50/p95 dan koreksi per field |
| Three-way matching invoice/PO/BAST | Parsial | Ekstraksi BAST, pencocokan referensi PO/BAST dan item/kuantitas perlu dilengkapi |
| Fingerprint berdasarkan identitas/isi invoice | Parsial | Hash byte file sudah ada, fingerprint bisnis sesuai proposal belum ada |
| Isolation Forest atau Autoencoder | Parsial | Isolation Forest diimplementasikan; dataset, threshold dan precision/recall belum divalidasi |
| AI credit scoring data alternatif + SHAP | Belum | Dataset berizin, sumber data, model tabular, explainability dan governance belum tersedia |
| Maker-checker dan audit | Parsial | Pemisahan aktor vendor/buyer/risk ada; approval bertingkat internal buyer dan pengelolaan kasus belum ada |
| Anti-kolusi vendor/buyer | Parsial | Konfirmasi dan rules membantu; belum graph/concentration features dan bukti ERP independen |
| Rekening terverifikasi dan cooling-off 48 jam | Belum | Belum modul rekening pencairan, name matching, biometrik atau kontrol pergantian rekening |
| Double financing lintas platform | Belum | Hash hanya mencakup database sendiri; perlu jalur verifikasi eksternal yang sah dan tersedia |
| Forensik pemalsuan dokumen | Belum | Belum analisis pixel/metadata yang tervalidasi; confidence OCR tidak mengukur keaslian |
| Integrasi e-Faktur, ERP, bank, biro kredit, QRIS/logistik | Belum | Memerlukan integrasi, izin dan mitra; model OCR saja tidak menyediakan koneksi tersebut |
| Fractional funding | Ada sebagai simulasi | Pencatatan komitmen tersedia; pergerakan uang belum diintegrasikan |
| Biaya transparan dan pendapatan platform | Parsial | Pricing vendor/lender ada; rincian bersih di semua layar, platform fee 0,2%, billing dan rekonsiliasi belum lengkap |
| Pencairan <24-48 jam dan collection | Belum | Belum payment provider, ledger, disbursement, repayment, reminder dan penanganan keterlambatan |
| Assisted onboarding dan limit bertahap vendor | Belum | Belum portal agen, proses verifikasi dokumen usaha atau kebijakan limit dari histori |
| KPI dampak AI for Good | Belum | Belum pengukuran waktu pencairan nyata, pertumbuhan vendor, fairness/bias atau survei dampak |

Target akurasi, fraud mendekati nol, straight-through processing 80% dan pencairan cepat di proposal merupakan sasaran. Pengujian sintetis yang telah dilakukan belum membuktikan pencapaiannya.

## Urutan to-do

| Tahap | Pekerjaan | Hasil yang dapat diperiksa |
| --- | --- | --- |
| Selesai putaran 1 | Onboarding pending/aktif/suspended, pendaftaran yang dapat dilanjutkan, reset password lengkap | UI lokal dan smoke cloud lulus; deliverability email cloud ditangani pada putaran 6 |
| P0 - kualitas dokumen | Tambah variasi fixture sintetis normal/duplikat/nominal berubah/scan buram; label independen dan laporan evaluator | Demo bukan hanya satu invoice; field accuracy, correction rate, latensi dan false positive tercatat |
| P0 - cakupan proposal | OCR BAST, cross-reference PO/BAST, matching item/kuantitas, fingerprint bisnis | Kasus invoice diekspor ulang atau nominal diubah tetap ditandai untuk pemeriksaan |
| P0 - UX bisnis | Tampilkan rincian biaya/advance bersih, alasan yang mudah dipahami, rapikan halaman operasional dan checklist UAT lima peran | Semua langkah dapat dicoba tim tanpa script/penjelasan developer |
| P1 - AI | Pisahkan baseline aturan dari model kredit; susun schema label pembayaran dan model tabular eksperimen dengan versi model | Evaluasi terpisah, SHAP/reason codes yang benar, dokumentasi data; data sintetis hanya untuk demonstrasi |
| P1 - operasi | Monitoring job gagal/menumpuk, kuota OCR, retry operator, cleanup object yatim, retensi dan restore backup | Gangguan diketahui dan bisa dipulihkan tanpa mengedit database manual |
| P1 - keamanan | Audit akses, dependency remediation, rate limit atomik, pengujian abuse, malware scan, review keamanan akun | Temuan diuji dan ditutup; hak akses nyata sesuai kebutuhan setiap peran |
| P2 - pilot | Histori pembayaran representatif berizin, validasi model terhadap waktu, kalibrasi, bias/drift dan pilot buyer | Bukti model pada data di luar pelatihan; persetujuan manusia tetap eksplisit |
| P2 - transaksi nyata | Provider pembayaran sandbox lalu alur ledger, webhook, pencairan, repayment, collection dan rekonsiliasi | Saldo dan transaksi dapat direkonsiliasi; kesiapan legal/operasi ditangani sebelum go-live uang nyata |
| P3 - ekosistem | ERP/e-Faktur/bank/biro kredit, kontrol rekening, approval buyer bertingkat, case management, assisted onboarding dan KPI dampak | Integrasi dan kontrol dapat diverifikasi pada mitra nyata sesuai izin/akses yang tersedia |

## Keputusan Azure dan Hugging Face

Tetap gunakan Azure untuk OCR baseline prototipe: integrasinya sudah berjalan dan ada bukti end-to-end. Invoice/PO memakai `prebuilt-invoice`; BAST saat ini manual. Dokumentasi Azure menjelaskan model ini mengekstrak field/line item dari invoice dan PO: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/invoice?view=doc-intel-4.0.0.

Hugging Face adalah sumber model dan tooling, bukan satu model fraud siap dipasang. Model document understanding dapat menjadi pembanding; contoh panduan resmi memakai LayoutLMv2 dengan OCR Tesseract dan fine-tuning DocVQA: https://huggingface.co/docs/transformers/tasks/document_question_answering. Pilih satu kandidat setelah dataset evaluasi siap; bandingkan ketepatan field, false positive, latensi, biaya inference, lisensi dan kebutuhan operasi sebelum mengganti provider.

Fraud screening tetap gabungan fingerprint, matching, anomaly detection dan bukti manusia. Credit scoring sesuai proposal memerlukan model tabular dan histori hasil pembayaran; mengganti OCR dengan model dari Hugging Face tidak menyelesaikan kebutuhan tersebut. Kode sudah mempunyai interface provider sehingga eksperimen OCR dapat ditambahkan tanpa mengganti alur invoice.
