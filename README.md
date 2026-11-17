# Website CHARIS

Website resmi **CHARIS – Center for Health Analytics, Research and Integrated Services**, unit Yayasan Peduli Insan Rentan (PINAR Foundation).

- **Frontend:** HTML, CSS, dan JavaScript murni (tanpa framework), di-host gratis di **GitHub Pages**
- **Database:** **Google Spreadsheet** (satu tab per jenis konten)
- **Penyimpanan file:** **Google Drive** (PDF publikasi, foto berita, logo mitra)
- **Backend/API:** **Google Apps Script** (dideploy sebagai Web App)
- **Pengelolaan:** panel admin di `/admin/` dengan password
- **Bahasa:** dwibahasa Indonesia/English (tombol ID/EN)

```
charis-web/
├── index.html              ← website utama (semua halaman, navigasi dengan #/)
├── repositori/             ← ★ produk pengetahuan (laporan, policy brief, dll.)
│   ├── _template/          ← template HTML untuk produk baru
│   ├── assets/             ← tampilan halaman laporan
│   ├── site.json           ← ★ ISI ALAMAT WEBSITE DI SINI
│   └── <folder-produk>/    ← satu folder per produk
├── portofolio/             ← sampul portofolio per ID proyek (lihat portofolio/README.md)
├── scripts/build-repo.mjs  ← pembuat metadata Scholar, sampul + thumbnail, daftar, dan sitemap
├── .github/workflows/      ← GitHub Actions (berjalan otomatis)
├── PANDUAN-REPOSITORI.md   ← ★ langkah menerbitkan produk, DOI, dan member
├── docs/                   ← template Word: klausul publikasi, lembar pengalaman proyek, kop surat, logo
├── .nojekyll               ← wajib untuk GitHub Pages
├── assets/
│   ├── css/style.css       ← tampilan, mengikuti Pedoman Identitas Visual CHARIS
│   ├── css/*.woff2         ← huruf Plus Jakarta Sans (self-hosted)
│   ├── img/                ← logo
│   └── js/
│       ├── config.js       ← ★ ISI URL API, email, telepon DI SINI
│       ├── i18n.js         ← teks antarmuka ID/EN + daftar 6 layanan
│       ├── api.js          ← penghubung ke Apps Script
│       ├── demo-data.js    ← konten contoh untuk mode demo
│       └── app.js          ← logika halaman
├── admin/                  ← panel admin (index.html, admin.js, admin.css)
└── apps-script/
    ├── Code.gs             ← kode backend (tempel ke Apps Script)
    └── appsscript.json     ← manifest Apps Script
```

Halaman website: Beranda, Tentang Kami, Layanan Kami (dengan contoh luaran dan pratinjau dari Repositori), Repositori, Portofolio, Terbaru (dengan halaman detail), Tim, Hubungi Kami, Kebijakan Privasi, dan Hasil Pencarian.

Beranda berisi: slider sorotan, sorotan layanan, Terbaru (tab Berita, Publikasi, dan Proyek), Layanan Kami (empat pilar), Tim Kami (tab per kelompok), Mitra Kami, dan formulir berlangganan kabar.

---

## Langkah pemasangan (±30 menit)

> Gunakan **akun Google resmi yayasan** untuk semua langkah, bukan akun pribadi, supaya data tetap milik lembaga.

### 1. Buat Google Spreadsheet
1. Buka [sheets.new](https://sheets.new), beri nama **CHARIS Website DB**.
2. Jangan bagikan Spreadsheet ini ke publik. Website membaca data lewat API, bukan langsung dari Sheet.

### 2. Pasang Google Apps Script
1. Di Spreadsheet: **Ekstensi › Apps Script**.
2. Hapus isi `Code.gs`, lalu tempel seluruh isi file `apps-script/Code.gs`.
3. Klik ⚙️ **Setelan proyek** › centang **Tampilkan file manifes "appsscript.json"**. Buka file itu dan ganti isinya dengan `apps-script/appsscript.json`.
4. Simpan (Ctrl+S).

### 3. Jalankan setup
1. Pilih fungsi **`setup`** di menu atas, klik **Jalankan**.
2. Berikan izin akses saat diminta. Jika muncul peringatan "aplikasi belum diverifikasi", pilih *Lanjutan › Buka (tidak aman)*. Ini normal untuk skrip milik sendiri.
3. Hasilnya: tab `news`, `team`, `projects`, `project_internal`, `partners`, `inquiries`, `subscribers`, `reports`, `requests`, `members`, dan `downloads` dibuat otomatis (tab `publications` tidak lagi dipakai karena publikasi dikelola lewat Repositori), beserta folder Drive **CHARIS Website Uploads**.

### 3b. Isi daftar pengalaman tim (sekali saja)
Pilih fungsi **`seedTeamExperience`**, lalu klik **Jalankan**. Tab `partners` akan terisi 38 lembaga dari CV pendiri. Daftar ini tampil di beranda dan halaman Tentang Kami sebagai **"Pengalaman tim kami bersama"**. Setelah itu, daftar bisa diubah lewat panel admin › *Mitra & pengalaman tim*.

### 4. Atur password admin
1. Di `Code.gs`, cari fungsi `setAdminPassword`. Ganti `GANTI_DENGAN_PASSWORD_KUAT` dengan password Anda (minimal 10 karakter).
2. Jalankan **`setAdminPassword`**.
3. **Hapus kembali teks password dari kode**, lalu simpan. Password tersimpan dalam bentuk hash di *Script Properties*.
4. Opsional: ubah email penerima notifikasi formulir kontak lewat fungsi `setNotifyEmail`. Bawaannya adalah email akun pemilik skrip.

### 5. Deploy sebagai Web App
1. Klik **Terapkan › Deployment baru** › jenis **Aplikasi web**.
2. *Jalankan sebagai*: **Saya**. *Yang memiliki akses*: **Siapa saja**.
3. Klik **Terapkan**, lalu salin **URL aplikasi web** (berakhiran `/exec`).

### 6. Hubungkan website
Buka `assets/js/config.js` dan isi:
```js
API_URL: "https://script.google.com/macros/s/XXXX/exec",
CONTACT_EMAIL: "info@domainanda.org",
CONTACT_PHONE: "+62 ...",
```
Selama `API_URL` kosong, website berjalan dalam **mode demo** dengan konten contoh bertanda `[Contoh]`.

Di file yang sama Anda juga bisa mengisi:
- `SOCIAL`: link Instagram, LinkedIn, YouTube, Facebook, dan X. Ikon hanya muncul jika link diisi.
- `HIGHLIGHT_IMAGE`: foto untuk bagian sorotan layanan di beranda.

### 7. Publikasikan di GitHub Pages
1. Buat repository baru di GitHub, misalnya `charis-website` (Public).
2. Unggah **seluruh isi** folder `charis-web/` ke root repository, termasuk file dan folder tersembunyi `.nojekyll` dan `.github/`.
   - Paling aman lewat **GitHub Desktop** atau `git push`, karena keduanya ikut mengunggah file tersembunyi.
   - Jika memakai *Add file › Upload files* di browser, folder `.github` sering tidak ikut terunggah (Windows dan macOS menyembunyikannya). Periksa setelah upload. Jika tidak ada, buat lewat *Add file › Create new file*, ketik nama `.github/workflows/build-repository.yml`, lalu tempel isi file tersebut. Lakukan hal yang sama untuk `.nojekyll` (boleh kosong).
3. **Settings › Pages** › *Source*: **Deploy from a branch** › *Branch*: `main` / `(root)` › Save.
4. Setelah 1–2 menit website aktif di `https://<username>.github.io/charis-website/`.
5. Panel admin: `https://<username>.github.io/charis-website/admin/`

---

## Repositori pengetahuan, DOI, dan member area

Produk pengetahuan **tidak** dikelola lewat Spreadsheet, melainkan lewat folder `repositori/` di GitHub:

- Upload folder produk (dari template), dan GitHub Actions otomatis membuat metadata Google Scholar, **sampul dan thumbnail** (dari gambar atau halaman pertama PDF), **flipbook pratinjau 5 halaman** (dari `pratinjau.pdf`), blok sitasi, daftar repositori (terbaru di atas), dan sitemap.
- Sampul Portofolio diunggah ke `portofolio/<ID-PROYEK>/` dan hanya tampil untuk proyek tingkat A dan B.
- Versi HTML terbuka untuk semua orang. PDF lengkap disimpan **privat** di Google Drive dan hanya bisa diunduh member yang permintaannya disetujui admin.
- DOI dipesan di Zenodo dan diisi di template.

Langkah lengkapnya ada di **PANDUAN-REPOSITORI.md**.

Pengaturan tambahan setelah langkah 6:
1. Ganti `base_url` di `repositori/site.json` dan alamat di `robots.txt` dengan alamat website Anda.
2. Folder Drive privat untuk PDF lengkap dibuat otomatis oleh `setup`. Lalu edit dan jalankan **`setSiteUrl`** dengan alamat website, karena alamat ini dipakai di email kepada member.
3. Di GitHub: **Settings › Actions › General › Workflow permissions** › pilih **Read and write permissions** › Save. Ini diperlukan agar GitHub Actions bisa menyimpan hasil pembangunan repositori.

## Portofolio dan kepatuhan perjanjian mitra

**Prinsip:** Portofolio mencatat *pekerjaan* (satu entri = satu proyek). Repositori menerbitkan *hasil* (satu entri = satu dokumen yang boleh terbit). Temuan tidak ditulis di Portofolio. Portofolio cukup menautkan ke Repositori lewat kolom *Publikasi terkait*.

Setiap proyek wajib diberi **tingkat keterbukaan** sesuai perjanjian atau persetujuan tertulis mitra:

| Tingkat | Tampil di website | Repositori |
|---|---|---|
| **A** Terbuka penuh | Semua kolom inti + nama klien, pendanaan, mitra, lokasi, foto, testimoni, publikasi terkait | Boleh |
| **B** Klien disebut, hasil tertutup | Kolom inti + nama klien, pendanaan, mitra, lokasi, foto, testimoni | Tidak |
| **C** Anonim | Hanya kolom inti (jenis klien, wilayah provinsi, tahun, ringkasan proses) | Tidak |
| **D** Tidak ditampilkan | Tidak tampil sama sekali | Tidak |

- Penyaringan dilakukan **di server** (Apps Script). Kolom yang tidak diizinkan untuk suatu tingkat tidak pernah dikirim ke browser, meskipun terisi di Spreadsheet. Proyek tanpa tingkat dianggap **D**.
- Data internal (nomor dan nilai kontrak, kontak pemberi kerja, tim, dasar persetujuan, tautan bukti) disimpan di tab **`project_internal`** (menu admin *Data internal proyek*) dan **tidak pernah** dibaca API publik.
- Template pendukung di folder `docs/`:
  - `Template_Klausul_Publikasi_CHARIS.docx`: klausul untuk kontrak atau MoU (ID/EN) dan contoh email permintaan persetujuan;
  - `Lembar_Pengalaman_Proyek_CHARIS.docx`: satu halaman per proyek untuk lampiran tender.
- Klausul adalah template. Tinjau bersama penasihat hukum atau notaris yayasan sebelum dipakai.

## Mengelola konten (panel admin)

| Menu | Isi | Tampil di |
|---|---|---|
| Pesan masuk | Kiriman formulir kontak; ubah status *baru → diproses → selesai* dan tambah catatan internal | Hanya admin |
| Permintaan laporan | Permintaan PDF lengkap; pilih *Setujui* atau *Tolak*, email terkirim otomatis | Hanya admin |
| Laporan lengkap (PDF) | Daftar PDF lengkap per ID produk, diunggah privat ke Drive | Hanya admin |
| Member | Akun member (dibuat otomatis saat disetujui); ubah status untuk mencabut akses | Hanya admin |
| Riwayat unduhan | Catatan setiap unduhan PDF lengkap | Hanya admin |
| Berita & kegiatan | Kategori (Berita, Kegiatan, Siaran pers, Opini, Karier), judul, ringkasan, isi ID/EN, foto, opsi tampil di slider | Slider, Terbaru |
| Portofolio proyek | Tingkat keterbukaan (A–D), informasi inti, kolom khusus A/B, publikasi terkait | Terbaru, Portofolio (sesuai tingkat) |
| Data internal proyek | Kontrak, nilai, kontak, tim, dasar dan bukti persetujuan | Hanya admin |
| Tim | Nama, kelompok (Pimpinan, Tenaga Ahli, Mitra Ahli), jabatan, profil ID/EN, foto, urutan | Beranda, Tim |
| Mitra & klien | Nama, logo, website | Beranda (bergulir otomatis jika lebih dari 4) |
| Pelanggan kabar | Email dari formulir berlangganan; ubah status ke *berhenti* jika diminta | Hanya admin |

- **Slider beranda:** centang *Tampilkan di slider beranda* pada berita atau publikasi. Slide pertama selalu berisi pernyataan tentang CHARIS. Foto landscape yang lebar (minimal 1600 px) memberi hasil terbaik.

- Tombol **Unggah** mengirim file ke folder Drive *CHARIS Website Uploads* (maks. 15 MB, format PDF/JPG/PNG/WebP/DOCX/PPTX). File otomatis dibagikan "siapa saja yang memiliki link: lihat".
- Anda juga bisa menempel link Google Drive yang sudah ada.
- Hilangkan centang **Tayangkan di website** untuk menyimpan sebagai draf.
- Isi berita: pisahkan paragraf dengan **satu baris kosong**.
- Data juga bisa diedit langsung di Spreadsheet. Kolom `published` diisi `TRUE`/`FALSE`.
- Sesi admin berlaku 6 jam. Setelah 5 kali salah password, login dikunci 15 menit.

## Memperbarui kode backend
Setelah mengubah `Code.gs`: **Terapkan › Kelola deployment › ✏️ Edit › Versi: Versi baru › Terapkan**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah.

## Menyambungkan domain sendiri (nanti)
1. Di repository, buat file `CNAME` berisi nama domain, misalnya `charis.or.id`.
2. Di pengelola DNS domain, tambahkan record `CNAME` (`www` → `<username>.github.io`) atau record `A` ke IP GitHub Pages (lihat dokumentasi GitHub Pages "Managing a custom domain").
3. Di **Settings › Pages**, isi *Custom domain* dan centang **Enforce HTTPS**.

## Mitra dan pengalaman tim

Tab `partners` menampung dua jenis lembaga, yang dibedakan lewat kolom **Hubungan**:

| Hubungan | Tampil sebagai | Untuk |
|---|---|---|
| `tim` | "Pengalaman tim kami bersama" | Lembaga tempat anggota tim pernah bekerja, meneliti, atau menjadi konsultan sebelum atau di luar CHARIS |
| `mitra` | "Mitra CHARIS" | Lembaga yang sudah punya kerja sama atau kontrak dengan CHARIS. Bagian ini otomatis tersembunyi selama belum ada isinya |

**Logo lembaga hanya tampil jika kolom "Sudah ada izin tertulis memakai logo" dicentang.** Tanpa izin, website menampilkan singkatan dan nama lengkap lembaga sebagai teks. Aturan ini ditegakkan di server (Apps Script), sehingga logo tanpa izin tidak pernah terkirim ke pengunjung.

Cara menambah logo: minta file logo resmi dan izin tertulis (cukup lewat email) dari lembaga terkait. Unggah logonya di panel admin, lalu centang kolom izin. Simpan email izin itu sebagai arsip.

## Keamanan dan batasan
- Spreadsheet tetap privat. API hanya mengembalikan baris yang `published = TRUE`. Pesan masuk hanya bisa dibaca setelah login.
- Formulir kontak dilindungi honeypot anti-bot dan batas 1 kiriman per menit per email.
- Isian diamankan dari *formula injection* di Spreadsheet.
- Kuota Google Apps Script berlaku, misalnya batas jumlah email notifikasi per hari untuk akun Gmail biasa. Untuk volume besar, pertimbangkan Google Workspace.
- Respons API pertama kali bisa memakan waktu 1–3 detik. Data publik di-cache 5 menit dan langsung diperbarui setiap kali admin menyimpan.
- Halaman **Kebijakan Privasi** (`#/privacy`) sudah tersedia dalam dua bahasa. Tinjau isinya, dan sesuaikan bila perlu di `assets/js/i18n.js` (kunci `privacy.body`).

## Sebelum diluncurkan
- [ ] Isi `API_URL`, email, dan telepon di `config.js`
- [ ] Hapus atau ganti semua konten `[Contoh]` lewat panel admin
- [ ] Unggah foto kegiatan asli untuk berita dan proyek (tanpa foto, website menampilkan tile motif balok)
- [ ] Tambahkan profil tim, minimal 1 publikasi, dan logo mitra (dengan izin)
- [ ] Uji formulir kontak dan pastikan email notifikasi masuk
