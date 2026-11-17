/* Sample content used only in DEMO mode (when API_URL is empty).
   Every entry is clearly marked as an example. Replace with real data
   through the admin panel once Google Apps Script is connected. */
window.DEMO_DATA = {
  publications: [
    { id: "p1", title_id: "[Contoh] Kajian Biaya Satuan Layanan Puskesmas", title_en: "[Sample] Unit Cost Study of Primary Care Services",
      summary_id: "Contoh ringkasan publikasi. Ganti melalui panel admin.", summary_en: "Sample publication summary. Replace via the admin panel.",
      category: "Laporan", year: "2026", file_url: "", cover_url: "", featured: true, published: true, date: "2026-10-01" },
    { id: "p2", title_id: "[Contoh] Policy Brief: Penguatan Layanan Primer", title_en: "[Sample] Policy Brief: Strengthening Primary Care",
      summary_id: "Contoh ringkasan policy brief.", summary_en: "Sample policy brief summary.",
      category: "Policy brief", year: "2026", file_url: "", cover_url: "", featured: true, published: true, date: "2026-09-15" },
    { id: "p3", title_id: "[Contoh] Panduan Analisis Beban Kerja", title_en: "[Sample] Workload Analysis Toolkit",
      summary_id: "Contoh ringkasan panduan.", summary_en: "Sample toolkit summary.",
      category: "Panduan", year: "2025", file_url: "", cover_url: "", featured: false, published: true, date: "2025-12-01" }
  ],
  news: [
    { id: "n1", category: "Berita", title_id: "[Contoh] CHARIS resmi diluncurkan", title_en: "[Sample] CHARIS officially launched",
      excerpt_id: "Contoh ringkasan berita. Tulis berita asli melalui panel admin.", excerpt_en: "Sample news excerpt. Write real news via the admin panel.",
      body_id: "Ini adalah contoh isi berita.\n\nParagraf kedua contoh isi berita.", body_en: "This is sample news content.\n\nA second sample paragraph.",
      image_url: "", date: "2026-11-14", featured: true, published: true },
    { id: "n2", category: "Kegiatan", title_id: "[Contoh] Lokakarya penyusunan tarif layanan", title_en: "[Sample] Workshop on service tariff setting",
      excerpt_id: "Contoh ringkasan kegiatan.", excerpt_en: "Sample activity excerpt.",
      body_id: "Contoh isi berita kegiatan.", body_en: "Sample activity story.", image_url: "", date: "2026-11-01", featured: false, published: true },
    { id: "n3", category: "Opini", title_id: "[Contoh] Catatan tentang pembiayaan layanan primer", title_en: "[Sample] A note on primary care financing",
      excerpt_id: "Contoh ringkasan tulisan opini.", excerpt_en: "Sample opinion excerpt.",
      body_id: "Contoh isi tulisan opini.", body_en: "Sample opinion piece.", image_url: "", date: "2026-10-20", featured: false, published: true }
  ],
  team: [
    { id: "t1", group: "leadership", name: "[Nama Lengkap, Gelar]", role_id: "Kepala CHARIS", role_en: "Head of CHARIS", bio_id: "Contoh profil singkat.", bio_en: "Sample short bio.", photo_url: "", order: 1, published: true },
    { id: "t2", group: "experts", name: "[Nama Lengkap, Gelar]", role_id: "Ahli Ekonomi Kesehatan", role_en: "Health Economist", bio_id: "Contoh profil singkat.", bio_en: "Sample short bio.", photo_url: "", order: 2, published: true },
    { id: "t3", group: "experts", name: "[Nama Lengkap, Gelar]", role_id: "Ahli Kebijakan Kesehatan", role_en: "Health Policy Specialist", bio_id: "Contoh profil singkat.", bio_en: "Sample short bio.", photo_url: "", order: 3, published: true },
    { id: "t4", group: "associates", name: "[Nama Lengkap, Gelar]", role_id: "Mitra Ahli Mutu Layanan", role_en: "Associate, Service Quality", bio_id: "Contoh profil singkat.", bio_en: "Sample short bio.", photo_url: "", order: 4, published: true }
  ],
  projects: [
    { id: "PRJ-2026-001", disclosure: "A", title_id: "[Contoh] Kajian biaya satuan layanan puskesmas", title_en: "[Sample] Unit cost study of primary care services",
      client_type: "Dinas kesehatan kabupaten/kota", service: "financing", component: "financing", region: "Bali", year_start: "2026", year_end: "2026", duration_months: 5, status: "selesai", role: "Pelaksana utama",
      summary_id: "Contoh ringkasan: CHARIS menghitung biaya satuan layanan di puskesmas dan menyusun rekomendasi pembiayaan bersama dinas kesehatan.", summary_en: "Sample summary: CHARIS estimated unit costs of primary care services and prepared financing recommendations with the district health office.",
      methods_id: "Activity-based costing, wawancara, analisis data keuangan", methods_en: "Activity-based costing, interviews, financial data analysis",
      outputs_id: "Laporan kajian, policy brief, lokakarya diseminasi", outputs_en: "Study report, policy brief, dissemination workshop",
      capacity_id: "Pelatihan perhitungan biaya untuk tim puskesmas", capacity_en: "Costing training for primary care teams", keywords: "biaya satuan, puskesmas, BLUD", sdg: "SDG 3.8",
      client: "[Nama Klien]", funder: "", partners: "", official_title: "", location_detail: "[Kabupaten]", image_url: "", related_publications: "CHARIS-2026-001",
      testimonial_id: "", testimonial_en: "", testimonial_by: "", date: "2026-08-01", published: true },
    { id: "PRJ-2026-002", disclosure: "C", title_id: "[Contoh] Penyusunan biaya satuan dan tarif layanan rumah sakit", title_en: "[Sample] Hospital unit costing and tariff setting",
      client_type: "RSUD", service: "financing", component: "financing", region: "Bali", year_start: "2026", year_end: "2026", duration_months: 4, status: "selesai", role: "Pelaksana utama",
      summary_id: "Contoh ringkasan: CHARIS mendampingi tim keuangan rumah sakit menghitung biaya satuan untuk seluruh layanan dan menyusun usulan tarif berbasis biaya.", summary_en: "Sample summary: CHARIS supported the hospital finance team to estimate unit costs for all services and draft cost-based tariffs.",
      methods_id: "Activity-based costing, wawancara unit layanan", methods_en: "Activity-based costing, service unit interviews",
      outputs_id: "Laporan analisis biaya, draf naskah tarif", outputs_en: "Cost analysis report, draft tariff regulation",
      capacity_id: "Pelatihan 2 hari untuk tim keuangan", capacity_en: "Two-day training for the finance team", keywords: "tarif, BLUD, JKN", sdg: "SDG 3.8",
      client: "TIDAK BOLEH TAMPIL", date: "2026-06-01", published: true },
    { id: "PRJ-2025-003", disclosure: "B", title_id: "[Contoh] Evaluasi program kesehatan ibu dan anak", title_en: "[Sample] Maternal and child health program evaluation",
      client_type: "Lembaga donor", service: "evaluation", component: "evidence", region: "Nusa Tenggara", year_start: "2025", year_end: "2026", duration_months: 8, status: "berjalan", role: "Mitra pelaksana",
      summary_id: "Contoh ringkasan: CHARIS melaksanakan survei awal dan evaluasi tengah program bersama mitra pelaksana.", summary_en: "Sample summary: CHARIS conducted the baseline and midline evaluation with implementing partners.",
      methods_id: "Survei rumah tangga, FGD, wawancara mendalam", methods_en: "Household survey, FGDs, in-depth interviews",
      outputs_id: "Laporan baseline, laporan evaluasi tengah", outputs_en: "Baseline report, midline evaluation report", capacity_id: "", capacity_en: "", keywords: "KIA, evaluasi", sdg: "SDG 3.1, 3.2",
      client: "[Nama Lembaga Donor]", partners: "[Nama Mitra]", date: "2026-03-01", published: true },
    { id: "PRJ-2025-004", disclosure: "D", title_id: "[Contoh] Proyek rahasia (tidak tampil)", client_type: "Perusahaan (CSR)", service: "planning", date: "2025-10-01", published: true }
  ],
  partners: [
    { id: "r1", name: "[Mitra 1]", logo_url: "", url: "", published: true },
    { id: "r2", name: "[Mitra 2]", logo_url: "", url: "", published: true },
    { id: "r3", name: "[Mitra 3]", logo_url: "", url: "", published: true },
    { id: "r4", name: "[Mitra 4]", logo_url: "", url: "", published: true },
    { id: "r5", name: "[Mitra 5]", logo_url: "", url: "", published: true }
  ]
};
