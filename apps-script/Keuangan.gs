/**
 * CHARIS Ruang Kerja: Keuangan (finance). Same Apps Script project as Code.gs and Kerja.gs
 * (add this file with + next to Files > Script, name it "Keuangan").
 *
 * Finance data lives in its own spreadsheet "CHARIS Keuangan (rahasia)", created on first use,
 * so it can be shared or locked in Google Drive separately from the workspace data.
 *
 * Roles: superadmin, direktur and bendahara see and manage everything. Everyone else sees only
 * their own fund requests and (for honoraria) their own payments.
 */
const F_FULL = ['superadmin', 'direktur', 'bendahara'];
const F_SCHEMA = {
  akun_kas:   ['id', 'name', 'kind', 'bank', 'number', 'holder', 'opening', 'opening_date', 'active', 'created'],
  pos:        ['id', 'code', 'name', 'kind', 'active', 'order'],
  anggaran:   ['id', 'project_id', 'year', 'pos_id', 'amount', 'note', 'updated'],
  transaksi:  ['id', 'number', 'date', 'type', 'account_id', 'to_account_id', 'amount', 'pos_id', 'project_id', 'party', 'description', 'ref', 'file_url',
               'request_id', 'invoice_id', 'honor_id', 'tax_kind', 'tax_amount', 'created_by', 'created'],
  pengajuan:  ['id', 'number', 'kind', 'uid', 'project_id', 'pos_id', 'amount', 'purpose', 'items', 'payee_name', 'bank', 'account_no', 'account_name', 'file_url',
               'status', 'checked_by', 'checked_at', 'check_note', 'approved_by', 'approved_at', 'approve_note', 'paid_tx', 'paid_at', 'created', 'updated'],
  invoice:    ['id', 'number', 'seq', 'client', 'client_address', 'project_id', 'date', 'due', 'items', 'ppn_rate', 'pph_rate', 'notes', 'status', 'created_by', 'created', 'updated'],
  honorarium: ['id', 'number', 'uid', 'name', 'npwp', 'project_id', 'activity', 'period', 'gross', 'tax_rate', 'bank', 'account_no', 'account_name', 'status', 'paid_tx', 'paid_at', 'created_by', 'created']
};
/* standard budget lines; more can be added in Pengaturan. kind: beban (expense), pendapatan (income), setoran (tax deposits, outside the budget) */
const F_POS_DEFAULT = [
  ['B01', 'Honorarium', 'beban'], ['B02', 'Perjalanan dinas', 'beban'], ['B03', 'Bahan dan ATK', 'beban'], ['B04', 'Konsumsi dan rapat', 'beban'],
  ['B05', 'Jasa profesional', 'beban'], ['B06', 'Sewa tempat dan peralatan', 'beban'], ['B07', 'Komunikasi dan internet', 'beban'], ['B08', 'Peralatan dan aset', 'beban'],
  ['B09', 'Publikasi dan diseminasi', 'beban'], ['B10', 'Administrasi bank', 'beban'], ['B99', 'Lain-lain', 'beban'],
  ['P01', 'Termin kontrak', 'pendapatan'], ['P02', 'Hibah dan donasi', 'pendapatan'], ['P03', 'Jasa layanan', 'pendapatan'], ['P04', 'Bunga bank', 'pendapatan'], ['P99', 'Pendapatan lain-lain', 'pendapatan'],
  ['S01', 'Setoran pajak', 'setoran']
];
const F_REQ_KINDS = ['uang muka', 'reimbursement', 'pembayaran pihak ketiga'];
const F_TAX_KINDS = ['', 'PPh 21', 'PPh 23', 'PPh 4(2)', 'PPN'];

function kFinSS_() {
  let id = PROPS.getProperty('FIN_SS_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('CHARIS Keuangan (rahasia)');
    PROPS.setProperty('FIN_SS_ID', ss.getId());
  }
  return ss;
}
const fFull_ = function (u) { return F_FULL.indexOf(u.role) >= 0; };
function fDeny_() { throw new Error('Anda tidak memiliki akses ke data keuangan ini.'); }
function fNum_(v) { return Math.max(0, Math.round(kNum_(v))); }
function fItems_(v) {
  return (Array.isArray(v) ? v : []).slice(0, 100).map(function (i) { return { d: clean_(i.d, 300), q: Math.max(0, kNum_(i.q)) || 1, p: fNum_(i.p) }; }).filter(function (i) { return i.d || i.p; });
}
function fSeq_(sheet, prefix) {
  return kRead_(sheet).filter(function (r) { return String(r.number).indexOf(prefix) === 0; }).length + 1;
}
function fPeople_(roles) { return kRead_('users').filter(function (u) { return u.status === 'aktif' && roles.indexOf(u.role) >= 0; }); }
function fCheckers_() { const b = fPeople_(['bendahara']); return b.length ? b : fPeople_(['direktur', 'superadmin']); }
function fApprovers_() { const d = fPeople_(['direktur']); return d.length ? d : fPeople_(['superadmin']); }
function fMoney_(n) { return 'Rp' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fEnsurePos_() {
  if (kRead_('pos').length) return;
  F_POS_DEFAULT.forEach(function (p, i) { kInsert_('pos', { id: 'POS-' + p[0], code: p[0], name: p[1], kind: p[2], active: true, order: i + 1 }); });
}

/* ============================================================
   ENTRY (from kerja_ in Kerja.gs)
   ============================================================ */
function keuangan_(me, b) {
  fEnsurePos_();
  switch (b.op) {
    case 'finLoad':      return fLoad_(me);
    case 'finSave':      return fSave_(me, b.sheet, b.row || {});
    case 'finDelete':    return fDelete_(me, b.sheet, b.id);
    case 'reqSave':      return fReqSave_(me, b.row || {});
    case 'reqAction':    return fReqAction_(me, b);
    case 'invoicePay':   return fInvoicePay_(me, b);
    case 'honorPay':     return fHonorPay_(me, b);
    default:             return { ok: false, error: 'Perintah keuangan tidak dikenal.' };
  }
}
function fOut_(name, r) {
  const o = Object.assign({}, r);
  ['amount', 'opening', 'tax_amount', 'gross', 'tax_rate', 'ppn_rate', 'pph_rate', 'seq', 'order', 'year'].forEach(function (k) { if (k in o) o[k] = Number(o[k]) || 0; });
  if ('items' in o) o.items = kJson_(r.items, []);
  if ('active' in o) o.active = o.active === '' ? true : isTrue_(o.active);
  return o;
}
/* everything finance the person may see, in one call */
function fLoad_(me) {
  const full = fFull_(me), all = function (n) { return kRead_(n).map(function (r) { return fOut_(n, r); }); };
  const out = { ok: true, full: full, pos: all('pos'),
    pengajuan: all('pengajuan').filter(function (r) { return full || r.uid === me.id; }),
    honorarium: all('honorarium').filter(function (r) { return full || r.uid === me.id; }) };
  if (full) { out.akun_kas = all('akun_kas'); out.anggaran = all('anggaran'); out.transaksi = all('transaksi'); out.invoice = all('invoice'); }
  let projects = [];
  try { projects = kRead_('wprojects').map(function (p) { return { id: p.id, name: p.name, code: p.code, status: p.status, start: p.start, end: p.end, client: p.client }; }); } catch (e) {}
  out.projects = projects;
  return out;
}

/* ============================================================
   GENERIC SAVE: cash accounts, budget lines, budget, transactions, invoices, honoraria
   ============================================================ */
const F_FIELDS = {
  akun_kas:   { name: ['t', 120], kind: ['e', ['bank', 'kas kecil', 'dompet digital']], bank: ['t', 80], number: ['t', 60], holder: ['t', 120], opening: ['m'], opening_date: ['d'], active: ['b'] },
  pos:        { code: ['t', 12], name: ['t', 120], kind: ['e', ['beban', 'pendapatan', 'setoran']], active: ['b'], order: ['m'] },
  anggaran:   { project_id: ['t', 40], year: ['m'], pos_id: ['t', 40], amount: ['m'], note: ['t', 300] },
  transaksi:  { date: ['d'], type: ['e', ['keluar', 'masuk', 'transfer']], account_id: ['t', 40], to_account_id: ['t', 40], amount: ['m'], pos_id: ['t', 40], project_id: ['t', 40],
                party: ['t', 200], description: ['t', 1000], ref: ['t', 120], file_url: ['u'], tax_kind: ['e', F_TAX_KINDS], tax_amount: ['m'] },
  invoice:    { client: ['t', 200], client_address: ['t', 500], project_id: ['t', 40], date: ['d'], due: ['d'], items: ['i'], ppn_rate: ['r'], pph_rate: ['r'], notes: ['t', 2000], status: ['e', ['draf', 'terkirim', 'batal']] },
  honorarium: { uid: ['t', 40], name: ['t', 160], npwp: ['t', 40], project_id: ['t', 40], activity: ['t', 300], period: ['t', 60], gross: ['m'], tax_rate: ['r'],
                bank: ['t', 80], account_no: ['t', 60], account_name: ['t', 160] }
};
function fClean_(spec, v) {
  switch (spec[0]) {
    case 'm': return fNum_(v);
    case 'r': return Math.max(0, Math.min(100, kNum_(v)));
    case 'b': return isTrue_(v);
    case 'i': return JSON.stringify(fItems_(v));
    default: return kCleanField_(spec, v);
  }
}
function fSave_(me, sheet, r) {
  const F = F_FIELDS[sheet]; if (!F) return { ok: false, error: 'Data tidak dikenal.' };
  if (!fFull_(me)) fDeny_();
  return withLock_(function () {
    const cur = r.id ? kRead_(sheet).filter(function (x) { return x.id === r.id; })[0] : null;
    if (r.id && !cur) return { ok: false, error: 'Data tidak ditemukan.' };
    const row = {};
    Object.keys(F).forEach(function (k) { if (r[k] !== undefined) row[k] = fClean_(F[k], r[k]); });
    const y = (row.date || kToday_()).slice(0, 4), m = Number((row.date || kToday_()).slice(5, 7));
    if (sheet === 'akun_kas' && !cur && !row.name) return { ok: false, error: 'Nama akun wajib diisi.' };
    if (sheet === 'pos' && !cur && !row.name) return { ok: false, error: 'Nama pos wajib diisi.' };
    if (sheet === 'anggaran') {
      if (!row.pos_id && !cur) return { ok: false, error: 'Pilih pos anggaran.' };
      /* one line per project, year and budget line: update it if it exists */
      if (!cur) {
        const same = kRead_('anggaran').filter(function (a) { return a.project_id === (row.project_id || '') && String(a.year) === String(row.year) && a.pos_id === row.pos_id; })[0];
        if (same) { kUpdate_('anggaran', same.id, { amount: row.amount, note: row.note, updated: kNow_() }); return { ok: true, row: fOut_('anggaran', Object.assign(same, row)) }; }
      }
      row.updated = kNow_();
    }
    if (sheet === 'transaksi') {
      const type = row.type || (cur && cur.type);
      if (!(row.amount > 0) && !cur) return { ok: false, error: 'Jumlah harus lebih dari 0.' };
      if (!(row.account_id || (cur && cur.account_id))) return { ok: false, error: 'Pilih akun kas.' };
      if (type === 'transfer' && !(row.to_account_id || (cur && cur.to_account_id))) return { ok: false, error: 'Pilih akun tujuan transfer.' };
      if (!cur) { const pre = (type === 'masuk' ? 'BKM' : type === 'keluar' ? 'BKK' : 'TRF') + '-' + y + '-'; row.number = pre + ('00' + fSeq_('transaksi', pre)).slice(-3); }
    }
    if (sheet === 'invoice' && !cur) {
      if (!row.client) return { ok: false, error: 'Nama klien wajib diisi.' };
      const seq = kRead_('invoice').filter(function (v) { return String(v.date || v.created).slice(0, 4) === y; }).reduce(function (a, v) { return Math.max(a, Number(v.seq) || 0); }, 0) + 1;
      row.seq = seq; row.number = ('00' + seq).slice(-3) + '/CHARIS/INV/' + K_ROMAN[m - 1] + '/' + y; if (!row.status) row.status = 'draf';
    }
    if (sheet === 'honorarium') {
      if (!cur && !(row.name || row.uid)) return { ok: false, error: 'Isi nama penerima.' };
      if (row.uid && !row.name) { const u = kRead_('users').filter(function (x) { return x.id === row.uid; })[0]; if (u) row.name = u.name; }
      if (!cur) { const pre = 'HON-' + kToday_().slice(0, 4) + '-'; row.number = pre + ('00' + fSeq_('honorarium', pre)).slice(-3); row.status = 'direncanakan'; }
    }
    if (cur) {
      if (sheet === 'honorarium' && cur.status === 'dibayar') return { ok: false, error: 'Honorarium yang sudah dibayar tidak dapat diubah.' };
      kUpdate_(sheet, cur.id, row);
      kLog_(me.id, 'ubah ' + sheet, sheet, cur.id, '');
      return { ok: true, row: fOut_(sheet, Object.assign({}, cur, row)) };
    }
    row.id = sheet.slice(0, 3).toUpperCase() + '-' + kShortId_();
    if (F_SCHEMA[sheet].indexOf('created') >= 0) row.created = kNow_();
    if (F_SCHEMA[sheet].indexOf('created_by') >= 0) row.created_by = me.id;
    if (sheet === 'akun_kas' && row.active === undefined) row.active = true;
    if (sheet === 'pos') { row.active = row.active === undefined ? true : row.active; if (!row.code) row.code = 'X' + ('0' + (kRead_('pos').length + 1)).slice(-2); }
    kInsert_(sheet, row);
    kLog_(me.id, 'buat ' + sheet, sheet, row.id, row.number || row.name || '');
    if (sheet === 'honorarium' && row.uid) kNotify_(row.uid, 'persetujuan', 'Honorarium dicatat untuk Anda: ' + (row.activity || '') + ' (' + fMoney_(row.gross) + ' bruto)', 'fin:honorarium', me.id);
    return { ok: true, row: fOut_(sheet, row) };
  });
}
function fDelete_(me, sheet, id) {
  if (!F_FIELDS[sheet] || !fFull_(me)) fDeny_();
  return withLock_(function () {
    const cur = kRead_(sheet).filter(function (x) { return x.id === id; })[0];
    if (!cur) return { ok: true };
    if (sheet === 'akun_kas' && kRead_('transaksi').some(function (t) { return t.account_id === id || t.to_account_id === id; })) return { ok: false, error: 'Akun ini sudah dipakai transaksi. Nonaktifkan saja.' };
    if (sheet === 'pos' && (kRead_('transaksi').some(function (t) { return t.pos_id === id; }) || kRead_('anggaran').some(function (a) { return a.pos_id === id; }))) return { ok: false, error: 'Pos ini sudah dipakai. Nonaktifkan saja.' };
    if (sheet === 'honorarium' && cur.status === 'dibayar') return { ok: false, error: 'Honorarium yang sudah dibayar tidak dapat dihapus. Hapus transaksinya lebih dulu.' };
    if (sheet === 'transaksi') {
      /* undo the link to what it paid */
      if (cur.request_id) kUpdate_('pengajuan', cur.request_id, { status: 'disetujui', paid_tx: '', paid_at: '' });
      if (cur.honor_id) kUpdate_('honorarium', cur.honor_id, { status: 'direncanakan', paid_tx: '', paid_at: '' });
    }
    kDeleteWhere_(sheet, function (x) { return x.id === id; });
    kLog_(me.id, 'hapus ' + sheet, sheet, id, cur.number || cur.name || '');
    return { ok: true };
  });
}

/* ============================================================
   FUND REQUESTS: applicant > bendahara checks > direktur approves > bendahara pays
   ============================================================ */
function fReqSave_(me, r) {
  return withLock_(function () {
    const cur = r.id ? kRead_('pengajuan').filter(function (x) { return x.id === r.id; })[0] : null;
    if (r.id && !cur) return { ok: false, error: 'Pengajuan tidak ditemukan.' };
    if (cur && !(cur.uid === me.id && ['diajukan', 'revisi'].indexOf(cur.status) >= 0)) return { ok: false, error: 'Pengajuan yang sudah diproses tidak dapat diubah.' };
    const items = fItems_(r.items);
    const total = items.length ? items.reduce(function (a, i) { return a + Math.round(i.q * i.p); }, 0) : fNum_(r.amount);
    const row = { kind: F_REQ_KINDS.indexOf(r.kind) >= 0 ? r.kind : F_REQ_KINDS[0], project_id: clean_(r.project_id, 40), pos_id: clean_(r.pos_id, 40), amount: total,
      purpose: clean_(r.purpose, 2000), items: JSON.stringify(items), payee_name: clean_(r.payee_name, 160), bank: clean_(r.bank, 80), account_no: clean_(r.account_no, 60),
      account_name: clean_(r.account_name, 160), file_url: kUrl_(r.file_url), status: 'diajukan', updated: kNow_() };
    if (!row.purpose) return { ok: false, error: 'Tuliskan keperluan dana.' };
    if (!(total > 0)) return { ok: false, error: 'Jumlah dana harus lebih dari 0.' };
    if (row.project_id) { const p = kProject_(row.project_id); if (!p || !(kCanSeeProject_(me, p))) return { ok: false, error: 'Proyek tidak ditemukan.' }; }
    let out;
    if (cur) { kUpdate_('pengajuan', cur.id, row); out = Object.assign({}, cur, row); }
    else {
      const pre = 'PD-' + kToday_().slice(0, 4) + '-';
      out = Object.assign({ id: 'PD-' + kShortId_(), number: pre + ('00' + fSeq_('pengajuan', pre)).slice(-3), uid: me.id, created: kNow_() }, row);
      kInsert_('pengajuan', out);
    }
    fCheckers_().forEach(function (u) { kNotify_(u.id, 'persetujuan', me.name + (cur ? ' memperbarui' : ' mengajukan') + ' dana ' + fMoney_(total) + ': ' + row.purpose.slice(0, 80), 'fin:pengajuan:' + out.id, me.id); });
    kLog_(me.id, cur ? 'perbarui pengajuan' : 'ajukan dana', 'pengajuan', out.id, out.number);
    return { ok: true, row: fOut_('pengajuan', out) };
  });
}
function fReqAction_(me, b) {
  return withLock_(function () {
    const r = kRead_('pengajuan').filter(function (x) { return x.id === b.id; })[0];
    if (!r) return { ok: false, error: 'Pengajuan tidak ditemukan.' };
    const note = clean_(b.note, 1000), act = b.act, now = kNow_(), applicant = r.uid;
    const say = function (uid, text) { kNotify_(uid, 'persetujuan', text, 'fin:pengajuan:' + r.id, me.id); };
    let patch = null;
    if (act === 'cancel') {
      if (r.uid !== me.id || ['diajukan', 'revisi'].indexOf(r.status) < 0) fDeny_();
      kDeleteWhere_('pengajuan', function (x) { return x.id === r.id; });
      kLog_(me.id, 'batalkan pengajuan', 'pengajuan', r.id, r.number);
      return { ok: true, deleted: true };
    }
    if (act === 'check' || act === 'revise') {
      const may = me.role === 'bendahara' || me.role === 'superadmin' || (me.role === 'direktur' && !fPeople_(['bendahara']).length);
      if (!may) fDeny_();
      if (r.status !== 'diajukan') return { ok: false, error: 'Pengajuan ini tidak sedang menunggu pemeriksaan.' };
      if (act === 'check') {
        patch = { status: 'diperiksa', checked_by: me.id, checked_at: now, check_note: note };
        fApprovers_().forEach(function (u) { say(u.id, 'Pengajuan ' + r.number + ' (' + fMoney_(r.amount) + ') sudah diperiksa bendahara dan menunggu persetujuan Anda'); });
        say(applicant, 'Pengajuan ' + r.number + ' sudah diperiksa bendahara dan diteruskan ke direktur');
      } else { patch = { status: 'revisi', checked_by: me.id, checked_at: now, check_note: note }; say(applicant, 'Pengajuan ' + r.number + ' perlu direvisi' + (note ? ': ' + note : '')); }
    } else if (act === 'approve' || act === 'reject') {
      if (['direktur', 'superadmin'].indexOf(me.role) < 0) fDeny_();
      if (r.status !== 'diperiksa') return { ok: false, error: 'Pengajuan harus diperiksa bendahara lebih dulu.' };
      if (r.uid === me.id && me.role !== 'superadmin') return { ok: false, error: 'Pengajuan sendiri disetujui oleh pimpinan lain.' };
      patch = { status: act === 'approve' ? 'disetujui' : 'ditolak', approved_by: me.id, approved_at: now, approve_note: note };
      say(applicant, 'Pengajuan ' + r.number + (act === 'approve' ? ' disetujui direktur' : ' ditolak direktur') + (note ? ': ' + note : ''));
      if (act === 'approve') fPeople_(['bendahara']).forEach(function (u) { say(u.id, 'Pengajuan ' + r.number + ' disetujui. Silakan proses pembayaran ' + fMoney_(r.amount)); });
    } else if (act === 'pay') {
      if (['bendahara', 'superadmin', 'direktur'].indexOf(me.role) < 0) fDeny_();
      if (r.status !== 'disetujui') return { ok: false, error: 'Hanya pengajuan yang sudah disetujui direktur yang dapat dibayar.' };
      const acc = kRead_('akun_kas').filter(function (a) { return a.id === b.account_id; })[0];
      if (!acc) return { ok: false, error: 'Pilih akun kas sumber pembayaran.' };
      const date = kDate_(b.date) || kToday_(), y = date.slice(0, 4), pre = 'BKK-' + y + '-';
      const tx = { id: 'TRA-' + kShortId_(), number: pre + ('00' + fSeq_('transaksi', pre)).slice(-3), date: date, type: 'keluar', account_id: acc.id, amount: Number(r.amount) || 0,
        pos_id: r.pos_id, project_id: r.project_id, party: r.payee_name || kRead_('users').filter(function (u) { return u.id === r.uid; }).map(function (u) { return u.name; })[0] || '',
        description: r.kind.charAt(0).toUpperCase() + r.kind.slice(1) + ': ' + r.purpose, ref: r.number, file_url: r.file_url, request_id: r.id, created_by: me.id, created: now };
      kInsert_('transaksi', tx);
      patch = { status: 'dibayar', paid_tx: tx.id, paid_at: date };
      say(applicant, 'Dana pengajuan ' + r.number + ' sudah dibayarkan (' + fMoney_(r.amount) + ')');
    } else return { ok: false, error: 'Tindakan tidak dikenal.' };
    patch.updated = now;
    kUpdate_('pengajuan', r.id, patch);
    kLog_(me.id, 'pengajuan ' + patch.status, 'pengajuan', r.id, r.number);
    return { ok: true, row: fOut_('pengajuan', Object.assign({}, r, patch)) };
  });
}

/* ============================================================
   INVOICE PAYMENTS AND HONORARIUM PAYMENTS (create cash transactions)
   ============================================================ */
function fInvoiceTotals_(v) {
  const items = kJson_(v.items, []), sub = items.reduce(function (a, i) { return a + Math.round((Number(i.q) || 0) * (Number(i.p) || 0)); }, 0);
  const ppn = Math.round(sub * (Number(v.ppn_rate) || 0) / 100), pph = Math.round(sub * (Number(v.pph_rate) || 0) / 100);
  return { sub: sub, ppn: ppn, pph: pph, total: sub + ppn, receivable: sub + ppn - pph };
}
function fInvoicePay_(me, b) {
  if (!fFull_(me)) fDeny_();
  return withLock_(function () {
    const v = kRead_('invoice').filter(function (x) { return x.id === b.id; })[0];
    if (!v) return { ok: false, error: 'Invoice tidak ditemukan.' };
    const acc = kRead_('akun_kas').filter(function (a) { return a.id === b.account_id; })[0];
    if (!acc) return { ok: false, error: 'Pilih akun kas penerima.' };
    const amount = fNum_(b.amount); if (!(amount > 0)) return { ok: false, error: 'Jumlah harus lebih dari 0.' };
    const date = kDate_(b.date) || kToday_(), pre = 'BKM-' + date.slice(0, 4) + '-';
    const t = fInvoiceTotals_(v);
    const tx = { id: 'TRA-' + kShortId_(), number: pre + ('00' + fSeq_('transaksi', pre)).slice(-3), date: date, type: 'masuk', account_id: acc.id, amount: amount,
      pos_id: clean_(b.pos_id, 40) || 'POS-P01', project_id: v.project_id, party: v.client, description: 'Pembayaran invoice ' + v.number, ref: v.number,
      invoice_id: v.id, tax_kind: t.pph ? 'PPh 23' : '', tax_amount: isTrue_(b.with_tax) ? t.pph : 0, created_by: me.id, created: kNow_() };
    kInsert_('transaksi', tx);
    if (v.status === 'draf') kUpdate_('invoice', v.id, { status: 'terkirim', updated: kNow_() });
    kLog_(me.id, 'pembayaran invoice', 'invoice', v.id, v.number);
    return { ok: true, tx: fOut_('transaksi', tx) };
  });
}
function fHonorPay_(me, b) {
  if (!fFull_(me)) fDeny_();
  return withLock_(function () {
    const h = kRead_('honorarium').filter(function (x) { return x.id === b.id; })[0];
    if (!h) return { ok: false, error: 'Honorarium tidak ditemukan.' };
    if (h.status === 'dibayar') return { ok: false, error: 'Honorarium ini sudah dibayar.' };
    const acc = kRead_('akun_kas').filter(function (a) { return a.id === b.account_id; })[0];
    if (!acc) return { ok: false, error: 'Pilih akun kas sumber pembayaran.' };
    const gross = Number(h.gross) || 0, tax = Math.round(gross * (Number(h.tax_rate) || 0) / 100), date = kDate_(b.date) || kToday_(), pre = 'BKK-' + date.slice(0, 4) + '-';
    /* cash out is the net amount; the withheld tax is kept on the transaction so the budget counts the gross */
    const tx = { id: 'TRA-' + kShortId_(), number: pre + ('00' + fSeq_('transaksi', pre)).slice(-3), date: date, type: 'keluar', account_id: acc.id, amount: gross - tax,
      pos_id: 'POS-B01', project_id: h.project_id, party: h.name, description: 'Honorarium ' + (h.activity || '') + (h.period ? ' (' + h.period + ')' : ''), ref: h.number,
      honor_id: h.id, tax_kind: tax ? 'PPh 21' : '', tax_amount: tax, created_by: me.id, created: kNow_() };
    kInsert_('transaksi', tx);
    kUpdate_('honorarium', h.id, { status: 'dibayar', paid_tx: tx.id, paid_at: date });
    if (h.uid) kNotify_(h.uid, 'persetujuan', 'Honorarium ' + (h.activity || '') + ' dibayarkan: ' + fMoney_(gross - tax) + ' (bersih)', 'fin:honorarium', me.id);
    kLog_(me.id, 'bayar honorarium', 'honorarium', h.id, h.number);
    return { ok: true, tx: fOut_('transaksi', tx) };
  });
}

/* ============================================================
   DASHBOARD NUMBERS AND DAILY REMINDERS
   ============================================================ */
function kFinSummary_(me) {
  const out = { req_check: 0, req_approve: 0, req_pay: 0, my_req_open: 0, invoice_due: 0 };
  if (!PROPS.getProperty('FIN_SS_ID')) return out;
  const req = kRead_('pengajuan');
  out.my_req_open = req.filter(function (r) { return r.uid === me.id && ['diajukan', 'diperiksa', 'disetujui', 'revisi'].indexOf(r.status) >= 0; }).length;
  if (me.role === 'bendahara' || me.role === 'superadmin') { out.req_check = req.filter(function (r) { return r.status === 'diajukan'; }).length; out.req_pay = req.filter(function (r) { return r.status === 'disetujui'; }).length; }
  if (me.role === 'direktur' || me.role === 'superadmin') out.req_approve = req.filter(function (r) { return r.status === 'diperiksa' && r.uid !== me.id; }).length;
  if (fFull_(me)) {
    const paid = {}; kRead_('transaksi').forEach(function (t) { if (t.invoice_id) paid[t.invoice_id] = (paid[t.invoice_id] || 0) + (Number(t.amount) || 0) + (Number(t.tax_amount) || 0); });
    const today = kToday_();
    out.invoice_due = kRead_('invoice').filter(function (v) { return v.status !== 'batal' && v.due && v.due <= kAddDays_(today, 7) && (paid[v.id] || 0) < fInvoiceTotals_(v).total; }).length;
  }
  return out;
}
function kFinHarian_(today, have) {
  if (!PROPS.getProperty('FIN_SS_ID')) return;
  const paid = {}; kRead_('transaksi').forEach(function (t) { if (t.invoice_id) paid[t.invoice_id] = (paid[t.invoice_id] || 0) + (Number(t.amount) || 0) + (Number(t.tax_amount) || 0); });
  const team = fPeople_(['bendahara', 'direktur']);
  kRead_('invoice').forEach(function (v) {
    if (v.status === 'batal' || !v.due || (paid[v.id] || 0) >= fInvoiceTotals_(v).total) return;
    const tag = v.due === kAddDays_(today, 3) ? 'h3' : v.due === kAddDays_(today, -1) ? 'late' : '';
    if (!tag) return;
    team.forEach(function (u) {
      const id = 'inv-' + tag + '-' + v.id + '-' + u.id;
      if (!have[id]) kInsert_('notifications', { id: id, uid: u.id, kind: tag === 'late' ? 'terlambat' : 'tenggat', text: (tag === 'late' ? 'Invoice lewat jatuh tempo: ' : 'Invoice jatuh tempo 3 hari lagi: ') + v.number + ' (' + v.client + ')', link: 'fin:invoice:' + v.id, read: false, created: kNow_() });
    });
  });
}
