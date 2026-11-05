# Inventaris fitur dan kecocokan proposal

Ditinjau 6 November 2026 setelah implementasi enam putaran prototipe. Acuan: proposal InvoFin AI for Good bagian 3-7 dan Value Proposition Canvas. Bukti serta batas pengujian ada di `VERIFICATION.md`; ini belum audit keamanan menyeluruh. Konfigurasi layanan produksi/SMTP masih menunggu pemilik.

Status **Ada** berarti tersedia dalam prototipe. **Parsial** berarti hanya sebagian alur/kebutuhan terpenuhi. **Belum** berarti belum ada implementasi operasional. Seluruh pendanaan masih simulasi.

## Fitur pengguna

| Area | Fitur tersedia | Batas yang perlu diketahui |
| --- | --- | --- |
| Publik | Landing page, tentang produk, panduan alur, demo lima peran tanpa login | Demo menggunakan state di memori, terpisah dari data aplikasi |
| Autentikasi | Daftar, login, logout, callback email/PKCE/token hash, reset password sampai penyimpanan password baru, profil dan membership | Pengiriman email sandbox diuji; SMTP/deliverability cloud per lingkungan belum diuji ke kotak masuk nyata |
| Onboarding | Akun diverifikasi lalu organisasi pending dibuat lewat RPC atomik/idempotent; pendaftaran terputus dapat dilanjutkan; halaman pending/suspended dan aktivasi admin | Belum e-KYC, assisted onboarding atau invitation tim |
| Lima peran | Vendor, anchor buyer, lender, Risk Officer, admin; menu dan halaman sesuai peran | Daftar pengguna admin masih baca saja; belum editor membership/undangan tim |
| Dashboard | KPI, grafik bulanan, filter tahun, daftar invoice, pencarian, filter status, pagination tampilan, ekspor CSV | Ringkasan dibatasi subset data, bukan agregasi keuangan/ledger menyeluruh |
| Vendor | Draft, buyer, nomor/tanggal/nominal/advance; preset tiga dokumen sintetis, upload, ajukan, koreksi ekstraksi, rincian biaya/advance bersih dan timeline | Ketiga dokumen wajib; status tidak bisa dilompati melalui update client; preset tidak memberi label bukti asli |
| Buyer | Antrean invoice terkait organisasinya, dokumen, konfirmasi nominal/jatuh tempo atau sengketa dengan alasan | Satu keputusan buyer; belum approval bertingkat di dalam tim buyer |
| Risk Officer | Antrean, bukti dokumen, alasan risiko, approve/reject, catatan, lab sintetis dan operasional dokumen | Lab terpisah dari keputusan, hanya non-production; skor keputusan masih dari aturan |
| Lender | Marketplace, detail invoice terverifikasi, reason codes, target/progres pendanaan, komitmen fraksional, portofolio komitmen | Tidak ada pencairan, pembayaran kembali atau imbal hasil nyata |
| Admin | Daftar organisasi/pengguna, aktivasi/penangguhan, ringkasan, audit dan monitoring/retry job gagal | Belum case management fraud, paging eksternal atau konfigurasi lengkap dari UI |
| Notifikasi | Notifikasi dalam aplikasi dari perubahan workflow dan tandai dibaca | Belum email/WhatsApp transaksional, reminder jatuh tempo, atau SLA delivery |
| Design system | Light blue, token warna/spacing, komponen Radix/shadcn, ikon Lucide, navigasi responsif, empty/loading/error state | Beberapa halaman operasional lama masih memerlukan perapian bahasa, kontras dan detail UX |

## Dokumen, AI dan infrastruktur

| Fitur | Status | Implementasi sekarang |
| --- | --- | --- |
| OCR invoice dan PO | Ada | Azure Document Intelligence `prebuilt-invoice`; normalisasi Rupiah/tanggal dan confidence per field |
| OCR BAST otomatis | Ada | Azure `prebuilt-layout` + key/value dan tabel; missing field atau confidence rendah tetap review |
| Konfirmasi manusia | Ada | Vendor mengoreksi dan menyatakan kesesuaian; buyer/risk memberi keputusan eksplisit |
| Antrean OCR | Ada | Job durable, lease, retry terbatas; Supabase Cron + Vault memanggil worker Vercel |
| Upload privat | Ada | Signed upload ke quarantine; validasi server, ukuran/signature/hash, salin ke canonical privat, signed URL untuk membaca |
| Duplikasi file | Ada | SHA-256 byte file; invoice identik ditolak, pengulangan supporting document ditandai |
| Duplikasi berdasarkan identitas | Ada | Unique vendor+buyer+nomor ternormalisasi menolak pengajuan ulang walau nominal berubah; belum similarity gambar/semantik |
| Konsistensi dokumen | Ada sebagai screening | Referensi PO/BAST, invoice reference, item, kuantitas dan nilai; data tidak lengkap diarahkan ke review |
| Penilaian awal dan alasan | Ada | Rules engine, skor/band dan reason codes; invoice OCR tidak pasti memaksa band review |
| Deteksi anomali ML | Parsial | Isolation Forest tersedia dan baru berjalan dengan minimal 20 invoice histori vendor; belum tervalidasi pada data representatif |
| Model kredit terlatih | Eksperimen sintetis | Logistic baseline 600 baris, split waktu/grup, lineage, metrik holdout dan kontribusi log-odds; bukan SHAP atau model nasabah tervalidasi |
| Model Hugging Face | Belum | Tidak ada integrasi/inference model Hugging Face dalam aplikasi |
| Transaksi workflow | Ada | RPC dengan row lock, pemeriksaan aktor/membership aktif, maker-checker dan audit |
| Komitmen aman terhadap retry | Ada | Idempotency key, locking, pembatasan overfunding; bukan eksekusi transfer dana |
| Isolasi organisasi | Ada | RLS, pembatasan dokumen lender, fungsi internal dibatasi; belum audit akses menyeluruh |
| Deployment | Ada | Vercel + Supabase cloud; VPS tidak diperlukan oleh runtime prototipe yang sekarang |
| Evaluasi teknis | Ada | 30 unit, 14 PostgreSQL, 7 workflow, 6 Auth, 3 operasi lokal dan 2 Python; build/lint/audit; lihat VERIFICATION.md |
| Operasional | Ada dengan batas | Monitoring 100 job, notifikasi gagal, retry, quota upload atomik, retensi quarantine, latihan restore logical lokal dan runbook |
| Dataset/retraining | Ada | 144 dokumen sintetis berlabel, split tanpa turunan bocor; pipeline model berversi dan input real privat/consented tanpa autopromotion |
| Promotion | Parsial | Guard target production terpisah, preflight, seed guard dan payment stub; provisioning/SMTP/restore cloud belum dilaksanakan |
| Arsitektur | Parsial terhadap istilah proposal | Modular monolith dengan batas modul dan worker; belum microservices yang dideploy independen |

## Kecocokan dengan proposal dan canvas

| Kebutuhan proposal | Status | Kekurangan yang harus ditutup |
| --- | --- | --- |
| Portal tiga pihak dan dashboard/notifikasi | Ada sebagai prototipe | Lima peran termasuk dua peran operasional sudah tersedia; monitoring finansial belum lengkap |
| Upload dan OCR invoice/BAST | Ada dengan batas | Ketiganya memakai Azure; augmentasi scan/rotasi/noise untuk evaluasi tersedia, preprocessing scan produksi belum dibangun |
| Target OCR MVP >=85%, <10 detik/dokumen | Belum dibuktikan | Satu fixture tidak mewakili akurasi; ukur waktu antrean terpisah dari waktu OCR, p50/p95 dan koreksi per field |
| Three-way matching invoice/PO/BAST | Ada sebagai screening | Referensi/item/kuantitas/nilai diperiksa; kualitas ekstraksi dan bukti manusia tetap menentukan |
| Fingerprint berdasarkan identitas/isi invoice | Parsial | Hash byte dan identitas bisnis tersedia; belum fingerprint visual/semantik atau lintas platform |
| Isolation Forest atau Autoencoder | Parsial | Isolation Forest diimplementasikan; dataset, threshold dan precision/recall belum divalidasi |
| AI credit scoring data alternatif + SHAP | Parsial | Lab tabular sintetis dan kontribusi linear tersedia; data alternatif berizin, SHAP, kalibrasi/bias/drift nasabah belum ada |
| Maker-checker dan audit | Parsial | Pemisahan aktor vendor/buyer/risk ada; approval bertingkat internal buyer dan pengelolaan kasus belum ada |
| Anti-kolusi vendor/buyer | Parsial | Konfirmasi dan rules membantu; belum graph/concentration features dan bukti ERP independen |
| Rekening terverifikasi dan cooling-off 48 jam | Belum | Belum modul rekening pencairan, name matching, biometrik atau kontrol pergantian rekening |
| Double financing lintas platform | Belum | Hash hanya mencakup database sendiri; perlu jalur verifikasi eksternal yang sah dan tersedia |
| Forensik pemalsuan dokumen | Belum | Belum analisis pixel/metadata yang tervalidasi; confidence OCR tidak mengukur keaslian |
| Integrasi e-Faktur, ERP, bank, biro kredit, QRIS/logistik | Belum | Memerlukan integrasi, izin dan mitra; model OCR saja tidak menyediakan koneksi tersebut |
| Fractional funding | Ada sebagai simulasi | Pencatatan komitmen tersedia; pergerakan uang belum diintegrasikan |
| Biaya transparan dan pendapatan platform | Parsial | Advance, fee berbasis invoice, hasil bersih dan return per tenor ditampilkan; platform fee 0,2%, billing/reconciliation belum ada |
| Pencairan <24-48 jam dan collection | Belum | Belum payment provider, ledger, disbursement, repayment, reminder dan penanganan keterlambatan |
| Assisted onboarding dan limit bertahap vendor | Belum | Belum portal agen, proses verifikasi dokumen usaha atau kebijakan limit dari histori |
| KPI dampak AI for Good | Belum | Belum pengukuran waktu pencairan nyata, pertumbuhan vendor, fairness/bias atau survei dampak |

Target akurasi, fraud mendekati nol, straight-through processing 80% dan pencairan cepat di proposal merupakan sasaran. Pengujian sintetis yang telah dilakukan belum membuktikan pencapaiannya.

## Urutan to-do

| Tahap | Pekerjaan | Hasil yang dapat diperiksa |
| --- | --- | --- |
| Selesai putaran 1 | Onboarding pending/aktif/suspended, pendaftaran yang dapat dilanjutkan, reset password lengkap | UI lokal dan smoke cloud lulus; deliverability email cloud ditangani pada putaran 6 |
| Selesai putaran 2-5 | Augmentasi, BAST/matching/identitas bisnis, biaya/preset/UAT dan baseline sintetis berversi | Lihat DATASET.md, DOCUMENT_PROCESSING.md, UAT.md dan MODELS.md |
| Tersedia putaran 6 | Monitoring/retry, retensi quarantine, quota atomik, dependency remediation, CI, restore lokal dan promotion guard/runbook | Konfigurasi staging online; hasil validasi di VERIFICATION.md |
| Prasyarat pilot | Project produksi terpisah, SMTP/domain/mailbox, restore cloud/byte objek dan paging eksternal | Konfigurasi nyata dan uji penerimaan operator; daftar rinci OPERATIONS.md |
| P1 - lanjutan keamanan | Audit menyeluruh, abuse/load test, scan malware dan kebijakan retensi canonical | Pemeriksaan yang tersedia belum menggantikan audit/pilot |
| P2 - pilot | Histori pembayaran representatif berizin, validasi model terhadap waktu, kalibrasi, bias/drift dan pilot buyer | Bukti model pada data di luar pelatihan; persetujuan manusia tetap eksplisit |
| P2 - transaksi nyata | Provider pembayaran sandbox lalu alur ledger, webhook, pencairan, repayment, collection dan rekonsiliasi | Saldo dan transaksi dapat direkonsiliasi; kesiapan legal/operasi ditangani sebelum go-live uang nyata |
| P3 - ekosistem | ERP/e-Faktur/bank/biro kredit, kontrol rekening, approval buyer bertingkat, case management, assisted onboarding dan KPI dampak | Integrasi dan kontrol dapat diverifikasi pada mitra nyata sesuai izin/akses yang tersedia |

## Keputusan Azure dan Hugging Face

Tetap gunakan Azure untuk OCR baseline prototipe: invoice/PO memakai `prebuilt-invoice`, BAST `prebuilt-layout`. Ada bukti panggilan sintetis, tetapi sampelnya belum membuktikan target akurasi proposal. Dokumentasi Azure menjelaskan model invoice/PO: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/invoice?view=doc-intel-4.0.0.

Hugging Face adalah sumber model dan tooling, bukan satu model fraud siap dipasang. Model document understanding dapat menjadi pembanding; contoh panduan resmi memakai LayoutLMv2 dengan OCR Tesseract dan fine-tuning DocVQA: https://huggingface.co/docs/transformers/tasks/document_question_answering. Pilih satu kandidat setelah dataset evaluasi siap; bandingkan ketepatan field, false positive, latensi, biaya inference, lisensi dan kebutuhan operasi sebelum mengganti provider.

Fraud screening tetap gabungan fingerprint, matching, anomaly detection dan bukti manusia. Credit scoring sesuai proposal memerlukan model tabular dan histori hasil pembayaran; mengganti OCR dengan model dari Hugging Face tidak menyelesaikan kebutuhan tersebut. Kode sudah mempunyai interface provider sehingga eksperimen OCR dapat ditambahkan tanpa mengganti alur invoice.
