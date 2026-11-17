# Sampul portofolio

Folder ini berisi **gambar sampul** untuk entri Portofolio. Data proyeknya sendiri tetap dikelola lewat panel admin dan Google Sheet.

## Cara menambah sampul

1. Buat folder dengan nama **persis sama dengan ID proyek** di Portofolio, misalnya `portofolio/PRJ-2026-004/`.
2. Masukkan salah satu file berikut (urutan prioritas):
   1. `sampul.jpg` / `sampul.png` / `sampul.webp`
   2. `cover.jpg` / `cover.png` / `cover.webp`
   3. `sampul.pdf` / `cover.pdf`: halaman pertama dijadikan gambar
   4. PDF lain apa pun di folder itu: halaman pertama dijadikan gambar
3. Upload ke GitHub. GitHub Actions otomatis membuat `auto-cover.jpg` (dari PDF), `auto-thumb.jpg` (versi kecil), dan memperbarui `portofolio/index.json`.

## Penting: hanya untuk proyek tingkat A dan B

- Website **hanya menampilkan sampul untuk proyek tingkat A dan B**.
- Semua file di GitHub **bisa diakses publik** lewat alamat langsungnya, meskipun tidak ditampilkan di website. Karena itu, **jangan unggah sampul untuk proyek tingkat C atau D**, karena sampul biasanya memuat nama atau logo klien.
- Jangan unggah PDF laporan lengkap ke sini. Cukup sampulnya saja, misalnya PDF satu halaman atau gambar.
- File yang namanya diawali `auto-` (`auto-cover.jpg`, `auto-thumb.jpg`, `auto-info.json`) dibuat otomatis. Jangan diedit. Untuk hasil tajam, gunakan PDF atau gambar dengan lebar minimal 1200 px.
