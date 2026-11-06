# Email Auth untuk staging

Email konfirmasi pendaftaran dan pemulihan password dikirim oleh Supabase Auth. Konfigurasinya berada di project **InvoFin App**, ref `skwwgjjgeativyevkkpl`, pada Authentication → Emails → SMTP Settings. App Password tidak perlu dimasukkan ke environment Vercel atau source code aplikasi.

## Gmail untuk pengujian tim

Gmail dengan App Password dapat dipakai untuk pengujian bervolume kecil tanpa domain pengirim sendiri. Akun harus mengaktifkan 2-Step Verification dan mendukung App Password; akun organisasi atau yang memakai Advanced Protection dapat membatasi fitur ini. Pemilik akun membuat dan memasukkan credential sendiri. Lihat [App Password Google](https://support.google.com/mail/answer/185833?hl=en) dan [Google SMTP dengan Supabase](https://supabase.com/kb/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y).

| Pengaturan | Nilai |
| --- | --- |
| Enable Custom SMTP | Aktif |
| Host | `smtp.gmail.com` |
| Port | `465` (TLS) |
| Username | Alamat Gmail utama pemilik App Password |
| Password | App Password, disimpan langsung di Supabase |
| Sender email | Gunakan alamat Gmail utama yang sama untuk uji awal |
| Sender name | `InvoFin` |

Simpan pengaturan. Untuk pengirim alias, konfigurasikan dan verifikasi Send mail as di Gmail sebelum mengganti Sender email. Alias `+tag` menerima email ke inbox yang sama dan tidak menyembunyikan alamat utama. Referensi: [alias Gmail](https://support.google.com/mail/answer/22370?hl=en).

## Verifikasi

1. Gunakan inbox yang pemiliknya mengizinkan pengujian dan sudah memiliki akun InvoFin. Kirim satu permintaan dari `/forgot-password`; jangan mengulang tanpa memperhatikan cooldown/kuota.
2. Periksa inbox dan spam. Pesan generik di UI menjaga privasi keberadaan akun; pesan tersebut sendiri belum membuktikan email terkirim. Operator dapat memeriksa waktu `recovery_sent_at` dan event Auth tanpa membaca token.
3. Buka tautan terbaru di browser yang dipakai meminta reset agar cookie PKCE tersedia. Pemilik akun memasukkan password baru sendiri. Jangan mengirim tautan recovery, kode, password atau App Password ke chat/log/Git.
4. Periksa login sesudah perubahan dan penolakan password lama. Catat pengiriman, penerimaan inbox, callback dan penyimpanan password sebagai hasil terpisah.

Jika belum ada email: pastikan project/ref benar, Custom SMTP aktif dan Save berhasil, username serta pengirim cocok dengan Gmail pemilik App Password, lalu periksa error Auth. Pengaturan SMTP yang tersimpan belum membuktikan credential benar atau deliverability berhasil. Jangan mematikan konfirmasi email untuk menutupi kegagalan pengiriman.

Jangan mengandalkan Gmail sebagai layanan email produksi berskala besar. Sebelum pilot, tentukan kuota, pengirim terverifikasi dan pemantauan pengiriman sesuai [panduan SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Template reset password InvoFin

Template kanonis: `supabase/templates/recovery.html`. Desain memakai warna `#2563eb`, wordmark teks InvoFin, kartu putih, tombol utama, catatan keamanan dan tautan cadangan. Layout tabel dan CSS inline menjaga kompatibilitas email; tidak memuat JavaScript, font atau gambar eksternal. Preview desktop dan mobile 390 px diperiksa tanpa overflow horizontal, memakai tautan contoh tanpa token asli.

Untuk hosted Supabase, buka [Reset Password email template](https://supabase.com/dashboard/project/skwwgjjgeativyevkkpl/auth/templates), isi Subject **Atur ulang kata sandi InvoFin Anda**, lalu salin seluruh isi HTML kanonis ke Body dan simpan. Diff CLI 3.0.0 yang diperiksa hanya menampilkan subject; jangan menganggap body HTML sudah terpasang setelah `config push`. Dokumentasi resmi menyediakan penerapan lewat [Dashboard atau Management API](https://supabase.com/docs/guides/auth/auth-email-templates).

Tombol dan tautan cadangan tetap memakai `{{ .ConfirmationURL }}`. Footer memakai `{{ .SiteURL }}`. Jangan menggantinya dengan URL dari email nyata atau token yang pernah dipakai. Template lokal sudah dirujuk oleh `supabase/config.toml`; perubahan lokal berlaku setelah stack dimuat ulang. Pengaturan SMTP dan App Password tidak perlu diubah untuk memasang desain.
