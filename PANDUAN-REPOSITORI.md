# Panduan Repositori Pengetahuan CHARIS

Panduan ini menjelaskan cara menerbitkan produk pengetahuan (laporan riset, kertas kerja, policy brief, panduan) agar:

- tampil otomatis di halaman **Repositori**, dengan yang terbaru paling atas;
- terbaca dan terindeks **Google Scholar**;
- punya **DOI** dari Zenodo;
- versi **PDF lengkap** hanya bisa diunduh member yang permintaannya disetujui admin.

---

## Gambaran alurnya

```
Anda                         GitHub (otomatis)                  Website CHARIS
────                         ─────────────────                  ──────────────
1. Pesan DOI di Zenodo
2. Isi template HTML    ──►  3. GitHub Actions membuat:    ──►  Repositori menampilkan
   + upload folder              • metadata Google Scholar         produk baru (paling atas)
                                • blok sitasi APA/BibTeX/RIS
                                • repositori/index.json         Halaman produk terbuka
                                • daftar repositori & sitemap      untuk semua orang
4. Upload PDF lengkap
   lewat panel admin    ──►  Google Drive (PRIVAT)        ──►  Hanya bisa diunduh member
                                                                 yang sudah disetujui
```

---

## Langkah menerbitkan satu produk

### 1. Siapkan ID produk dan pesan DOI di Zenodo

1. Tentukan **ID produk** yang unik, misalnya `CHARIS-2026-003`. ID ini dipakai di tiga tempat: template HTML, panel admin, dan formulir permintaan.
2. Masuk ke [zenodo.org](https://zenodo.org), sebaiknya dengan akun ORCID atau akun Google lembaga, lalu pilih **New upload**.
3. Di kolom *Digital Object Identifier*, jawab **No**, lalu klik **Get a DOI now!** (Reserve DOI). Salin DOI-nya, misalnya `10.5281/zenodo.1234567`.
4. Isi metadata: jenis *Publication › Report*, judul, penulis, abstrak, kata kunci, lisensi.
5. Untuk file, pilih salah satu:
   - unggah versi PDF lengkap dengan akses **Restricted** (metadata tetap publik, file hanya bisa diminta lewat Zenodo); atau
   - unggah **ringkasan** atau halaman sampul dan tambahkan *Related identifier* ke halaman produk di website CHARIS.
6. Simpan sebagai draf. **Publish** setelah halaman di website sudah tayang, supaya tautan baliknya sudah aktif.

> DOI Zenodo diterbitkan melalui DataCite dengan prefix `10.5281`. Jika suatu hari yayasan menjadi anggota Crossref dan punya prefix sendiri, kolom `doi` cukup diganti.

### 2. Buat folder produk dari template

1. Salin folder `repositori/_template/`, lalu beri nama baru dengan format `tahun-bulan-judul-singkat`, huruf kecil tanpa spasi:
   ```
   repositori/2026-12-kajian-tarif-rsud/
   ```
2. Buka `index.html` di folder itu, lalu isi blok **DATA PRODUK**:

| Kolom | Isi | Wajib |
|---|---|---|
| `id` | ID produk, mis. `CHARIS-2026-003` | ✔ |
| `type` | `Laporan riset`, `Kertas kerja`, `Policy brief`, `Panduan`, `Laporan evaluasi` | ✔ |
| `series` | mis. `Kertas Kerja CHARIS No. 2` | |
| `title_id`, `title_en` | Judul Indonesia dan Inggris | ✔ (`title_id`) |
| `abstract_id`, `abstract_en` | Abstrak lengkap, 150–300 kata | ✔ (`abstract_id`) |
| `authors` | Daftar penulis: `name`, `affiliation`, `orcid` (opsional) | ✔ |
| `date_published` | Tanggal terbit, format `YYYY-MM-DD`. **Menentukan urutan di Repositori** | ✔ |
| `language` | `id` atau `en` | |
| `keywords` | Daftar kata kunci | |
| `project_id` | ID proyek asal di Portofolio (mis. `PRJ-2026-001`), kosongkan untuk kajian mandiri. Tidak ditampilkan di halaman laporan | |
| `service` | Lini layanan: `financing`, `analytics`, `evaluation`, `planning`, `workforce`, `quality` | |
| `doi` | DOI dari Zenodo, mis. `10.5281/zenodo.1234567` | |
| `license` | mis. `CC BY 4.0` | |
| `pages` | Jumlah halaman versi PDF | |
| `cover` | Opsional. Kosongkan agar sampul dideteksi otomatis (lihat bagian Sampul) | |
| `pdf_summary` | Nama file ringkasan PDF publik (opsional, **maks. 5 MB** agar diindeks Scholar) | |
| `featured` | `true` agar muncul di slider beranda | |

3. Tulis isi laporan di antara penanda **ISI LAPORAN**. Gunakan:
   - `<h2>` untuk bab dan `<h3>` untuk subbab (daftar isi dibuat otomatis);
   - `<figure>` + `<figcaption>` untuk gambar, `<table>` + `<caption>` untuk tabel;
   - `<aside class="callout">` untuk kotak temuan kunci;
   - bagian **Daftar Pustaka** di akhir, karena Google Scholar membaca bagian referensi.
4. **Jangan** mengedit bagian di antara penanda `CHARIS:AUTO`. Bagian itu ditulis ulang otomatis.

> Tips: tulis laporan di Word atau Google Docs seperti biasa, lalu salin teksnya ke template. Untuk tabel besar, Anda bisa menyimpan tabel sebagai gambar PNG dengan teks alternatif.

### 3. Upload ke GitHub

1. Di repository GitHub, buka folder `repositori/`, lalu klik **Add file › Upload files**.
2. Seret seluruh folder produk (index.html, sampul, gambar, ringkasan PDF). **Jangan** mengunggah PDF lengkap ke GitHub, karena semua file di GitHub Pages terbuka untuk publik.
3. Klik **Commit changes**.
4. Buka tab **Actions** dan tunggu proses *Bangun repositori CHARIS* selesai (±1 menit, tanda ✔ hijau).
   - Jika muncul tanda ✖ merah, buka prosesnya. Bagian **MASALAH yang perlu diperbaiki** menjelaskan kolom mana yang salah, misalnya tanda kutip atau koma di DATA PRODUK.
5. Produk tampil di Repositori setelah GitHub Pages diperbarui (1–2 menit).

### 4. Daftarkan PDF lengkap (privat)

1. Masuk ke panel admin (`/admin/`), lalu buka menu **Laporan lengkap (PDF)** › **+ Tambah**.
2. Isi **ID produk** (harus sama persis dengan `id` di DATA PRODUK) dan judul, lalu klik **Unggah PDF** (maks. 25 MB).
3. Simpan. File tersimpan di folder Drive **CHARIS Laporan Lengkap (PRIVAT)** dan tidak dibagikan ke siapa pun.

### 5. Publish di Zenodo

Kembali ke draf Zenodo. Tambahkan *Related identifier* berupa URL halaman produk di website CHARIS (`…/repositori/nama-folder/`), lalu klik **Publish**. DOI langsung aktif.

---

## Sampul otomatis

Setiap produk otomatis mendapat **gambar sampul** dan **thumbnail**. Sampul tampil di daftar Repositori, kartu Terbaru, halaman laporan, dan formulir permintaan, dan bisa diklik untuk diperbesar. GitHub Actions mencari file di folder produk dengan urutan prioritas:

1. file yang ditulis di kolom `cover` (gambar atau PDF);
2. `sampul.jpg/png/webp`, lalu `cover.jpg/png/webp`;
3. `sampul.pdf` atau `cover.pdf`: halaman pertama dijadikan gambar;
4. file ringkasan PDF (`pdf_summary`): halaman pertama;
5. PDF lain apa pun di folder.

**Cara termudah:** ekspor halaman sampul laporan dari Word sebagai PDF satu halaman, beri nama `sampul.pdf`, dan unggah bersama `index.html`. File `_cover.jpg`, `_thumb.jpg`, dan `_cover.json` dibuat otomatis. Jangan diedit. Jika sampul diganti, cukup unggah file baru dengan nama yang sama.

Sampul untuk **Portofolio** diunggah ke folder `portofolio/<ID-PROYEK>/` dengan aturan yang sama (lihat `portofolio/README.md`). Sampul ini hanya tampil untuk proyek tingkat A dan B.

## Pratinjau flipbook (maksimal 5 halaman)

Pembaca bisa membalik **lima halaman pertama** laporan seperti buku, langsung dari daftar Repositori, halaman Layanan Kami, dan halaman laporan. Di akhir pratinjau ada tombol **Minta PDF lengkap**.

1. Dari Word atau PDF laporan, simpan **hanya halaman 1–5** (sampul, daftar isi, ringkasan, dan seterusnya) sebagai `pratinjau.pdf`.
   Di Word: *File → Save as → PDF → Options → Pages from 1 to 5*. Di Adobe/Preview: ekstrak halaman 1–5.
2. Unggah `pratinjau.pdf` ke folder produk, bersama `index.html` dan `sampul.pdf`.
3. GitHub Actions membuat gambar `_p1.jpg` sampai `_p5.jpg`. Jika PDF lebih dari 5 halaman, hanya 5 halaman pertama yang dipakai.

**Jangan unggah PDF laporan lengkap ke GitHub.** Semua isi repo bisa diunduh publik. Jika `pratinjau.pdf` tidak ada, sistem memakai file ringkasan (`pdf_summary`) bila tersedia. Tanpa keduanya, sampul tetap tampil tetapi tanpa flipbook.

Jika `sampul.pdf` tidak ada, halaman pertama `pratinjau.pdf` otomatis dipakai sebagai sampul, jadi satu file `pratinjau.pdf` sudah cukup.

## Alur permintaan laporan lengkap

1. Pengunjung membuka halaman produk, lalu klik **Minta PDF lengkap**.
2. Mereka mengisi nama, instansi, email, dan alasan permintaan. Pemohon menerima email konfirmasi, dan admin menerima notifikasi.
3. Admin membuka **Permintaan laporan** di panel admin, memilih **Setujui** atau **Tolak** (boleh menambah catatan), lalu klik **Proses keputusan**.
4. Jika disetujui:
   - pemohon baru otomatis dibuatkan akun member dan menerima **email berisi kode akses**;
   - member lama menerima email bahwa laporan sudah tersedia.
5. Member masuk di halaman **Masuk member** (`#/member`) dengan email dan kode akses, lalu mengunduh PDF yang sudah disetujui.
6. Lupa kode? Member bisa meminta kode baru dari halaman masuk. Kode lama otomatis tidak berlaku.
7. Setiap unduhan tercatat di **Riwayat unduhan**. Untuk mencabut akses seseorang, ubah statusnya di menu **Member** menjadi *nonaktif*.

---

## Google Scholar: daftar periksa

Setiap halaman produk sudah otomatis memenuhi pedoman teknis Google Scholar:

- ✔ satu produk = satu URL;
- ✔ judul, penulis, dan **abstrak lengkap** terlihat tanpa login;
- ✔ tag `citation_title`, `citation_author`, `citation_publication_date`, `citation_doi`, `citation_technical_report_institution`, dan lainnya;
- ✔ halaman daftar sederhana tanpa JavaScript (`/repositori/`) dan `sitemap.xml`;
- ✔ bagian Daftar Pustaka.

Yang perlu Anda lakukan:

1. Ganti `base_url` di `repositori/site.json` dengan alamat website Anda.
2. Daftarkan website di **Google Search Console** dan kirim `sitemap.xml`.
3. Pastikan file ringkasan PDF publik **di bawah 5 MB** dan teksnya bisa dicari (bukan hasil scan).
4. Bersabar. Indeksasi Google Scholar biasanya memakan waktu beberapa minggu dan tidak bisa dipercepat secara manual.
5. Catatan: dengan alamat `username.github.io/nama-repo`, file `robots.txt` tidak berada di root domain. Setelah memakai domain sendiri (mis. `charis.or.id`), `robots.txt` di repository ini akan aktif.

---

## Pertanyaan umum

**Bagaimana kalau laporan direvisi?** Edit `index.html`, naikkan `version` (mis. `1.1`), lalu upload ulang. Urutan tidak berubah karena mengikuti `date_published`. Di Zenodo, gunakan **New version** agar DOI versi lama tetap tercatat.

**Bisa menerbitkan dalam bahasa Inggris saja?** Bisa. Isi `language: "en"`, tulis isi laporan dalam bahasa Inggris, dan tetap isi `title_id` serta `abstract_id` (boleh sama dengan versi Inggris).

**Berapa batas ukuran?** Upload lewat browser GitHub maksimal 25 MB per file. Usahakan total repository di bawah 1 GB. PDF lengkap di Drive maksimal 25 MB per file lewat panel admin.
