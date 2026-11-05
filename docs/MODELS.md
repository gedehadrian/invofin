# Eksperimen model dan retraining

`models/credit-synthetic-v1.json` adalah logistic regression L2, dilatih lokal dari 600 baris label buatan: 360 train, 120 validation dan 120 test. Tiga fiturnya amountLog10, tenorDays dan advancePercent. Standardisasi hanya dari train; lineage group serta batas waktu antar split divalidasi. Artifact menyimpan versi, dataset SHA, checksum script pelatihan, parameter, rentang fitur dan metrik holdout, dengan `notForProduction=true`.

```sh
python tools/train_risk_baseline.py
python tools/test_training.py
npm run eval:screening
```

Train ulang deterministik dengan data yang sama menghasilkan artifact sama. Artifact berbeda tidak menimpa path versi lama. Baseline sintetis awal memiliki AUC test sekitar 0,635 dan recall 0,171 pada threshold 0,5: hasil eksperimen ini tidak membuktikan kelayakan untuk keputusan kredit. Lab hanya tersedia untuk Risk Officer/Admin pada lingkungan non-production, terpisah dari skor aturan dan keputusan invoice. Kontribusi linear menjelaskan log-odds model; ini bukan SHAP.

Ketika data nyata berizin tersedia, simpan CSV dan artifact di folder ignored `evaluation/private/`. Kolom wajib: `group_id,as_of_date,split,amount,tenor_days,advance_percent,label`. Label 0/1 harus berasal dari outcome pembayaran yang sudah diamati, bukan keluaran model. Gunakan identifier kelompok pseudonim, pastikan hak penggunaan data dan dokumentasikan definisi outcome serta observation window.

```sh
python tools/train_risk_baseline.py --dataset-kind representative --input evaluation/private/labeled.csv --consented --version credit-candidate-v2 --output evaluation/private/credit-candidate-v2.json
```

Pipeline menolak group lintas split, tanggal train yang melewati holdout, nilai nonfinite, label tidak lengkap dan split terlalu kecil. Lolos validasi struktur tidak membuktikan label bebas bias atau model siap production: lakukan evaluasi waktu/vendor/buyer, kalibrasi, fairness/drift, review model dan promotion terkontrol. Kandidat baru tidak otomatis diaktifkan dalam aplikasi.

`eval:screening` memakai ground truth generator sebagai oracle fields untuk menguji rules tiga dokumen. Laporan menyatakan `usesOracleFields=true`; precision pada pengujian ini tidak dapat disebut akurasi deteksi fraud dunia nyata. Evaluasi OCR tetap terpisah lewat Azure dan label independen.
