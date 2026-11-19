/**
 * CHARIS Ruang Kerja: Peluang dan proposal (opportunities, brainstorming, proposals, bidding).
 * Same Apps Script project as Code.gs, Kerja.gs and Keuangan.gs (add with + next to Files, name it "Peluang").
 *
 * Flow: a call is noted in seconds (title, link, deadline) > brainstorming (ideas, discussion sheet, scores)
 * > team decision > concept note or EOI (optional) > writing > internal review > submitted
 * > clarification, presentation or negotiation > won, not won, cancelled, or not pursued.
 * When the team decides to go ahead, a proposal workspace is created as a project with status "proposal",
 * so tasks, comments, calendar and hours work as in any project. When the proposal is won, that same
 * project becomes a running project, with milestones, budget, contract draft and portfolio draft.
 */
const P_STAGES = ['masuk', 'brainstorm', 'keputusan', 'eoi', 'penyusunan', 'telaah', 'diajukan', 'klarifikasi', 'lolos', 'tidak_lolos', 'batal', 'tidak_lanjut'];
const P_OPEN = ['masuk', 'brainstorm', 'keputusan', 'eoi', 'penyusunan', 'telaah', 'diajukan', 'klarifikasi'];
const P_STAGE_L = { masuk: 'Peluang masuk', brainstorm: 'Brainstorming', keputusan: 'Keputusan tim', eoi: 'Concept note atau EOI', penyusunan: 'Penyusunan proposal', telaah: 'Telaah internal',
  diajukan: 'Diajukan', klarifikasi: 'Klarifikasi, presentasi, atau negosiasi', lolos: 'Lolos', tidak_lolos: 'Tidak lolos', batal: 'Batal', tidak_lanjut: 'Tidak dilanjutkan' };
const P_KINDS = ['', 'hibah', 'tender', 'rfp', 'penunjukan', 'lainnya'];
const P_CURRENCIES = ['IDR', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY', 'CHF'];
const P_BRIEF = ['masalah', 'pendekatan', 'mitra', 'keunggulan', 'risiko', 'syarat'];
/* standard proposal tasks: [title, milestone index, days before the deadline] */
const P_TASKS = [
  ['Baca panduan call dan syarat kelayakan', 0, 21], ['Tetapkan tim, peran, dan jadwal penyusunan', 0, 20],
  ['Susun concept note atau EOI', 1, 18],
  ['Rumuskan masalah dan teori perubahan', 2, 15], ['Susun kerangka logis dan indikator', 2, 12], ['Tulis narasi proposal', 2, 9],
  ['Susun anggaran dan justifikasi', 2, 9], ['Kumpulkan CV tim dan surat dukungan mitra', 2, 8], ['Siapkan dokumen legalitas lembaga', 2, 8],
  ['Telaah internal dan perbaikan', 3, 4], ['Periksa kelengkapan sesuai daftar syarat', 3, 2], ['Kirim proposal dan simpan bukti pengiriman', 4, 0]
];
const P_MILESTONES = ['Persiapan', 'Concept note atau EOI', 'Penyusunan', 'Telaah internal', 'Pengajuan'];

function kOpp_(id) { return kRead_('peluang').filter(function (o) { return o.id === id; })[0] || null; }
function kOppTeam_(o) { return [o.lead_uid, o.created_by].concat(String(o.team || '').split(',')).map(function (s) { return String(s).trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }); }
/* visibility: leaders see everything; the team always; everyone else (except freelance consultants) only while
   the opportunity is open to all, which is the default before the team decides to write a proposal */
function kCanSeeOpp_(u, o) { return u.role === 'superadmin' || u.role === 'direktur' || u.role === 'admin' || kOppTeam_(o).indexOf(u.id) >= 0 || (o.visibility !== 'tim' && u.role !== 'konsultan'); }
function kCanEditOpp_(u, o) { return u.role === 'superadmin' || u.role === 'direktur' || u.role === 'admin' || kOppTeam_(o).indexOf(u.id) >= 0; }
function kCanDecideOpp_(u, o) { return u.role === 'superadmin' || u.role === 'direktur' || o.lead_uid === u.id; }
function kOppVisible_(me, id) {
  const o = kOpp_(id); if (!o || !kCanSeeOpp_(me, o)) return null;
  return { t: { id: o.id, title: o.title }, p: { lead_uid: o.lead_uid, members: kOppTeam_(o).join(',') } };
}
function kOppOut_(o, ideas, scores) {
  const sc = scores.filter(function (s) { return s.opp_id === o.id; });
  const avg = sc.length ? Math.round(sc.reduce(function (a, s) { return a + (Number(s.fit) + Number(s.win) + Number(s.capacity) + Number(s.value)) / 4; }, 0) / sc.length * 10) / 10 : 0;
  return { id: o.id, number: o.number, title: o.title, link: o.link, deadline: o.deadline, kind: o.kind, funder: o.funder, value: Number(o.value) || 0, currency: o.currency || 'IDR',
    service: o.service, stage: o.stage || 'masuk', visibility: o.visibility || 'semua', lead_uid: o.lead_uid, team: kOppTeam_(o), project_id: o.project_id,
    rate: Number(o.rate) || 0, ideas: ideas.filter(function (i) { return i.opp_id === o.id; }).length, scores: sc.length, score: avg,
    decision: kJson_(o.decision, null), result: kJson_(o.result, null), parent_id: o.parent_id, submitted_at: o.submitted_at, created_by: o.created_by, created: o.created, updated: o.updated };
}
function kOppList_(me) {
  const ideas = kRead_('peluang_ide'), scores = kRead_('peluang_skor');
  return kRead_('peluang').filter(function (o) { return kCanSeeOpp_(me, o); }).map(function (o) { return kOppOut_(o, ideas, scores); });
}

function peluang_(me, b) {
  switch (b.op) {
    case 'oppCapture':    return kOppCapture_(me, b);
    case 'oppSave':       return kOppSave_(me, b.row || {});
    case 'oppGet':        return kOppGet_(me, b.id);
    case 'oppStage':      return kOppStage_(me, b);
    case 'oppIdea':       return kOppIdea_(me, b);
    case 'oppVote':       return kOppVote_(me, b);
    case 'oppIdeaDelete': return kOppIdeaDelete_(me, b);
    case 'oppScore':      return kOppScore_(me, b);
    case 'oppDecide':     return kOppDecide_(me, b);
    case 'oppBudget':     return kOppBudget_(me, b);
    case 'oppResult':     return kOppResult_(me, b);
    case 'oppCopy':       return kOppCopy_(me, b);
    case 'oppDelete':     return kOppDelete_(me, b);
    default:              return { ok: false, error: 'Perintah tidak dikenal.' };
  }
}
function kOppNumber_() {
  const y = kToday_().slice(0, 4), pre = 'OPP-' + y + '-';
  const max = kRead_('peluang').reduce(function (m, o) { const s = String(o.number || ''); return s.indexOf(pre) === 0 ? Math.max(m, Number(s.slice(pre.length)) || 0) : m; }, 0);
  return pre + ('00' + (max + 1)).slice(-3);
}

/* the quick note: three fields, anyone can do it */
function kOppCapture_(me, b) {
  const title = clean_(b.title, 300);
  if (!title) return { ok: false, error: 'Tulis judul call.' };
  const link = kUrl_(b.link), deadline = kDate_(b.deadline);
  if (b.link && !link) return { ok: false, error: 'Tautan harus diawali https://' };
  return withLock_(function () {
    const now = kNow_(), number = kOppNumber_();
    const row = { id: 'OPP-' + kShortId_(), number: number, title: title, link: link, deadline: deadline, stage: 'masuk', visibility: 'semua', lead_uid: me.id, team: me.id,
      currency: 'IDR', created_by: me.id, created: now, updated: now };
    kInsert_('peluang', row);
    kRead_('users').filter(function (u) { return u.status === 'aktif' && (u.role === 'direktur' || u.role === 'superadmin') && u.id !== me.id; })
      .forEach(function (u) { kNotify_(u.id, 'proyek', me.name + ' mencatat peluang: ' + title + (deadline ? ' (tenggat ' + deadline + ')' : ''), 'opp:' + row.id, me.id); });
    kLog_(me.id, 'catat peluang', 'peluang', row.id, number);
    return { ok: true, item: kOppOut_(row, [], []) };
  });
}
function kOppSave_(me, r) {
  return withLock_(function () {
    const o = kOpp_(r.id); if (!o) return { ok: false, error: 'Peluang tidak ditemukan.' };
    if (!kCanEditOpp_(me, o)) kDeny_();
    const patch = {}, set = function (k, v) { if (r[k] !== undefined) patch[k] = v; };
    set('title', clean_(r.title, 300)); set('link', kUrl_(r.link)); set('deadline', kDate_(r.deadline));
    set('kind', P_KINDS.indexOf(r.kind) >= 0 ? r.kind : ''); set('funder', clean_(r.funder, 200)); set('value', Math.max(0, kNum_(r.value)));
    set('currency', P_CURRENCIES.indexOf(r.currency) >= 0 ? r.currency : 'IDR'); set('service', clean_(r.service, 40)); set('notes', clean_(r.notes, 5000));
    set('rate', Math.max(0, kNum_(r.rate))); set('rate_date', kDate_(r.rate_date));
    if (r.visibility !== undefined) patch.visibility = r.visibility === 'tim' ? 'tim' : 'semua';
    if (r.lead_uid !== undefined) { if (!kCanDecideOpp_(me, o)) kDeny_(); patch.lead_uid = clean_(r.lead_uid, 40); }
    if (r.team !== undefined) patch.team = (Array.isArray(r.team) ? r.team : String(r.team).split(',')).map(function (s) { return clean_(s, 40); }).filter(String).join(',');
    if (r.brief !== undefined) { const bf = {}; P_BRIEF.forEach(function (k) { bf[k] = clean_((r.brief || {})[k], 4000); }); patch.brief = JSON.stringify(bf); }
    if (r.workplan !== undefined) patch.workplan = JSON.stringify((Array.isArray(r.workplan) ? r.workplan : []).slice(0, 40).map(function (w) { return { name: clean_(w.name, 200), due: kDate_(w.due) }; }).filter(function (w) { return w.name; }));
    if (patch.title === '') return { ok: false, error: 'Judul call wajib diisi.' };
    patch.updated = kNow_();
    const before = kOppTeam_(o);
    kUpdate_('peluang', o.id, patch);
    const now = Object.assign({}, o, patch);
    kOppTeam_(now).filter(function (u) { return before.indexOf(u) < 0; }).forEach(function (u) { kNotify_(u, 'tugas', me.name + ' menambahkan Anda ke tim peluang: ' + now.title, 'opp:' + o.id, me.id); });
    /* keep the proposal workspace team in step */
    if (now.project_id && (patch.team !== undefined || patch.lead_uid !== undefined)) {
      const p = kProject_(now.project_id); if (p) kUpdate_('wprojects', p.id, { lead_uid: now.lead_uid, members: kOppTeam_(now).join(','), updated: kNow_() });
    }
    return { ok: true, item: kOppOut_(now, kRead_('peluang_ide'), kRead_('peluang_skor')) };
  });
}
function kOppGet_(me, id) {
  const o = kOpp_(id); if (!o || !kCanSeeOpp_(me, o)) return { ok: false, error: 'Peluang tidak ditemukan atau Anda tidak memiliki akses.' };
  const ideas = kRead_('peluang_ide'), scores = kRead_('peluang_skor');
  const mine = scores.filter(function (s) { return s.opp_id === id && s.uid === me.id; })[0] || null;
  let proj = null;
  if (o.project_id) {
    const p = kProject_(o.project_id);
    if (p) { const ts = kRead_('tasks').filter(function (t) { return t.project_id === p.id; }); proj = { id: p.id, name: p.name, status: p.status, tasks: ts.length, done: ts.filter(function (t) { return t.status === 'selesai'; }).length }; }
  }
  return { ok: true, item: kOppOut_(o, ideas, scores), brief: kJson_(o.brief, {}), workplan: kJson_(o.workplan, []), notes: o.notes || '', rate_date: o.rate_date || '',
    ideas: ideas.filter(function (i) { return i.opp_id === id; }).map(function (i) { const v = String(i.votes || '').split(',').filter(String); return { id: i.id, uid: i.uid, text: i.text, votes: v.length, voted: v.indexOf(me.id) >= 0, created: i.created }; })
      .sort(function (a, b) { return b.votes - a.votes || String(a.created).localeCompare(String(b.created)); }),
    scores: scores.filter(function (s) { return s.opp_id === id; }).map(function (s) { return { uid: s.uid, fit: Number(s.fit), win: Number(s.win), capacity: Number(s.capacity), value: Number(s.value), note: s.note }; }),
    my_score: mine ? { fit: Number(mine.fit), win: Number(mine.win), capacity: Number(mine.capacity), value: Number(mine.value), note: mine.note } : null,
    budget: kRead_('peluang_rab').filter(function (l) { return l.opp_id === id; }).sort(function (a, b) { return Number(a.order) - Number(b.order); })
      .map(function (l) { return { pos_id: l.pos_id, description: l.description, volume: Number(l.volume) || 0, unit: l.unit, price: Number(l.price) || 0 }; }),
    project: proj, can_edit: kCanEditOpp_(me, o), can_decide: kCanDecideOpp_(me, o) };
}
/* move between open stages (decision and results have their own actions) */
function kOppStage_(me, b) {
  return withLock_(function () {
    const o = kOpp_(b.id); if (!o) return { ok: false, error: 'Peluang tidak ditemukan.' };
    if (!kCanEditOpp_(me, o)) kDeny_();
    const st = String(b.stage);
    if (P_OPEN.indexOf(st) < 0) return { ok: false, error: 'Tahap tidak dikenal.' };
    if (['eoi', 'penyusunan', 'telaah', 'diajukan', 'klarifikasi'].indexOf(st) >= 0 && !o.project_id) return { ok: false, error: 'Catat dulu keputusan tim untuk melanjutkan peluang ini.' };
    const patch = { stage: st, updated: kNow_() };
    if (st === 'diajukan' && !o.submitted_at) patch.submitted_at = kToday_();
    kUpdate_('peluang', o.id, patch);
    kOppTeam_(o).forEach(function (u) { kNotify_(u, 'proyek', 'Tahap peluang: ' + P_STAGE_L[st] + ' (' + o.title + ')', 'opp:' + o.id, me.id); });
    kLog_(me.id, 'tahap peluang ' + P_STAGE_L[st], 'peluang', o.id, o.number);
    return { ok: true, item: kOppOut_(Object.assign({}, o, patch), kRead_('peluang_ide'), kRead_('peluang_skor')) };
  });
}
function kOppIdea_(me, b) {
  const o = kOpp_(b.opp_id); if (!o || !kCanSeeOpp_(me, o)) kDeny_();
  const text = clean_(b.text, 1500); if (!text) return { ok: false, error: 'Tulis idenya dulu.' };
  return withLock_(function () {
    const row = { id: 'IDE-' + kShortId_(), opp_id: o.id, uid: me.id, text: text, votes: '', created: kNow_() };
    kInsert_('peluang_ide', row);
    if (o.stage === 'masuk') kUpdate_('peluang', o.id, { stage: 'brainstorm', updated: kNow_() });
    kOppTeam_(o).forEach(function (u) { kNotify_(u, 'sebutan', me.name + ' menambah ide: ' + text.slice(0, 80), 'opp:' + o.id, me.id); });
    return { ok: true };
  });
}
function kOppVote_(me, b) {
  return withLock_(function () {
    const i = kRead_('peluang_ide').filter(function (x) { return x.id === b.id; })[0]; if (!i) return { ok: false, error: 'Ide tidak ditemukan.' };
    const o = kOpp_(i.opp_id); if (!o || !kCanSeeOpp_(me, o)) kDeny_();
    let v = String(i.votes || '').split(',').filter(String);
    v = v.indexOf(me.id) >= 0 ? v.filter(function (x) { return x !== me.id; }) : v.concat([me.id]);
    kUpdate_('peluang_ide', i.id, { votes: v.join(',') });
    return { ok: true };
  });
}
function kOppIdeaDelete_(me, b) {
  return withLock_(function () {
    const i = kRead_('peluang_ide').filter(function (x) { return x.id === b.id; })[0]; if (!i) return { ok: true };
    const o = kOpp_(i.opp_id);
    if (!(i.uid === me.id || (o && kCanDecideOpp_(me, o)))) kDeny_();
    kDeleteWhere_('peluang_ide', function (x) { return x.id === b.id; });
    return { ok: true };
  });
}
function kOppScore_(me, b) {
  const o = kOpp_(b.opp_id); if (!o || !kCanSeeOpp_(me, o)) kDeny_();
  const s = function (v) { return Math.max(1, Math.min(5, Math.round(Number(v) || 0))); };
  return withLock_(function () {
    const id = o.id + ':' + me.id, row = { id: id, opp_id: o.id, uid: me.id, fit: s(b.fit), win: s(b.win), capacity: s(b.capacity), value: s(b.value), note: clean_(b.note, 1000), updated: kNow_() };
    if (kRead_('peluang_skor').some(function (x) { return x.id === id; })) kUpdate_('peluang_skor', id, row); else kInsert_('peluang_skor', row);
    if (o.stage === 'masuk' || o.stage === 'brainstorm') kUpdate_('peluang', o.id, { stage: 'keputusan', updated: kNow_() });
    return { ok: true };
  });
}

/* the team meeting decides: go (creates the proposal workspace with standard tasks) or not */
function kOppDecide_(me, b) {
  return withLock_(function () {
    const o = kOpp_(b.id); if (!o) return { ok: false, error: 'Peluang tidak ditemukan.' };
    if (!kCanDecideOpp_(me, o)) return { ok: false, error: 'Keputusan dicatat oleh penanggung jawab peluang, direktur, atau superadmin.' };
    const go = b.decision === 'lanjut', now = kNow_(), note = clean_(b.note, 3000);
    const sc = kRead_('peluang_skor').filter(function (s) { return s.opp_id === o.id; });
    const avg = sc.length ? Math.round(sc.reduce(function (a, s) { return a + (Number(s.fit) + Number(s.win) + Number(s.capacity) + Number(s.value)) / 4; }, 0) / sc.length * 10) / 10 : 0;
    const patch = { decision: JSON.stringify({ d: go ? 'lanjut' : 'tidak', by: me.id, at: now, note: note, score: avg, voters: sc.length }), updated: now };
    if (!go) {
      patch.stage = 'tidak_lanjut';
      kUpdate_('peluang', o.id, patch);
      kOppTeam_(o).forEach(function (u) { kNotify_(u, 'proyek', 'Peluang tidak dilanjutkan: ' + o.title + (note ? '. ' + note.slice(0, 100) : ''), 'opp:' + o.id, me.id); });
      kLog_(me.id, 'peluang tidak dilanjutkan', 'peluang', o.id, o.number);
      return { ok: true, item: kOppOut_(Object.assign({}, o, patch), kRead_('peluang_ide'), sc) };
    }
    const withEoi = isTrue_(b.eoi);
    patch.stage = withEoi ? 'eoi' : 'penyusunan';
    patch.visibility = 'tim';
    if (b.team !== undefined) patch.team = (Array.isArray(b.team) ? b.team : String(b.team).split(',')).map(function (s) { return clean_(s, 40); }).filter(String).join(',');
    if (b.lead_uid) patch.lead_uid = clean_(b.lead_uid, 40);
    const cur = Object.assign({}, o, patch);
    if (!o.project_id) patch.project_id = kOppWorkspace_(me, cur, withEoi);
    kUpdate_('peluang', o.id, patch);
    kOppTeam_(cur).forEach(function (u) { kNotify_(u, 'tugas', 'Tim memutuskan lanjut menyusun proposal: ' + o.title, 'opp:' + o.id, me.id); });
    kLog_(me.id, 'peluang dilanjutkan', 'peluang', o.id, o.number);
    return { ok: true, item: kOppOut_(Object.assign(cur, patch), kRead_('peluang_ide'), sc) };
  });
}
/* proposal workspace: a project with status "proposal", milestones and the standard tasks dated back from the deadline */
function kOppWorkspace_(me, o, withEoi) {
  const year = kToday_().slice(0, 4), seq = kRead_('wprojects').filter(function (p) { return String(p.id).indexOf('WP-' + year + '-') === 0; }).length + 1;
  const pid = 'WP-' + year + '-' + ('00' + seq).slice(-3), team = kOppTeam_(o), now = kNow_();
  kInsert_('wprojects', { id: pid, name: 'Proposal: ' + o.title, code: o.number, client: o.funder || '', status: 'proposal', start: kToday_(), end: o.deadline || '', lead_uid: o.lead_uid || me.id,
    members: team.join(','), description: 'Ruang kerja penyusunan proposal untuk ' + o.title + (o.link ? '\n' + o.link : ''), drive_url: '', created: now, updated: now });
  const due = function (days) { if (!o.deadline) return ''; const d = kAddDays_(o.deadline, -days); return d < kToday_() ? kToday_() : d; };
  const ms = P_MILESTONES.map(function (name, i) { return { id: 'MS-' + kShortId_() + i, project_id: pid, name: name, weight: [10, 15, 45, 15, 15][i], deliverable: i === 4, due: due([18, 16, 6, 2, 0][i]), order: i + 1 }; })
    .filter(function (m, i) { return withEoi || i !== 1; });
  ms.forEach(function (m) { kInsert_('milestones', m); });
  P_TASKS.forEach(function (t, i) {
    if (!withEoi && t[1] === 1) return;
    const m = ms.filter(function (x) { return x.name === P_MILESTONES[t[1]]; })[0];
    kInsert_('tasks', { id: 'T-' + kShortId_() + i, project_id: pid, milestone_id: m ? m.id : '', title: t[0], description: '', assignee_uid: i < 2 ? (o.lead_uid || me.id) : '', status: 'belum', priority: t[2] <= 4 ? 'tinggi' : 'sedang',
      labels: 'proposal', start: '', due: due(t[2]), est_hours: 0, checklist: '[]', attachments: '[]', order: i + 1, created_by: me.id, created: now, updated: now, done_at: '' });
  });
  return pid;
}
function kOppBudget_(me, b) {
  return withLock_(function () {
    const o = kOpp_(b.id); if (!o) return { ok: false, error: 'Peluang tidak ditemukan.' };
    if (!kCanEditOpp_(me, o)) kDeny_();
    const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 300).map(function (l, i) {
      return { id: o.id + '-' + i, opp_id: o.id, pos_id: clean_(l.pos_id, 40), description: clean_(l.description, 300), volume: Math.max(0, kNum_(l.volume)), unit: clean_(l.unit, 30), price: Math.max(0, kNum_(l.price)), order: i + 1 };
    }).filter(function (l) { return l.description || l.price; });
    kDeleteWhere_('peluang_rab', function (x) { return x.opp_id === o.id; });
    lines.forEach(function (l) { kInsert_('peluang_rab', l); });
    const total = lines.reduce(function (a, l) { return a + l.volume * l.price; }, 0);
    const patch = { currency: P_CURRENCIES.indexOf(b.currency) >= 0 ? b.currency : 'IDR', rate: b.currency === 'IDR' ? 1 : Math.max(0, kNum_(b.rate)), rate_date: kDate_(b.rate_date) || kToday_(), value: Math.round(total * 100) / 100, updated: kNow_() };
    kUpdate_('peluang', o.id, patch);
    kLog_(me.id, 'ubah anggaran proposal', 'peluang', o.id, o.number);
    return { ok: true, item: kOppOut_(Object.assign({}, o, patch), kRead_('peluang_ide'), kRead_('peluang_skor')) };
  });
}

/* result: won turns the workspace into a running project and prepares everything that follows */
function kOppResult_(me, b) {
  return withLock_(function () {
    const o = kOpp_(b.id); if (!o) return { ok: false, error: 'Peluang tidak ditemukan.' };
    if (!kCanDecideOpp_(me, o)) return { ok: false, error: 'Hasil dicatat oleh penanggung jawab peluang, direktur, atau superadmin.' };
    const res = ['lolos', 'tidak_lolos', 'batal'].indexOf(b.result) >= 0 ? b.result : '';
    if (!res) return { ok: false, error: 'Pilih hasilnya.' };
    const now = kNow_(), made = [];
    const result = { d: res, by: me.id, at: now, note: clean_(b.note, 3000), feedback: clean_(b.feedback, 5000), reason: clean_(b.reason, 200) };
    const patch = { stage: res, result: JSON.stringify(result), updated: now };
    const p = o.project_id ? kProject_(o.project_id) : null;
    if (res === 'lolos') {
      const start = kDate_(b.start) || kToday_(), end = kDate_(b.end) || '', valueIdr = Math.max(0, kNum_(b.value_idr)) || Math.round((Number(o.value) || 0) * (o.currency === 'IDR' ? 1 : (Number(o.rate) || 0)));
      let pid = p ? p.id : '';
      if (p) kUpdate_('wprojects', p.id, { name: o.title, status: 'berjalan', start: start, end: end, client: o.funder || p.client, updated: now });
      else { pid = kOppWorkspace_(me, o, false); kUpdate_('wprojects', pid, { name: o.title, status: 'berjalan', start: start, end: end }); }
      patch.project_id = pid; made.push('proyek');
      /* implementation milestones from the work plan */
      const wp = kJson_(o.workplan, []), base = kRead_('milestones').filter(function (m) { return m.project_id === pid; }).length;
      wp.forEach(function (w, i) { kInsert_('milestones', { id: 'MS-' + kShortId_() + 'w' + i, project_id: pid, name: w.name, weight: Math.round(100 / Math.max(1, wp.length)), deliverable: false, due: w.due, order: base + i + 1 }); });
      if (wp.length) made.push('milestone');
      /* budget in rupiah per budget line, for the start year */
      try {
        if (PROPS.getProperty('FIN_SS_ID')) {
          const rate = o.currency === 'IDR' ? 1 : (Number(o.rate) || 0), sums = {};
          kRead_('peluang_rab').filter(function (l) { return l.opp_id === o.id && l.pos_id; }).forEach(function (l) { sums[l.pos_id] = (sums[l.pos_id] || 0) + Number(l.volume) * Number(l.price) * rate; });
          Object.keys(sums).forEach(function (pos) { kInsert_('anggaran', { id: 'ANG-' + kShortId_() + pos.slice(-3), project_id: pid, year: Number(start.slice(0, 4)), pos_id: pos, amount: Math.round(sums[pos]), note: 'Dari proposal ' + o.number, updated: now }); });
          if (Object.keys(sums).length) made.push('anggaran');
        }
      } catch (e) { /* finance not set up */ }
      /* contract draft in Administrasi */
      kInsert_('kontrak', { id: 'KON-' + kShortId_(), kind: 'Kontrak', number: clean_(b.contract_no, 120), title: o.title, party: o.funder || '', project_id: pid, value: valueIdr, start: start, end: end, file_url: '',
        notes: 'Draf otomatis dari proposal ' + o.number + '. Lengkapi nomor dan berkas kontrak.', created_by: me.id, created: now, updated: now });
      made.push('kontrak');
      /* portfolio draft in Alur konten */
      const kid = 'KN-' + kShortId_();
      kInsert_('konten', { id: kid, type: 'portofolio', title: o.title, ref_id: '', stage: 'draf', owner_uid: o.lead_uid || me.id, assignees: '{}', priority: 'sedang', project_id: pid, created_by: me.id, created: now, updated: now });
      kInsert_('naskah', { id: kid, web_type: 'projects', updated: now, updated_by: me.id, title_id: o.title, client: o.funder || '', service: o.service || '', status: 'berjalan', year_start: start.slice(0, 4), year_end: end.slice(0, 4), date: kToday_() });
      made.push('portofolio');
      kOppTeam_(o).forEach(function (u) { kNotify_(u, 'proyek', 'Proposal lolos: ' + o.title + '. Proyek sudah dibuat.', 'project:' + pid, me.id); });
    } else {
      if (p) kUpdate_('wprojects', p.id, { status: res === 'tidak_lolos' ? 'tidak_lolos' : 'ditunda', updated: now });
      kOppTeam_(o).forEach(function (u) { kNotify_(u, 'proyek', (res === 'tidak_lolos' ? 'Proposal tidak lolos: ' : 'Proposal dibatalkan: ') + o.title, 'opp:' + o.id, me.id); });
    }
    kUpdate_('peluang', o.id, patch);
    kLog_(me.id, 'hasil proposal ' + P_STAGE_L[res], 'peluang', o.id, o.number);
    return { ok: true, made: made, item: kOppOut_(Object.assign({}, o, patch), kRead_('peluang_ide'), kRead_('peluang_skor')) };
  });
}
/* reuse a proposal for another call: discussion sheet, work plan, budget and team come along */
function kOppCopy_(me, b) {
  const o = kOpp_(b.id); if (!o || !kCanSeeOpp_(me, o)) kDeny_();
  const title = clean_(b.title, 300); if (!title) return { ok: false, error: 'Tulis judul call yang baru.' };
  return withLock_(function () {
    const now = kNow_(), row = { id: 'OPP-' + kShortId_(), number: kOppNumber_(), title: title, link: kUrl_(b.link), deadline: kDate_(b.deadline), kind: o.kind, funder: clean_(b.funder, 200) || '',
      value: o.value, currency: o.currency, service: o.service, stage: 'keputusan', visibility: o.visibility || 'semua', lead_uid: o.lead_uid || me.id, team: o.team, brief: o.brief, rate: o.rate, rate_date: o.rate_date,
      workplan: o.workplan, parent_id: o.id, notes: 'Disalin dari ' + o.number + ': ' + o.title, created_by: me.id, created: now, updated: now };
    kInsert_('peluang', row);
    kRead_('peluang_rab').filter(function (l) { return l.opp_id === o.id; }).forEach(function (l, i) { kInsert_('peluang_rab', Object.assign({}, l, { id: row.id + '-' + i, opp_id: row.id })); });
    kOppTeam_(row).forEach(function (u) { kNotify_(u, 'tugas', 'Proposal disalin untuk call baru: ' + title, 'opp:' + row.id, me.id); });
    kLog_(me.id, 'salin proposal', 'peluang', row.id, row.number + ' dari ' + o.number);
    return { ok: true, item: kOppOut_(row, [], []) };
  });
}
function kOppDelete_(me, b) {
  const o = kOpp_(b.id); if (!o) return { ok: true };
  if (!(me.role === 'superadmin' || me.role === 'direktur' || (o.created_by === me.id && !o.project_id))) return { ok: false, error: 'Peluang hanya dapat dihapus oleh pencatatnya (sebelum proposal disusun), direktur, atau superadmin.' };
  return withLock_(function () {
    ['peluang_ide', 'peluang_skor', 'peluang_rab'].forEach(function (s) { kDeleteWhere_(s, function (x) { return x.opp_id === o.id; }); });
    kDeleteWhere_('comments', function (c) { return c.task_id === o.id; });
    kDeleteWhere_('peluang', function (x) { return x.id === o.id; });
    kLog_(me.id, 'hapus peluang', 'peluang', o.id, o.number);
    return { ok: true };
  });
}
/* daily: deadline in 7 days and tomorrow, to the opportunity team */
function kOppHarian_(today, have) {
  const d7 = kAddDays_(today, 7), d1 = kAddDays_(today, 1);
  kRead_('peluang').forEach(function (o) {
    if (P_OPEN.indexOf(o.stage || 'masuk') < 0 || !o.deadline || o.stage === 'diajukan' || o.stage === 'klarifikasi') return;
    const tag = o.deadline === d7 ? 'h7' : o.deadline === d1 ? 'h1' : '';
    if (!tag) return;
    kOppTeam_(o).forEach(function (uid) {
      const id = 'opp-' + tag + '-' + o.id + '-' + uid;
      if (!have[id]) kInsert_('notifications', { id: id, uid: uid, kind: 'tenggat', text: (tag === 'h7' ? 'Tenggat call 7 hari lagi: ' : 'Tenggat call besok: ') + o.title, link: 'opp:' + o.id, read: false, created: kNow_() });
    });
  });
}
