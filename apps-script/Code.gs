/**
 * CHARIS website backend — Google Apps Script
 * --------------------------------------------------------------
 * Storage : the Google Spreadsheet this script is bound to
 * Files   : a Google Drive folder created by setup()
 * API     : deployed as a Web App (Execute as: Me, Access: Anyone)
 *
 * First-time steps (see README):
 *   1. Run setup()            -> creates sheets, headers, Drive folders, and opens a
 *                                60-minute window to create the superuser account
 *   2. Deploy > New deployment > Web app
 *   3. Open /admin/ on the website, enter the script owner's email and a new password.
 *      No password is ever written in this file: only a salted, stretched hash is kept
 *      in Script Properties. Forgot it? Run resetAdmin() and repeat step 3.
 */

const SCHEMA = {
  publications: ['id', 'title_id', 'title_en', 'summary_id', 'summary_en', 'category', 'year', 'file_url', 'cover_url', 'date', 'featured', 'published'],
  news:         ['id', 'category', 'title_id', 'title_en', 'excerpt_id', 'excerpt_en', 'body_id', 'body_en', 'image_url', 'date', 'featured', 'published'],
  team:         ['id', 'group', 'name', 'role_id', 'role_en', 'bio_id', 'bio_en', 'photo_url', 'order', 'published'],
  /* Portfolio. 'disclosure' A/B/C/D controls which columns are public (see PROJECT_PUBLIC). */
  projects:     ['id', 'disclosure', 'title_id', 'title_en', 'client_type', 'service', 'component', 'region', 'year_start', 'year_end', 'duration_months', 'status', 'role',
                 'summary_id', 'summary_en', 'methods_id', 'methods_en', 'outputs_id', 'outputs_en', 'capacity_id', 'capacity_en', 'keywords', 'sdg',
                 'client', 'funder', 'partners', 'official_title', 'location_detail', 'image_url', 'related_publications', 'testimonial_id', 'testimonial_en', 'testimonial_by',
                 'date', 'published'],
  /* Internal project data: NEVER returned by the public API. */
  project_internal: ['id', 'contract_no', 'contract_date', 'contract_value', 'employer_contact', 'team', 'disclosure_basis', 'consent_link', 'last_review', 'notes'],
  /* new columns are appended at the end so existing sheets keep their data */
  partners:     ['id', 'name', 'logo_url', 'url', 'published', 'short', 'category', 'relation', 'logo_ok', 'order'],
  inquiries:    ['id', 'timestamp', 'name', 'org', 'email', 'phone', 'service', 'message', 'lang', 'status', 'notes'],
  subscribers:  ['id', 'timestamp', 'email', 'lang', 'status'],
  /* knowledge products: full PDFs kept privately in Drive, matched to repository ids */
  reports:      ['id', 'title', 'drive_file_id', 'file_name', 'notes', 'updated'],
  requests:     ['id', 'timestamp', 'report_id', 'report_title', 'name', 'institution', 'email', 'reason', 'lang', 'status', 'decided_at', 'decided_note'],
  members:      ['id', 'email', 'name', 'institution', 'code_hash', 'code_salt', 'created', 'last_login', 'status'],
  downloads:    ['id', 'timestamp', 'email', 'report_id']
};
const PUBLIC_TYPES = ['publications', 'news', 'team', 'projects', 'partners'];
/* Columns of a project shown publicly, by disclosure level. Level D (or empty) is never shown. */
const PROJECT_CORE = ['id', 'disclosure', 'title_id', 'title_en', 'client_type', 'service', 'component', 'region', 'year_start', 'year_end', 'duration_months', 'status', 'role',
  'summary_id', 'summary_en', 'methods_id', 'methods_en', 'outputs_id', 'outputs_en', 'capacity_id', 'capacity_en', 'keywords', 'sdg', 'date'];
const PROJECT_NAMED = ['client', 'funder', 'partners', 'official_title', 'location_detail', 'image_url', 'testimonial_id', 'testimonial_en', 'testimonial_by'];
const PROJECT_PUBLIC = { A: PROJECT_CORE.concat(PROJECT_NAMED, ['related_publications']), B: PROJECT_CORE.concat(PROJECT_NAMED), C: PROJECT_CORE };
/* Bump when Code.gs changes. The admin panel compares it with the version it expects, so a stale
   Web App deployment (Code.gs edited but no new deployment version) is reported on screen. */
const API_VERSION = '2026-11-17';
const SESSION_HOURS = 6;
const PROPS = PropertiesService.getScriptProperties();

/* ============================================================
   SETUP (run manually from the editor)
   ============================================================ */
/* Fills the "partners" tab with organisations the team has worked with (from the founder's CV).
   Run once from the editor. Nothing is added if rows with relation "tim" already exist. */
function seedTeamExperience() {
  const sh = SpreadsheetApp.getActive().getSheetByName('partners');
  if (!sh) throw new Error('Jalankan setup() dulu.');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = function (k) { return head.indexOf(k); };
  const existing = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [];
  if (existing.some(function (r) { return String(r[col('relation')]) === 'tim'; })) { Logger.log('Sudah ada data pengalaman tim. Tidak ada yang ditambahkan.'); return; }
  const list = [
    ["Kementerian Kesehatan Republik Indonesia", "KEMENKES", "gov"],
    ["Kementerian Kesehatan Timor-Leste", "MOH TL", "gov"],
    ["Dinas Kesehatan Kabupaten Badung", "DINKES BADUNG", "gov"],
    ["Dinas Kesehatan Kabupaten Gianyar", "DINKES GIANYAR", "gov"],
    ["Dinas Kesehatan Kota Denpasar", "DINKES DENPASAR", "gov"],
    ["Dinas Kesehatan Kabupaten Buton", "DINKES BUTON", "gov"],
    ["Dinas Kesehatan Kabupaten Sumba Barat Daya", "DINKES SBD", "gov"],
    ["Dinas Kesehatan Kabupaten Sorong", "DINKES SORONG", "gov"],
    ["Perwakilan BKKBN Provinsi Bali", "BKKBN BALI", "gov"],
    ["Rumah Sakit Mata Bali Mandara", "RSMBM", "gov"],
    ["World Health Organization – Indonesia", "WHO", "un"],
    ["World Health Organization – Timor-Leste", "WHO", "un"],
    ["UNAIDS Indonesia", "UNAIDS", "un"],
    ["UNICEF Indonesia", "UNICEF", "un"],
    ["UNFPA Indonesia", "UNFPA", "un"],
    ["The Global Fund to Fight AIDS, Tuberculosis and Malaria", "THE GLOBAL FUND", "intl"],
    ["USAID – EPIC, FHI 360", "USAID", "intl"],
    ["U.S. Centers for Disease Control and Prevention", "US CDC", "intl"],
    ["Oxford Policy Management", "OPM", "intl"],
    ["Global Alliance for Improved Nutrition", "GAIN", "intl"],
    ["The David and Lucile Packard Foundation", "PACKARD", "intl"],
    ["World Mosquito Program", "WMP", "intl"],
    ["Plan International Indonesia", "PLAN", "intl"],
    ["International SOS", "INTERNATIONAL SOS", "intl"],
    ["Liam Charitable Fund", "LIAM", "intl"],
    ["APCASO", "APCASO", "ngo"],
    ["Indonesia AIDS Coalition", "IAC", "ngo"],
    ["Yayasan Spiritia", "SPIRITIA", "ngo"],
    ["Jaringan Indonesia Positif", "JIP", "ngo"],
    ["PKBI DKI Jakarta", "PKBI DKI", "ngo"],
    ["Organisasi Perubahan Sosial Indonesia", "OPSI", "ngo"],
    ["Yayasan Gemilang Sehat Indonesia", "YGSI", "ngo"],
    ["Yayasan Siklus Sehat Indonesia", "SIKLUS", "ngo"],
    ["YKIS", "YKIS", "ngo"],
    ["Universitas Udayana – Center for Public Health Innovation", "UNUD", "uni"],
    ["Institute for Population and Social Research, Mahidol University", "MAHIDOL", "uni"],
    ["The Kirby Institute, UNSW Sydney", "KIRBY", "uni"],
    ["Fakultas Kedokteran dan Ilmu Kesehatan, Universitas Warmadewa", "WARMADEWA", "uni"]
  ];
  const rows = list.map(function (o, i) {
    const r = new Array(head.length).fill('');
    r[col('id')] = 'ORG-' + String(i + 1).padStart(3, '0'); r[col('name')] = o[0]; r[col('short')] = o[1]; r[col('category')] = o[2];
    r[col('relation')] = 'tim'; r[col('logo_ok')] = false; r[col('order')] = i + 1; r[col('published')] = true;
    return r;
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
  CacheService.getScriptCache().remove('pub_partners');
  Logger.log(rows.length + ' lembaga ditambahkan.');
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SCHEMA).forEach(function (type) {
    let sh = ss.getSheetByName(type);
    if (!sh) sh = ss.insertSheet(type);
    const headers = SCHEMA[type];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#E8F0EF');
    sh.setFrozenRows(1);
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  if (!PROPS.getProperty('PRIVATE_FOLDER_ID')) {
    const pf = DriveApp.createFolder('CHARIS Laporan Lengkap (PRIVAT)');
    PROPS.setProperty('PRIVATE_FOLDER_ID', pf.getId());
  }
  if (!PROPS.getProperty('SITE_URL')) PROPS.setProperty('SITE_URL', 'https://USERNAME.github.io/charis-website/');
  if (!PROPS.getProperty('FOLDER_ID')) {
    const folder = DriveApp.createFolder('CHARIS Website Uploads');
    PROPS.setProperty('FOLDER_ID', folder.getId());
  }
  if (!PROPS.getProperty('NOTIFY_EMAIL')) {
    PROPS.setProperty('NOTIFY_EMAIL', Session.getEffectiveUser().getEmail());
  }
  Logger.log('Setup selesai. Folder unggahan: ' + PROPS.getProperty('FOLDER_ID'));
  if (!PROPS.getProperty('ADMIN_HASH')) openSetupWindow_();
  else Logger.log('Akun superuser sudah ada (' + PROPS.getProperty('ADMIN_EMAIL') + '). Lupa password? Jalankan resetAdmin().');
}

/* First portfolio entry (anonymised, level C) plus its private record. Run from the editor.
   Safe to run again: it updates the texts of PRJ-2026-001 and keeps the private record as it is. */
function seedFirstPortfolio() {
  const pub = {
    "id": "PRJ-2026-001",
    "disclosure": "C",
    "title_id": "Kajian kerangka strategi keberlanjutan klinik berbasis komunitas menjelang berakhirnya pendanaan donor",
    "title_en": "Sustainability strategy framework for community-based clinics preparing for the end of donor funding",
    "client_type": "Kemitraan pemerintah dan LSM",
    "service": "planning",
    "component": "financing",
    "region": "Nasional · 7 provinsi",
    "year_start": "2026",
    "year_end": "",
    "duration_months": "",
    "status": "berjalan",
    "role": "Pengalaman tim (sebelum CHARIS)",
    "summary_id": "Sebelum CHARIS berdiri, anggota tim kami sebagai konsultan individu merancang dan melaksanakan kajian kesiapan keberlanjutan di tujuh klinik berbasis komunitas yang selama ini didukung donor kesehatan global. Kajian menilai seberapa siap setiap klinik tetap melayani, termasuk bagi populasi kunci, ketika dukungan donor berkurang. Pada lokakarya keberlanjutan, setiap klinik menyusun rencana tindak lanjut tiga bulan dan peta jalan menuju 2030; hasilnya dianalisis untuk memetakan kesenjangan antara target dan tindakan, lalu diterjemahkan menjadi kerangka strategi, perangkat kerja, dan pendampingan bagi pengelola klinik.",
    "summary_en": "Before CHARIS was established, a member of our team, working as an individual consultant, designed and led a sustainability readiness study across seven community-based clinics supported by a global health donor. The study assessed how ready each clinic is to keep serving its clients, including key populations, as donor support declines. At a sustainability workshop, each clinic drafted a three-month action plan and a roadmap to 2030; these were analysed to map the gap between targets and actions, and turned into a strategy framework, practical tools, and ongoing support for clinic managers.",
    "methods_id": "Penilaian mandiri kapasitas klinik (35 butir, 9 domain) oleh pimpinan, staf keuangan, dan perwakilan komunitas; dashboard pemantauan langsung dwibahasa; tipologi kesiapan transisi (kelembagaan dan finansial); wawancara mendalam pengelola klinik untuk mengklarifikasi perbedaan persepsi; pemetaan ke enam komponen kerangka keberlanjutan; lokakarya keberlanjutan tiga hari dengan penyusunan rencana tindak lanjut dan peta jalan 2030 per klinik; analisis dokumen dan penilaian mutu rencana tindak lanjut",
    "methods_en": "Clinic capacity self-assessment (35 items, 9 domains) by clinic heads, finance staff, and community representatives; bilingual live monitoring dashboard; transition readiness typology (institutional and financial); in-depth interviews with clinic managers to clarify diverging views; mapping to six sustainability framework components; three-day sustainability workshop in which each clinic drafted an action plan and a 2030 roadmap; document analysis and quality appraisal of the action plans",
    "outputs_id": "Instrumen penilaian dan panduan skoring, dashboard interaktif, perangkat Excel (cek kesiapan, biaya per kunjungan, proyeksi arus kas), modul pelatihan lima sesi, laporan kerangka strategi dan profil kesiapan per klinik, rangkuman rencana tindak lanjut dan peta jalan 2030 lintas klinik, kertas kerja akademis",
    "outputs_en": "Assessment instrument and scoring guide, interactive dashboard, Excel toolkit (readiness checks, cost per visit, cash-flow projection), five-session training module, strategy framework report and clinic readiness profiles, cross-clinic summary of action plans and 2030 roadmaps, academic working paper",
    "capacity_id": "Pelatihan lima sesi bagi pimpinan dan staf keuangan klinik: menilai kesiapan, menghitung biaya per kunjungan, kredensialing JKN dan kerja sama dengan pemerintah daerah, proyeksi arus kas, serta rencana transisi yang tetap menjaga akses layanan; lokakarya tiga hari dan pendampingan revisi rencana tindak lanjut",
    "capacity_en": "Five-session training for clinic heads and finance staff: assessing readiness, costing a visit, JKN credentialing and local government contracting, cash-flow projection, and transition plans that protect access to services; three-day workshop and coaching to revise the action plans",
    "keywords": "keberlanjutan program, transisi pendanaan donor, klinik berbasis komunitas, populasi kunci, JKN, biaya per kunjungan, penilaian mandiri, dashboard, rencana tindak lanjut, peta jalan 2030, swakelola tipe III",
    "sdg": "SDG 3.8 · SDG 17.17",
    "client": "",
    "funder": "",
    "partners": "",
    "official_title": "",
    "location_detail": "",
    "image_url": "",
    "related_publications": "CHARIS-2026-001",
    "testimonial_id": "",
    "testimonial_en": "",
    "testimonial_by": "",
    "date": "2026-11-11",
    "published": true
  };
  const internal = {
    "id": "PRJ-2026-001",
    "contract_no": "",
    "contract_date": "",
    "contract_value": "",
    "employer_contact": "[Isi nama, jabatan, dan kontak pemberi kerja]",
    "team": "Ngakan Putu Anom Harjana – konsultan utama (kontrak individu, sebelum CHARIS berdiri)",
    "disclosure_basis": "Tingkat C ditetapkan pemilik: semua nama lembaga dan klinik disamarkan. Naikkan ke A/B hanya setelah ada persetujuan tertulis pemberi kerja.",
    "consent_link": "",
    "last_review": "2026-11-18",
    "notes": "Kajian Kerangka Strategi Keberlanjutan CBC. Kolaborasi Kementerian Kesehatan dan Yayasan Spiritia; tujuh klinik CBC yang didukung Global Fund. Penilaian mandiri INS-01 15–28 Oktober 2026, dilanjutkan KII pengelola (INS-02E), perangkat Excel, modul pelatihan MP1–MP5, dan Workshop Keberlanjutan CBC 9–11 November 2026 (RTL dan Peta Jalan 2030). Temuan agregat anonim terbit sebagai Kertas Kerja CHARIS No. 1/2026 (CHARIS-2026-001) dengan izin pemberi kerja; simpan bukti izin di consent_link."
  };
  const existed = findBy_('projects', 'id', pub.id).length > 0;
  save_('projects', pub);                                  /* insert, or update the texts if the row already exists */
  if (!findBy_('project_internal', 'id', internal.id).length) save_('project_internal', internal);
  CacheService.getScriptCache().remove('pub_projects');
  Logger.log(pub.id + (existed ? ' diperbarui' : ' ditambahkan') + ' di Portofolio (tingkat C). Kertas kerja terkait: ' + pub.related_publications + '.');
}

/** Diagnostic: run from the editor and read the log when something does not appear in the admin panel. */
function cekSistem() {
  const ss = SpreadsheetApp.getActive();
  Logger.log('Versi Code.gs: ' + API_VERSION);
  Object.keys(SCHEMA).forEach(function (t) {
    const sh = ss.getSheetByName(t);
    Logger.log((sh ? 'OK   ' : 'HILANG ') + t + (sh ? ' — ' + Math.max(sh.getLastRow() - 1, 0) + ' baris' : ''));
  });
  Logger.log('Email notifikasi: ' + (PROPS.getProperty('NOTIFY_EMAIL') || '(kosong)'));
  Logger.log('Akun superuser: ' + (PROPS.getProperty('ADMIN_EMAIL') || '(belum dibuat)'));
  Logger.log('Sisa kuota email hari ini: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Ingat: setiap kali Code.gs diubah, buat versi baru di Terapkan › Kelola deployment › Edit (ikon pensil) › Versi: Versi baru › Terapkan.');
}

/** Forgot the admin password? Run this from the editor, then create a new one at /admin/ within 60 minutes. */
function resetAdmin() {
  ['ADMIN_EMAIL', 'ADMIN_SALT', 'ADMIN_HASH', 'ADMIN_ITER'].forEach(function (k) { PROPS.deleteProperty(k); });
  CacheService.getScriptCache().remove('login_fails');
  openSetupWindow_();
}

/* The superuser account can only be created (a) while no account exists, (b) within 60 minutes
   after setup()/resetAdmin() was run by the script owner, and (c) with the script owner's email. */
const SETUP_WINDOW_MIN = 60;
function openSetupWindow_() {
  const owner = Session.getEffectiveUser().getEmail();
  PROPS.setProperty('OWNER_EMAIL', owner);
  PROPS.setProperty('SETUP_UNTIL', String(Date.now() + SETUP_WINDOW_MIN * 60000));
  Logger.log('Buka panel admin website (/admin/) dalam ' + SETUP_WINDOW_MIN + ' menit, lalu buat akun superuser dengan email: ' + owner);
}

/** Set the public website address used in emails to members. */
function setSiteUrl() {
  PROPS.setProperty('SITE_URL', 'https://USERNAME.github.io/charis-website/');
}

/** Optional: change the email that receives contact-form notifications. */
function setNotifyEmail() {
  PROPS.setProperty('NOTIFY_EMAIL', 'email@contoh.org');
}

/* ============================================================
   HTTP ENTRY POINTS
   ============================================================ */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'list') return json_({ ok: true, data: listPublic_(p.type) });
    return json_({ ok: true, service: 'CHARIS API', version: API_VERSION });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'contact':  return json_(contact_(body));
      case 'subscribe': return json_(subscribe_(body));
      case 'authStatus': return json_(authStatus_());
      case 'bootstrap': return json_(bootstrap_(body));
      case 'login':    return json_(login_(body.email, body.password));
      case 'changePassword': requireAuth_(body.token); return json_(changePassword_(body));
      case 'logout':   requireAuth_(body.token); CacheService.getScriptCache().remove('s_' + body.token); return json_({ ok: true });
      case 'adminList': requireAuth_(body.token); return json_({ ok: true, data: readAll_(checkType_(body.type)).map(function (r) { delete r.code_hash; delete r.code_salt; return r; }) });
      case 'save':     requireAuth_(body.token); return json_({ ok: true, data: save_(checkType_(body.type), body.row) });
      case 'delete':   requireAuth_(body.token); remove_(checkType_(body.type), body.id); return json_({ ok: true });
      case 'upload':   requireAuth_(body.token); return json_({ ok: true, data: upload_(body) });
      case 'session':  requireAuth_(body.token); return json_({ ok: true });
      /* knowledge products: public */
      case 'requestReport': return json_(requestReport_(body));
      case 'memberLogin':   return json_(memberLogin_(body));
      case 'memberNewCode': return json_(memberNewCode_(body));
      /* knowledge products: member session */
      case 'memberLibrary': return json_(memberLibrary_(body.mtoken));
      case 'memberDownload': return json_(memberDownload_(body.mtoken, body.report_id));
      case 'memberLogout':  CacheService.getScriptCache().remove('m_' + body.mtoken); return json_({ ok: true });
      /* knowledge products: admin */
      case 'decide':   requireAuth_(body.token); return json_(decide_(body.id, body.decision, body.note));
      case 'uploadPrivate': requireAuth_(body.token); return json_({ ok: true, data: uploadPrivate_(body) });
      default:         return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

/* ============================================================
   PUBLIC
   ============================================================ */
function listPublic_(type) {
  if (PUBLIC_TYPES.indexOf(type) < 0) throw new Error('Invalid type');
  const cache = CacheService.getScriptCache();
  const hit = cache.get('pub_' + type);
  if (hit) return JSON.parse(hit);
  let rows = readAll_(type).filter(function (r) { return isTrue_(r.published); });
  if (type === 'projects') {
    rows = rows.filter(function (r) { return PROJECT_PUBLIC[String(r.disclosure).trim().toUpperCase()]; }).map(function (r) {
      const allowed = PROJECT_PUBLIC[String(r.disclosure).trim().toUpperCase()], o = {};
      allowed.forEach(function (k) { o[k] = r[k]; });
      o.disclosure = String(r.disclosure).trim().toUpperCase();
      return o;
    });
  }
  if (type === 'partners') {
    /* a logo is shown only when written permission is recorded; otherwise the name is shown as text */
    rows = rows.map(function (r) {
      return { id: r.id, name: r.name, short: r.short, category: r.category, relation: r.relation || 'tim', url: r.url,
               order: r.order, logo_url: isTrue_(r.logo_ok) ? r.logo_url : '' };
    });
  }
  try { cache.put('pub_' + type, JSON.stringify(rows), 300); } catch (e) { /* too large to cache */ }
  return rows;
}

function contact_(b) {
  if (b.website) return { ok: true };                       // honeypot filled: silently ignore bots
  const name = clean_(b.name, 120), email = clean_(b.email, 160), message = clean_(b.message, 4000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid input' };
  const cache = CacheService.getScriptCache();
  const key = 'c_' + email.toLowerCase();
  if (cache.get(key)) return { ok: false, error: 'Please wait a moment before sending again.' };
  cache.put(key, '1', 60);

  const row = {
    id: Utilities.getUuid(), timestamp: new Date(), name: name, org: clean_(b.org, 160), email: email,
    phone: clean_(b.phone, 40), service: clean_(b.service, 40), message: message, lang: clean_(b.lang, 4), status: 'baru', notes: ''
  };
  withLock_(function () { appendRow_('inquiries', row); });

  const to = PROPS.getProperty('NOTIFY_EMAIL');
  if (to) {
    try {
      MailApp.sendEmail({
        to: to, replyTo: email,
        subject: '[CHARIS] Permintaan baru dari ' + name + (row.org ? ' (' + row.org + ')' : ''),
        body: 'Nama: ' + name + '\nLembaga: ' + row.org + '\nEmail: ' + email + '\nTelepon: ' + row.phone +
              '\nLayanan: ' + row.service + '\n\nPesan:\n' + message + '\n\n— Dikirim dari website CHARIS'
      });
    } catch (e) { console.warn('contact_ email gagal: ' + e.message); }   /* the message is already saved */
  }
  return { ok: true };
}

function subscribe_(b) {
  if (b.website) return { ok: true };
  const email = clean_(b.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid email' };
  return withLock_(function () {
    const exists = readAll_('subscribers').some(function (r) { return String(r.email).toLowerCase() === email; });
    if (!exists) appendRow_('subscribers', { id: Utilities.getUuid().slice(0, 8), timestamp: new Date(), email: email, lang: clean_(b.lang, 4), status: 'aktif' });
    return { ok: true };
  });
}

/* ============================================================
   AUTH
   ============================================================ */
const PW_ITER = 1000;                                   /* key stretching: slows down guessing if properties ever leak */
function pwHash_(salt, password, iter) {
  let h = hash_(salt + String(password));
  for (let i = 1; i < (iter || 1); i++) h = hash_(h + salt);
  return h;
}
function setupOpen_() { return Date.now() < Number(PROPS.getProperty('SETUP_UNTIL') || 0); }
function pwProblem_(pw) {
  pw = String(pw || '');
  if (pw.length < 10) return 'Password minimal 10 karakter.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password harus berisi huruf dan angka.';
  return '';
}
function newSession_() {
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('s_' + token, '1', SESSION_HOURS * 3600);
  return { ok: true, token: token, hours: SESSION_HOURS };
}
function storePassword_(password) {
  const salt = Utilities.getUuid() + Utilities.getUuid();
  PROPS.setProperties({ ADMIN_SALT: salt, ADMIN_ITER: String(PW_ITER), ADMIN_HASH: pwHash_(salt, password, PW_ITER) });
}

/* tells the admin page whether to show "create superuser" or the normal login */
function authStatus_() {
  const exists = !!PROPS.getProperty('ADMIN_HASH');
  return { ok: true, hasAdmin: exists, setupOpen: !exists && setupOpen_() };
}

/* one-time creation of the superuser account from the admin page */
function bootstrap_(b) {
  return withLock_(function () {
    if (PROPS.getProperty('ADMIN_HASH')) return { ok: false, error: 'Akun superuser sudah ada. Silakan masuk.' };
    if (!setupOpen_()) return { ok: false, error: 'Waktu pembuatan akun sudah habis. Jalankan setup() atau resetAdmin() di Apps Script, lalu coba lagi dalam 60 menit.' };
    const email = String(b.email || '').trim().toLowerCase(), owner = String(PROPS.getProperty('OWNER_EMAIL') || '').toLowerCase();
    if (!owner || email !== owner) return { ok: false, error: 'Gunakan email akun Google pemilik Apps Script ini.' };
    const problem = pwProblem_(b.password);
    if (problem) return { ok: false, error: problem };
    PROPS.setProperty('ADMIN_EMAIL', email);
    storePassword_(b.password);
    PROPS.deleteProperty('SETUP_UNTIL');
    try { MailApp.sendEmail(owner, 'Akun superuser panel admin CHARIS dibuat', 'Akun superuser panel admin website CHARIS baru saja dibuat untuk ' + email + ' (' + new Date() + ').\n\nJika ini bukan Anda, buka Apps Script dan jalankan resetAdmin() segera.'); } catch (e) { /* mail quota */ }
    return newSession_();
  });
}

function login_(email, password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= 5) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' };
  const salt = PROPS.getProperty('ADMIN_SALT'), stored = PROPS.getProperty('ADMIN_HASH');
  if (!salt || !stored) return { ok: false, error: 'Akun superuser belum dibuat. Jalankan setup() di Apps Script, lalu buka halaman ini lagi.' };
  const adminEmail = String(PROPS.getProperty('ADMIN_EMAIL') || '').toLowerCase();
  const emailOk = !adminEmail || String(email || '').trim().toLowerCase() === adminEmail;   /* accounts from older versions had no email */
  if (!emailOk || pwHash_(salt, password, Number(PROPS.getProperty('ADMIN_ITER') || 1)) !== stored) {
    cache.put('login_fails', String(fails + 1), 900);
    return { ok: false, error: 'Email atau password salah.' };
  }
  cache.remove('login_fails');
  if (!adminEmail && email) PROPS.setProperty('ADMIN_EMAIL', String(email).trim().toLowerCase());
  if (!PROPS.getProperty('ADMIN_ITER')) storePassword_(password);     /* upgrade old single-round hashes */
  return newSession_();
}

function changePassword_(b) {
  const salt = PROPS.getProperty('ADMIN_SALT');
  if (pwHash_(salt, b.current, Number(PROPS.getProperty('ADMIN_ITER') || 1)) !== PROPS.getProperty('ADMIN_HASH')) return { ok: false, error: 'Password lama salah.' };
  const problem = pwProblem_(b.password);
  if (problem) return { ok: false, error: problem };
  storePassword_(b.password);
  return { ok: true };
}

function requireAuth_(token) {
  if (!token || !CacheService.getScriptCache().get('s_' + token)) throw new Error('AUTH');
}

/* ============================================================
   DATA
   ============================================================ */
/* Returns the tab for a collection. Creates it, or adds missing header columns at the end,
   so data written by a newer Code.gs never fails on an older spreadsheet. */
function sheet_(type) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(type);
  const want = SCHEMA[type] || [];
  if (!sh) {
    sh = ss.insertSheet(type);
    if (want.length) { sh.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold').setBackground('#E8F0EF'); sh.setFrozenRows(1); }
    return sh;
  }
  if (want.length) {
    const last = Math.max(sh.getLastColumn(), 1);
    const have = sh.getRange(1, 1, 1, last).getValues()[0].map(String);
    const missing = want.filter(function (h) { return have.indexOf(h) < 0; });
    if (missing.length) {
      const start = have.join('') === '' ? 1 : last + 1;
      sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#E8F0EF');
    }
  }
  return sh;
}

function readAll_(type) {
  const sh = sheet_(type);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    const o = {};
    headers.forEach(function (h, i) {
      let v = r[i];
      if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Makassar', h === 'timestamp' ? "yyyy-MM-dd HH:mm" : 'yyyy-MM-dd');
      o[h] = v;
    });
    return o;
  });
}

function appendRow_(type, obj) {
  const sh = sheet_(type);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
}

function save_(type, row) {
  if (!row || typeof row !== 'object') throw new Error('Data kosong');
  return withLock_(function () {
    const sh = sheet_(type);
    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const idCol = headers.indexOf('id');
    const clean = {};
    SCHEMA[type].forEach(function (h) { if (row[h] !== undefined) clean[h] = sanitize_(row[h]); });
    if ('published' in clean) clean.published = isTrue_(clean.published);
    if ('featured' in clean) clean.featured = isTrue_(clean.featured);

    let rowIndex = -1;
    if (clean.id) for (let i = 1; i < values.length; i++) if (String(values[i][idCol]) === String(clean.id)) { rowIndex = i; break; }

    if (rowIndex === -1) {
      clean.id = clean.id || Utilities.getUuid().slice(0, 8);
      appendRow_(type, clean);
    } else {
      const current = values[rowIndex];
      const updated = headers.map(function (h, i) { return clean[h] !== undefined ? clean[h] : current[i]; });
      sh.getRange(rowIndex + 1, 1, 1, headers.length).setValues([updated]);
    }
    CacheService.getScriptCache().remove('pub_' + type);
    return clean;
  });
}

function remove_(type, id) {
  withLock_(function () {
    const sh = sheet_(type);
    const values = sh.getDataRange().getValues();
    const idCol = values[0].indexOf('id');
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][idCol]) === String(id)) { sh.deleteRow(i + 1); break; }
    }
    CacheService.getScriptCache().remove('pub_' + type);
  });
}

function upload_(b) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  if (allowed.indexOf(b.mimeType) < 0) throw new Error('Jenis file tidak diizinkan');
  const bytes = Utilities.base64Decode(b.data);
  if (bytes.length > 15 * 1024 * 1024) throw new Error('File maksimal 15 MB');
  const folder = DriveApp.getFolderById(PROPS.getProperty('FOLDER_ID'));
  const name = clean_(b.name, 150).replace(/[^\w.\- ]+/g, '_') || 'file';
  const file = folder.createFile(Utilities.newBlob(bytes, b.mimeType, name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: file.getId(), url: 'https://drive.google.com/file/d/' + file.getId() + '/view', name: name };
}

/* ============================================================
   KNOWLEDGE PRODUCTS: requests, approval, member access
   ============================================================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEMBER_SESSION_HOURS = 12;

function siteUrl_() { return (PROPS.getProperty('SITE_URL') || '').replace(/\/?$/, '/'); }
function findBy_(type, key, value) {
  return readAll_(type).filter(function (r) { return String(r[key]).toLowerCase() === String(value).toLowerCase(); });
}

function requestReport_(b) {
  if (b.website) return { ok: true };
  const r = {
    id: Utilities.getUuid().slice(0, 8), timestamp: new Date(), report_id: clean_(b.report_id, 60), report_title: clean_(b.report_title, 300),
    name: clean_(b.name, 120), institution: clean_(b.institution, 200), email: clean_(b.email, 160).toLowerCase(),
    reason: clean_(b.reason, 2000), lang: clean_(b.lang, 4), status: 'menunggu', decided_at: '', decided_note: ''
  };
  if (!r.report_id || !r.name || !r.institution || !r.reason || !EMAIL_RE.test(r.email)) return { ok: false, error: 'Invalid input' };
  const cache = CacheService.getScriptCache(), key = 'rq_' + r.email + '_' + r.report_id;
  if (cache.get(key)) return { ok: true, duplicate: true };          /* double click within 5 minutes */
  const dup = findBy_('requests', 'email', r.email).some(function (x) { return x.report_id === r.report_id && x.status === 'menunggu'; });
  if (dup) return { ok: true, duplicate: true };
  withLock_(function () { appendRow_('requests', r); });
  cache.put(key, '1', 300);                                          /* only after the row is really saved */
  CacheService.getScriptCache().remove('pub_requests');

  /* e-mails must never undo a saved request (quota, permission, bad address) */
  const mailErrors = [];
  const to = PROPS.getProperty('NOTIFY_EMAIL');
  try {
    if (to) MailApp.sendEmail({ to: to, replyTo: r.email, subject: '[CHARIS] Permintaan laporan: ' + r.report_title,
      body: 'Permintaan baru untuk laporan lengkap.\n\nLaporan: ' + r.report_title + ' (' + r.report_id + ')\nNama: ' + r.name + '\nInstansi: ' + r.institution +
            '\nEmail: ' + r.email + '\nAlasan:\n' + r.reason + '\n\nSetujui atau tolak di panel admin website (menu Permintaan laporan).' });
  } catch (e) { mailErrors.push('admin: ' + e.message); }
  try {
    MailApp.sendEmail({ to: r.email, subject: r.lang === 'en' ? 'CHARIS: we received your request' : 'CHARIS: permintaan Anda sudah kami terima',
      body: r.lang === 'en'
        ? 'Dear ' + r.name + ',\n\nThank you for requesting "' + r.report_title + '". Our team will review your request and reply by email, usually within 2 working days.\n\nCHARIS'
        : 'Yth. ' + r.name + ',\n\nTerima kasih atas permintaan Anda untuk laporan "' + r.report_title + '". Tim kami akan meninjau permintaan ini dan membalas melalui email, biasanya dalam 2 hari kerja.\n\nSalam,\nCHARIS' });
  } catch (e) { mailErrors.push('pemohon: ' + e.message); }
  if (mailErrors.length) console.warn('requestReport_ email gagal: ' + mailErrors.join(' | '));
  return { ok: true, saved: true };
}

function decide_(id, decision, note) {
  if (['disetujui', 'ditolak'].indexOf(decision) < 0) throw new Error('Keputusan tidak valid');
  const req = findBy_('requests', 'id', id)[0];
  if (!req) throw new Error('Permintaan tidak ditemukan');
  save_('requests', { id: id, status: decision, decided_at: Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm'), decided_note: clean_(note, 1000) });
  const en = req.lang === 'en';
  if (decision === 'ditolak') {
    MailApp.sendEmail({ to: req.email, subject: en ? 'CHARIS: about your report request' : 'CHARIS: tentang permintaan laporan Anda',
      body: (en ? 'Dear ' + req.name + ',\n\nThank you for your interest in "' + req.report_title + '". We are unable to share the full report for this request.'
                : 'Yth. ' + req.name + ',\n\nTerima kasih atas minat Anda pada laporan "' + req.report_title + '". Saat ini kami belum dapat membagikan laporan lengkap untuk permintaan ini.') +
            (note ? '\n\n' + note : '') + (en ? '\n\nThe full HTML version remains open on our website.\n\nCHARIS' : '\n\nVersi HTML laporan tetap dapat dibaca terbuka di website kami.\n\nSalam,\nCHARIS') });
    return { ok: true };
  }
  /* approved: make sure a member account exists, send access details */
  let member = findBy_('members', 'email', req.email)[0], code = '';
  if (!member) {
    code = newCode_();
    const salt = Utilities.getUuid();
    withLock_(function () { appendRow_('members', { id: Utilities.getUuid().slice(0, 8), email: req.email, name: req.name, institution: req.institution,
      code_hash: hash_(salt + code), code_salt: salt, created: new Date(), last_login: '', status: 'aktif' }); });
  }
  const link = siteUrl_() + '#/member';
  MailApp.sendEmail({ to: req.email, subject: en ? 'CHARIS: your report request is approved' : 'CHARIS: permintaan laporan Anda disetujui',
    body: en
      ? 'Dear ' + req.name + ',\n\nYour request for "' + req.report_title + '" has been approved.\n\nSign in to the CHARIS member area to download it:\n' + link + '\nEmail: ' + req.email +
        (code ? '\nAccess code: ' + code + '\n\nKeep this code private. You can request a new code from the sign-in page at any time.' : '\nUse the access code you received earlier, or request a new one from the sign-in page.') +
        (note ? '\n\nNote from our team: ' + note : '') + '\n\nCHARIS'
      : 'Yth. ' + req.name + ',\n\nPermintaan Anda untuk laporan "' + req.report_title + '" telah disetujui.\n\nMasuk ke member area CHARIS untuk mengunduhnya:\n' + link + '\nEmail: ' + req.email +
        (code ? '\nKode akses: ' + code + '\n\nJaga kerahasiaan kode ini. Anda bisa meminta kode baru dari halaman masuk kapan saja.' : '\nGunakan kode akses yang sudah Anda terima sebelumnya, atau minta kode baru dari halaman masuk.') +
        (note ? '\n\nCatatan dari tim kami: ' + note : '') + '\n\nSalam,\nCHARIS' });
  return { ok: true };
}

function newCode_() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s.slice(0, 5) + '-' + s.slice(5);
}

function memberLogin_(b) {
  const email = clean_(b.email, 160).toLowerCase(), code = clean_(b.code, 20).toUpperCase().replace(/\s/g, '');
  const cache = CacheService.getScriptCache(), fkey = 'mf_' + email, fails = Number(cache.get(fkey) || 0);
  if (fails >= 5) return { ok: false, error: 'locked' };
  const m = findBy_('members', 'email', email)[0];
  if (!m || m.status !== 'aktif' || hash_(m.code_salt + code) !== m.code_hash) {
    cache.put(fkey, String(fails + 1), 900);
    return { ok: false, error: 'invalid' };
  }
  cache.remove(fkey);
  save_('members', { id: m.id, last_login: Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm') });
  const t = Utilities.getUuid() + Utilities.getUuid();
  cache.put('m_' + t, email, MEMBER_SESSION_HOURS * 3600);
  return { ok: true, mtoken: t, name: m.name };
}

function memberNewCode_(b) {
  const email = clean_(b.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Invalid email' };
  const cache = CacheService.getScriptCache();
  if (cache.get('nc_' + email)) return { ok: true };
  cache.put('nc_' + email, '1', 600);
  const m = findBy_('members', 'email', email)[0];
  if (m && m.status === 'aktif') {             /* always answer ok so emails cannot be probed */
    const code = newCode_(), salt = Utilities.getUuid();
    save_('members', { id: m.id, code_hash: hash_(salt + code), code_salt: salt });
    MailApp.sendEmail({ to: email, subject: 'CHARIS: kode akses baru / new access code',
      body: 'Kode akses baru Anda / Your new access code: ' + code + '\n\n' + siteUrl_() + '#/member\n\nJika Anda tidak memintanya, abaikan email ini. / If you did not ask for this, ignore this email.\n\nCHARIS' });
  }
  return { ok: true };
}

function memberEmail_(mtoken) {
  const email = mtoken && CacheService.getScriptCache().get('m_' + mtoken);
  if (!email) throw new Error('MAUTH');
  return email;
}

function memberLibrary_(mtoken) {
  const email = memberEmail_(mtoken);
  const reports = readAll_('reports');
  const approved = findBy_('requests', 'email', email);
  const seen = {};
  const data = approved.filter(function (r) { if (seen[r.report_id + r.status]) return false; seen[r.report_id + r.status] = 1; return true; }).map(function (r) {
    const rep = reports.filter(function (x) { return x.id === r.report_id; })[0];
    return { report_id: r.report_id, title: r.report_title, status: r.status, requested: r.timestamp, available: r.status === 'disetujui' && !!(rep && rep.drive_file_id) };
  });
  const m = findBy_('members', 'email', email)[0] || {};
  return { ok: true, data: data, name: m.name || '', email: email };
}

function memberDownload_(mtoken, reportId) {
  const email = memberEmail_(mtoken);
  const ok = findBy_('requests', 'email', email).some(function (r) { return r.report_id === reportId && r.status === 'disetujui'; });
  if (!ok) return { ok: false, error: 'not_approved' };
  const rep = readAll_('reports').filter(function (x) { return x.id === reportId; })[0];
  if (!rep || !rep.drive_file_id) return { ok: false, error: 'not_available' };
  const blob = DriveApp.getFileById(rep.drive_file_id).getBlob();
  withLock_(function () { appendRow_('downloads', { id: Utilities.getUuid().slice(0, 8), timestamp: new Date(), email: email, report_id: reportId }); });
  return { ok: true, name: rep.file_name || (reportId + '.pdf'), mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function uploadPrivate_(b) {
  if (b.mimeType !== 'application/pdf') throw new Error('Laporan lengkap harus PDF');
  const bytes = Utilities.base64Decode(b.data);
  if (bytes.length > 25 * 1024 * 1024) throw new Error('File maksimal 25 MB');
  const folder = DriveApp.getFolderById(PROPS.getProperty('PRIVATE_FOLDER_ID'));
  const name = clean_(b.name, 150).replace(/[^\w.\- ]+/g, '_') || 'laporan.pdf';
  const file = folder.createFile(Utilities.newBlob(bytes, b.mimeType, name));   /* NOT shared: stays private */
  return { id: file.getId(), name: name };
}

/* ============================================================
   UTILITIES
   ============================================================ */
function checkType_(type) { if (!SCHEMA[type]) throw new Error('Invalid type'); return type; }
function isTrue_(v) { return v === true || ['true', 'ya', 'yes', '1', 'y'].indexOf(String(v).toLowerCase().trim()) >= 0; }
function clean_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }
function sanitize_(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  let s = String(v == null ? '' : v).slice(0, 20000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;                  // prevent spreadsheet formula injection
  return s;
}
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
