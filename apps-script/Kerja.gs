/**
 * CHARIS Ruang Kerja (workspace): accounts and roles, projects, milestones, tasks,
 * comments and in-app notifications. Lives in the same Apps Script project as Code.gs
 * (add this file with File > New > Script, name it "Kerja").
 *
 * Data is kept in a separate spreadsheet "CHARIS Ruang Kerja", created by siapkanRuangKerja(),
 * so operational data never sits next to website content.
 *
 * First-time steps:
 *   1. Run siapkanRuangKerja() once from the editor. It creates the spreadsheet, the daily
 *      deadline trigger, and the superadmin account. The temporary password is shown in the log.
 *   2. Deploy > Manage deployments > edit > New version.
 *   3. Open /kerja/ on the website, sign in, and set a new password.
 */

/* Bump when this file changes; /kerja/ shows a notice when the Web App deployment is older. */
const K_VERSION = '2026-11-19-f8';
const K_ROLES = ['superadmin', 'direktur', 'admin', 'bendahara', 'peneliti', 'konsultan'];
const K_SEE_ALL = ['superadmin', 'direktur', 'admin'];          /* see every project */
const K_SUPERADMIN_EMAIL = 'halo.charis@gmail.com';
const K_TZ = 'Asia/Makassar';
const K_SESSION_DAYS = 14;
const K_STATUS = ['belum', 'dikerjakan', 'ditinjau', 'selesai'];
const K_PRIORITY = ['rendah', 'sedang', 'tinggi', 'mendesak'];
const K_PROJECT_STATUS = ['perencanaan', 'berjalan', 'ditunda', 'selesai', 'proposal', 'tidak_lolos'];

const K_SCHEMA = {
  users:         ['id', 'email', 'name', 'role', 'title', 'phone', 'status', 'pw_hash', 'pw_salt', 'must_change', 'created', 'last_login'],
  sessions:      ['id', 'uid', 'expires', 'created'],
  wprojects:     ['id', 'name', 'code', 'portfolio_id', 'repo_ids', 'client', 'status', 'start', 'end', 'lead_uid', 'members', 'description', 'drive_url', 'created', 'updated'],
  milestones:    ['id', 'project_id', 'name', 'weight', 'deliverable', 'due', 'order'],
  tasks:         ['id', 'project_id', 'milestone_id', 'title', 'description', 'assignee_uid', 'status', 'priority', 'labels', 'start', 'due',
                  'est_hours', 'checklist', 'attachments', 'order', 'created_by', 'created', 'updated', 'done_at'],
  comments:      ['id', 'task_id', 'uid', 'body', 'mentions', 'created'],
  notifications: ['id', 'uid', 'kind', 'text', 'link', 'read', 'created'],
  activity:      ['id', 'ts', 'uid', 'action', 'entity', 'entity_id', 'detail'],
  /* phase 3: content workflow (repository products, news, portfolio updates) */
  konten:        ['id', 'type', 'title', 'ref_id', 'stage', 'owner_uid', 'assignees', 'due', 'priority', 'notes', 'link', 'doi', 'project_id', 'created_by', 'created', 'updated', 'done_at',
                  'web_id', 'web_status', 'review', 'published_at', 'published_by', 'draft_sig', 'pub_sig'],
  /* website text being written for a news item or portfolio entry (one row per content item) */
  /* opportunities and proposals (Peluang.gs) */
  peluang:       ['id', 'number', 'title', 'link', 'deadline', 'kind', 'funder', 'value', 'currency', 'service', 'stage', 'visibility', 'lead_uid', 'team',
                  'project_id', 'brief', 'decision', 'result', 'rate', 'rate_date', 'workplan', 'parent_id', 'submitted_at', 'notes', 'created_by', 'created', 'updated'],
  peluang_ide:   ['id', 'opp_id', 'uid', 'text', 'votes', 'created'],
  peluang_skor:  ['id', 'opp_id', 'uid', 'fit', 'win', 'capacity', 'value', 'note', 'updated'],
  peluang_rab:   ['id', 'opp_id', 'pos_id', 'description', 'volume', 'unit', 'price', 'order'],
  naskah:        ['id', 'web_type', 'updated', 'updated_by', 'category', 'title_id', 'title_en', 'excerpt_id', 'excerpt_en', 'body_id', 'body_en', 'image_url', 'date', 'featured',
                  'disclosure', 'client_type', 'service', 'component', 'region', 'year_start', 'year_end', 'duration_months', 'status', 'role', 'summary_id', 'summary_en',
                  'methods_id', 'methods_en', 'outputs_id', 'outputs_en', 'capacity_id', 'capacity_en', 'keywords', 'sdg', 'client', 'funder', 'partners', 'official_title',
                  'location_detail', 'related_publications', 'testimonial_id', 'testimonial_en', 'testimonial_by', 'areas', 'photo_public'],
  /* phase 4: administration */
  surat:         ['id', 'direction', 'number', 'seq', 'code', 'date', 'subject', 'party', 'ref_number', 'project_id', 'file_url', 'notes', 'created_by', 'created', 'updated'],
  kontrak:       ['id', 'kind', 'number', 'title', 'party', 'project_id', 'value', 'start', 'end', 'file_url', 'notes', 'created_by', 'created', 'updated'],
  rapat:         ['id', 'kind', 'date', 'time', 'title', 'place', 'project_id', 'internal', 'external', 'agenda', 'minutes', 'decisions', 'followups', 'file_url', 'created_by', 'created', 'updated'],
  cuti:          ['id', 'uid', 'kind', 'start', 'end', 'days', 'reason', 'status', 'decided_by', 'decided_at', 'decision_note', 'created'],
  timesheet:     ['id', 'uid', 'date', 'project_id', 'task_id', 'hours', 'note', 'created'],
  aset:          ['id', 'code', 'name', 'category', 'serial', 'purchase_date', 'value', 'condition', 'location', 'holder_uid', 'file_url', 'notes', 'created_by', 'created', 'updated']
};

/* ============================================================
   SETUP (run from the editor)
   ============================================================ */
function siapkanRuangKerja() {
  let id = PROPS.getProperty('KERJA_SS_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('CHARIS Ruang Kerja (internal)'); PROPS.setProperty('KERJA_SS_ID', ss.getId()); }
  Object.keys(K_SCHEMA).forEach(function (n) { kSheet_(n); });
  const first = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);

  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'kerjaHarian'; })) {
    ScriptApp.newTrigger('kerjaHarian').timeBased().everyDays(1).atHour(6).inTimezone(K_TZ).create();
  }
  const exists = kRead_('users').some(function (u) { return u.email === K_SUPERADMIN_EMAIL; });
  if (!exists) {
    const pw = kTempPassword_();
    kInsert_('users', kUserRow_({ email: K_SUPERADMIN_EMAIL, name: 'Superadmin CHARIS', role: 'superadmin', title: 'Superadmin' }, pw));
    Logger.log('Akun superadmin dibuat untuk ' + K_SUPERADMIN_EMAIL + '. Password sementara: ' + pw + '  (wajib diganti saat masuk pertama kali di /kerja/)');
  } else {
    Logger.log('Ruang Kerja sudah siap. Spreadsheet: ' + ss.getUrl());
  }
  Logger.log('Spreadsheet Ruang Kerja: ' + ss.getUrl());
}

/** Forgot the superadmin password and no email access: run this to get a new temporary password in the log. */
function resetSuperadmin() {
  const u = kRead_('users').filter(function (x) { return x.email === K_SUPERADMIN_EMAIL; })[0];
  if (!u) { siapkanRuangKerja(); return; }
  const pw = kTempPassword_(), salt = Utilities.getUuid();
  kUpdate_('users', u.id, { pw_salt: salt, pw_hash: pwHash_(salt, pw, PW_ITER), must_change: true, status: 'aktif' });
  Logger.log('Password sementara superadmin: ' + pw);
}

/** Runs every morning: in-app reminders one day before a deadline and when a task is overdue. */
function kerjaHarian() { kResetMemo_(); return kBatched_(kerjaHarianRun_); }
function kerjaHarianRun_() {
  const today = kToday_(), tomorrow = kAddDays_(today, 1);
  const have = {}; kRead_('notifications').forEach(function (n) { have[n.id] = 1; });
  const projects = {}; kRead_('wprojects').forEach(function (p) { projects[p.id] = p; });
  kRead_('tasks').forEach(function (t) {
    if (t.status === 'selesai' || !t.due || !t.assignee_uid) return;
    const p = projects[t.project_id], where = p ? ' (' + p.name + ')' : '';
    if (t.due === tomorrow) {
      const id = 'due-' + t.id + '-' + t.due;
      if (!have[id]) kInsert_('notifications', { id: id, uid: t.assignee_uid, kind: 'tenggat', text: 'Tenggat besok: ' + t.title + where, link: 'task:' + t.id, read: false, created: kNow_() });
    } else if (t.due < today) {
      const id = 'late-' + t.id + '-' + t.due;
      if (!have[id]) {
        kInsert_('notifications', { id: id, uid: t.assignee_uid, kind: 'terlambat', text: 'Melewati tenggat: ' + t.title + where, link: 'task:' + t.id, read: false, created: kNow_() });
        if (p && p.lead_uid && p.lead_uid !== t.assignee_uid) kInsert_('notifications', { id: id + '-lead', uid: p.lead_uid, kind: 'terlambat', text: 'Tugas tim melewati tenggat: ' + t.title + where, link: 'task:' + t.id, read: false, created: kNow_() });
      }
    }
  });
  /* content workflow: deadline of the current stage */
  kRead_('konten').forEach(function (k) {
    if (!k.due || k.stage === 'diseminasi' && k.done_at) return;
    const who = kJson_(k.assignees, {})[k.stage] || k.owner_uid; if (!who) return;
    if (k.due === tomorrow) { const id = 'kdue-' + k.id + '-' + k.due; if (!have[id]) kInsert_('notifications', { id: id, uid: who, kind: 'tenggat', text: 'Target besok: ' + k.title + ' (' + K_STAGE_L[k.stage] + ')', link: 'konten:' + k.id, read: false, created: kNow_() }); }
    else if (k.due < today && !k.done_at) { const id = 'klate-' + k.id + '-' + k.due; if (!have[id]) kInsert_('notifications', { id: id, uid: who, kind: 'terlambat', text: 'Melewati target: ' + k.title + ' (' + K_STAGE_L[k.stage] + ')', link: 'konten:' + k.id, read: false, created: kNow_() }); }
  });
  /* contracts and MoUs: 30 days, 7 days and on the last day */
  const managers = kRead_('users').filter(function (u) { return u.status === 'aktif' && K_SEE_ALL.indexOf(u.role) >= 0; });
  kRead_('kontrak').forEach(function (c) {
    if (!c.end) return;
    const left = Math.round((Date.parse(c.end + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
    [30, 7, 0].forEach(function (d) {
      if (left !== d) return;
      managers.forEach(function (u) {
        const id = 'kontrak-' + c.id + '-' + d + '-' + u.id;
        if (!have[id]) kInsert_('notifications', { id: id, uid: u.id, kind: 'tenggat', text: (d ? c.kind + ' berakhir dalam ' + d + ' hari: ' : c.kind + ' berakhir hari ini: ') + c.title + (c.party ? ' (' + c.party + ')' : ''), link: 'admin:kontrak:' + c.id, read: false, created: kNow_() });
      });
    });
  });
  try { kFinHarian_(today, have); } catch (e) { console.warn('kFinHarian_: ' + e.message); }
  try { if (typeof kOppHarian_ === 'function') kOppHarian_(today, have); } catch (e) { console.warn('kOppHarian_: ' + e.message); }
  /* tidy up: expired sessions and read notifications older than 90 days */
  const now = kNow_(), old = kAddDays_(today, -90);
  kDeleteWhere_('sessions', function (s) { return s.expires < now; });
  kDeleteWhere_('notifications', function (n) { return isTrue_(n.read) && String(n.created).slice(0, 10) < old; });
}

/* ============================================================
   ENTRY: doPost routes { action: 'w', op: ... } here
   ============================================================ */
function kerja_(b) {
  kResetMemo_();
  return kBatched_(function () { return kerjaRun_(b); });
}
function kerjaRun_(b) {
  const op = String(b.op || '');
  /* no session needed */
  if (op === 'login') return kLogin_(b);
  if (op === 'forgot') return kForgot_(b);
  if (op === 'reset') return kReset_(b);
  const me = kAuth_(b.ktoken);
  if (!me) return { ok: false, error: 'AUTH' };
  if (me.must_change && ['changePassword', 'logout', 'me'].indexOf(op) < 0) return { ok: false, error: 'MUST_CHANGE' };
  switch (op) {
    case 'me':             return { ok: true, me: kPublicUser_(me, true) };
    case 'logout':         kDeleteWhere_('sessions', function (s) { return s.id === hash_(String(b.ktoken)); }); CacheService.getScriptCache().remove('k_' + hash_(String(b.ktoken))); return { ok: true };
    case 'changePassword': return kChangePassword_(me, b);
    case 'load':           return kLoad_(me);
    case 'sync':           return { ok: true, rev: kRev_(), changed: String(b.rev || '') !== kRev_(), version: K_VERSION };
    case 'userSave':       return kUserSave_(me, b.row || {});
    case 'userResetPw':    return kUserResetPw_(me, b.id);
    case 'projectSave':    return kProjectSave_(me, b.row || {});
    case 'projectDelete':  return kProjectDelete_(me, b.id);
    case 'milestoneSave':  return kMilestoneSave_(me, b.row || {});
    case 'milestoneDelete':return kMilestoneDelete_(me, b.id);
    case 'taskSave':       return kTaskSave_(me, b.row || {});
    case 'taskDelete':     return kTaskDelete_(me, b.id);
    case 'comments':       return kComments_(me, b.task_id);
    case 'commentAdd':     return kCommentAdd_(me, b);
    case 'notifRead':      return kNotifRead_(me, b.ids);
    case 'kontenSave':     return kKontenSave_(me, b.row || {});
    case 'kontenDelete':   return kKontenDelete_(me, b.id);
    case 'kontenGet':      return kKontenGet_(me, b.id);
    case 'kontenDraft':    return kKontenDraft_(me, b);
    case 'kontenReview':   return kKontenReview_(me, b);
    case 'kontenPublish':  return kKontenPublish_(me, b);
    case 'kontenUnpublish': return kKontenUnpublish_(me, b);
    case 'webList':        return kWebList_(me);
    case 'webToggle':      return kWebToggle_(me, b);
    case 'webImport':      return kWebImport_(me, b);
    case 'upload':         return kUpload_(me, b);
    case 'oppCapture': case 'oppSave': case 'oppGet': case 'oppStage': case 'oppIdea': case 'oppVote': case 'oppIdeaDelete': case 'oppScore':
    case 'oppDecide': case 'oppBudget': case 'oppResult': case 'oppCopy': case 'oppDelete':
      return peluang_(me, b);                                   /* Peluang.gs */
    case 'regList':        return kRegList_(me, b.reg);
    case 'regSave':        return kRegSave_(me, b.reg, b.row || {});
    case 'regDelete':      return kRegDelete_(me, b.reg, b.id);
    case 'leaveDecide':    return kLeaveDecide_(me, b.id, b.decision, b.note);
    case 'finLoad': case 'finSave': case 'finDelete': case 'reqSave': case 'reqAction': case 'invoicePay': case 'honorPay':
      return keuangan_(me, b);                                  /* Keuangan.gs */
    default:               return { ok: false, error: 'Perintah tidak dikenal.' };
  }
}

/* ============================================================
   AUTH
   ============================================================ */
function kUserRow_(o, password) {
  const salt = Utilities.getUuid();
  return { id: 'U-' + kShortId_(), email: String(o.email).trim().toLowerCase(), name: clean_(o.name, 120), role: o.role, title: clean_(o.title, 120),
    phone: clean_(o.phone, 40), status: 'aktif', pw_salt: salt, pw_hash: pwHash_(salt, password, PW_ITER), must_change: true, created: kNow_(), last_login: '' };
}
function kTempPassword_() {
  const a = 'abcdefghjkmnpqrstuvwxyz', d = '23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += a.charAt(Math.floor(Math.random() * a.length));
  for (let i = 0; i < 4; i++) s += d.charAt(Math.floor(Math.random() * d.length));
  return s;
}
function kPublicUser_(u, self) {
  const o = { id: u.id, name: u.name, role: u.role, title: u.title, status: u.status };
  if (self) { o.email = u.email; o.phone = u.phone; o.must_change = isTrue_(u.must_change); }
  return o;
}
function kFindUserByEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  return kRead_('users').filter(function (u) { return u.email === email; })[0] || null;
}
/** Checks an email and password against workspace accounts. Used by /kerja/ and by the website admin login. */
function kCheckPassword_(email, password) {
  const u = kFindUserByEmail_(email);
  if (!u || u.status !== 'aktif') return null;
  return pwHash_(u.pw_salt, password, PW_ITER) === u.pw_hash ? u : null;
}
function kLogin_(b) {
  const cache = CacheService.getScriptCache(), email = String(b.email || '').trim().toLowerCase(), key = 'kf_' + hash_(email);
  const fails = Number(cache.get(key) || 0);
  if (fails >= 5) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' };
  if (!PROPS.getProperty('KERJA_SS_ID')) return { ok: false, error: 'Ruang Kerja belum disiapkan. Jalankan siapkanRuangKerja() di Apps Script.' };
  const u = kCheckPassword_(email, b.password);
  if (!u) { cache.put(key, String(fails + 1), 900); return { ok: false, error: 'Email atau password salah.' }; }
  cache.remove(key);
  kUpdate_('users', u.id, { last_login: kNow_() });
  return { ok: true, ktoken: kNewSession_(u.id), me: kPublicUser_(u, true) };
}
function kNewSession_(uid) {
  const token = Utilities.getUuid() + Utilities.getUuid(), id = hash_(token);
  const exp = new Date(Date.now() + K_SESSION_DAYS * 86400000).toISOString();
  kInsert_('sessions', { id: id, uid: uid, expires: exp, created: kNow_() });
  CacheService.getScriptCache().put('k_' + id, JSON.stringify({ uid: uid, exp: exp }), 21600);
  return token;
}
function kAuth_(token) {
  if (!token) return null;
  const id = hash_(String(token)), cache = CacheService.getScriptCache();
  let s = null; const hit = cache.get('k_' + id);
  if (hit) s = JSON.parse(hit);
  else {
    const row = kRead_('sessions').filter(function (x) { return x.id === id; })[0];
    if (row) { s = { uid: row.uid, exp: row.expires }; cache.put('k_' + id, JSON.stringify(s), 21600); }
  }
  if (!s || s.exp < new Date().toISOString()) return null;
  const u = kRead_('users').filter(function (x) { return x.id === s.uid; })[0];
  if (!u || u.status !== 'aktif') return null;
  u.must_change = isTrue_(u.must_change);
  return u;
}
function kChangePassword_(me, b) {
  if (pwHash_(me.pw_salt, b.current, PW_ITER) !== me.pw_hash) return { ok: false, error: 'Password saat ini salah.' };
  const problem = pwProblem_(b.password);
  if (problem) return { ok: false, error: problem };
  const salt = Utilities.getUuid();
  kUpdate_('users', me.id, { pw_salt: salt, pw_hash: pwHash_(salt, b.password, PW_ITER), must_change: false });
  kLog_(me.id, 'ganti password', 'users', me.id, '');
  return { ok: true };
}
/* forgot password: a 6-digit code by email, valid 15 minutes. The answer is the same whether or not the email exists. */
function kForgot_(b) {
  const u = kFindUserByEmail_(b.email), cache = CacheService.getScriptCache();
  if (u && u.status === 'aktif' && !cache.get('kr_wait_' + u.id)) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    cache.put('kr_' + u.id, hash_(code + u.id), 900);
    cache.put('kr_wait_' + u.id, '1', 60);
    try {
      mail_({ to: u.email, subject: 'CHARIS Ruang Kerja: kode atur ulang password',
        body: 'Halo ' + u.name + ',\n\nKode untuk mengatur ulang password Ruang Kerja CHARIS: ' + code + '\nKode berlaku 15 menit. Abaikan email ini jika Anda tidak memintanya.' });
    } catch (e) { console.warn('kForgot_ email gagal: ' + e.message); }
  }
  return { ok: true };
}
function kReset_(b) {
  const u = kFindUserByEmail_(b.email), cache = CacheService.getScriptCache();
  if (!u) return { ok: false, error: 'Kode salah atau sudah kedaluwarsa.' };
  const want = cache.get('kr_' + u.id), tries = Number(cache.get('kr_try_' + u.id) || 0);
  if (!want || tries >= 5 || want !== hash_(String(b.code || '').trim() + u.id)) { cache.put('kr_try_' + u.id, String(tries + 1), 900); return { ok: false, error: 'Kode salah atau sudah kedaluwarsa.' }; }
  const problem = pwProblem_(b.password);
  if (problem) return { ok: false, error: problem };
  const salt = Utilities.getUuid();
  kUpdate_('users', u.id, { pw_salt: salt, pw_hash: pwHash_(salt, b.password, PW_ITER), must_change: false });
  cache.remove('kr_' + u.id);
  kLog_(u.id, 'atur ulang password', 'users', u.id, '');
  return { ok: true };
}

/* ============================================================
   PERMISSIONS (always enforced here, never only in the browser)
   ============================================================ */
function kSeesAll_(u) { return K_SEE_ALL.indexOf(u.role) >= 0; }
function kMembers_(p) { return String(p.members || '').split(',').map(function (s) { return s.trim(); }).filter(String); }
function kInProject_(u, p) { return p.lead_uid === u.id || kMembers_(p).indexOf(u.id) >= 0; }
function kCanSeeProject_(u, p) { return kSeesAll_(u) || kInProject_(u, p); }
function kCanManageProject_(u, p) { return kSeesAll_(u) || (p && p.lead_uid === u.id); }
function kCanCreateTask_(u, p) { return kCanManageProject_(u, p) || (u.role !== 'konsultan' && kInProject_(u, p)); }
function kCanEditTask_(u, t, p) { return kCanCreateTask_(u, p) || t.assignee_uid === u.id; }
function kProject_(id) { return kRead_('wprojects').filter(function (p) { return p.id === id; })[0] || null; }
function kDeny_() { throw new Error('Anda tidak memiliki akses untuk tindakan ini.'); }

/* ============================================================
   LOAD: everything the signed-in person may see, in one call
   ============================================================ */
function kLoad_(me) {
  const rev = kRev_();
  kCacheGet_(['wprojects', 'tasks', 'comments', 'notifications', 'milestones', 'konten', 'timesheet', 'cuti', 'kontrak', 'peluang', 'peluang_ide', 'peluang_skor'].concat(kProps_()['FIN_SS_ID'] ? ['pengajuan', 'invoice', 'transaksi'] : []));
  const projects = kRead_('wprojects').filter(function (p) { return kCanSeeProject_(me, p); });
  const pids = {}; projects.forEach(function (p) { pids[p.id] = 1; });
  const tasks = kRead_('tasks').filter(function (t) { return pids[t.project_id]; }).map(kTaskOut_);
  const tids = {}; tasks.forEach(function (t) { tids[t.id] = 1; });
  const ccount = {}; kRead_('comments').forEach(function (c) { if (tids[c.task_id]) ccount[c.task_id] = (ccount[c.task_id] || 0) + 1; });
  const notes = kRead_('notifications').filter(function (n) { return n.uid === me.id; })
    .sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }).slice(0, 60)
    .map(function (n) { return { id: n.id, kind: n.kind, text: n.text, link: n.link, read: isTrue_(n.read), created: n.created }; });
  const users = kRead_('users').map(function (u) {
    const o = kPublicUser_(u, false);
    if (me.role === 'superadmin' || me.role === 'direktur') { o.email = u.email; o.phone = u.phone; o.last_login = u.last_login; }
    return o;
  });
  let portfolio = [];
  try {
    const pc = CacheService.getScriptCache(), hit = pc.get('k_portfolio');
    if (hit) portfolio = JSON.parse(hit);
    else { portfolio = readAll_('projects').map(function (r) { return { id: r.id, title: r.title_id }; }); pc.put('k_portfolio', JSON.stringify(portfolio), 600); }
  } catch (e) { /* website sheet not reachable */ }
  const hours = {}; kRead_('timesheet').forEach(function (h) { if (tids[h.task_id]) hours[h.task_id] = (hours[h.task_id] || 0) + (Number(h.hours) || 0); });
  return { ok: true, version: K_VERSION, rev: rev, me: kPublicUser_(me, true), today: kToday_(), users: users, projects: projects.map(kProjectOut_),
    konten: kRead_('konten').filter(function (k) { return kCanSeeKonten_(me, k); }).map(kKontenOut_), hours_by_task: hours, summary: kSummary_(me),
    milestones: kRead_('milestones').filter(function (m) { return pids[m.project_id]; }).map(kMilestoneOut_),
    peluang: typeof kOppList_ === 'function' ? kOppList_(me) : [],
    tasks: tasks, comment_counts: ccount, notifications: notes, portfolio: portfolio };
}
function kProjectOut_(p) {
  return { id: p.id, name: p.name, code: p.code, portfolio_id: p.portfolio_id, repo_ids: p.repo_ids, client: p.client, status: p.status, start: p.start, end: p.end,
    lead_uid: p.lead_uid, members: kMembers_(p), description: p.description, drive_url: p.drive_url, created: p.created, updated: p.updated };
}
function kMilestoneOut_(m) { return { id: m.id, project_id: m.project_id, name: m.name, weight: Number(m.weight) || 0, deliverable: isTrue_(m.deliverable), due: m.due, order: Number(m.order) || 0 }; }
function kTaskOut_(t) {
  return { id: t.id, project_id: t.project_id, milestone_id: t.milestone_id, title: t.title, description: t.description, assignee_uid: t.assignee_uid,
    status: t.status || 'belum', priority: t.priority || 'sedang', labels: String(t.labels || '').split(',').map(function (s) { return s.trim(); }).filter(String),
    start: t.start, due: t.due, est_hours: Number(t.est_hours) || 0, checklist: kJson_(t.checklist, []), attachments: kJson_(t.attachments, []),
    order: Number(t.order) || 0, created_by: t.created_by, created: t.created, updated: t.updated, done_at: t.done_at };
}

/* ============================================================
   USERS (superadmin)
   ============================================================ */
function kUserSave_(me, r) {
  if (me.role !== 'superadmin') kDeny_();
  if (K_ROLES.indexOf(r.role) < 0) return { ok: false, error: 'Peran tidak valid.' };
  const email = String(r.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Email tidak valid.' };
  if (!clean_(r.name, 120)) return { ok: false, error: 'Nama wajib diisi.' };
  return withLock_(function () {
    const dup = kFindUserByEmail_(email);
    if (r.id) {
      if (dup && dup.id !== r.id) return { ok: false, error: 'Email sudah dipakai akun lain.' };
      const cur = kRead_('users').filter(function (u) { return u.id === r.id; })[0];
      if (!cur) return { ok: false, error: 'Akun tidak ditemukan.' };
      if (cur.id === me.id && (r.role !== 'superadmin' || r.status !== 'aktif')) return { ok: false, error: 'Anda tidak dapat menurunkan peran atau menonaktifkan akun Anda sendiri.' };
      kUpdate_('users', r.id, { email: email, name: clean_(r.name, 120), role: r.role, title: clean_(r.title, 120), phone: clean_(r.phone, 40), status: r.status === 'nonaktif' ? 'nonaktif' : 'aktif' });
      if (r.status === 'nonaktif') kDeleteWhere_('sessions', function (s) { return s.uid === r.id; });
      kLog_(me.id, 'ubah akun', 'users', r.id, email + ' ' + r.role);
      return { ok: true };
    }
    if (dup) return { ok: false, error: 'Email sudah terdaftar.' };
    const pw = kTempPassword_(), row = kUserRow_({ email: email, name: r.name, role: r.role, title: r.title, phone: r.phone }, pw);
    kInsert_('users', row);
    kLog_(me.id, 'buat akun', 'users', row.id, email + ' ' + r.role);
    return { ok: true, id: row.id, temp_password: pw };
  });
}
function kUserResetPw_(me, id) {
  if (me.role !== 'superadmin') kDeny_();
  const pw = kTempPassword_(), salt = Utilities.getUuid();
  kUpdate_('users', id, { pw_salt: salt, pw_hash: pwHash_(salt, pw, PW_ITER), must_change: true });
  kDeleteWhere_('sessions', function (s) { return s.uid === id; });
  kLog_(me.id, 'reset password', 'users', id, '');
  return { ok: true, temp_password: pw };
}

/* ============================================================
   PROJECTS AND MILESTONES
   ============================================================ */
function kProjectSave_(me, r) {
  const name = clean_(r.name, 200);
  if (!name) return { ok: false, error: 'Nama proyek wajib diisi.' };
  const members = (Array.isArray(r.members) ? r.members : String(r.members || '').split(',')).map(function (s) { return String(s).trim(); }).filter(String);
  const row = { name: name, code: clean_(r.code, 30), portfolio_id: clean_(r.portfolio_id, 40), repo_ids: clean_(r.repo_ids, 300), client: clean_(r.client, 200),
    status: K_PROJECT_STATUS.indexOf(r.status) >= 0 ? r.status : 'perencanaan', start: kDate_(r.start), end: kDate_(r.end), lead_uid: clean_(r.lead_uid, 40),
    members: members.join(','), description: clean_(r.description, 5000), drive_url: kUrl_(r.drive_url), updated: kNow_() };
  return withLock_(function () {
    if (r.id) {
      const cur = kProject_(r.id);
      if (!cur) return { ok: false, error: 'Proyek tidak ditemukan.' };
      if (!kCanManageProject_(me, cur)) kDeny_();
      kUpdate_('wprojects', r.id, row);
      kLog_(me.id, 'ubah proyek', 'wprojects', r.id, name);
      return { ok: true, project: kProjectOut_(Object.assign(cur, row)) };
    }
    if (!kSeesAll_(me)) kDeny_();
    const year = kToday_().slice(0, 4), seq = kRead_('wprojects').filter(function (p) { return String(p.id).indexOf('WP-' + year + '-') === 0; }).length + 1;
    row.id = 'WP-' + year + '-' + ('00' + seq).slice(-3); row.created = kNow_();
    if (!row.lead_uid) row.lead_uid = me.id;
    kInsert_('wprojects', row);
    kLog_(me.id, 'buat proyek', 'wprojects', row.id, name);
    if (row.lead_uid !== me.id) kNotify_(row.lead_uid, 'proyek', 'Anda menjadi penanggung jawab proyek: ' + name, 'project:' + row.id, me.id);
    return { ok: true, project: kProjectOut_(row) };
  });
}
function kProjectDelete_(me, id) {
  const p = kProject_(id);
  if (!p) return { ok: true };
  if (!(me.role === 'superadmin' || me.role === 'direktur')) kDeny_();
  return withLock_(function () {
    const tids = {}; kRead_('tasks').forEach(function (t) { if (t.project_id === id) tids[t.id] = 1; });
    kDeleteWhere_('comments', function (c) { return tids[c.task_id]; });
    kDeleteWhere_('tasks', function (t) { return t.project_id === id; });
    kDeleteWhere_('milestones', function (m) { return m.project_id === id; });
    kDeleteWhere_('wprojects', function (x) { return x.id === id; });
    kLog_(me.id, 'hapus proyek', 'wprojects', id, p.name);
    return { ok: true };
  });
}
function kMilestoneSave_(me, r) {
  const p = kProject_(r.project_id);
  if (!p) return { ok: false, error: 'Proyek tidak ditemukan.' };
  if (!kCanManageProject_(me, p)) kDeny_();
  const name = clean_(r.name, 200);
  if (!name) return { ok: false, error: 'Nama milestone wajib diisi.' };
  const row = { project_id: p.id, name: name, weight: Math.max(0, Math.min(100, Number(r.weight) || 0)), deliverable: isTrue_(r.deliverable), due: kDate_(r.due), order: Number(r.order) || 0 };
  return withLock_(function () {
    if (r.id) { kUpdate_('milestones', r.id, row); row.id = r.id; }
    else { row.id = 'M-' + kShortId_(); if (!row.order) row.order = kRead_('milestones').filter(function (m) { return m.project_id === p.id; }).length + 1; kInsert_('milestones', row); }
    kLog_(me.id, r.id ? 'ubah milestone' : 'buat milestone', 'milestones', row.id, name);
    return { ok: true, milestone: kMilestoneOut_(row) };
  });
}
function kMilestoneDelete_(me, id) {
  const m = kRead_('milestones').filter(function (x) { return x.id === id; })[0];
  if (!m) return { ok: true };
  if (!kCanManageProject_(me, kProject_(m.project_id))) kDeny_();
  return withLock_(function () {
    kRead_('tasks').forEach(function (t) { if (t.milestone_id === id) kUpdate_('tasks', t.id, { milestone_id: '' }); });
    kDeleteWhere_('milestones', function (x) { return x.id === id; });
    kLog_(me.id, 'hapus milestone', 'milestones', id, m.name);
    return { ok: true };
  });
}

/* ============================================================
   TASKS
   ============================================================ */
function kTaskSave_(me, r) {
  return withLock_(function () {
    const cur = r.id ? kRead_('tasks').filter(function (t) { return t.id === r.id; })[0] : null;
    if (r.id && !cur) return { ok: false, error: 'Tugas tidak ditemukan. Mungkin sudah dihapus.' };
    const p = kProject_(cur ? cur.project_id : r.project_id);
    if (!p) return { ok: false, error: 'Proyek tidak ditemukan.' };
    if (cur ? !kCanEditTask_(me, cur, p) : !kCanCreateTask_(me, p)) kDeny_();
    const full = kCanCreateTask_(me, p);              /* an assignee outside the project team may only update progress */
    const patch = {};
    const set = function (k, v) { if (r[k] !== undefined) patch[k] = v; };
    if (full || !cur) {
      set('title', clean_(r.title, 300)); set('description', clean_(r.description, 10000)); set('milestone_id', clean_(r.milestone_id, 40));
      set('assignee_uid', clean_(r.assignee_uid, 40)); set('priority', K_PRIORITY.indexOf(r.priority) >= 0 ? r.priority : 'sedang');
      set('labels', (Array.isArray(r.labels) ? r.labels : String(r.labels || '').split(',')).map(function (s) { return clean_(s, 40); }).filter(String).join(','));
      set('start', kDate_(r.start)); set('due', kDate_(r.due)); set('est_hours', Math.max(0, Number(r.est_hours) || 0));
    }
    set('status', K_STATUS.indexOf(r.status) >= 0 ? r.status : 'belum');
    set('checklist', JSON.stringify((r.checklist || []).slice(0, 100).map(function (c) { return { t: clean_(c.t, 300), d: !!c.d }; })));
    set('attachments', JSON.stringify((r.attachments || []).slice(0, 30).map(function (a) { return { name: clean_(a.name, 200), url: kUrl_(a.url) }; }).filter(function (a) { return a.url; })));
    set('order', Number(r.order) || 0);
    if (!cur && !patch.title) return { ok: false, error: 'Judul tugas wajib diisi.' };
    patch.updated = kNow_();
    if (patch.status) patch.done_at = patch.status === 'selesai' ? (cur && cur.status === 'selesai' ? cur.done_at : kNow_()) : '';
    let row;
    if (cur) { kUpdate_('tasks', cur.id, patch); row = Object.assign({}, cur, patch); }
    else {
      row = Object.assign({ id: 'T-' + kShortId_(), project_id: p.id, status: 'belum', priority: 'sedang', checklist: '[]', attachments: '[]', order: Date.now(), created_by: me.id, created: kNow_() }, patch);
      kInsert_('tasks', row);
    }
    /* the assignee joins the project team so the project becomes visible to them */
    if (row.assignee_uid && row.assignee_uid !== p.lead_uid && kMembers_(p).indexOf(row.assignee_uid) < 0) kUpdate_('wprojects', p.id, { members: kMembers_(p).concat([row.assignee_uid]).join(',') });
    if (row.assignee_uid && row.assignee_uid !== me.id && (!cur || cur.assignee_uid !== row.assignee_uid)) kNotify_(row.assignee_uid, 'tugas', me.name + ' menugaskan Anda: ' + row.title + ' (' + p.name + ')', 'task:' + row.id, me.id);
    if (cur && patch.status && patch.status !== cur.status) kLog_(me.id, 'status ' + patch.status, 'tasks', cur.id, row.title);
    else kLog_(me.id, cur ? 'ubah tugas' : 'buat tugas', 'tasks', row.id, row.title);
    return { ok: true, task: kTaskOut_(row), members: kMembers_(kProject_(p.id)) };
  });
}
function kTaskDelete_(me, id) {
  const t = kRead_('tasks').filter(function (x) { return x.id === id; })[0];
  if (!t) return { ok: true };
  const p = kProject_(t.project_id);
  if (!(kCanManageProject_(me, p) || t.created_by === me.id)) kDeny_();
  return withLock_(function () {
    kDeleteWhere_('comments', function (c) { return c.task_id === id; });
    kDeleteWhere_('tasks', function (x) { return x.id === id; });
    kLog_(me.id, 'hapus tugas', 'tasks', id, t.title);
    return { ok: true };
  });
}
function kTaskVisible_(me, id) {
  if (String(id).indexOf('OPP-') === 0 && typeof kOppVisible_ === 'function') return kOppVisible_(me, id);
  if (String(id).indexOf('KN-') === 0) {
    const k = kRead_('konten').filter(function (x) { return x.id === id; })[0];
    if (!k || !kCanSeeKonten_(me, k)) return null;
    /* content items behave like a task of a virtual project whose team is everyone assigned to it */
    return { t: { id: k.id, title: k.title }, p: { lead_uid: k.owner_uid, members: kKontenPeople_(k).join(',') } };
  }
  const t = kRead_('tasks').filter(function (x) { return x.id === id; })[0];
  if (!t) return null;
  const p = kProject_(t.project_id);
  return p && kCanSeeProject_(me, p) ? { t: t, p: p } : null;
}
function kComments_(me, taskId) {
  if (!kTaskVisible_(me, taskId)) kDeny_();
  const ent = String(taskId).indexOf('KN-') === 0 ? 'konten' : 'tasks';
  const list = kRead_('comments').filter(function (c) { return c.task_id === taskId; })
    .sort(function (a, b) { return String(a.created).localeCompare(String(b.created)); })
    .map(function (c) { return { id: c.id, uid: c.uid, body: c.body, created: c.created }; });
  const log = kRead_('activity').filter(function (a) { return a.entity === ent && a.entity_id === taskId; })
    .map(function (a) { return { uid: a.uid, action: a.action, ts: a.ts }; }).slice(-30);
  return { ok: true, comments: list, activity: log };
}
function kCommentAdd_(me, b) {
  const v = kTaskVisible_(me, b.task_id);
  if (!v) kDeny_();
  const body = clean_(b.body, 5000);
  if (!body) return { ok: false, error: 'Komentar masih kosong.' };
  const team = {}; [v.p.lead_uid].concat(kMembers_(v.p)).forEach(function (x) { team[x] = 1; });
  const users = kRead_('users'), allowed = function (uid) { const u = users.filter(function (x) { return x.id === uid; })[0]; return u && (team[uid] || kSeesAll_(u)); };
  const mentions = (b.mentions || []).map(String).filter(function (uid, i, a) { return a.indexOf(uid) === i && uid !== me.id && allowed(uid); });
  const row = { id: 'C-' + kShortId_(), task_id: v.t.id, uid: me.id, body: body, mentions: mentions.join(','), created: kNow_() };
  kInsert_('comments', row);
  const link = (String(v.t.id).indexOf('KN-') === 0 ? 'konten:' : 'task:') + v.t.id;
  mentions.forEach(function (uid) { kNotify_(uid, 'sebutan', me.name + ' menyebut Anda di: ' + v.t.title, link, me.id); });
  return { ok: true, comment: { id: row.id, uid: me.id, body: body, created: row.created } };
}
function kNotify_(uid, kind, text, link, fromUid) {
  if (!uid || uid === fromUid) return;
  kInsert_('notifications', { id: 'N-' + kShortId_(), uid: uid, kind: kind, text: clean_(text, 400), link: link, read: false, created: kNow_() });
}
function kNotifRead_(me, ids) {
  const all = ids === 'all', want = {}; (Array.isArray(ids) ? ids : []).forEach(function (i) { want[i] = 1; });
  return withLock_(function () {
    const sh = kSheet_('notifications'), values = sh.getDataRange().getValues(), h = values[0];
    const cu = h.indexOf('uid'), cr = h.indexOf('read'), ci = h.indexOf('id');
    for (let i = 1; i < values.length; i++) {
      if (values[i][cu] === me.id && !isTrue_(values[i][cr]) && (all || want[values[i][ci]])) { sh.getRange(i + 1, cr + 1).setValue(true); kTouch_('notifications'); }
    }
    delete kMemo_.notifications;
    return { ok: true };
  });
}
function kLog_(uid, action, entity, id, detail) {
  try { kInsert_('activity', { id: 'L-' + kShortId_(), ts: kNow_(), uid: uid, action: action, entity: entity, entity_id: id, detail: clean_(detail, 300) }); } catch (e) { /* logging never blocks the work */ }
}

/* ============================================================
   STORAGE HELPERS (separate spreadsheet, plain-text cells)
   ============================================================ */
let kMemo_ = {};
/* per-request handles: opening a spreadsheet is the slowest call in Apps Script, so do it once */
let kSSMemo_ = null, kShMemo_ = {};
function kResetMemo_() { kMemo_ = {}; kShMemo_ = {}; kSSMemo_ = null; kPropsMemo_ = null; kDirty_ = {}; if (typeof kFinMemo_ !== 'undefined') kFinMemo_ = null; }
function kLockEnter_() { kPropsMemo_ = null; kMemo_ = {}; }
function kSS_() {
  if (kSSMemo_) return kSSMemo_;
  const id = PROPS.getProperty('KERJA_SS_ID');
  if (!id) throw new Error('Ruang Kerja belum disiapkan. Jalankan siapkanRuangKerja() di Apps Script.');
  return (kSSMemo_ = SpreadsheetApp.openById(id));
}
function kSheet_(name) {
  if (kShMemo_[name]) return kShMemo_[name];
  return (kShMemo_[name] = kSheetOpen_(name));
}
function kSheetOpen_(name) {
  /* finance sheets (Keuangan.gs) live in their own spreadsheet */
  const fin = typeof F_SCHEMA !== 'undefined' && F_SCHEMA[name];
  const ss = fin ? kFinSS_() : kSS_(), want = K_SCHEMA[name] || F_SCHEMA[name];
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold').setBackground('#E8F0EF');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), Math.max(want.length, sh.getMaxColumns())).setNumberFormat('@');   /* dates and codes stay text */
    return sh;
  }
  const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const missing = want.filter(function (h) { return have.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#E8F0EF');
  return sh;
}
/* ============================================================
   SERVER CACHE
   Each sheet is cached in CacheService under a version token. Every write sets a new random
   token for that sheet (after the write), so a cached copy is only used while nothing changed.
   KREV changes on any write and lets the browser ask "anything new?" without reading sheets.
   ============================================================ */
const K_CACHE_TTL = 21600, K_CHUNK = 30000;
let kPropsMemo_ = null, kDirty_ = {}, kBatch_ = false;
function kProps_() { return kPropsMemo_ || (kPropsMemo_ = PROPS.getProperties()); }
function kVer_(name) { return kProps_()['KV_' + name] || '0'; }
function kRev_() { return kProps_()['KREV'] || '0'; }
function kTouch_(name) { kDirty_[name] = 1; delete kMemo_[name]; if (!kBatch_) kFlush_(); }
function kFlush_() {
  const names = Object.keys(kDirty_); if (!names.length) return;
  const set = { KREV: Utilities.getUuid().slice(0, 13) };
  names.forEach(function (n) { set['KV_' + n] = Utilities.getUuid().slice(0, 13); });
  PROPS.setProperties(set);
  kDirty_ = {}; kPropsMemo_ = null;
}
/* run a block of work with one property write at the end instead of one per changed row */
function kBatched_(fn) {
  const outer = kBatch_; kBatch_ = true;
  try { return fn(); } finally { if (!outer) { kBatch_ = false; kFlush_(); } }
}
function kCacheKey_(name) { return 'kc_' + name + '_' + kVer_(name); }
function kCacheGet_(names) {
  const want = names.filter(function (n) { return !kMemo_[n] && !kDirty_[n]; });
  if (!want.length) return;
  const cache = CacheService.getScriptCache();
  let heads = {}; try { heads = cache.getAll(want.map(kCacheKey_)); } catch (e) { return; }
  const parts = [];
  want.forEach(function (n) { const c = Number(heads[kCacheKey_(n)] || 0); for (let i = 0; i < c; i++) parts.push(kCacheKey_(n) + '_' + i); });
  let body = {}; if (parts.length) { try { body = cache.getAll(parts); } catch (e) { return; } }
  want.forEach(function (n) {
    const k = kCacheKey_(n), c = Number(heads[k] || 0); if (!c) return;
    let s = ''; for (let i = 0; i < c; i++) { const p = body[k + '_' + i]; if (p == null) return; s += p; }
    try { kMemo_[n] = JSON.parse(s); } catch (e) { /* ignore a broken entry */ }
  });
}
function kCachePut_(name, rows) {
  if (kDirty_[name]) return;
  try {
    const s = JSON.stringify(rows), k = kCacheKey_(name), put = {};
    if (s.length > K_CHUNK * 60) return;                         /* very large sheet: read it directly */
    let n = 0; for (let i = 0; i < s.length; i += K_CHUNK) put[k + '_' + (n++)] = s.slice(i, i + K_CHUNK);
    put[k] = String(n);
    CacheService.getScriptCache().putAll(put, K_CACHE_TTL);
  } catch (e) { /* cache is optional */ }
}
function kRead_(name) {
  if (!kMemo_[name]) kCacheGet_([name]);
  if (kMemo_[name]) return kMemo_[name].map(function (o) { return Object.assign({}, o); });
  const values = kSheet_(name).getDataRange().getValues();
  const head = values[0] || [];
  const rows = values.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    const o = {};
    head.forEach(function (h, i) { let v = r[i]; if (v instanceof Date) v = Utilities.formatDate(v, K_TZ, 'yyyy-MM-dd'); o[h] = v === null || v === undefined ? '' : (typeof v === 'boolean' ? v : String(v)); });
    return o;
  });
  const want = K_SCHEMA[name] || (typeof F_SCHEMA !== 'undefined' && F_SCHEMA[name]) || [];
  rows.forEach(function (o) { want.forEach(function (h) { if (!(h in o)) o[h] = ''; }); });
  kMemo_[name] = rows;
  kCachePut_(name, rows);
  return rows.map(function (o) { return Object.assign({}, o); });
}
function kInsert_(name, obj) {
  const sh = kSheet_(name), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return obj[h] === undefined ? '' : kCell_(obj[h]); }));
  kTouch_(name);
}
function kUpdate_(name, id, patch) {
  const sh = kSheet_(name), values = sh.getDataRange().getValues(), head = values[0], ci = head.indexOf('id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][ci]) === String(id)) {
      const row = values[i].slice();
      Object.keys(patch).forEach(function (k) { const c = head.indexOf(k); if (c >= 0) row[c] = kCell_(patch[k]); });
      sh.getRange(i + 1, 1, 1, head.length).setValues([row]);
      kTouch_(name);
      return true;
    }
  }
  return false;
}
function kDeleteWhere_(name, test) {
  const sh = kSheet_(name), values = sh.getDataRange().getValues(), head = values[0];
  for (let i = values.length - 1; i >= 1; i--) {
    const o = {}; head.forEach(function (h, k) { o[h] = values[i][k] instanceof Date ? Utilities.formatDate(values[i][k], K_TZ, 'yyyy-MM-dd') : String(values[i][k]); });
    if (test(o)) { sh.deleteRow(i + 1); kTouch_(name); }
  }
  delete kMemo_[name];
}
function kCell_(v) { return typeof v === 'boolean' || typeof v === 'number' ? v : sanitize_(v); }
function kJson_(s, dflt) { try { const v = JSON.parse(String(s || '').replace(/^'/, '')); return v == null ? dflt : v; } catch (e) { return dflt; } }
function kDate_(v) { const s = String(v || '').trim().slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function kUrl_(v) { const s = String(v || '').trim().slice(0, 1000); return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : ''; }
function kNow_() { return new Date().toISOString(); }
function kToday_() { return Utilities.formatDate(new Date(), K_TZ, 'yyyy-MM-dd'); }
function kAddDays_(ymd, n) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function kShortId_() { return Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }


/* ============================================================
   PHASE 3: CONTENT WORKFLOW
   ============================================================ */
const K_STAGES = ['draf', 'telaah', 'tata_letak', 'zenodo', 'terbit', 'diseminasi'];
const K_STAGE_L = { draf: 'Draf', telaah: 'Telaah internal', tata_letak: 'Tata letak dan grafik', zenodo: 'Unggah ke Zenodo', terbit: 'Terbit di web', diseminasi: 'Diseminasi' };
const K_KONTEN_TYPES = ['repositori', 'berita', 'portofolio'];
function kKontenPeople_(k) {
  const a = kJson_(k.assignees, {}), out = [k.owner_uid];
  Object.keys(a).forEach(function (s) { if (a[s]) out.push(a[s]); });
  return out.filter(function (x, i, arr) { return x && arr.indexOf(x) === i; });
}
function kCanSeeKonten_(u, k) { return kSeesAll_(u) || u.role === 'peneliti' || kKontenPeople_(k).indexOf(u.id) >= 0; }
function kCanEditKonten_(u, k) { return kSeesAll_(u) || kKontenPeople_(k).indexOf(u.id) >= 0; }
function kKontenOut_(k) {
  return { id: k.id, type: k.type, title: k.title, ref_id: k.ref_id, stage: k.stage || 'draf', owner_uid: k.owner_uid, assignees: kJson_(k.assignees, {}), due: k.due,
    priority: k.priority || 'sedang', notes: k.notes, link: k.link, doi: k.doi, project_id: k.project_id, created_by: k.created_by, created: k.created, updated: k.updated, done_at: k.done_at,
    web_id: k.web_id || '', web_status: k.web_status || '', review: kJson_(k.review, null), published_at: k.published_at || '', published_by: k.published_by || '',
    has_draft: !!k.draft_sig, pending: k.web_status === 'tayang' && !!k.draft_sig && k.draft_sig !== k.pub_sig,
    review_ok: !!(kJson_(k.review, null) && kJson_(k.review, {}).d === 'setuju' && kJson_(k.review, {}).sig === k.draft_sig) };
}
function kKontenSave_(me, r) {
  return withLock_(function () {
    const cur = r.id ? kRead_('konten').filter(function (k) { return k.id === r.id; })[0] : null;
    if (r.id && !cur) return { ok: false, error: 'Item konten tidak ditemukan.' };
    if (cur ? !kCanEditKonten_(me, cur) : !(kSeesAll_(me) || me.role === 'peneliti')) kDeny_();
    const patch = {}, set = function (k, v) { if (r[k] !== undefined) patch[k] = v; };
    set('type', K_KONTEN_TYPES.indexOf(r.type) >= 0 ? r.type : 'repositori');
    set('title', clean_(r.title, 300)); set('ref_id', clean_(r.ref_id, 60)); set('owner_uid', clean_(r.owner_uid, 40));
    set('stage', K_STAGES.indexOf(r.stage) >= 0 ? r.stage : 'draf'); set('due', kDate_(r.due));
    set('priority', K_PRIORITY.indexOf(r.priority) >= 0 ? r.priority : 'sedang'); set('notes', clean_(r.notes, 10000));
    set('link', kUrl_(r.link)); set('doi', clean_(r.doi, 120)); set('project_id', clean_(r.project_id, 40));
    if (r.assignees !== undefined) { const a = {}; K_STAGES.forEach(function (s) { if (r.assignees && r.assignees[s]) a[s] = clean_(r.assignees[s], 40); }); patch.assignees = JSON.stringify(a); }
    if (!cur && !patch.title) return { ok: false, error: 'Judul wajib diisi.' };
    patch.updated = kNow_();
    const prevStage = cur ? cur.stage : '';
    if (patch.stage) patch.done_at = patch.stage === 'diseminasi' ? (cur && cur.done_at ? cur.done_at : kNow_()) : '';
    let row;
    if (cur) { kUpdate_('konten', cur.id, patch); row = Object.assign({}, cur, patch); }
    else { row = Object.assign({ id: 'KN-' + kShortId_(), stage: 'draf', owner_uid: me.id, assignees: '{}', created_by: me.id, created: kNow_() }, patch); if (!row.owner_uid) row.owner_uid = me.id; kInsert_('konten', row); }
    /* notify: new owner, and whoever is responsible for the stage the item moves into */
    const a = kJson_(row.assignees, {}), before = cur ? kJson_(cur.assignees, {}) : {};
    if (row.owner_uid && (!cur || cur.owner_uid !== row.owner_uid)) kNotify_(row.owner_uid, 'tugas', me.name + ' menjadikan Anda penanggung jawab konten: ' + row.title, 'konten:' + row.id, me.id);
    if (row.stage !== prevStage && a[row.stage]) kNotify_(a[row.stage], 'tugas', 'Giliran Anda (' + K_STAGE_L[row.stage] + '): ' + row.title, 'konten:' + row.id, me.id);
    else K_STAGES.forEach(function (s) { if (a[s] && a[s] !== before[s] && s !== row.stage) kNotify_(a[s], 'tugas', me.name + ' menugaskan Anda tahap ' + K_STAGE_L[s] + ': ' + row.title, 'konten:' + row.id, me.id); });
    kLog_(me.id, cur ? (row.stage !== prevStage ? 'tahap ' + K_STAGE_L[row.stage] : 'ubah konten') : 'buat konten', 'konten', row.id, row.title);
    return { ok: true, item: kKontenOut_(row) };
  });
}
function kKontenDelete_(me, id) {
  const k = kRead_('konten').filter(function (x) { return x.id === id; })[0];
  if (!k) return { ok: true };
  if (!(kSeesAll_(me) || k.created_by === me.id)) kDeny_();
  return withLock_(function () {
    kDeleteWhere_('comments', function (c) { return c.task_id === id; });
    kDeleteWhere_('konten', function (x) { return x.id === id; });
    kDeleteWhere_('naskah', function (x) { return x.id === id; });
    kLog_(me.id, 'hapus konten', 'konten', id, k.title);
    return { ok: true };
  });
}

/* ============================================================
   PHASE 4: ADMINISTRATION REGISTERS
   ============================================================ */
const K_LETTER_CODES = ['SK', 'SKEP', 'ST', 'UND', 'SP', 'SPM', 'SPK', 'PKS', 'MOU', 'BA', 'SE', 'SKU', 'PENG', 'LL'];
const K_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const K_APPROVERS = ['direktur', 'superadmin'];
/* field cleaners per register: t = text (max length), d = date, n = number, u = https link, e = one of a list, j = JSON, c = id list */
const K_REG = {
  surat:     { f: { direction: ['e', ['masuk', 'keluar']], code: ['e', K_LETTER_CODES], date: ['d'], subject: ['t', 300], party: ['t', 200], ref_number: ['t', 120], project_id: ['t', 40], file_url: ['u'], notes: ['t', 3000] },
               view: function (u) { return kSeesAll_(u) || u.role === 'bendahara'; }, create: function (u) { return kSeesAll_(u); }, edit: function (u) { return kSeesAll_(u); } },
  kontrak:   { f: { kind: ['e', ['Kontrak', 'MoU', 'PKS', 'SPK', 'Addendum']], number: ['t', 120], title: ['t', 300], party: ['t', 200], project_id: ['t', 40], value: ['n'], start: ['d'], end: ['d'], file_url: ['u'], notes: ['t', 3000] },
               view: function (u) { return kSeesAll_(u) || u.role === 'bendahara'; }, create: function (u) { return kSeesAll_(u); }, edit: function (u) { return kSeesAll_(u); } },
  rapat:     { f: { kind: ['e', ['rapat internal', 'rapat dengan mitra', 'kegiatan lapangan', 'pelatihan', 'lokakarya']], date: ['d'], time: ['t', 20], title: ['t', 300], place: ['t', 200], project_id: ['t', 40],
                    internal: ['c'], external: ['j'], agenda: ['t', 5000], minutes: ['t', 20000], decisions: ['t', 5000], followups: ['t', 5000], file_url: ['u'] },
               view: function (u, r) { return kSeesAll_(u) || u.role === 'bendahara' || kCsv_(r.internal).indexOf(u.id) >= 0 || r.created_by === u.id; },
               create: function (u) { return u.role !== 'konsultan'; }, edit: function (u, r) { return kSeesAll_(u) || r.created_by === u.id; } },
  cuti:      { f: { kind: ['e', ['tahunan', 'sakit', 'alasan penting', 'melahirkan', 'lainnya']], start: ['d'], end: ['d'], reason: ['t', 2000] },
               view: function (u, r) { return r.uid === u.id || K_APPROVERS.indexOf(u.role) >= 0; }, create: function (u) { return u.role !== 'konsultan'; },
               edit: function (u, r) { return r.uid === u.id && r.status === 'diajukan'; } },
  timesheet: { f: { date: ['d'], project_id: ['t', 40], task_id: ['t', 40], hours: ['n'], note: ['t', 500] },
               view: function (u, r) { if (r.uid === u.id || kSeesAll_(u)) return true; const p = r.project_id && kProject_(r.project_id); return !!(p && p.lead_uid === u.id); },
               create: function () { return true; }, edit: function (u, r) { return r.uid === u.id || u.role === 'superadmin'; } },
  aset:      { f: { name: ['t', 200], category: ['e', ['Laptop dan komputer', 'Perangkat elektronik', 'Perabot', 'Kendaraan', 'Peralatan lapangan', 'Perangkat lunak', 'Lainnya']], serial: ['t', 120],
                    purchase_date: ['d'], value: ['n'], condition: ['e', ['baik', 'perlu perbaikan', 'rusak', 'dihapuskan']], location: ['t', 200], holder_uid: ['t', 40], file_url: ['u'], notes: ['t', 2000] },
               view: function (u, r) { return kSeesAll_(u) || u.role === 'bendahara' || r.holder_uid === u.id; }, create: function (u) { return kSeesAll_(u); }, edit: function (u) { return kSeesAll_(u); } }
};
/* accepts 150000000, "150.000.000", "1.250,5" or "12.5" */
function kNum_(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim().replace(/[^0-9.,\-]/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  return Number(s) || 0;
}
function kCsv_(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(String); }
function kCleanField_(spec, v) {
  switch (spec[0]) {
    case 't': return clean_(v, spec[1]);
    case 'd': return kDate_(v);
    case 'n': return Math.max(0, Math.round(kNum_(v) * 100) / 100);
    case 'u': return kUrl_(v);
    case 'e': return spec[1].indexOf(v) >= 0 ? v : spec[1][0];
    case 'c': return (Array.isArray(v) ? v : kCsv_(v)).map(function (x) { return clean_(x, 40); }).join(',');
    case 'j': return JSON.stringify((Array.isArray(v) ? v : []).slice(0, 300).map(function (o) { const out = {}; Object.keys(o || {}).slice(0, 8).forEach(function (k) { out[clean_(k, 20)] = clean_(o[k], 200); }); return out; }));
  }
  return '';
}
function kRegOut_(reg, r) {
  const o = Object.assign({}, r);
  if (reg === 'rapat') { o.internal = kCsv_(r.internal); o.external = kJson_(r.external, []); }
  ['value', 'hours', 'days', 'seq'].forEach(function (k) { if (k in o) o[k] = Number(o[k]) || 0; });
  return o;
}
function kRegList_(me, reg) {
  const R = K_REG[reg]; if (!R) return { ok: false, error: 'Daftar tidak dikenal.' };
  if (reg !== 'cuti' && reg !== 'timesheet' && reg !== 'rapat' && reg !== 'aset' && !R.view(me, {})) kDeny_();
  const rows = kRead_(reg).filter(function (r) { return R.view(me, r); }).map(function (r) { return kRegOut_(reg, r); });
  return { ok: true, rows: rows };
}
/* working days between two dates, Saturday and Sunday excluded */
function kWorkdays_(a, b) {
  if (!a || !b || b < a) return 0;
  let n = 0, d = new Date(a + 'T12:00:00Z'); const end = new Date(b + 'T12:00:00Z');
  while (d <= end && n < 400) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; d.setUTCDate(d.getUTCDate() + 1); }
  return n;
}
function kRegSave_(me, reg, r) {
  const R = K_REG[reg]; if (!R) return { ok: false, error: 'Daftar tidak dikenal.' };
  return withLock_(function () {
    const cur = r.id ? kRead_(reg).filter(function (x) { return x.id === r.id; })[0] : null;
    if (r.id && !cur) return { ok: false, error: 'Data tidak ditemukan.' };
    if (cur ? !R.edit(me, cur) : !R.create(me)) kDeny_();
    const row = {};
    Object.keys(R.f).forEach(function (k) { if (r[k] !== undefined) row[k] = kCleanField_(R.f[k], r[k]); });
    const year = kToday_().slice(0, 4);
    /* register-specific rules */
    if (reg === 'surat') {
      if (!cur && !row.subject) return { ok: false, error: 'Perihal surat wajib diisi.' };
      if (!cur) {
        const dir = row.direction || 'keluar', y = (row.date || kToday_()).slice(0, 4);
        const seq = kRead_('surat').filter(function (s) { return s.direction === dir && String(s.date || s.created).slice(0, 4) === y; })
          .reduce(function (m, s) { return Math.max(m, Number(s.seq) || 0); }, 0) + 1;
        const month = Number((row.date || kToday_()).slice(5, 7));
        row.seq = seq;
        row.number = dir === 'keluar' ? ('00' + seq).slice(-3) + '/CHARIS/' + (row.code || 'LL') + '/' + K_ROMAN[month - 1] + '/' + y : 'AG-' + y + '-' + ('00' + seq).slice(-3);
      } else { delete row.direction; }                  /* the number stays as issued */
    }
    if (reg === 'kontrak' && !cur && !row.title) return { ok: false, error: 'Judul kontrak wajib diisi.' };
    if (reg === 'kontrak' && row.start && row.end && row.end < row.start) return { ok: false, error: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' };
    if (reg === 'rapat' && !cur && !row.title) return { ok: false, error: 'Judul rapat atau kegiatan wajib diisi.' };
    if (reg === 'aset') {
      if (!cur && !row.name) return { ok: false, error: 'Nama aset wajib diisi.' };
      if (!cur) { const n = kRead_('aset').filter(function (a) { return String(a.code).indexOf('INV-' + year + '-') === 0; }).length + 1; row.code = 'INV-' + year + '-' + ('00' + n).slice(-3); }
      if (row.holder_uid && (!cur || cur.holder_uid !== row.holder_uid)) kNotify_(row.holder_uid, 'tugas', 'Aset dicatat atas nama Anda: ' + (row.name || cur.name), 'admin:aset', me.id);
    }
    if (reg === 'cuti') {
      const s = row.start || (cur && cur.start), e = row.end || (cur && cur.end);
      if (!s || !e || e < s) return { ok: false, error: 'Isi tanggal mulai dan selesai cuti dengan benar.' };
      row.days = kWorkdays_(s, e);
      if (!cur) { row.uid = me.id; row.status = 'diajukan'; }
    }
    if (reg === 'timesheet') {
      if (!(row.hours > 0) || row.hours > 24) return { ok: false, error: 'Jam kerja harus antara 0 dan 24.' };
      if (!row.date && !cur) row.date = kToday_();
      if (row.task_id) {
        const t = kRead_('tasks').filter(function (x) { return x.id === row.task_id; })[0];
        if (!t) return { ok: false, error: 'Tugas tidak ditemukan.' };
        const p = kProject_(t.project_id);
        if (!(kCanSeeProject_(me, p))) kDeny_();
        row.project_id = t.project_id;
      }
      if (!cur) row.uid = me.id;
    }
    if (cur) {
      if (reg !== 'cuti' && reg !== 'timesheet') row.updated = kNow_();
      kUpdate_(reg, cur.id, row);
      kLog_(me.id, 'ubah ' + reg, reg, cur.id, row.subject || row.title || row.name || '');
      return { ok: true, row: kRegOut_(reg, Object.assign({}, cur, row)) };
    }
    row.id = reg.slice(0, 3).toUpperCase() + '-' + kShortId_(); row.created = kNow_();
    if (K_SCHEMA[reg].indexOf('created_by') >= 0) row.created_by = me.id;
    if (K_SCHEMA[reg].indexOf('updated') >= 0) row.updated = row.created;
    kInsert_(reg, row);
    if (reg === 'cuti') kApprovers_().forEach(function (u) { kNotify_(u.id, 'persetujuan', me.name + ' mengajukan cuti ' + row.kind + ' ' + row.days + ' hari (' + row.start + ' sampai ' + row.end + ')', 'admin:cuti', me.id); });
    if (reg === 'rapat') kCsv_(row.internal).forEach(function (uid) { kNotify_(uid, 'proyek', 'Anda tercatat di ' + row.kind + ': ' + row.title + ' (' + row.date + ')', 'admin:rapat:' + row.id, me.id); });
    kLog_(me.id, 'buat ' + reg, reg, row.id, row.subject || row.title || row.name || row.kind || '');
    return { ok: true, row: kRegOut_(reg, row) };
  });
}
function kApprovers_() {
  const users = kRead_('users').filter(function (u) { return u.status === 'aktif'; });
  const dir = users.filter(function (u) { return u.role === 'direktur'; });
  return dir.length ? dir : users.filter(function (u) { return u.role === 'superadmin'; });
}
function kRegDelete_(me, reg, id) {
  const R = K_REG[reg]; if (!R) return { ok: false, error: 'Daftar tidak dikenal.' };
  const cur = kRead_(reg).filter(function (x) { return x.id === id; })[0];
  if (!cur) return { ok: true };
  const may = reg === 'cuti' ? (cur.uid === me.id && cur.status === 'diajukan') || me.role === 'superadmin'
    : reg === 'timesheet' ? R.edit(me, cur) : reg === 'surat' ? me.role === 'superadmin' || me.role === 'direktur' : R.edit(me, cur);
  if (!may) kDeny_();
  return withLock_(function () { kDeleteWhere_(reg, function (x) { return x.id === id; }); kLog_(me.id, 'hapus ' + reg, reg, id, ''); return { ok: true }; });
}
function kLeaveDecide_(me, id, decision, note) {
  if (K_APPROVERS.indexOf(me.role) < 0) kDeny_();
  if (['disetujui', 'ditolak'].indexOf(decision) < 0) return { ok: false, error: 'Keputusan tidak valid.' };
  return withLock_(function () {
    const c = kRead_('cuti').filter(function (x) { return x.id === id; })[0];
    if (!c) return { ok: false, error: 'Pengajuan tidak ditemukan.' };
    if (c.uid === me.id && me.role !== 'superadmin') return { ok: false, error: 'Pengajuan cuti sendiri diputuskan oleh pimpinan lain.' };
    const patch = { status: decision, decided_by: me.id, decided_at: kNow_(), decision_note: clean_(note, 1000) };
    kUpdate_('cuti', id, patch);
    kNotify_(c.uid, 'persetujuan', 'Cuti ' + c.start + ' sampai ' + c.end + ' ' + decision + ' oleh ' + me.name + (patch.decision_note ? ': ' + patch.decision_note : ''), 'admin:cuti', me.id);
    kLog_(me.id, 'cuti ' + decision, 'cuti', id, '');
    return { ok: true, row: kRegOut_('cuti', Object.assign({}, c, patch)) };
  });
}
/* small numbers for the dashboard */
function kSummary_(me) {
  const out = { leave_pending: 0, my_leave_pending: 0, contracts_ending: [], konten_open: 0, week_hours: 0 };
  try {
    const today = kToday_(), in30 = kAddDays_(today, 30);
    const cuti = kRead_('cuti');
    if (K_APPROVERS.indexOf(me.role) >= 0) out.leave_pending = cuti.filter(function (c) { return c.status === 'diajukan' && c.uid !== me.id; }).length;
    out.my_leave_pending = cuti.filter(function (c) { return c.status === 'diajukan' && c.uid === me.id; }).length;
    if (K_REG.kontrak.view(me, {})) out.contracts_ending = kRead_('kontrak').filter(function (c) { return c.end && c.end >= today && c.end <= in30; })
      .map(function (c) { return { id: c.id, kind: c.kind, title: c.title, party: c.party, end: c.end }; });
    const monday = kAddDays_(today, -((new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7));
    out.week_hours = kRead_('timesheet').filter(function (h) { return h.uid === me.id && h.date >= monday && h.date <= today; }).reduce(function (a, h) { return a + (Number(h.hours) || 0); }, 0);
  } catch (e) { /* new sheets not ready yet */ }
  try { Object.assign(out, kFinSummary_(me)); } catch (e) { /* finance not set up yet */ }
  return out;
}

/** Run from the editor after editing the spreadsheet by hand: forces every tab to be read fresh. */
function kosongkanCache() {
  const set = { KREV: Utilities.getUuid().slice(0, 13) };
  Object.keys(K_SCHEMA).concat(typeof F_SCHEMA !== 'undefined' ? Object.keys(F_SCHEMA) : []).forEach(function (n) { set['KV_' + n] = Utilities.getUuid().slice(0, 13); });
  PROPS.setProperties(set);
  CacheService.getScriptCache().remove('k_portfolio');
  Logger.log('Cache Ruang Kerja dikosongkan. Semua tab akan dibaca ulang dari spreadsheet.');
}


/* ============================================================
   PHASE 6: WRITE, REVIEW AND PUBLISH WEBSITE CONTENT
   News and announcements (website tab "news") and portfolio entries ("projects") are written here,
   reviewed, then published straight to the website sheets that the public site reads.
   ============================================================ */
const K_WEB = { berita: 'news', portofolio: 'projects' };
const K_NASKAH = {
  news: ['category', 'title_id', 'title_en', 'excerpt_id', 'excerpt_en', 'body_id', 'body_en', 'image_url', 'date', 'featured'],
  projects: ['disclosure', 'title_id', 'title_en', 'client_type', 'service', 'component', 'region', 'year_start', 'year_end', 'duration_months', 'status', 'role',
    'summary_id', 'summary_en', 'methods_id', 'methods_en', 'outputs_id', 'outputs_en', 'capacity_id', 'capacity_en', 'keywords', 'sdg', 'client', 'funder', 'partners',
    'official_title', 'location_detail', 'image_url', 'related_publications', 'testimonial_id', 'testimonial_en', 'testimonial_by', 'date', 'areas', 'photo_public']
};
const K_NASKAH_LONG = { body_id: 20000, body_en: 20000, summary_id: 8000, summary_en: 8000, excerpt_id: 2000, excerpt_en: 2000, testimonial_id: 3000, testimonial_en: 3000 };
const K_NASKAH_BOOL = { featured: 1, photo_public: 1 };
const K_PUBLISHERS = ['superadmin', 'direktur', 'admin'];
function kCanPublish_(u) { return K_PUBLISHERS.indexOf(u.role) >= 0; }
function kWebUrl_(wt, id) { return CONTACT.site + (wt === 'news' ? '#/latest/' : '#/projects/') + encodeURIComponent(id); }
function kKonten_(id) { return kRead_('konten').filter(function (k) { return k.id === id; })[0] || null; }
function kDraftOf_(k) {
  const wt = K_WEB[k.type], n = kRead_('naskah').filter(function (x) { return x.id === k.id; })[0], o = {};
  if (!wt) return o;
  /* cells that start with = + - @ are stored with a leading apostrophe (formula guard); hand back the text as written */
  K_NASKAH[wt].forEach(function (f) { o[f] = n ? (K_NASKAH_BOOL[f] ? isTrue_(n[f]) : String(n[f] == null ? '' : n[f]).replace(/^'(?=[=+\-@])/, '')) : (K_NASKAH_BOOL[f] ? false : ''); });
  return o;
}
function kSig_(wt, d) { return hash_(JSON.stringify(K_NASKAH[wt].map(function (f) { return K_NASKAH_BOOL[f] ? isTrue_(d[f]) : String(d[f] == null ? '' : d[f]).trim(); }))).slice(0, 16); }
function kWebRow_(wt, id) {
  if (!id) return null;
  try { return readAll_(wt).filter(function (r) { return String(r.id) === String(id); })[0] || null; } catch (e) { return null; }
}
function kWebStats_() {
  const out = {};
  try { readAll_('stats').forEach(function (r) { out[r.id] = { reads: Number(r.reads) || 0, shares: Number(r.shares) || 0 }; }); } catch (e) { /* no stats yet */ }
  return out;
}
function kWebPeople_(k, me) { return kKontenPeople_(k).filter(function (u) { return u !== me.id; }); }

function kKontenGet_(me, id) {
  const k = kKonten_(id);
  if (!k || !kCanSeeKonten_(me, k)) return { ok: false, error: 'Item tidak ditemukan atau Anda tidak memiliki akses.' };
  const wt = K_WEB[k.type], out = { ok: true, item: kKontenOut_(k), web_type: wt || '', draft: kDraftOf_(k), can_publish: kCanPublish_(me) };
  if (wt && k.web_id) {
    const w = kWebRow_(wt, k.web_id);
    if (w) { const o = { published: isTrue_(w.published) }; K_NASKAH[wt].forEach(function (f) { o[f] = K_NASKAH_BOOL[f] ? isTrue_(w[f]) : String(w[f] == null ? '' : w[f]); }); out.web = o; }
    out.url = kWebUrl_(wt, k.web_id);
    out.stats = kWebStats_()[k.web_id] || { reads: 0, shares: 0 };
  }
  return out;
}
function kKontenDraft_(me, b) {
  return withLock_(function () {
    const k = kKonten_(b.id);
    if (!k) return { ok: false, error: 'Item tidak ditemukan.' };
    if (!kCanEditKonten_(me, k)) kDeny_();
    const wt = K_WEB[k.type]; if (!wt) return { ok: false, error: 'Naskah website hanya untuk berita dan portofolio.' };
    const d = b.draft || {}, row = { id: k.id, web_type: wt, updated: kNow_(), updated_by: me.id };
    K_NASKAH[wt].forEach(function (f) {
      if (d[f] === undefined) return;
      if (K_NASKAH_BOOL[f]) row[f] = isTrue_(d[f]);
      else if (f === 'image_url') row[f] = kUrl_(d[f]);
      else if (f === 'date') row[f] = kDate_(d[f]);
      else if (f === 'disclosure') row[f] = ['A', 'B', 'C', 'D'].indexOf(String(d[f]).toUpperCase()) >= 0 ? String(d[f]).toUpperCase() : '';
      else row[f] = String(d[f] == null ? '' : d[f]).replace(/\r/g, '').slice(0, K_NASKAH_LONG[f] || 1500);
    });
    const have = kRead_('naskah').some(function (x) { return x.id === k.id; });
    if (!have && !row.date) row.date = kToday_();                 /* a fixed date keeps the reviewed version identical at publish time */
    if (wt === 'news' && !have && !row.category) row.category = 'Berita';
    if (have) kUpdate_('naskah', k.id, row); else kInsert_('naskah', row);
    const draft = kDraftOf_(Object.assign({}, k)), sig = kSig_(wt, draft), patch = { draft_sig: sig, updated: kNow_() };
    if (draft.title_id && draft.title_id !== k.title) patch.title = clean_(draft.title_id, 300);
    kUpdate_('konten', k.id, patch);
    kLog_(me.id, 'ubah naskah', 'konten', k.id, patch.title || k.title);
    return { ok: true, item: kKontenOut_(Object.assign({}, k, patch)), draft: draft };
  });
}
/* reviewer decision: approve (moves on to layout) or send back to draft */
function kKontenReview_(me, b) {
  return withLock_(function () {
    const k = kKonten_(b.id); if (!k) return { ok: false, error: 'Item tidak ditemukan.' };
    const a = kJson_(k.assignees, {}), reviewer = a.telaah === me.id || kSeesAll_(me);
    if (!reviewer) return { ok: false, error: 'Hanya penelaah tahap Telaah internal atau pimpinan yang dapat memberi keputusan.' };
    if (k.owner_uid === me.id && a.telaah && a.telaah !== me.id && !kCanPublish_(me)) return { ok: false, error: 'Naskah sendiri ditelaah oleh orang lain.' };
    const ok = b.decision === 'setuju', note = clean_(b.note, 3000), now = kNow_();
    const patch = { review: JSON.stringify({ d: ok ? 'setuju' : 'revisi', by: me.id, at: now, note: note, sig: k.draft_sig || '' }), stage: ok ? (K_STAGES.indexOf(k.stage) < K_STAGES.indexOf('tata_letak') ? 'tata_letak' : k.stage) : 'draf', updated: now };
    kUpdate_('konten', k.id, patch);
    kInsert_('comments', { id: 'C-' + kShortId_(), task_id: k.id, uid: me.id, body: (ok ? 'Telaah: disetujui untuk terbit.' : 'Telaah: perlu revisi.') + (note ? '\n' + note : ''), mentions: '', created: now });
    kNotify_(k.owner_uid, 'persetujuan', (ok ? 'Naskah disetujui penelaah: ' : 'Naskah perlu revisi: ') + k.title + (note ? '. ' + note.slice(0, 120) : ''), 'konten:' + k.id, me.id);
    if (ok) {
      const next = a.tata_letak || a.terbit;
      if (next) kNotify_(next, 'tugas', 'Naskah siap dilanjutkan: ' + k.title, 'konten:' + k.id, me.id);
      kRead_('users').filter(function (u) { return u.status === 'aktif' && kCanPublish_(u) && u.id !== me.id && u.id !== next; }).slice(0, 5)
        .forEach(function (u) { kNotify_(u.id, 'persetujuan', 'Naskah siap diterbitkan ke website: ' + k.title, 'konten:' + k.id, me.id); });
    }
    kLog_(me.id, ok ? 'setujui naskah' : 'minta revisi naskah', 'konten', k.id, k.title);
    return { ok: true, item: kKontenOut_(Object.assign({}, k, patch)) };
  });
}
function kNextProjectId_() {
  const y = kToday_().slice(0, 4), re = new RegExp('^PRJ-' + y + '-(\\d+)$');
  let max = 0; readAll_('projects').forEach(function (r) { const m = String(r.id).match(re); if (m) max = Math.max(max, Number(m[1])); });
  return 'PRJ-' + y + '-' + ('00' + (max + 1)).slice(-3);
}
function kKontenPublish_(me, b) {
  if (!kCanPublish_(me)) return { ok: false, error: 'Hanya superadmin, direktur, dan admin yang dapat menerbitkan ke website.' };
  return withLock_(function () {
    const k = kKonten_(b.id); if (!k) return { ok: false, error: 'Item tidak ditemukan.' };
    const wt = K_WEB[k.type]; if (!wt) return { ok: false, error: 'Produk repositori diterbitkan lewat GitHub.' };
    const d = kDraftOf_(k), sig = kSig_(wt, d), rv = kJson_(k.review, null);
    if (!d.title_id) return { ok: false, error: 'Judul (Bahasa Indonesia) di naskah masih kosong.' };
    if (wt === 'news' && !d.body_id && !d.excerpt_id) return { ok: false, error: 'Isi atau ringkasan berita masih kosong.' };
    if (wt === 'projects' && ['A', 'B', 'C'].indexOf(d.disclosure) < 0) return { ok: false, error: 'Pilih tingkat keterbukaan A, B, atau C. Tingkat D tidak ditayangkan di website.' };
    if (!(rv && rv.d === 'setuju' && rv.sig === sig) && !isTrue_(b.force)) return { ok: false, need_force: true, error: 'Versi naskah ini belum disetujui penelaah.' };
    const row = { published: true };
    K_NASKAH[wt].forEach(function (f) { row[f] = d[f]; });
    if (!row.date) row.date = kToday_();
    row.id = k.web_id || (wt === 'projects' ? kNextProjectId_() : 'N-' + kToday_().replace(/-/g, '') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6));
    const saved = save_(wt, row);
    try { CacheService.getScriptCache().remove('k_portfolio'); } catch (e) {}
    const now = kNow_(), first = !k.web_id || k.web_status !== 'tayang';
    const patch = { web_id: saved.id, web_status: 'tayang', published_at: now, published_by: me.id, pub_sig: sig, draft_sig: sig, link: kWebUrl_(wt, saved.id), updated: now };
    if (K_STAGES.indexOf(k.stage) < K_STAGES.indexOf('terbit')) patch.stage = 'terbit';
    kUpdate_('konten', k.id, patch);
    kWebPeople_(k, me).forEach(function (uid) { kNotify_(uid, 'persetujuan', (first ? 'Tayang di website: ' : 'Versi tayang diperbarui: ') + k.title, 'konten:' + k.id, me.id); });
    const a = kJson_(k.assignees, {}); if (a.diseminasi && first) kNotify_(a.diseminasi, 'tugas', 'Sudah tayang, giliran diseminasi: ' + k.title, 'konten:' + k.id, me.id);
    kLog_(me.id, first ? 'terbitkan ke website' : 'perbarui versi tayang', 'konten', k.id, k.title);
    return { ok: true, item: kKontenOut_(Object.assign({}, k, patch)), url: patch.link };
  });
}
function kKontenUnpublish_(me, b) {
  if (!kCanPublish_(me)) return { ok: false, error: 'Hanya superadmin, direktur, dan admin yang dapat menarik konten dari website.' };
  return withLock_(function () {
    const k = kKonten_(b.id); if (!k || !k.web_id) return { ok: false, error: 'Item ini belum tayang di website.' };
    save_(K_WEB[k.type], { id: k.web_id, published: false });
    try { CacheService.getScriptCache().remove('k_portfolio'); } catch (e) {}
    const patch = { web_status: 'ditarik', updated: kNow_() };
    kUpdate_('konten', k.id, patch);
    kLog_(me.id, 'tarik dari website', 'konten', k.id, k.title);
    return { ok: true, item: kKontenOut_(Object.assign({}, k, patch)) };
  });
}
/* everything currently on the website, with reads and shares, for the "Di website" control view */
function kWebList_(me) {
  if (!kSeesAll_(me)) kDeny_();
  const links = {}; kRead_('konten').forEach(function (k) { if (k.web_id) links[K_WEB[k.type] + ':' + k.web_id] = k.id; });
  const st = kWebStats_(), map = function (wt) {
    let rows = []; try { rows = readAll_(wt); } catch (e) {}
    return rows.map(function (r) {
      const s = st[r.id] || {};
      return { id: String(r.id), title: String(r.title_id || ''), category: String(r.category || ''), disclosure: String(r.disclosure || ''), date: String(r.date || ''),
        published: isTrue_(r.published), featured: isTrue_(r.featured), image_url: String(r.image_url || ''), reads: s.reads || 0, shares: s.shares || 0, konten_id: links[wt + ':' + r.id] || '', url: kWebUrl_(wt, r.id) };
    });
  };
  return { ok: true, news: map('news'), projects: map('projects'), can_publish: kCanPublish_(me) };
}
function kWebToggle_(me, b) {
  if (!kCanPublish_(me)) return { ok: false, error: 'Hanya superadmin, direktur, dan admin yang dapat mengubah tayangan website.' };
  const wt = b.type === 'projects' ? 'projects' : 'news', field = b.field === 'featured' && wt === 'news' ? 'featured' : 'published', on = isTrue_(b.value);
  return withLock_(function () {
    const w = kWebRow_(wt, b.web_id); if (!w) return { ok: false, error: 'Item website tidak ditemukan.' };
    if (field === 'published' && on && wt === 'projects' && ['A', 'B', 'C'].indexOf(String(w.disclosure).toUpperCase()) < 0) return { ok: false, error: 'Tingkat keterbukaan proyek ini D atau kosong, jadi tidak dapat ditayangkan.' };
    const row = { id: w.id }; row[field] = on; save_(wt, row);
    try { CacheService.getScriptCache().remove('k_portfolio'); } catch (e) {}
    const k = kRead_('konten').filter(function (x) { return x.web_id === String(w.id) && K_WEB[x.type] === wt; })[0];
    if (k) {
      const patch = field === 'published' ? { web_status: on ? 'tayang' : 'ditarik', updated: kNow_() } : { updated: kNow_() };
      if (field === 'featured') { const n = kRead_('naskah').some(function (x) { return x.id === k.id; }); if (n) kUpdate_('naskah', k.id, { featured: on }); patch.draft_sig = kSig_(wt, kDraftOf_(k)); patch.pub_sig = k.draft_sig === k.pub_sig ? patch.draft_sig : k.pub_sig; }
      kUpdate_('konten', k.id, patch);
    }
    kLog_(me.id, (on ? 'aktifkan ' : 'matikan ') + field + ' web', wt, String(w.id), String(w.title_id || ''));
    return { ok: true };
  });
}
/* bring an item that already exists on the website under the content workflow */
function kWebImport_(me, b) {
  if (!kSeesAll_(me)) kDeny_();
  const wt = b.type === 'projects' ? 'projects' : 'news', type = wt === 'news' ? 'berita' : 'portofolio';
  return withLock_(function () {
    const have = kRead_('konten').filter(function (k) { return k.web_id === String(b.web_id) && k.type === type; })[0];
    if (have) return { ok: true, item: kKontenOut_(have) };
    const w = kWebRow_(wt, b.web_id); if (!w) return { ok: false, error: 'Item website tidak ditemukan.' };
    const id = 'KN-' + kShortId_(), now = kNow_(), pub = isTrue_(w.published), n = { id: id, web_type: wt, updated: now, updated_by: me.id };
    K_NASKAH[wt].forEach(function (f) { n[f] = w[f] instanceof Date ? Utilities.formatDate(w[f], K_TZ, 'yyyy-MM-dd') : (K_NASKAH_BOOL[f] ? isTrue_(w[f]) : String(w[f] == null ? '' : w[f])); });
    kInsert_('naskah', n);
    const sig = kSig_(wt, n);
    const row = { id: id, type: type, title: clean_(w.title_id || '(tanpa judul)', 300), ref_id: wt === 'projects' ? String(w.id) : '', stage: pub ? 'terbit' : 'draf', owner_uid: me.id, assignees: '{}',
      priority: 'sedang', created_by: me.id, created: now, updated: now, web_id: String(w.id), web_status: pub ? 'tayang' : 'ditarik', draft_sig: sig, pub_sig: pub ? sig : '', link: kWebUrl_(wt, w.id),
      review: pub ? JSON.stringify({ d: 'setuju', by: me.id, at: now, note: 'Diambil dari website yang sudah tayang', sig: sig }) : '' };
    kInsert_('konten', row);
    kLog_(me.id, 'ambil dari website', 'konten', id, row.title);
    return { ok: true, item: kKontenOut_(row) };
  });
}
function kUpload_(me, b) {
  if (!(kSeesAll_(me) || me.role === 'peneliti' || kRead_('konten').some(function (k) { return kKontenPeople_(k).indexOf(me.id) >= 0; }))) kDeny_();
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(b.mimeType) < 0) return { ok: false, error: 'Unggah foto berformat JPG, PNG, atau WebP.' };
  if (!PROPS.getProperty('FOLDER_ID')) return { ok: false, error: 'Folder unggahan belum disiapkan. Tempel tautan Google Drive sebagai gantinya.' };
  return { ok: true, data: upload_(b) };
}
