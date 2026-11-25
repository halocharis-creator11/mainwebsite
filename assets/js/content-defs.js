/* Field definitions for website news and portfolio entries, shared by the admin panel (/admin/)
   and the Ruang Kerja content editor (/kerja/), so both always write the same columns.
   Needs i18n.js (window.SERVICES) loaded first. */
(function () {
  "use strict";
  const SERVICE_OPTS = (window.SERVICES || []).map(s => [s.key, s.id.t]);
  window.CHARIS_DEFS = {
    news: { title: "Berita dan pengumuman", hint: "Kabar kegiatan dan pengumuman. Pisahkan paragraf isi dengan satu baris kosong. Disarankan menulis dan menerbitkan dari Ruang Kerja, menu Alur konten, agar telaah dan riwayatnya tercatat.",
      cols: [["title_id", "Judul"], ["category", "Kategori"], ["date", "Tanggal"], ["featured", "Slider"], ["published", "Tayang"]],
      fields: [["title_id", "Judul (ID)", "text"], ["title_en", "Title (EN)", "text"], ["category", "Kategori", "select", [["Berita", "Berita"], ["Pengumuman", "Pengumuman"], ["Informasi", "Informasi (video, foto, dan media sosial)"], ["Kegiatan", "Kegiatan"], ["Siaran pers", "Siaran pers"], ["Opini", "Opini"], ["Karier", "Karier"]]],
        ["excerpt_id", "Ringkasan (ID)", "textarea"], ["excerpt_en", "Excerpt (EN)", "textarea"],
        ["body_id", "Isi berita (ID)", "long"], ["body_en", "Body (EN)", "long"], ["date", "Tanggal", "date"], ["image_url", "Foto utama (landscape)", "image"],
        ["_hm", "Video dan galeri foto (opsional, cocok untuk kategori Informasi)", "heading"],
        ["video_url", "Tautan video: YouTube (termasuk Shorts), Instagram (post atau Reels), TikTok, Facebook, Vimeo, LinkedIn, atau Google Drive", "video"],
        ["gallery", "Galeri foto carousel: satu tautan per baris, atau unggah beberapa foto sekaligus", "gallery"],
        ["thumb_url", "Thumbnail kartu (opsional, landscape). Bila kosong dipakai foto utama, foto galeri pertama, atau gambar video", "image"],
        ["featured", "Tampilkan di slider beranda", "bool"], ["published", "Tayangkan di website", "bool"]] },
    projects: { title: "Portofolio proyek", hint: "Satu entri = satu proyek. Tingkat keterbukaan menentukan kolom yang tampil: A terbuka penuh, B klien disebut tanpa hasil, C anonim, D tidak tampil.",
      cols: [["title_id", "Judul"], ["disclosure", "Tingkat"], ["client_type", "Jenis klien"], ["year_start", "Tahun"], ["published", "Tayang"]],
      fields: [["_h1", "Keterbukaan", "heading"],
        ["disclosure", "Tingkat keterbukaan (sesuai perjanjian)", "select", [["A", "A. Terbuka penuh (klien dan publikasi)"], ["B", "B. Klien disebut, hasil tertutup"], ["C", "C. Anonim (tanpa nama klien)"], ["D", "D. Tidak ditampilkan di website"]]],
        ["published", "Tayangkan di website", "bool"],
        ["_h2", "Informasi inti (aman untuk semua tingkat)", "heading"],
        ["title_id", "Judul generik (ID), tanpa nama klien", "text"], ["title_en", "Generic title (EN)", "text"],
        ["client_type", "Jenis klien", "select", [["RSUD", "RSUD"], ["Rumah sakit swasta", "Rumah sakit swasta"], ["Puskesmas", "Puskesmas"], ["Klinik", "Klinik"], ["Dinas kesehatan provinsi", "Dinas kesehatan provinsi"], ["Dinas kesehatan kabupaten/kota", "Dinas kesehatan kabupaten/kota"], ["Pemerintah daerah", "Pemerintah daerah"], ["Kementerian/lembaga", "Kementerian/lembaga"], ["Lembaga donor", "Lembaga donor"], ["LSM/organisasi masyarakat", "LSM/organisasi masyarakat"], ["Universitas/lembaga riset", "Universitas/lembaga riset"], ["Perusahaan (CSR)", "Perusahaan (CSR)"], ["Kemitraan pemerintah dan LSM", "Kemitraan pemerintah dan LSM"]]],
        ["service", "Lini layanan CHARIS", "select", SERVICE_OPTS], ["component", "Komponen sistem kesehatan", "select", [["governance", "Tata kelola"], ["financing", "Pembiayaan"], ["workforce", "SDM kesehatan"], ["service", "Layanan dan mutu"], ["information", "Informasi"], ["evidence", "Bukti dan evaluasi"]]],
        ["region", "Wilayah umum (provinsi/regional)", "text"], ["areas", "Cakupan wilayah di peta (pisahkan dengan koma: nama provinsi, Nasional, atau nama negara, mis. Bali, Nusa Tenggara Timur, Timor-Leste)", "text"], ["year_start", "Tahun mulai", "number"], ["year_end", "Tahun selesai", "number"],
        ["duration_months", "Durasi (bulan)", "number"], ["status", "Status", "select", [["selesai", "Selesai"], ["berjalan", "Berjalan"]]],
        ["role", "Peran CHARIS", "select", [["Pelaksana utama", "Pelaksana utama"], ["Mitra pelaksana", "Mitra pelaksana"], ["Subkontraktor", "Subkontraktor"], ["Pendamping teknis", "Pendamping teknis"], ["Pengalaman tim (sebelum CHARIS)", "Pengalaman tim (sebelum CHARIS): dikerjakan anggota tim sebagai konsultan individu"]]],
        ["summary_id", "Ringkasan pekerjaan (ID): apa yang dikerjakan, bukan temuannya", "textarea"], ["summary_en", "Work summary (EN)", "textarea"],
        ["methods_id", "Pendekatan/metode (ID)", "text"], ["methods_en", "Approach/methods (EN)", "text"],
        ["outputs_id", "Jenis keluaran (ID), bentuk bukan isi", "text"], ["outputs_en", "Output types (EN)", "text"],
        ["capacity_id", "Peningkatan kapasitas (ID)", "text"], ["capacity_en", "Capacity building (EN)", "text"],
        ["keywords", "Tema/kata kunci (pisahkan dengan koma)", "text"], ["sdg", "Kontribusi SDG (mis. SDG 3.8)", "text"],
        ["date", "Tanggal untuk urutan tampil", "date"],
        ["_h3", "Hanya tampil untuk tingkat A dan B (perlu izin mitra)", "heading"],
        ["client", "Nama klien/mitra (persis seperti disetujui)", "text"], ["official_title", "Judul resmi proyek", "text"],
        ["funder", "Sumber pendanaan", "text"], ["partners", "Mitra pelaksana lain", "text"], ["location_detail", "Lokasi spesifik (kabupaten/kota)", "text"],
        ["image_url", "Foto kegiatan (landscape; tanpa wajah yang bisa dikenali, kecuali ada izin)", "image"],
        ["photo_public", "Foto boleh tampil juga untuk tingkat C (centang hanya jika foto tidak memuat nama lembaga, logo, papan nama, atau wajah yang dapat dikenali)", "bool"],
        ["testimonial_id", "Testimoni (ID), dengan persetujuan tertulis", "textarea"], ["testimonial_en", "Testimonial (EN)", "textarea"], ["testimonial_by", "Nama dan jabatan pemberi testimoni", "text"],
        ["_h4", "Hanya tampil untuk tingkat A", "heading"],
        ["related_publications", "ID publikasi terkait di Repositori (pisahkan dengan koma)", "text"]] }
  };
})();
