/* CHARIS admin panel. Talks to the Apps Script API with a session token. */
(function () {
  const cfg = window.CHARIS_CONFIG || {};
  const DEMO = !cfg.API_URL;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let token = null;
  try { token = sessionStorage.getItem("charis_token"); } catch (e) {}
  let type = "inquiries", rows = [], editing = null;

  const SERVICE_OPTS = window.SERVICES.map(s => [s.key, s.id.t]);
  /* field: [key, label, kind, options] kind: text|textarea|long|date|bool|select|image|file|number|readonly */
  const DEF = {
    publications: { title: "Publikasi", hint: "Laporan, policy brief, dan panduan yang bisa diunduh pengunjung.",
      cols: [["title_id", "Judul"], ["category", "Kategori"], ["year", "Tahun"], ["featured", "Slider"], ["published", "Tayang"]],
      fields: [["title_id", "Judul (ID)", "text"], ["title_en", "Title (EN)", "text"], ["summary_id", "Ringkasan (ID)", "textarea"], ["summary_en", "Summary (EN)", "textarea"],
        ["category", "Kategori", "select", [["Laporan", "Laporan"], ["Policy brief", "Policy brief"], ["Panduan", "Panduan"], ["Artikel", "Artikel"], ["Lainnya", "Lainnya"]]],
        ["year", "Tahun", "number"], ["date", "Tanggal terbit", "date"], ["file_url", "File dokumen (PDF)", "file"], ["cover_url", "Gambar sampul", "image"], ["featured", "Tampilkan di slider beranda", "bool"], ["published", "Tayangkan di website", "bool"]] },
    news: { title: "Berita & kegiatan", hint: "Kabar kegiatan. Pisahkan paragraf isi dengan satu baris kosong.",
      cols: [["title_id", "Judul"], ["category", "Kategori"], ["date", "Tanggal"], ["featured", "Slider"], ["published", "Tayang"]],
      fields: [["title_id", "Judul (ID)", "text"], ["title_en", "Title (EN)", "text"], ["category", "Kategori", "select", [["Berita", "Berita"], ["Kegiatan", "Kegiatan"], ["Siaran pers", "Siaran pers"], ["Opini", "Opini"], ["Karier", "Karier"]]],
        ["excerpt_id", "Ringkasan (ID)", "textarea"], ["excerpt_en", "Excerpt (EN)", "textarea"],
        ["body_id", "Isi berita (ID)", "long"], ["body_en", "Body (EN)", "long"], ["date", "Tanggal", "date"], ["image_url", "Foto utama (landscape)", "image"], ["featured", "Tampilkan di slider beranda", "bool"], ["published", "Tayangkan di website", "bool"]] },
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
        ["related_publications", "ID publikasi terkait di Repositori (pisahkan dengan koma)", "text"]] },
    project_internal: { title: "Data internal proyek", hint: "Tidak pernah tampil di website. Untuk tender, CV lembaga, dan bukti kepatuhan. ID harus sama dengan ID proyek di Portofolio.",
      cols: [["id", "ID proyek"], ["contract_no", "No. kontrak"], ["contract_value", "Nilai"], ["last_review", "Tinjauan terakhir"]],
      fields: [["id", "ID proyek (salin dari Portofolio)", "text"], ["contract_no", "Nomor kontrak/SPK", "text"], ["contract_date", "Tanggal kontrak", "date"], ["contract_value", "Nilai kontrak (Rp)", "number"],
        ["employer_contact", "Nama dan kontak pemberi kerja", "textarea"], ["team", "Tim CHARIS (nama + peran)", "textarea"],
        ["disclosure_basis", "Dasar tingkat keterbukaan (pasal kontrak / email persetujuan)", "textarea"], ["consent_link", "Tautan bukti persetujuan di Drive", "text"],
        ["last_review", "Tanggal tinjauan terakhir", "date"], ["notes", "Catatan sensitif", "textarea"]] },
    team: { title: "Tim", hint: "Profil tenaga ahli. Urutan kecil tampil lebih dulu.",
      cols: [["name", "Nama"], ["group", "Kelompok"], ["role_id", "Jabatan"], ["order", "Urutan"], ["published", "Tayang"]],
      fields: [["name", "Nama lengkap dan gelar", "text"], ["group", "Kelompok (tab di website)", "select", [["leadership", "Pimpinan"], ["experts", "Tenaga Ahli"], ["associates", "Mitra Ahli"]]], ["role_id", "Jabatan (ID)", "text"], ["role_en", "Position (EN)", "text"], ["bio_id", "Profil singkat (ID)", "textarea"], ["bio_en", "Short bio (EN)", "textarea"],
        ["photo_url", "Foto (rasio 1:1)", "image"], ["order", "Urutan tampil", "number"], ["published", "Tayangkan di website", "bool"]] },
    partners: { title: "Mitra & pengalaman tim", hint: "\"Mitra CHARIS\" = lembaga yang bekerja sama dengan CHARIS. \"Pengalaman tim\" = lembaga tempat anggota tim pernah bekerja atau menjadi konsultan. Logo hanya tampil jika izin tertulis sudah dicentang; tanpa izin, nama lembaga tampil sebagai teks.",
      cols: [["name", "Nama"], ["short", "Singkatan"], ["category", "Kategori"], ["relation", "Hubungan"], ["logo_ok", "Izin logo"], ["published", "Tayang"]],
      fields: [["name", "Nama lembaga", "text"], ["short", "Singkatan yang tampil di kartu (mis. WHO, KEMENKES)", "text"],
        ["category", "Kategori", "select", [["gov", "Pemerintah"], ["un", "PBB & multilateral"], ["intl", "Donor & lembaga internasional"], ["ngo", "LSM & jaringan komunitas"], ["uni", "Perguruan tinggi & riset"]]],
        ["relation", "Hubungan dengan CHARIS", "select", [["tim", "Pengalaman tim (sebelum/di luar CHARIS)"], ["mitra", "Mitra CHARIS (sudah ada kerja sama)"]]],
        ["logo_url", "Logo resmi (PNG/SVG transparan, dari lembaga terkait)", "image"], ["logo_ok", "Sudah ada izin tertulis memakai logo", "bool"],
        ["url", "Website (opsional)", "text"], ["order", "Urutan tampil", "number"], ["published", "Tayangkan di website", "bool"]] },
    requests: { title: "Permintaan laporan", hint: "Permintaan PDF lengkap. Pilih keputusan lalu simpan: pemohon otomatis menerima email (dan kode akses untuk member baru).", readonlyAdd: true, decide: true,
      cols: [["timestamp", "Waktu"], ["name", "Nama"], ["institution", "Instansi"], ["report_title", "Laporan"], ["status", "Status"]],
      fields: [["timestamp", "Waktu", "readonly"], ["report_title", "Laporan", "readonly"], ["report_id", "ID laporan", "readonly"], ["name", "Nama", "readonly"], ["institution", "Instansi", "readonly"],
        ["email", "Email", "readonly"], ["reason", "Alasan permintaan", "readonly"], ["status", "Status saat ini", "readonly"],
        ["decision", "Keputusan", "select", [["disetujui", "Setujui dan kirim akses"], ["ditolak", "Tolak"]]], ["decided_note", "Catatan untuk pemohon (opsional, ikut terkirim di email)", "textarea"]] },
    reports: { title: "Laporan lengkap (PDF)", hint: "Daftarkan PDF lengkap tiap produk. ID harus sama persis dengan \"id\" di DATA PRODUK halaman repositori. File disimpan privat di Google Drive.",
      cols: [["id", "ID produk"], ["title", "Judul"], ["file_name", "File"], ["updated", "Diperbarui"]],
      fields: [["id", "ID produk (mis. CHARIS-2026-001)", "text"], ["title", "Judul laporan", "text"], ["drive_file_id", "File PDF lengkap (privat)", "privatefile"], ["file_name", "Nama file", "text"], ["notes", "Catatan internal", "textarea"]] },
    members: { title: "Member", hint: "Akun member dibuat otomatis saat permintaan pertama disetujui. Ubah status ke nonaktif untuk mencabut akses.", readonlyAdd: true,
      cols: [["email", "Email"], ["name", "Nama"], ["institution", "Instansi"], ["last_login", "Terakhir masuk"], ["status", "Status"]],
      fields: [["email", "Email", "readonly"], ["name", "Nama", "readonly"], ["institution", "Instansi", "readonly"], ["created", "Terdaftar", "readonly"], ["last_login", "Terakhir masuk", "readonly"],
        ["status", "Status", "select", [["aktif", "Aktif"], ["nonaktif", "Nonaktif"]]]] },
    downloads: { title: "Riwayat unduhan", hint: "Catatan setiap unduhan laporan lengkap oleh member.", readonlyAdd: true, readonly: true,
      cols: [["timestamp", "Waktu"], ["email", "Email"], ["report_id", "ID laporan"]],
      fields: [["timestamp", "Waktu", "readonly"], ["email", "Email", "readonly"], ["report_id", "ID laporan", "readonly"]] },
    stats: { title: "Statistik", hint: "Jumlah dibaca, diunduh (PDF lengkap oleh member), dan dibagikan untuk setiap produk repositori, berita, dan proyek. Angka ini tampil publik di halaman repositori.", readonlyAdd: true,
      cols: [["id", "ID"], ["kind", "Jenis"], ["reads", "Dibaca"], ["downloads", "Diunduh"], ["shares", "Dibagikan"], ["updated", "Terakhir"]],
      fields: [["id", "ID", "readonly"], ["kind", "Jenis", "readonly"], ["reads", "Dibaca"], ["downloads", "Diunduh"], ["shares", "Dibagikan"], ["updated", "Terakhir", "readonly"]] },
    subscribers: { title: "Pelanggan kabar", hint: "Email yang mendaftar lewat formulir berlangganan. Ubah status ke 'berhenti' jika mereka minta berhenti.", readonlyAdd: true,
      cols: [["timestamp", "Waktu"], ["email", "Email"], ["lang", "Bahasa"], ["status", "Status"]],
      fields: [["timestamp", "Waktu", "readonly"], ["email", "Email", "readonly"], ["lang", "Bahasa", "readonly"], ["status", "Status", "select", [["aktif", "Aktif"], ["berhenti", "Berhenti"]]]] },
    inquiries: { title: "Pesan masuk", hint: "Pesan dari formulir kontak. Ubah status untuk menandai tindak lanjut.", readonlyAdd: true,
      cols: [["timestamp", "Waktu"], ["name", "Nama"], ["org", "Lembaga"], ["service", "Layanan"], ["status", "Status"]],
      fields: [["timestamp", "Waktu", "readonly"], ["name", "Nama", "readonly"], ["org", "Lembaga", "readonly"], ["email", "Email", "readonly"], ["phone", "Telepon", "readonly"],
        ["service", "Layanan", "readonly"], ["message", "Pesan", "readonly"], ["status", "Status", "select", [["baru", "Baru"], ["diproses", "Diproses"], ["selesai", "Selesai"]]], ["notes", "Catatan internal", "textarea"]] }
  };

  /* ---------- API ---------- */
  const demoStore = JSON.parse(JSON.stringify(Object.assign({
    requests: [{ id: "rq1", timestamp: "2026-11-14 10:30", report_id: "CHARIS-2026-001", report_title: "[Contoh] Biaya Satuan Layanan Rawat Jalan Puskesmas di Kabupaten X", name: "[Contoh] Nama Pemohon", institution: "[Contoh] Dinas Kesehatan", email: "contoh@email.org", reason: "Contoh alasan permintaan untuk bahan perencanaan.", lang: "id", status: "menunggu", decided_at: "", decided_note: "" }],
    reports: [{ id: "CHARIS-2026-001", title: "[Contoh] Biaya Satuan Layanan Rawat Jalan Puskesmas di Kabupaten X", drive_file_id: "", file_name: "", notes: "", updated: "" }],
    members: [], downloads: [], project_internal: [], stats: [{ id: "CHARIS-2026-004", kind: "repositori", reads: 12, downloads: 1, shares: 3, updated: "2026-11-18 10:00" }],
    subscribers: [{ id: "s1", timestamp: "2026-11-14 09:00", email: "contoh@email.org", lang: "id", status: "aktif" }], inquiries: [
    { id: "q1", timestamp: "2026-11-14 10:12", name: "[Contoh] Nama Pengirim", org: "[Contoh] Dinas Kesehatan", email: "contoh@email.org", phone: "", service: "financing", message: "Contoh pesan masuk dari formulir kontak.", lang: "id", status: "baru", notes: "" }
  ] }, window.DEMO_DATA)));
  async function api(payload) {
    if (DEMO) {
      await new Promise(r => setTimeout(r, 250));
      const list = demoStore[payload.type] || [];
      if (payload.action === "login") return { ok: true, token: "demo" };
      if (payload.action === "adminList") return { ok: true, data: list };
      if (payload.action === "save") {
        const row = payload.row; const i = list.findIndex(r => r.id === row.id);
        if (i >= 0) list[i] = Object.assign(list[i], row); else { row.id = "d" + Date.now(); list.push(row); }
        return { ok: true, data: row };
      }
      if (payload.action === "delete") { demoStore[payload.type] = list.filter(r => r.id !== payload.id); return { ok: true }; }
      if (payload.action === "decide") { const r = demoStore.requests.find(x => x.id === payload.id); if (r) r.status = payload.decision; return { ok: true }; }
      if (payload.action === "uploadPrivate") return { ok: false, error: "Upload hanya tersedia setelah API terhubung." };
      if (payload.action === "upload") return { ok: false, error: "Upload hanya tersedia setelah API terhubung." };
      return { ok: true };
    }
    const res = await fetch(cfg.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ token }, payload)) });
    const json = await res.json();
    if (!json.ok && json.error === "AUTH") { logout(true); throw new Error("Sesi berakhir. Silakan masuk lagi."); }
    return json;
  }

  /* ---------- auth ---------- */
  function showApp(on) { $("loginView").hidden = on; $("appView").hidden = !on; }
  $("demoNote").hidden = !DEMO;
  let setupMode = false;
  const pwRule = pw => pw.length < 10 ? "Password minimal 10 karakter." : (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) ? "Password harus berisi huruf dan angka." : "";
  function setMode(status) {
    setupMode = !!(status && !status.hasAdmin && status.setupOpen);
    const closed = !!(status && !status.hasAdmin && !status.setupOpen);
    $("setupNote").hidden = !setupMode; $("setupClosed").hidden = !closed;
    $("pw2Field").hidden = !setupMode; $("pwHint").hidden = !setupMode;
    $("pw").autocomplete = setupMode ? "new-password" : "current-password";
    $("loginTitle").textContent = setupMode ? "Buat akun superuser" : "Panel admin";
    $("loginLead").hidden = setupMode || closed;
    $("loginBtn").textContent = setupMode ? "Buat akun dan masuk" : "Masuk";
    $("loginBtn").disabled = closed;
  }
  if (!DEMO && !token) api({ action: "authStatus" }).then(setMode).catch(() => {});

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const em = $("em").value.trim(), pw = $("pw").value;
    $("loginErr").textContent = "";
    if (!em || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $("loginErr").textContent = "Masukkan email yang valid."; $("em").focus(); return; }
    if (!pw) { $("loginErr").textContent = "Masukkan password."; $("pw").focus(); return; }
    if (setupMode) {
      const p = pwRule(pw); if (p) { $("loginErr").textContent = p; $("pw").focus(); return; }
      if (pw !== $("pw2").value) { $("loginErr").textContent = "Kedua password tidak sama."; $("pw2").focus(); return; }
    }
    const label = $("loginBtn").textContent;
    $("loginBtn").disabled = true; $("loginBtn").textContent = "Memeriksa";
    try {
      const r = await api({ action: setupMode ? "bootstrap" : "login", email: em, password: pw });
      if (!r.ok) throw new Error(r.error || "Gagal masuk");
      token = r.token; try { sessionStorage.setItem("charis_token", token); } catch (err) {}
      $("pw").value = ""; $("pw2").value = "";
      if (setupMode) toast("Akun superuser dibuat. Simpan password Anda di tempat aman.");
      setMode({ hasAdmin: true }); showApp(true); select("inquiries"); checkApi();
    } catch (err) { $("loginErr").textContent = err.message; }
    $("loginBtn").disabled = false; $("loginBtn").textContent = label;
  });

  /* change password */
  $("pwBtn").addEventListener("click", () => { $("pwForm").reset(); $("pwErr").textContent = ""; $("pwDlg").showModal(); $("pwOld").focus(); });
  $("pwCancel").addEventListener("click", () => $("pwDlg").close());
  $("pwForm").addEventListener("submit", async e => {
    e.preventDefault();
    const cur = $("pwOld").value, n1 = $("pwNew").value, n2 = $("pwNew2").value;
    const p = !cur ? "Masukkan password lama." : pwRule(n1) || (n1 !== n2 ? "Kedua password baru tidak sama." : "");
    if (p) { $("pwErr").textContent = p; return; }
    $("pwSave").disabled = true;
    try {
      const r = DEMO ? { ok: true } : await api({ action: "changePassword", current: cur, password: n1 });
      if (!r.ok) throw new Error(r.error || "Gagal mengganti password.");
      $("pwDlg").close(); toast("Password diganti.");
    } catch (err) { $("pwErr").textContent = err.message; }
    $("pwSave").disabled = false;
  });
  function logout(silent) {
    if (!silent && !DEMO) api({ action: "logout" }).catch(() => {});
    token = null; try { sessionStorage.removeItem("charis_token"); } catch (e) {}
    showApp(false);
  }
  $("logoutBtn").addEventListener("click", () => logout(false));

  /* ---------- list ---------- */
  $("sideNav").addEventListener("click", e => { const b = e.target.closest("button[data-type]"); if (b) select(b.dataset.type); });
  async function select(t) {
    type = t; const d = DEF[t];
    document.querySelectorAll("#sideNav button").forEach(b => b.setAttribute("aria-current", b.dataset.type === t ? "page" : "false"));
    $("viewTitle").textContent = d.title; $("viewHint").textContent = d.hint;
    $("addBtn").hidden = !!d.readonlyAdd; $("q").value = "";
    $("table").querySelector("thead").innerHTML = "<tr>" + d.cols.map(c => "<th scope=\"col\">" + esc(c[1]) + "</th>").join("") + '<th scope="col"><span class="sr-only">Aksi</span></th></tr>';
    $("table").querySelector("tbody").innerHTML = ""; $("tableState").textContent = "Memuat";
    try {
      const r = await api({ action: "adminList", type: t });
      if (!r.ok) throw new Error(r.error);
      rows = r.data || [];
      if (t === "stats") rows.sort((a, b) => (Number(b.reads) || 0) - (Number(a.reads) || 0));
      else if (["inquiries", "requests", "downloads", "subscribers"].includes(t)) rows.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
      if (t === "inquiries") updateCount();
      if (t === "requests") { const n = rows.filter(r => r.status === "menunggu").length; $("reqCount").hidden = !n; $("reqCount").textContent = n; }
      draw();
    } catch (err) { $("tableState").textContent = err.message || "Gagal memuat data."; }
  }
  $("reloadBtn").addEventListener("click", () => { if (type) select(type); });

  /* Warn when the live Web App still runs an older Code.gs (edited, but no new deployment version) */
  const EXPECTED_API = "2026-11-18c";
  function checkApi() {
    if (DEMO) return;
    fetch(cfg.API_URL).then(r => r.json()).then(j => {
      const v = j && j.version;
      if (v && v >= EXPECTED_API) return;
      $("apiWarn").innerHTML = "<strong>Kode Apps Script yang aktif belum versi terbaru" + (v ? " (" + esc(v) + ")" : "") + ".</strong> Di Apps Script, buka <em>Terapkan › Kelola deployment</em>, klik ikon pensil, pilih <em>Versi: Versi baru</em>, lalu <em>Terapkan</em>. Selama belum diperbarui, sebagian data (misalnya permintaan laporan) bisa tidak tersimpan atau tidak tampil.";
      $("apiWarn").hidden = false;
    }).catch(() => {});
  }

  function updateCount() {
    const n = rows.filter(r => r.status === "baru").length;
    $("newCount").hidden = !n; $("newCount").textContent = n;
  }
  function cell(k, v) {
    if (k === "published") return v === true || String(v).toUpperCase() === "TRUE" ? '<span class="pill on">Tayang</span>' : '<span class="pill">Draf</span>';
    if (k === "featured") return v === true || String(v).toUpperCase() === "TRUE" ? '<span class="pill on">Slider</span>' : "";
    if (k === "disclosure") return v ? '<span class="pill lvl-' + esc(v) + '">' + esc(v) + "</span>" : '<span class="pill">?</span>';
    if (k === "group") return esc({ leadership: "Pimpinan", experts: "Tenaga Ahli", associates: "Mitra Ahli" }[v] || v);
    if (k === "status" && ["menunggu", "disetujui", "ditolak", "aktif", "nonaktif"].includes(v)) return '<span class="pill st-' + esc(v) + '">' + esc(v) + "</span>";
    if (k === "status") return '<span class="pill st-' + esc(v) + '">' + esc(v || "-") + "</span>";
    if (k === "service") { const s = window.SERVICES.find(x => x.key === v); return esc(s ? s.id.t : v); }
    return esc(v);
  }
  function draw() {
    const d = DEF[type], q = $("q").value.trim().toLowerCase();
    const sel = rows.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
    $("table").querySelector("tbody").innerHTML = sel.map(r => "<tr>" + d.cols.map((c, i) => (i === 0 ? '<th scope="row">' : "<td>") + cell(c[0], r[c[0]]) + (i === 0 ? "</th>" : "</td>")).join("") +
      '<td class="act"><button type="button" class="btn btn-outline sm" data-edit="' + esc(r.id) + '">' + (["inquiries", "requests", "members", "downloads", "subscribers", "stats"].includes(type) ? "Buka" : "Edit") + "</button></td></tr>").join("");
    $("tableState").textContent = sel.length ? "" : "Belum ada data.";
  }
  $("q").addEventListener("input", draw);
  $("table").addEventListener("click", e => { const b = e.target.closest("[data-edit]"); if (b) openEdit(rows.find(r => String(r.id) === b.dataset.edit)); });
  $("addBtn").addEventListener("click", () => openEdit(null));

  /* ---------- edit dialog ---------- */
  const dlg = $("editDlg");
  function input(f, v) {
    const [k, label, kind, opts] = f, id = "fld-" + k, val = v == null ? "" : v;
    if (kind === "heading") return '<h3 class="dlg-sec">' + esc(label) + "</h3>";
    if (kind === "bool") return '<div class="field check"><input type="checkbox" id="' + id + '" name="' + k + '"' + (isOn(val) ? " checked" : "") + '><label for="' + id + '">' + esc(label) + "</label></div>";
    let ctl;
    if (kind === "textarea") ctl = '<textarea id="' + id + '" name="' + k + '" rows="3">' + esc(val) + "</textarea>";
    else if (kind === "long") ctl = '<textarea id="' + id + '" name="' + k + '" rows="9">' + esc(val) + "</textarea>";
    else if (kind === "select") ctl = '<select id="' + id + '" name="' + k + '"><option value="">Pilih</option>' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(val) === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>";
    else if (kind === "readonly") ctl = '<div class="ro" id="' + id + '">' + esc(val).replace(/\n/g, "<br>") + "</div>";
    else if (kind === "image" || kind === "file") ctl = '<div class="upload"><input id="' + id + '" name="' + k + '" type="url" placeholder="Tempel link Google Drive atau unggah" value="' + esc(val) + '">' +
      '<label class="btn btn-outline sm">Unggah<input type="file" class="sr-only" data-target="' + id + '" accept="' + (kind === "image" ? "image/jpeg,image/png,image/webp" : "application/pdf,.docx,.pptx") + '"></label></div>' +
      (kind === "image" && val ? '<img class="thumb" src="' + esc(thumb(val)) + '" alt="">' : "");
    else if (kind === "privatefile") ctl = '<div class="upload"><input id="' + id + '" name="' + k + '" type="text" placeholder="ID file Google Drive (terisi otomatis setelah unggah)" value="' + esc(val) + '">' +
      '<label class="btn btn-outline sm">Unggah PDF<input type="file" class="sr-only" data-private="1" data-target="' + id + '" accept="application/pdf"></label></div>';
    else ctl = '<input id="' + id + '" name="' + k + '" type="' + (kind === "date" ? "date" : kind === "number" ? "number" : "text") + '" value="' + esc(val) + '">';
    return '<div class="field' + (kind === "long" || kind === "readonly" && k === "message" ? " wide" : "") + '"><label for="' + id + '">' + esc(label) + "</label>" + ctl + "</div>";
  }
  function isOn(v) { return v === true || String(v).toUpperCase() === "TRUE"; }
  function thumb(url) { const m = String(url).match(/(?:\/d\/|id=)([\w-]{20,})/); return m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w300" : url; }
  function openEdit(row) {
    editing = row; const d = DEF[type];
    $("dlgTitle").textContent = (row ? (type === "inquiries" ? "Detail pesan" : "Edit ") : "Tambah ") + (type === "inquiries" ? "" : d.title.toLowerCase());
    $("dlgBody").innerHTML = d.fields.map(f => input(f, row ? row[f[0]] : (f[2] === "bool" ? f[0] !== "featured" : f[2] === "date" ? new Date().toISOString().slice(0, 10) : ""))).join("");
    $("delBtn").hidden = !row || !!d.decide; $("dlgStatus").textContent = "";
    $("saveBtn").textContent = d.decide ? "Proses keputusan" : d.readonly ? "Tutup" : "Simpan";
    $("saveBtn").hidden = d.decide && row && row.status !== "menunggu" ? false : false;
    dlg.showModal();
    const first = $("dlgBody").querySelector("input:not([type=checkbox]),textarea,select"); if (first) first.focus();
  }
  const closeDlg = () => dlg.close();
  $("dlgClose").addEventListener("click", closeDlg); $("cancelBtn").addEventListener("click", closeDlg);

  $("dlgBody").addEventListener("change", async e => {
    const inp = e.target.closest("input[type=file]"); if (!inp || !inp.files[0]) return;
    const file = inp.files[0];
    const priv = inp.dataset.private === "1";
    if (file.size > (priv ? 25 : 15) * 1024 * 1024) { $("dlgStatus").textContent = "File maksimal " + (priv ? 25 : 15) + " MB."; return; }
    $("dlgStatus").textContent = "Mengunggah " + file.name;
    try {
      const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(file); });
      const r = await api({ action: priv ? "uploadPrivate" : "upload", name: file.name, mimeType: file.type, data });
      if (!r.ok) throw new Error(r.error);
      if (priv) { $(inp.dataset.target).value = r.data.id; const fn = $("fld-file_name"); if (fn) fn.value = r.data.name; $("dlgStatus").textContent = "Tersimpan privat di Google Drive."; }
      else { $(inp.dataset.target).value = r.data.url; $("dlgStatus").textContent = "Terunggah ke Google Drive."; }
    } catch (err) { $("dlgStatus").textContent = err.message || "Gagal mengunggah."; }
    inp.value = "";
  });

  $("editForm").addEventListener("submit", async e => {
    e.preventDefault();
    const d = DEF[type], row = { id: editing ? editing.id : "" };
    d.fields.forEach(([k, , kind]) => {
      if (kind === "readonly" || kind === "heading") return;
      const el = $("fld-" + k); if (!el) return;
      row[k] = kind === "bool" ? el.checked : el.value.trim();
    });
    if (d.readonly) { closeDlg(); return; }
    if (d.decide) {
      if (!row.decision) { $("dlgStatus").textContent = "Pilih keputusan terlebih dahulu."; $("fld-decision").focus(); return; }
      $("saveBtn").disabled = true; $("dlgStatus").textContent = "Memproses dan mengirim email";
      try {
        const r = await api({ action: "decide", id: editing.id, decision: row.decision, note: row.decided_note });
        if (!r.ok) throw new Error(r.error);
        closeDlg(); toast(row.decision === "disetujui" ? "Disetujui. Email akses terkirim." : "Ditolak. Email terkirim."); select(type);
      } catch (err) { $("dlgStatus").textContent = err.message || "Gagal memproses."; }
      $("saveBtn").disabled = false; return;
    }
    if (type === "reports") row.updated = new Date().toISOString().slice(0, 10);
    const tf = d.fields.find(f => !["heading", "select", "bool", "readonly"].includes(f[2])) || d.fields[0];
    const titleKey = tf[0];
    if (!["inquiries", "members", "subscribers"].includes(type) && !row[titleKey]) { $("dlgStatus").textContent = "Isi kolom '" + tf[1] + "' terlebih dahulu."; $("fld-" + titleKey).focus(); return; }
    if (type === "projects" && !row.disclosure) { $("dlgStatus").textContent = "Pilih tingkat keterbukaan terlebih dahulu."; $("fld-disclosure").focus(); return; }
    $("saveBtn").disabled = true; $("dlgStatus").textContent = "Menyimpan";
    try {
      const r = await api({ action: "save", type, row });
      if (!r.ok) throw new Error(r.error);
      closeDlg(); toast("Tersimpan."); select(type);
    } catch (err) { $("dlgStatus").textContent = err.message || "Gagal menyimpan."; }
    $("saveBtn").disabled = false;
  });

  $("delBtn").addEventListener("click", async () => {
    if (!editing) return;
    if ($("delBtn").dataset.confirm !== "1") { $("delBtn").dataset.confirm = "1"; $("delBtn").textContent = "Klik lagi untuk hapus"; setTimeout(() => { $("delBtn").dataset.confirm = ""; $("delBtn").textContent = "Hapus"; }, 4000); return; }
    $("delBtn").dataset.confirm = ""; $("delBtn").textContent = "Hapus";
    try {
      const r = await api({ action: "delete", type, id: editing.id });
      if (!r.ok) throw new Error(r.error);
      closeDlg(); toast("Dihapus."); select(type);
    } catch (err) { $("dlgStatus").textContent = err.message || "Gagal menghapus."; }
  });

  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 2500); }

  /* ---------- start ---------- */
  if (token) {
    (DEMO ? Promise.resolve({ ok: true }) : api({ action: "session" })).then(r => { if (r.ok) { showApp(true); select("inquiries"); checkApi(); } else logout(true); }).catch(() => logout(true));
  }
})();
