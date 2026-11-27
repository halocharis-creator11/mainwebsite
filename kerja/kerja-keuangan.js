/* CHARIS Ruang Kerja: Keuangan. Fund requests, cash book, budgets, invoices, honoraria, Excel reports.
   Server side: apps-script/Keuangan.gs. Needs kerja.js, kerja-admin.js (formModal) and kerja-xlsx.js. */
(function () {
  "use strict";
  const K = window.K, S = K.S, esc = K.esc, ic = K.ic, $ = id => document.getElementById(id);
  const role = () => S.me.role, full = () => K.finFull();
  const F = { loaded: false };
  const nf = new Intl.NumberFormat("id-ID");
  const rp = n => (n < 0 ? "minus Rp" : "Rp") + nf.format(Math.abs(Math.round(n || 0)));
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const REQ_L = { diajukan: "Diajukan", revisi: "Perlu revisi", diperiksa: "Diperiksa bendahara", disetujui: "Disetujui", ditolak: "Ditolak", dibayar: "Dibayar" };
  const REQ_C = { diajukan: "soon", revisi: "today", diperiksa: "soon", disetujui: "ok", ditolak: "late", dibayar: "done2" };
  const KIND_L = { "uang muka": "Uang muka", reimbursement: "Reimbursement", "pembayaran pihak ketiga": "Pembayaran pihak ketiga" };
  const INV_C = { draf: "lab", terkirim: "soon", "dibayar sebagian": "today", lunas: "ok", batal: "late", terlambat: "late" };

  const TABS = [
    ["ringkasan", "Ringkasan", full], ["pengajuan", "Pengajuan dana", () => true], ["kas", "Kas dan transaksi", full], ["anggaran", "Anggaran", full],
    ["invoice", "Invoice", full], ["honorarium", "Honorarium", () => true], ["laporan", "Laporan Excel", full], ["pengaturan", "Pengaturan", full]
  ];

  /* ---------- data helpers ---------- */
  const pos = id => (F.pos || []).find(p => p.id === id);
  const posName = id => (pos(id) || {}).name || "";
  const posList = kinds => (F.pos || []).filter(p => p.active && (!kinds || kinds.includes(p.kind))).sort((a, b) => (a.order - b.order) || String(a.code).localeCompare(b.code));
  const acc = id => (F.akun_kas || []).find(a => a.id === id);
  const accName = id => (acc(id) || {}).name || "";
  const projName = id => id ? ((F.projects || []).find(p => p.id === id) || K.proj(id) || {}).name || id : "Operasional yayasan";
  const projects = () => (F.projects || S.projects || []);
  const year = d => String(d || "").slice(0, 4);
  const thisYear = () => S.today.slice(0, 4);
  const gross = t => (Number(t.amount) || 0) + (Number(t.tax_amount) || 0);
  function balance(a, upTo) {
    let b = (!upTo || !a.opening_date || a.opening_date <= upTo) ? Number(a.opening) || 0 : 0;
    (F.transaksi || []).forEach(t => {
      if (upTo && t.date >= upTo) return;
      const n = Number(t.amount) || 0;
      if (t.account_id === a.id) b += t.type === "masuk" ? n : -n;
      if (t.type === "transfer" && t.to_account_id === a.id) b += n;
    });
    return b;
  }
  /* realisation: expenses count gross (cash out plus tax withheld); income counts gross too */
  function realised(projectId, yr, posId) {
    return (F.transaksi || []).filter(t => t.type !== "transfer" && (t.project_id || "") === (projectId || "") && year(t.date) === String(yr) && t.pos_id === posId).reduce((a, t) => a + gross(t), 0);
  }
  function invTotals(v) {
    const sub = (v.items || []).reduce((a, i) => a + Math.round((Number(i.q) || 0) * (Number(i.p) || 0)), 0);
    const ppn = Math.round(sub * (Number(v.ppn_rate) || 0) / 100), pph = Math.round(sub * (Number(v.pph_rate) || 0) / 100);
    const paid = (F.transaksi || []).filter(t => t.invoice_id === v.id).reduce((a, t) => a + gross(t), 0);
    const total = sub + ppn;
    let status = v.status;
    if (status !== "batal") { if (paid >= total && total > 0) status = "lunas"; else if (paid > 0) status = "dibayar sebagian"; else if (status === "terkirim" && v.due && v.due < S.today) status = "terlambat"; }
    return { sub, ppn, pph, total, paid, due: Math.max(0, total - paid), status };
  }
  const chip = (cls, text) => '<span class="due ' + cls + '">' + esc(text) + "</span>";
  const reqChip = r => chip(REQ_C[r.status] || "lab", REQ_L[r.status] || r.status);
  const posOptions = (kinds, val, empty) => (empty ? '<option value="">' + esc(empty) + "</option>" : "") + posList(kinds).concat(val && !posList(kinds).find(p => p.id === val) && pos(val) ? [pos(val)] : [])
    .map(p => '<option value="' + p.id + '"' + (p.id === val ? " selected" : "") + ">" + esc(p.code + " " + p.name) + "</option>").join("");
  const accOptions = val => (F.akun_kas || []).filter(a => a.active || a.id === val).map(a => '<option value="' + a.id + '"' + (a.id === val ? " selected" : "") + ">" + esc(a.name) + "</option>").join("");
  const projOptions = (val, empty) => '<option value="">' + esc(empty || "Operasional yayasan (tanpa proyek)") + "</option>" + projects().map(p => '<option value="' + p.id + '"' + (p.id === val ? " selected" : "") + ">" + esc(p.name) + "</option>").join("");

  async function loadFin() {
    const j = await K.api("finLoad");
    Object.assign(F, { loaded: true, full: j.full, pos: j.pos || [], pengajuan: j.pengajuan || [], honorarium: j.honorarium || [], akun_kas: j.akun_kas || [], anggaran: j.anggaran || [],
      transaksi: j.transaksi || [], invoice: j.invoice || [], projects: j.projects || [], rev: S.rev });
  }
  const reload = () => K.reload();

  /* ---------- page ---------- */
  K.pages.keuangan = async (v, tab, q) => {
    const tabs = TABS.filter(t => t[2]());
    if (!tabs.find(t => t[0] === tab)) tab = tabs[0][0];
    K.setTop("Keuangan");
    const s = S.summary || {}, cnt = { pengajuan: (s.req_check || 0) + (s.req_approve || 0) + (s.req_pay || 0), invoice: s.invoice_due || 0 };
    v.innerHTML = '<nav class="tabs" aria-label="Keuangan">' + tabs.map(([k, l]) => '<a href="#/keuangan/' + k + '"' + (k === tab ? ' aria-current="page"' : "") + ">" + l + (cnt[k] ? '<span class="cnt">' + cnt[k] + "</span>" : "") + "</a>").join("") +
      '</nav><div id="fBody">' + (F.loaded ? "" : '<p class="muted ld-line"><span class="ld-spin" aria-hidden="true"></span>Memuat data keuangan</p>') + "</div>";
    const draw = () => { if ($("fBody") && location.hash.indexOf("#/keuangan") === 0) RENDER[tab]($("fBody"), q); };
    /* finance data stays in memory (never on disk); refetch only when the server reports changes */
    if (F.loaded && F.me === S.me.id) { draw(); if (F.rev === S.rev) return; q = new URLSearchParams(q); ["id", "tx"].forEach(k => q.delete(k)); }
    const hash = location.hash;
    try {
      await loadFin(); F.me = S.me.id;
      if (location.hash === hash) draw();
    } catch (e) { if ($("fBody") && !F.loaded) $("fBody").innerHTML = '<div class="panel empty">' + esc(e.message) + "</div>"; else K.toast(e.message, true); }
  };
  const RENDER = {};
  const header = (lead, btn) => '<div class="sec-h"><p class="muted" style="max-width:72ch">' + lead + "</p>" + (btn || "") + "</div>";
  const openFromQuery = (rows, q, fn) => { const id = q.get("id"); if (id) { const r = rows.find(x => x.id === id); if (r) setTimeout(() => fn(r), 30); } };

  /* item rows (description, quantity, unit price) inside a modal */
  function itemsEditor(items, can) {
    let list = (items && items.length ? items : [{ d: "", q: 1, p: 0 }]).map(i => Object.assign({}, i));
    const html = '<div class="field full" style="margin-top:14px"><span style="font-size:13px;font-weight:700;color:var(--muted)">Rincian</span>' +
      '<div class="it-row it-h small muted"><span>Uraian</span><span>Volume</span><span>Harga satuan</span><span></span></div><div id="itRows" style="display:grid;gap:6px"></div>' +
      (can ? '<button class="btn ghost small" type="button" id="itAdd" style="margin-top:6px;justify-self:start">' + ic("plus") + "Tambah baris</button>" : "") +
      '<p class="it-total">Total <b id="itTotal">Rp0</b></p></div>';
    const total = () => list.reduce((a, i) => a + Math.round((Number(i.q) || 0) * (Number(i.p) || 0)), 0);
    const draw = () => {
      $("itRows").innerHTML = list.map((i, n) => '<div class="it-row"><input class="in" data-n="' + n + '" data-k="d" placeholder="Uraian" value="' + esc(i.d || "") + '"' + (can ? "" : " disabled") + ">" +
        '<input class="in" data-n="' + n + '" data-k="q" inputmode="decimal" value="' + esc(i.q == null ? 1 : i.q) + '"' + (can ? "" : " disabled") + ' aria-label="Volume">' +
        '<input class="in" data-n="' + n + '" data-k="p" inputmode="numeric" value="' + (i.p ? nf.format(i.p) : "") + '" placeholder="0"' + (can ? "" : " disabled") + ' aria-label="Harga satuan">' +
        (can ? '<button class="icon-btn" type="button" data-x="' + n + '" aria-label="Hapus baris" style="width:32px;height:32px">' + ic("close") + "</button>" : "<span></span>") + "</div>").join("");
      $("itRows").querySelectorAll("input").forEach(inp => (inp.oninput = () => {
        const k = inp.dataset.k, it = list[inp.dataset.n];
        if (k === "p") { const d = inp.value.replace(/[^0-9]/g, ""); inp.value = d ? nf.format(Number(d)) : ""; it.p = Number(d) || 0; }
        else if (k === "q") it.q = Number(inp.value.replace(",", ".")) || 0; else it.d = inp.value;
        $("itTotal").textContent = rp(total());
      }));
      $("itRows").querySelectorAll("[data-x]").forEach(b => (b.onclick = () => { list.splice(Number(b.dataset.x), 1); if (!list.length) list.push({ d: "", q: 1, p: 0 }); draw(); }));
      $("itTotal").textContent = rp(total());
    };
    return { html, after: () => { draw(); if ($("itAdd")) $("itAdd").onclick = () => { list.push({ d: "", q: 1, p: 0 }); draw(); const ins = $("itRows").querySelectorAll('[data-k="d"]'); ins[ins.length - 1].focus(); }; },
      get: () => list.filter(i => (i.d || "").trim() || i.p), total };
  }
  /* small modal with a note field (and optionally account and date) for workflow steps */
  function stepModal(title, text, okLabel, opts, fn) {
    opts = opts || {};
    K.openModal("<h3>" + esc(title) + '</h3><form id="stForm" novalidate><p>' + text + "</p>" +
      (opts.account ? (F.akun_kas || []).length ? '<div class="props"><label class="field"><span>Dari akun kas</span><select class="in" id="stAcc">' + accOptions(opts.accountVal) + '</select></label><label class="field"><span>Tanggal bayar</span><input class="in" type="date" id="stDate" value="' + S.today + '"></label>' +
        (opts.amount !== undefined ? '<label class="field"><span>Jumlah diterima (Rp)</span><input class="in" id="stAmt" inputmode="numeric" value="' + nf.format(opts.amount) + '"></label>' : "") +
        (opts.tax ? '<label class="check field" style="align-self:end"><input type="checkbox" id="stTax"' + (opts.taxOn ? " checked" : "") + ">" + esc(opts.tax) + "</label>" : "") + "</div>"
        : '<p class="err">Belum ada akun kas. Tambahkan di tab Pengaturan lebih dulu.</p>' : "") +
      (opts.note === false ? "" : '<label class="field" style="margin-top:12px"><span>' + esc(opts.noteLabel || "Catatan (opsional)") + '</span><textarea class="in" id="stNote" rows="3"></textarea></label>') +
      '<p class="err" id="stErr"></p><div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn' + (opts.danger ? " danger" : "") + '" type="submit">' + esc(okLabel) + "</button></div></form>");
    if ($("stAmt")) $("stAmt").oninput = e => { const d = e.target.value.replace(/[^0-9]/g, ""); e.target.value = d ? nf.format(Number(d)) : ""; };
    $("stForm").onsubmit = async e => {
      e.preventDefault();
      const out = { note: $("stNote") ? $("stNote").value.trim() : "" };
      if (opts.account) { if (!$("stAcc")) return; out.account_id = $("stAcc").value; out.date = $("stDate").value; }
      if ($("stAmt")) out.amount = Number($("stAmt").value.replace(/\./g, "")) || 0;
      if ($("stTax")) out.with_tax = $("stTax").checked;
      if (opts.noteRequired && !out.note) { $("stErr").textContent = "Tuliskan alasannya agar pengaju tahu apa yang perlu diperbaiki."; return; }
      await K.run(e.target.querySelector('[type="submit"]'), async () => { await fn(out); K.closeModal(); });
    };
  }

  /* ============================================================
     SUMMARY
     ============================================================ */
  RENDER.ringkasan = el => {
    const accs = (F.akun_kas || []).filter(a => a.active), month = S.today.slice(0, 7), yr = thisYear();
    const tm = (F.transaksi || []).filter(t => t.date.slice(0, 7) === month);
    const inM = tm.filter(t => t.type === "masuk").reduce((a, t) => a + Number(t.amount), 0), outM = tm.filter(t => t.type === "keluar").reduce((a, t) => a + Number(t.amount), 0);
    const totalBal = accs.reduce((a, x) => a + balance(x), 0);
    const reqOpen = (F.pengajuan || []).filter(r => ["diajukan", "diperiksa", "disetujui"].includes(r.status)).length;
    const ar = (F.invoice || []).reduce((a, v) => { const t = invTotals(v); return a + (t.status === "batal" || t.status === "draf" ? 0 : t.due); }, 0);
    const kpi = (href, n, l, alert) => '<a class="kpi' + (alert ? " alert" : "") + '" href="' + href + '"><b class="money">' + n + "</b><span>" + l + "</span></a>";
    /* budget absorption per project for this year */
    const groups = {};
    (F.anggaran || []).filter(a => String(a.year) === yr && (pos(a.pos_id) || {}).kind === "beban").forEach(a => { const g = groups[a.project_id || ""] || (groups[a.project_id || ""] = { plan: 0, real: 0 }); g.plan += a.amount; });
    Object.keys(groups).forEach(pid => { groups[pid].real = posList(["beban"]).concat((F.pos || []).filter(p => !p.active && p.kind === "beban")).reduce((a, p) => a + realised(pid, yr, p.id), 0); });
    const recent = (F.transaksi || []).slice().sort((a, b) => String(b.date + b.created).localeCompare(a.date + a.created)).slice(0, 8);
    el.innerHTML = '<div class="kpis">' + kpi("#/keuangan/kas", rp(totalBal), "Saldo semua akun") + kpi("#/keuangan/kas", rp(inM), "Masuk bulan ini") + kpi("#/keuangan/kas", rp(outM), "Keluar bulan ini") +
      kpi("#/keuangan/pengajuan?f=aktif", String(reqOpen), "Pengajuan dalam proses", reqOpen > 0) + kpi("#/keuangan/invoice", rp(ar), "Piutang invoice") + "</div>" +
      '<div class="grid2"><section class="sec"><div class="sec-h"><h2>Saldo per akun</h2><a class="small" href="#/keuangan/pengaturan">Atur akun</a></div><div class="panel">' +
      (accs.length ? accs.map(a => '<a class="trow" href="#/keuangan/kas?acc=' + a.id + '" style="text-decoration:none;color:inherit"><span class="nic">' + ic("money") + '</span><span style="min-width:0"><span class="t">' + esc(a.name) + '</span><span class="p">' + esc([a.bank, a.number].filter(Boolean).join(" ") || a.kind) + '</span></span><b class="money">' + rp(balance(a)) + "</b></a>").join("")
        : '<div class="empty"><strong>Belum ada akun kas</strong>Tambahkan rekening bank dan kas kecil di tab Pengaturan.</div>') + "</div></section>" +
      '<section class="sec"><div class="sec-h"><h2>Serapan anggaran ' + yr + '</h2><a class="small" href="#/keuangan/anggaran">Kelola anggaran</a></div><div class="panel pad">' +
      (Object.keys(groups).length ? Object.keys(groups).map(pid => { const g = groups[pid], p = pct(g.real, g.plan); return '<a class="absorb" href="#/keuangan/anggaran?p=' + encodeURIComponent(pid || "-") + '"><span class="t">' + esc(projName(pid)) + '</span><span class="bar"><i style="width:' + Math.min(100, p) + "%" + (p > 100 ? ";background:var(--late)" : "") + '"></i></span><span class="small muted">' + rp(g.real) + " dari " + rp(g.plan) + " (" + String(p).replace(".", ",") + "%)</span></a>"; }).join("")
        : '<div class="empty">Belum ada anggaran untuk tahun ' + yr + ".</div>") + "</div></section></div>" +
      '<section class="sec"><div class="sec-h"><h2>Transaksi terbaru</h2><a class="small" href="#/keuangan/kas">Lihat buku kas</a></div><div class="panel" style="overflow:hidden">' + (recent.length ? txTable(recent) : '<div class="empty">Belum ada transaksi.</div>') + "</div></section>";
    bindTx(el);
  };

  /* ============================================================
     FUND REQUESTS
     ============================================================ */
  const mayCheck = () => role() === "bendahara" || role() === "superadmin" || (role() === "direktur" && !S.users.some(u => u.role === "bendahara" && u.status === "aktif"));
  const mayApprove = r => (role() === "direktur" || role() === "superadmin") && (r.uid !== S.me.id || role() === "superadmin");
  const mayPay = () => ["bendahara", "superadmin", "direktur"].includes(role());
  const needsMe = r => (r.status === "diajukan" && mayCheck()) || (r.status === "diperiksa" && mayApprove(r)) || (r.status === "disetujui" && mayPay() && full()) || (r.status === "revisi" && r.uid === S.me.id);
  RENDER.pengajuan = (el, q) => {
    const rows = F.pengajuan || [];
    let f = q.get("f") || (full() && rows.some(needsMe) ? "tindakan" : "semua"), term = "";
    const FILTERS = [["tindakan", "Perlu tindakan saya"], ["aktif", "Dalam proses"], ["semua", "Semua"], ["dibayar", "Dibayar"], ["ditolak", "Ditolak"]];
    if (["diajukan", "diperiksa", "disetujui"].includes(f)) f = "tindakan";
    el.innerHTML = header(full() ? "Alur: pengaju mengisi, bendahara memeriksa, direktur menyetujui, lalu bendahara mencatat pembayaran. Setiap langkah mengirim notifikasi ke orang berikutnya."
      : "Ajukan uang muka, reimbursement, atau pembayaran ke pihak ketiga. Bendahara memeriksa, direktur menyetujui, lalu dana ditransfer ke rekening yang Anda isi.",
      '<button class="btn" id="rqNew" type="button">' + ic("plus") + "Ajukan dana</button>") +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Saring status">' + FILTERS.map(([k, l]) => '<button type="button" data-f="' + k + '">' + l + "</button>").join("") + '</div><input class="in grow" id="rqQ" type="search" placeholder="Cari nomor, keperluan, atau nama" aria-label="Cari"></div><div id="rqList"></div>';
    const draw = () => {
      el.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
      const list = rows.filter(r => (f === "semua" || (f === "tindakan" ? needsMe(r) : f === "aktif" ? ["diajukan", "revisi", "diperiksa", "disetujui"].includes(r.status) : r.status === f)) &&
        (!term || [r.number, r.purpose, K.uName(r.uid), r.payee_name, projName(r.project_id)].join(" ").toLowerCase().includes(term.toLowerCase()))).sort((a, b) => String(b.created).localeCompare(a.created));
      $("rqList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Nomor</th><th>Keperluan</th><th>Pengaju</th><th class="r">Jumlah</th><th>Status</th></tr></thead><tbody>' +
        list.map(r => '<tr class="click" data-id="' + r.id + '"><td class="mono">' + esc(r.number) + '<br><span class="small muted" style="font-weight:400">' + esc(K.fmtDate(String(r.created).slice(0, 10))) + '</span></td><td class="wrap sm-full"><b>' + esc(r.purpose.length > 90 ? r.purpose.slice(0, 88) + " (dst)" : r.purpose) + '</b><br><span class="small muted">' + esc(KIND_L[r.kind] || r.kind) + ", " + esc(projName(r.project_id)) + '</span></td><td class="sm-hide">' + esc(K.uName(r.uid)) +
          '</td><td class="r money">' + rp(r.amount) + "</td><td>" + reqChip(r) + "</td></tr>").join("") + "</tbody></table></div>"
        : '<div class="panel empty"><strong>' + (f === "tindakan" ? "Tidak ada pengajuan yang menunggu Anda" : "Belum ada pengajuan") + "</strong>" + (f === "tindakan" ? "Pilih Semua untuk melihat seluruh pengajuan." : "Buat pengajuan dengan tombol Ajukan dana.") + "</div>";
      $("rqList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => detail(rows.find(r => r.id === tr.dataset.id))));
    };
    el.querySelectorAll("[data-f]").forEach(b => (b.onclick = () => { f = b.dataset.f; draw(); }));
    $("rqQ").oninput = e => { term = e.target.value; draw(); };
    $("rqNew").onclick = () => reqForm();
    draw(); openFromQuery(rows, q, detail);
  };
  function reqForm(r) {
    const last = (F.pengajuan || []).filter(x => x.uid === S.me.id && x.account_no).sort((a, b) => String(b.created).localeCompare(a.created))[0] || {};
    r = r || { kind: "uang muka", payee_name: last.payee_name || "", bank: last.bank || "", account_no: last.account_no || "", account_name: last.account_name || S.me.name, items: [] };
    const ed = itemsEditor(r.items, true);
    const myProjects = projects().filter(p => full() || K.proj(p.id));
    K.formModal(r.id ? "Perbarui pengajuan " + r.number : "Ajukan dana", [
      ["kind", "Jenis pengajuan", "select", Object.keys(KIND_L).map(k => [k, KIND_L[k]])], ["project_id", "Dibebankan ke", "select", [["", "Operasional yayasan (tanpa proyek)"]].concat(myProjects.map(p => [p.id, p.name]))],
      ["pos_id", "Pos anggaran", "select", [["", "Pilih pos anggaran"]].concat(posList(["beban"]).map(p => [p.id, p.code + " " + p.name]))], ["file_url", "Bukti atau rincian di Google Drive (opsional)", "url"],
      ["purpose", "Keperluan", "textarea", null, { full: true, rows: 3 }]
    ], r, {
      ok: r.id ? "Kirim ulang" : "Kirim pengajuan",
      top: r.status === "revisi" && r.check_note ? '<p class="note">Catatan bendahara: ' + esc(r.check_note) + "</p>" : "",
      extra: ed.html + '<h4 class="fin-h">Rekening penerima</h4><div class="props">' +
        ['<label class="field"><span>Nama penerima</span><input class="in" id="rq_payee" value="' + esc(r.payee_name || "") + '" placeholder="Kosongkan jika Anda sendiri"></label>',
          '<label class="field"><span>Bank</span><input class="in" id="rq_bank" value="' + esc(r.bank || "") + '" placeholder="Misalnya BNI, BRI, Mandiri"></label>',
          '<label class="field"><span>Nomor rekening</span><input class="in" id="rq_no" inputmode="numeric" value="' + esc(r.account_no || "") + '"></label>',
          '<label class="field"><span>Atas nama</span><input class="in" id="rq_an" value="' + esc(r.account_name || "") + '"></label>'].join("") + "</div>",
      after: ed.after,
      collect: () => ({ items: ed.get(), amount: ed.total(), payee_name: $("rq_payee").value.trim(), bank: $("rq_bank").value.trim(), account_no: $("rq_no").value.trim(), account_name: $("rq_an").value.trim() }),
      validate: o => !o.purpose.trim() ? "Tuliskan keperluan dana." : !(o.amount > 0) ? "Isi rincian dengan harga satuan agar jumlah dana terhitung." : !o.pos_id ? "Pilih pos anggaran." :
        !o.bank || !o.account_no || !o.account_name ? "Lengkapi bank, nomor rekening, dan nama pemilik rekening." : o.file_url && !/^https:\/\//.test(o.file_url) ? "Tautan bukti harus diawali https://" : "",
      save: async row => { const j = await K.api("reqSave", { row }); K.toast(r.id ? "Pengajuan dikirim ulang." : "Pengajuan " + j.row.number + " terkirim ke bendahara."); await reload(); }
    });
  }
  function detail(r) {
    if (!r) return;
    const items = r.items || [], who = uid => uid ? esc(K.uName(uid)) : "";
    const step = (done, label, by, at, note) => '<li class="' + (done ? "done" : "") + '"><b>' + label + "</b>" + (by ? '<span class="small muted">' + by + (at ? ", " + esc(K.fmtTime(at)) : "") + "</span>" : "") + (note ? '<span class="small">' + esc(note) + "</span>" : "") + "</li>";
    const st = r.status, acts = [];
    if (r.uid === S.me.id && ["diajukan", "revisi"].includes(st)) acts.push('<button class="btn danger ghost" type="button" data-a="cancel" style="margin-right:auto">Batalkan</button>', '<button class="btn ghost" type="button" data-a="edit">' + (st === "revisi" ? "Perbaiki dan kirim ulang" : "Ubah") + "</button>");
    if (st === "diajukan" && mayCheck()) acts.push('<button class="btn ghost" type="button" data-a="revise">Kembalikan untuk revisi</button>', '<button class="btn" type="button" data-a="check">Sudah diperiksa, teruskan</button>');
    if (st === "diperiksa" && mayApprove(r)) acts.push('<button class="btn danger ghost" type="button" data-a="reject">Tolak</button>', '<button class="btn" type="button" data-a="approve">Setujui</button>');
    if (st === "disetujui" && mayPay() && full()) acts.push('<button class="btn" type="button" data-a="pay">Catat pembayaran</button>');
    if (st === "dibayar" && full() && r.paid_tx) acts.push('<a class="btn ghost" href="#/keuangan/kas?tx=' + r.paid_tx + '">Lihat transaksi</a>');
    K.openModal('<h3>Pengajuan ' + esc(r.number) + "</h3>" + '<div class="req-head"><div><span class="small muted">' + esc(KIND_L[r.kind] || r.kind) + "</span><b class=\"money big\">" + rp(r.amount) + "</b></div>" + reqChip(r) + "</div>" +
      '<dl class="dl"><dt>Pengaju</dt><dd>' + who(r.uid) + "</dd><dt>Dibebankan ke</dt><dd>" + esc(projName(r.project_id)) + "</dd><dt>Pos anggaran</dt><dd>" + esc(posName(r.pos_id) || "Belum dipilih") + "</dd><dt>Keperluan</dt><dd>" + esc(r.purpose) + "</dd>" +
      (r.file_url ? '<dt>Bukti</dt><dd><a href="' + esc(r.file_url) + '" target="_blank" rel="noopener">Buka berkas</a></dd>' : "") +
      "<dt>Rekening</dt><dd>" + esc([r.bank, r.account_no].filter(Boolean).join(" ")) + (r.account_name ? "<br>a.n. " + esc(r.account_name) : "") + (r.payee_name ? '<br><span class="small muted">Penerima: ' + esc(r.payee_name) + "</span>" : "") + "</dd></dl>" +
      (items.length ? '<table class="atable mini"><thead><tr><th>Uraian</th><th class="r">Volume</th><th class="r">Harga</th><th class="r">Jumlah</th></tr></thead><tbody>' + items.map(i => "<tr><td>" + esc(i.d) + '</td><td class="r">' + nf.format(i.q) + '</td><td class="r">' + rp(i.p) + '</td><td class="r">' + rp(i.q * i.p) + "</td></tr>").join("") + "</tbody></table>" : "") +
      '<ol class="steps">' + step(true, "Diajukan", who(r.uid), r.created) + (st === "revisi" ? step(true, "Dikembalikan untuk revisi", who(r.checked_by), r.checked_at, r.check_note) : step(!!r.checked_at && st !== "diajukan", "Diperiksa bendahara", who(r.checked_by), r.checked_at, r.check_note)) +
      step(!!r.approved_at, st === "ditolak" ? "Ditolak direktur" : "Disetujui direktur", who(r.approved_by), r.approved_at, r.approve_note) + (st === "ditolak" ? "" : step(st === "dibayar", "Dibayar", r.paid_at ? esc(K.fmtDate(r.paid_at)) : "", "")) + "</ol>" +
      '<div class="m-acts" style="flex-wrap:wrap"><button class="btn ghost" type="button" data-close>Tutup</button>' + acts.join("") + "</div>");
    const act = (a, body, msg) => async () => { const j = await K.api("reqAction", Object.assign({ id: r.id, act: a }, body)); K.toast(msg); await reload(); return j; };
    document.querySelectorAll(".modal [data-a]").forEach(b => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === "edit") { K.closeModal(); setTimeout(() => reqForm(r), 20); }
      else if (a === "cancel") K.confirmBox("Batalkan pengajuan " + r.number + "? Pengajuan akan dihapus.", "Batalkan pengajuan", act("cancel", {}, "Pengajuan dibatalkan."));
      else if (a === "check") stepModal("Teruskan ke direktur", "Rincian dan rekening sudah diperiksa. Direktur akan menerima notifikasi untuk menyetujui " + rp(r.amount) + ".", "Teruskan ke direktur", {}, o => act("check", o, "Diteruskan ke direktur.")());
      else if (a === "revise") stepModal("Kembalikan untuk revisi", "Pengaju akan diminta memperbaiki pengajuan ini.", "Kembalikan", { noteLabel: "Apa yang perlu diperbaiki", noteRequired: true }, o => act("revise", o, "Dikembalikan ke pengaju.")());
      else if (a === "approve") stepModal("Setujui pengajuan", "Setujui pengajuan " + esc(r.number) + " sebesar <b>" + rp(r.amount) + "</b>. Bendahara akan diminta memproses pembayaran.", "Setujui", {}, o => act("approve", o, "Pengajuan disetujui.")());
      else if (a === "reject") stepModal("Tolak pengajuan", "Pengaju dan bendahara akan menerima notifikasi.", "Tolak pengajuan", { danger: true, noteLabel: "Alasan penolakan", noteRequired: true }, o => act("reject", o, "Pengajuan ditolak.")());
      else if (a === "pay") stepModal("Catat pembayaran", "Transfer " + rp(r.amount) + " ke " + esc([r.bank, r.account_no].join(" ")) + " a.n. " + esc(r.account_name) + ". Setelah dicatat, transaksi kas keluar dibuat otomatis.", "Catat pembayaran", { account: true, note: false }, o => act("pay", o, "Pembayaran dicatat.")());
    }));
  }

  /* ============================================================
     CASH BOOK
     ============================================================ */
  function txTable(list, running) {
    return '<table class="atable"><thead><tr><th>Tanggal</th><th>Uraian</th><th class="sm-hide">Akun</th><th class="r">Jumlah</th>' + (running ? '<th class="r sm-hide">Saldo</th>' : "") + "</tr></thead><tbody>" +
      list.map(t => {
        const sign = t.type === "masuk" ? 1 : t.type === "keluar" ? -1 : 0;
        return '<tr class="click" data-tx="' + t.id + '"><td class="mono">' + esc(K.fmtShort ? K.fmtShort(t.date) : t.date) + '<br><span class="small muted" style="font-weight:400">' + esc(t.number) + '</span></td><td class="wrap sm-full"><b>' + esc(t.description || t.party || "") + '</b><br><span class="small muted">' +
          esc([t.type === "transfer" ? "Transfer ke " + accName(t.to_account_id) : posName(t.pos_id), t.project_id ? projName(t.project_id) : "", t.party && t.description ? t.party : ""].filter(Boolean).join(", ")) + (t.tax_amount ? ", " + esc(t.tax_kind || "Pajak") + " " + rp(t.tax_amount) : "") +
          '</span></td><td class="sm-hide">' + esc(accName(t.account_id)) + '</td><td class="r money ' + (sign > 0 ? "plus" : sign < 0 ? "minus" : "") + '">' + (sign > 0 ? "+" : sign < 0 ? "-" : "") + rp(t.amount).replace("Rp", "Rp") + "</td>" +
          (running ? '<td class="r money sm-hide">' + rp(t._bal) + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  const bindTx = root => root.querySelectorAll("[data-tx]").forEach(tr => (tr.onclick = () => txForm((F.transaksi || []).find(t => t.id === tr.dataset.tx))));
  RENDER.kas = (el, q) => {
    const accs = F.akun_kas || [];
    let fAcc = q.get("acc") || "", fMonth = q.get("m") || S.today.slice(0, 7), fType = "", term = "";
    const months = Array.from(new Set((F.transaksi || []).map(t => t.date.slice(0, 7)).concat([S.today.slice(0, 7)]))).sort().reverse();
    el.innerHTML = header("Buku kas mencatat semua uang masuk, keluar, dan transfer antarakun. Pembayaran pengajuan, invoice, dan honorarium tercatat di sini otomatis.",
      accs.length ? '<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" type="button" data-new="transfer">Transfer</button><button class="btn ghost" type="button" data-new="masuk">' + ic("plus") + 'Kas masuk</button><button class="btn" type="button" data-new="keluar">' + ic("plus") + "Kas keluar</button></span>" : "") +
      (accs.length ? '<div class="sumgrid" style="margin-bottom:16px">' + accs.filter(a => a.active).map(a => '<button class="panel acc-card" type="button" data-acc="' + a.id + '"><span class="small muted">' + esc(a.name) + '</span><b class="money">' + rp(balance(a)) + "</b></button>").join("") + "</div>"
        : '<div class="panel empty" style="margin-bottom:16px"><strong>Belum ada akun kas</strong>Tambahkan rekening bank atau kas kecil di tab <a href="#/keuangan/pengaturan">Pengaturan</a> sebelum mencatat transaksi.</div>') +
      '<div class="toolbar"><select class="in" id="kAcc"><option value="">Semua akun</option>' + accOptions(fAcc) + '</select><select class="in" id="kMonth"><option value="">Semua bulan</option>' +
      months.map(m => '<option value="' + m + '"' + (m === fMonth ? " selected" : "") + ">" + K.MONTHS_L[Number(m.slice(5)) - 1] + " " + m.slice(0, 4) + "</option>").join("") +
      '</select><select class="in" id="kType"><option value="">Semua jenis</option><option value="masuk">Masuk</option><option value="keluar">Keluar</option><option value="transfer">Transfer</option></select><input class="in grow" id="kQ" type="search" placeholder="Cari uraian, nomor, atau pihak" aria-label="Cari"></div><div id="kSum" class="small muted" style="margin:-6px 0 10px"></div><div id="kList"></div>';
    const draw = () => {
      el.querySelectorAll("[data-acc]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.acc === fAcc)));
      let list = (F.transaksi || []).filter(t => (!fAcc || t.account_id === fAcc || t.to_account_id === fAcc) && (!fMonth || t.date.slice(0, 7) === fMonth) && (!fType || t.type === fType) &&
        (!term || [t.number, t.description, t.party, t.ref, posName(t.pos_id)].join(" ").toLowerCase().includes(term.toLowerCase())));
      list.sort((a, b) => String(a.date + a.created).localeCompare(b.date + b.created));
      if (fAcc) { const a = acc(fAcc); let bal = fMonth ? balance(a, fMonth + "-01") : (Number(a.opening) || 0); list.forEach(t => { const n = Number(t.amount) || 0; bal += t.account_id === fAcc ? (t.type === "masuk" ? n : -n) : n; t._bal = bal; }); }
      const inn = list.filter(t => t.type === "masuk").reduce((x, t) => x + Number(t.amount), 0), out = list.filter(t => t.type === "keluar").reduce((x, t) => x + Number(t.amount), 0);
      $("kSum").textContent = list.length + " transaksi. Masuk " + rp(inn) + ", keluar " + rp(out) + ".";
      list.reverse();
      $("kList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden">' + txTable(list, !!fAcc && !fType && !term) + "</div>" : '<div class="panel empty">Tidak ada transaksi untuk saringan ini.</div>';
      bindTx($("kList"));
    };
    el.querySelectorAll("[data-acc]").forEach(b => (b.onclick = () => { fAcc = fAcc === b.dataset.acc ? "" : b.dataset.acc; $("kAcc").value = fAcc; draw(); }));
    el.querySelectorAll("[data-new]").forEach(b => (b.onclick = () => txForm({ type: b.dataset.new, date: S.today, account_id: fAcc || (accs.find(a => a.active) || {}).id })));
    $("kAcc").oninput = e => { fAcc = e.target.value; draw(); };
    $("kMonth").oninput = e => { fMonth = e.target.value; draw(); };
    $("kType").oninput = e => { fType = e.target.value; draw(); };
    $("kQ").oninput = e => { term = e.target.value; draw(); };
    draw();
    const tx = q.get("tx"); if (tx) { const t = (F.transaksi || []).find(x => x.id === tx); if (t) setTimeout(() => txForm(t), 30); }
  };
  function txForm(t) {
    if (!t) return;
    const type = t.type, linked = t.request_id || t.invoice_id || t.honor_id;
    const posKinds = type === "masuk" ? ["pendapatan"] : ["beban", "setoran"];
    const fields = [["date", "Tanggal", "date"], ["account_id", type === "transfer" ? "Dari akun" : type === "masuk" ? "Masuk ke akun" : "Keluar dari akun", "select", (F.akun_kas || []).filter(a => a.active || a.id === t.account_id).map(a => [a.id, a.name])]];
    if (type === "transfer") fields.push(["to_account_id", "Ke akun", "select", [["", "Pilih akun tujuan"]].concat((F.akun_kas || []).filter(a => a.active || a.id === t.to_account_id).map(a => [a.id, a.name]))]);
    fields.push(["amount", type === "keluar" ? "Jumlah dibayar (Rp)" : "Jumlah (Rp)", "money"]);
    if (type !== "transfer") fields.push(["pos_id", "Pos", "select", [["", "Pilih pos"]].concat(posList(posKinds).map(p => [p.id, p.code + " " + p.name]))], ["project_id", "Proyek", "select", [["", "Operasional yayasan (tanpa proyek)"]].concat(projects().map(p => [p.id, p.name]))],
      ["party", type === "masuk" ? "Diterima dari" : "Dibayar kepada", "text"]);
    fields.push(["description", "Uraian", "text", null, { full: true }], ["ref", "Nomor bukti atau referensi", "text"], ["file_url", "Bukti di Google Drive", "url"]);
    if (type !== "transfer") fields.push(["tax_kind", type === "masuk" ? "Pajak dipotong pihak lain" : "Pajak dipotong CHARIS", "select", [["", "Tidak ada"], ["PPh 21", "PPh 21"], ["PPh 23", "PPh 23"], ["PPh 4(2)", "PPh 4(2)"], ["PPN", "PPN"]]],
      ["tax_amount", "Jumlah pajak dipotong (Rp)", "money", null, { help: type === "keluar" ? "Jumlah dibayar adalah nilai bersih. Realisasi anggaran memakai jumlah dibayar ditambah pajak." : "Dicatat sebagai bukti potong dari pihak lain." }]);
    const title = { masuk: "Kas masuk", keluar: "Kas keluar", transfer: "Transfer antarakun" }[type];
    K.formModal(t.id ? title + " " + t.number : title + " baru", fields, t, {
      top: linked ? '<p class="note small">Transaksi ini dibuat dari ' + (t.request_id ? "pengajuan dana " : t.invoice_id ? "pembayaran invoice " : "honorarium ") + esc(t.ref || "") + ". Menghapusnya akan mengembalikan status " + (t.invoice_id ? "pembayaran invoice." : "menjadi belum dibayar.") + "</p>" : "",
      collect: () => ({ type }), validate: o => !o.account_id ? "Pilih akun kas." : !(o.amount > 0) ? "Jumlah harus lebih dari 0." : type === "transfer" && (!o.to_account_id || o.to_account_id === o.account_id) ? "Pilih akun tujuan yang berbeda." :
        type !== "transfer" && !o.pos_id ? "Pilih pos." : o.file_url && !/^https:\/\//.test(o.file_url) ? "Tautan bukti harus diawali https://" : "",
      save: async row => { const j = await K.api("finSave", { sheet: "transaksi", row }); K.toast(t.id ? "Transaksi disimpan." : "Tercatat sebagai " + j.row.number + "."); await reload(); },
      del: t.id ? async () => { await K.api("finDelete", { sheet: "transaksi", id: t.id }); K.toast("Transaksi dihapus."); await reload(); } : null, delConfirm: "Hapus transaksi " + (t.number || "") + "? Saldo akun akan berubah."
    });
  }

  /* ============================================================
     BUDGET
     ============================================================ */
  RENDER.anggaran = (el, q) => {
    let pid = q.get("p") === "-" ? "" : (q.get("p") || (projects()[0] || {}).id || ""), yr = q.get("y") || thisYear();
    const years = Array.from(new Set((F.anggaran || []).map(a => String(a.year)).concat((F.transaksi || []).map(t => year(t.date)), [thisYear(), String(Number(thisYear()) + 1)]))).filter(Boolean).sort().reverse();
    el.innerHTML = header("Isi anggaran per pos untuk tiap proyek dan untuk operasional yayasan. Realisasi dihitung otomatis dari transaksi kas yang memakai pos dan proyek yang sama.") +
      '<div class="toolbar"><select class="in grow" id="bProj">' + projOptions(pid, "Operasional yayasan") + '</select><select class="in" id="bYear">' + years.map(y => '<option' + (y === yr ? " selected" : "") + ">" + y + "</option>").join("") + '</select><button class="btn ghost" type="button" id="bCopy">Salin dari tahun lalu</button></div><div id="bBody"></div>';
    const draw = () => {
      const lines = F.anggaran.filter(a => (a.project_id || "") === pid && String(a.year) === yr);
      const section = (kind, title) => {
        const ps = posList([kind]).concat((F.pos || []).filter(p => !p.active && p.kind === kind && lines.some(l => l.pos_id === p.id)));
        let tp = 0, tr = 0;
        const rows = ps.map(p => { const l = lines.find(x => x.pos_id === p.id) || {}, plan = l.amount || 0, real = realised(pid, yr, p.id); tp += plan; tr += real; if (!plan && !real) return { p, plan, real, empty: true };
          return { p, plan, real, note: l.note }; });
        const r1 = rows.map(x => { const pc = pct(x.real, x.plan), over = x.plan && x.real > x.plan;
          return '<tr class="click' + (x.empty ? " dim" : "") + '" data-pos="' + x.p.id + '"><td class="sm-full"><b>' + esc(x.p.code + " " + x.p.name) + "</b>" + (x.note ? '<br><span class="small muted">' + esc(x.note) + "</span>" : "") + '</td><td class="r money" data-l="Anggaran">' + rp(x.plan) + '</td><td class="r money" data-l="Realisasi">' + rp(x.real) +
            '</td><td class="r money sm-hide' + (over ? " minus" : "") + '">' + rp(x.plan - x.real) + '</td><td class="r sm-hide">' + (x.plan ? '<span class="due ' + (over ? "late" : pc > 85 ? "soon" : "ok") + '">' + String(pc).replace(".", ",") + "%</span>" : "") + "</td></tr>"; }).join("");
        return '<section class="sec"><div class="sec-h"><h2>' + title + '</h2></div><div class="panel" style="overflow:hidden"><table class="atable budget"><thead><tr><th>Pos</th><th class="r">Anggaran</th><th class="r">Realisasi</th><th class="r sm-hide">Sisa</th><th class="r sm-hide">Serapan</th></tr></thead><tbody>' + r1 +
          '<tr class="tot"><td class="sm-full"><b>Jumlah</b></td><td class="r money" data-l="Anggaran">' + rp(tp) + '</td><td class="r money" data-l="Realisasi">' + rp(tr) + '</td><td class="r money sm-hide">' + rp(tp - tr) + '</td><td class="r sm-hide">' + (tp ? String(pct(tr, tp)).replace(".", ",") + "%" : "") + "</td></tr></tbody></table></div></section>";
      };
      $("bBody").innerHTML = section("beban", "Belanja " + yr) + section("pendapatan", "Pendapatan " + yr) + '<p class="small muted">Klik baris untuk mengubah nilai anggaran. Tambah pos baru di tab <a href="#/keuangan/pengaturan">Pengaturan</a>.</p>';
      $("bBody").querySelectorAll("[data-pos]").forEach(tr => (tr.onclick = () => {
        const p = pos(tr.dataset.pos), l = lines.find(x => x.pos_id === p.id) || { project_id: pid, year: yr, pos_id: p.id };
        K.formModal("Anggaran " + p.name, [["amount", "Nilai anggaran (Rp)", "money"], ["note", "Keterangan (opsional)", "text", null, { full: true }]], { amount: l.amount, note: l.note }, {
          top: '<p class="small muted">' + esc(projName(pid)) + ", tahun " + esc(yr) + ". Realisasi saat ini " + rp(realised(pid, yr, p.id)) + ".</p>",
          collect: () => ({ project_id: pid, year: Number(yr), pos_id: p.id }), save: async row => { delete row.id; await K.api("finSave", { sheet: "anggaran", row }); K.toast("Anggaran disimpan."); await loadFin(); draw(); }
        });
      }));
    };
    $("bProj").oninput = e => { pid = e.target.value; draw(); };
    $("bYear").oninput = e => { yr = e.target.value; draw(); };
    $("bCopy").onclick = () => {
      const prev = F.anggaran.filter(a => (a.project_id || "") === pid && String(a.year) === String(Number(yr) - 1));
      if (!prev.length) { K.toast("Tidak ada anggaran tahun " + (Number(yr) - 1) + " untuk disalin.", true); return; }
      K.confirmBox("Salin " + prev.length + " baris anggaran tahun " + (Number(yr) - 1) + " ke tahun " + yr + "? Nilai yang sudah ada di tahun " + yr + " akan ditimpa.", "Salin anggaran", async () => {
        for (const a of prev) await K.api("finSave", { sheet: "anggaran", row: { project_id: pid, year: Number(yr), pos_id: a.pos_id, amount: a.amount, note: a.note } });
        K.toast("Anggaran disalin."); await loadFin(); draw();
      });
    };
    draw();
  };

  /* ============================================================
     INVOICES
     ============================================================ */
  RENDER.invoice = (el, q) => {
    const rows = F.invoice || [];
    let f = "semua", term = "";
    el.innerHTML = header("Nomor invoice dibuat otomatis, misalnya 004/CHARIS/INV/XI/2026. Catat pembayaran klien di sini agar masuk ke buku kas dan status invoice terbarui.", '<button class="btn" id="iNew" type="button">' + ic("plus") + "Invoice baru</button>") +
      '<div class="toolbar"><div class="seg" role="group">' + [["semua", "Semua"], ["belum", "Belum lunas"], ["lunas", "Lunas"], ["draf", "Draf"]].map(([k, l]) => '<button type="button" data-f="' + k + '">' + l + "</button>").join("") + '</div><input class="in grow" id="iQ" type="search" placeholder="Cari nomor atau klien" aria-label="Cari"></div><div id="iList"></div>';
    const draw = () => {
      el.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
      const list = rows.map(v => Object.assign({ _t: invTotals(v) }, v)).filter(v => (f === "semua" || (f === "belum" ? ["terkirim", "dibayar sebagian", "terlambat"].includes(v._t.status) : v._t.status === f)) && (!term || [v.number, v.client].join(" ").toLowerCase().includes(term.toLowerCase())))
        .sort((a, b) => String(b.date).localeCompare(a.date) || b.seq - a.seq);
      $("iList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Nomor</th><th>Klien</th><th class="sm-hide">Jatuh tempo</th><th class="r">Total</th><th>Status</th></tr></thead><tbody>' +
        list.map(v => '<tr class="click" data-id="' + v.id + '"><td class="mono">' + esc(v.number) + '<br><span class="small muted" style="font-weight:400">' + esc(K.fmtDate(v.date)) + '</span></td><td class="wrap sm-full"><b>' + esc(v.client) + '</b><br><span class="small muted">' + esc(v.project_id ? projName(v.project_id) : "") + (v._t.paid ? (v.project_id ? ", " : "") + "dibayar " + rp(v._t.paid) : "") +
          '</span></td><td class="sm-hide">' + (v.due ? esc(K.fmtDate(v.due)) : "") + '</td><td class="r money">' + rp(v._t.total) + "</td><td>" + chip(INV_C[v._t.status] || "lab", v._t.status[0].toUpperCase() + v._t.status.slice(1)) + "</td></tr>").join("") + "</tbody></table></div>"
        : '<div class="panel empty"><strong>Belum ada invoice</strong>Buat invoice untuk termin kontrak atau jasa layanan.</div>';
      $("iList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => invForm(rows.find(v => v.id === tr.dataset.id))));
    };
    el.querySelectorAll("[data-f]").forEach(b => (b.onclick = () => { f = b.dataset.f; draw(); }));
    $("iQ").oninput = e => { term = e.target.value; draw(); };
    $("iNew").onclick = () => invForm();
    draw(); openFromQuery(rows, q, invForm);
  };
  function invForm(v) {
    v = v || { date: S.today, due: K.addDays(S.today, 30), status: "draf", items: [], ppn_rate: 0, pph_rate: 0 };
    const t = v.id ? invTotals(v) : null, ed = itemsEditor(v.items, true);
    const pays = v.id ? (F.transaksi || []).filter(x => x.invoice_id === v.id) : [];
    K.formModal(v.id ? "Invoice " + v.number : "Invoice baru", [
      ["client", "Klien atau pemberi kerja", "text"], ["project_id", "Proyek", "select", [["", "Tidak terkait proyek"]].concat(projects().map(p => [p.id, p.name]))],
      ["client_address", "Alamat klien", "textarea", null, { full: true, rows: 2 }], ["date", "Tanggal invoice", "date"], ["due", "Jatuh tempo", "date"],
      ["ppn_rate", "PPN (%)", "number", null, { help: "Isi 0 jika tidak dipungut PPN." }], ["pph_rate", "PPh dipotong klien (%)", "number", null, { help: "Misalnya PPh 23 atas jasa, sesuai ketentuan yang berlaku." }],
      ["status", "Status", "select", [["draf", "Draf"], ["terkirim", "Terkirim ke klien"], ["batal", "Batal"]]], ["notes", "Catatan di invoice (opsional)", "textarea", null, { full: true, rows: 2 }]
    ], v, {
      top: t ? '<div class="req-head"><div><span class="small muted">Total tagihan</span><b class="money big">' + rp(t.total) + '</b><span class="small muted">Sudah dibayar ' + rp(t.paid) + (t.due ? ", sisa " + rp(t.due) : "") + "</span></div>" + chip(INV_C[t.status] || "lab", t.status[0].toUpperCase() + t.status.slice(1)) + "</div>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn ghost small" type="button" id="iPrint">Cetak invoice</button>' + (t.due && t.status !== "batal" ? '<button class="btn small" type="button" id="iPay">Catat pembayaran</button>' : "") + "</div>" +
        (pays.length ? '<p class="small muted">Pembayaran: ' + pays.map(p => esc(K.fmtDate(p.date)) + " " + rp(gross(p))).join("; ") + "</p>" : "") : "",
      extra: ed.html, after: () => {
        ed.after();
        if ($("iPrint")) $("iPrint").onclick = () => printInvoice(v);
        if ($("iPay")) $("iPay").onclick = () => { K.closeModal(); setTimeout(() => stepModal("Pembayaran " + v.number, "Catat dana yang diterima dari " + esc(v.client) + ". Jika klien memotong PPh, isi jumlah yang benar-benar diterima dan centang pilihan pajak.", "Catat pembayaran",
          { account: true, amount: t.due - (t.paid ? 0 : t.pph), tax: t.pph ? "Klien memotong PPh " + rp(t.pph) + " (bukti potong)" : "", taxOn: !!t.pph, note: false },
          async o => { await K.api("invoicePay", Object.assign({ id: v.id }, o)); K.toast("Pembayaran dicatat."); await reload(); }), 20); };
      },
      collect: () => ({ items: ed.get() }), validate: o => !o.client.trim() ? "Nama klien wajib diisi." : !o.items.length ? "Isi minimal satu baris rincian." : "",
      save: async row => { const j = await K.api("finSave", { sheet: "invoice", row }); K.toast(v.id ? "Invoice disimpan." : "Invoice " + j.row.number + " dibuat."); await reload(); },
      del: v.id && !pays.length ? async () => { await K.api("finDelete", { sheet: "invoice", id: v.id }); K.toast("Invoice dihapus."); await reload(); } : null, delConfirm: "Hapus invoice ini? Nomornya tidak dipakai ulang."
    });
  }
  function printInvoice(v) {
    const t = invTotals(v), w = window.open("", "_blank");
    if (!w) { K.toast("Izinkan jendela baru (pop-up) untuk mencetak.", true); return; }
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Invoice ' + esc(v.number) + '</title><style>body{font:13px/1.5 Arial,sans-serif;color:#142826;margin:32px;max-width:760px}h1{font-size:24px;margin:0;color:#0E5A55}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:8px 6px;border-bottom:1px solid #C9D6D4;text-align:left}th{background:#E7F0EE}td.r,th.r{text-align:right}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0E5A55;padding-bottom:12px;margin-bottom:16px}.org{font-weight:700;font-size:16px;color:#0E5A55}.tot td{border:0;padding:4px 6px}.tot .g td{font-weight:700;font-size:15px;border-top:2px solid #0E5A55}.sign{margin-top:48px;display:flex;justify-content:flex-end}.sign div{text-align:center;width:220px}@media print{body{margin:14mm}}</style></head><body>' +
      '<div class="head"><div><div class="org">Yayasan PINAR (CHARIS)</div><div>Kecamatan Blahbatuh, Kabupaten Gianyar, Bali 80581</div><div>halo@charisforhealth.org, +62 859-3520-1571</div></div><div style="text-align:right"><h1>INVOICE</h1><div><b>' + esc(v.number) + "</b></div><div>Tanggal " + esc(K.fmtDate(v.date)) + "</div>" + (v.due ? "<div>Jatuh tempo " + esc(K.fmtDate(v.due)) + "</div>" : "") + "</div></div>" +
      "<p><b>Kepada</b><br>" + esc(v.client) + (v.client_address ? "<br>" + esc(v.client_address).replace(/\n/g, "<br>") : "") + "</p>" + (v.project_id ? "<p>Proyek: " + esc(projName(v.project_id)) + "</p>" : "") +
      '<table><thead><tr><th>No</th><th>Uraian</th><th class="r">Volume</th><th class="r">Harga satuan</th><th class="r">Jumlah</th></tr></thead><tbody>' +
      (v.items || []).map((i, n) => "<tr><td>" + (n + 1) + "</td><td>" + esc(i.d) + '</td><td class="r">' + nf.format(i.q) + '</td><td class="r">' + rp(i.p) + '</td><td class="r">' + rp(i.q * i.p) + "</td></tr>").join("") + "</tbody></table>" +
      '<table class="tot" style="width:320px;margin-left:auto"><tr><td>Subtotal</td><td class="r">' + rp(t.sub) + "</td></tr>" + (t.ppn ? "<tr><td>PPN " + nf.format(v.ppn_rate) + '%</td><td class="r">' + rp(t.ppn) + "</td></tr>" : "") + '<tr class="g"><td>Total</td><td class="r">' + rp(t.total) + "</td></tr>" +
      (t.pph ? "<tr><td>PPh dipotong " + nf.format(v.pph_rate) + '%</td><td class="r">' + rp(t.pph) + '</td></tr><tr><td>Jumlah ditransfer</td><td class="r">' + rp(t.total - t.pph) + "</td></tr>" : "") + "</table>" +
      (v.notes ? "<p>" + esc(v.notes).replace(/\n/g, "<br>") + "</p>" : "") + '<div class="sign"><div>Gianyar, ' + esc(K.fmtDate(v.date)) + "<br>Hormat kami,<br><br><br><br>Direktur</div></div>" +
      "<script>window.onload=function(){window.print()}<\/script></body></html>");
    w.document.close();
  }

  /* ============================================================
     HONORARIUM
     ============================================================ */
  RENDER.honorarium = (el, q) => {
    const rows = F.honorarium || [], can = full();
    let term = "";
    el.innerHTML = header(can ? "Catat honorarium tim dan narasumber. Saat dibayar, transaksi kas keluar bersih dibuat otomatis dan pajak yang dipotong masuk rekap pajak." : "Honorarium yang dicatat bendahara untuk Anda.",
      can ? '<button class="btn" id="hNew" type="button">' + ic("plus") + "Honorarium baru</button>" : "") +
      (rows.length > 6 ? '<div class="toolbar"><input class="in grow" id="hQ" type="search" placeholder="Cari nama, kegiatan, atau nomor" aria-label="Cari"></div>' : "") + '<div id="hList"></div>';
    const draw = () => {
      const list = rows.filter(h => !term || [h.number, h.name, h.activity, h.period].join(" ").toLowerCase().includes(term.toLowerCase())).sort((a, b) => String(b.created).localeCompare(a.created));
      $("hList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Nomor</th><th>Penerima dan kegiatan</th><th class="r">Bruto</th><th class="r sm-hide">Bersih</th><th>Status</th></tr></thead><tbody>' +
        list.map(h => { const tax = Math.round(h.gross * h.tax_rate / 100); return '<tr class="click" data-id="' + h.id + '"><td class="mono">' + esc(h.number) + '</td><td class="wrap sm-full"><b>' + esc(h.name) + '</b><br><span class="small muted">' + esc([h.activity, h.period, h.project_id ? projName(h.project_id) : ""].filter(Boolean).join(", ")) + '</span></td><td class="r money">' + rp(h.gross) +
          '</td><td class="r money sm-hide">' + rp(h.gross - tax) + "</td><td>" + chip(h.status === "dibayar" ? "ok" : "soon", h.status === "dibayar" ? "Dibayar" : "Direncanakan") + "</td></tr>"; }).join("") + "</tbody></table></div>"
        : '<div class="panel empty"><strong>Belum ada honorarium</strong>' + (can ? "Catat honorarium dengan tombol di atas." : "Honorarium yang dicatat untuk Anda akan muncul di sini.") + "</div>";
      $("hList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => honorForm(rows.find(h => h.id === tr.dataset.id))));
    };
    if ($("hQ")) $("hQ").oninput = e => { term = e.target.value; draw(); };
    if ($("hNew")) $("hNew").onclick = () => honorForm();
    draw(); openFromQuery(rows, q, honorForm);
  };
  function honorForm(h) {
    const can = full(), paid = h && h.status === "dibayar";
    h = h || { tax_rate: 0, period: K.MONTHS_L[Number(S.today.slice(5, 7)) - 1] + " " + thisYear() };
    K.formModal(h.id ? "Honorarium " + h.number : "Honorarium baru", [
      ["uid", "Anggota tim (kosongkan untuk pihak luar)", "user"], ["name", "Nama penerima", "text", null, { help: "Terisi otomatis jika memilih anggota tim." }], ["npwp", "NPWP atau NIK", "text"],
      ["project_id", "Proyek", "select", [["", "Operasional yayasan (tanpa proyek)"]].concat(projects().map(p => [p.id, p.name]))], ["activity", "Kegiatan", "text"], ["period", "Periode", "text"],
      ["gross", "Honorarium bruto (Rp)", "money"], ["tax_rate", "Tarif PPh 21 (%)", "number", null, { help: "Isi sesuai ketentuan PPh 21 yang berlaku untuk penerima ini." }],
      ["bank", "Bank", "text"], ["account_no", "Nomor rekening", "text"], ["account_name", "Atas nama", "text"]
    ], h, {
      readonly: !can || paid,
      top: '<p class="note small" id="hNet"></p>' + (h.id && can && !paid ? '<div style="margin-bottom:12px"><button class="btn small" type="button" id="hPay">Bayar honorarium</button></div>' : "") + (paid ? '<p class="small muted">Dibayar ' + esc(K.fmtDate(h.paid_at)) + (can && h.paid_tx ? ', <a href="#/keuangan/kas?tx=' + h.paid_tx + '">lihat transaksi</a>' : "") + ".</p>" : ""),
      after: () => {
        const calc = () => { const g = Number(($("f_gross").value || "").replace(/\./g, "")) || 0, r = Number(String($("f_tax_rate").value).replace(",", ".")) || 0, tx = Math.round(g * r / 100); $("hNet").textContent = "Bruto " + rp(g) + ", PPh 21 " + rp(tx) + ", diterima bersih " + rp(g - tx) + "."; };
        ["f_gross", "f_tax_rate"].forEach(id => $(id).addEventListener("input", calc)); calc();
        $("f_tax_rate").step = "0.5";
        if ($("f_uid")) $("f_uid").addEventListener("input", e => { const u = K.user(e.target.value); if (u && !$("f_name").value) $("f_name").value = u.name; if (u && !$("f_account_name").value) $("f_account_name").value = u.name; });
        if ($("hPay")) $("hPay").onclick = () => { K.closeModal(); setTimeout(() => stepModal("Bayar honorarium", "Transfer bersih " + rp(h.gross - Math.round(h.gross * h.tax_rate / 100)) + " ke " + esc([h.bank, h.account_no].filter(Boolean).join(" ") || h.name) + ". PPh 21 dicatat sebagai pajak yang wajib disetor.", "Catat pembayaran", { account: true, note: false },
          async o => { await K.api("honorPay", Object.assign({ id: h.id }, o)); K.toast("Honorarium dibayar."); await reload(); }), 20); };
      },
      validate: o => !o.name && !o.uid ? "Isi nama penerima." : !(o.gross > 0) ? "Isi nilai honorarium." : "",
      save: async row => { const j = await K.api("finSave", { sheet: "honorarium", row }); K.toast(h.id ? "Honorarium disimpan." : "Tercatat sebagai " + j.row.number + "."); await reload(); },
      del: h.id && can && !paid ? async () => { await K.api("finDelete", { sheet: "honorarium", id: h.id }); K.toast("Honorarium dihapus."); await reload(); } : null
    });
  }

  /* ============================================================
     SETTINGS: cash accounts and budget lines
     ============================================================ */
  RENDER.pengaturan = el => {
    const accs = F.akun_kas || [], ps = (F.pos || []).slice().sort((a, b) => String(a.kind).localeCompare(b.kind) || (a.order - b.order) || String(a.code).localeCompare(b.code));
    const KL = { beban: "Belanja", pendapatan: "Pendapatan", setoran: "Setoran pajak (di luar anggaran)" };
    el.innerHTML = '<section class="sec"><div class="sec-h"><h2>Akun kas</h2><button class="btn" type="button" id="aNew">' + ic("plus") + 'Akun baru</button></div><div class="panel" style="overflow:hidden">' +
      (accs.length ? '<table class="atable"><thead><tr><th>Nama</th><th class="sm-hide">Bank dan nomor</th><th class="r">Saldo awal</th><th class="r">Saldo kini</th></tr></thead><tbody>' + accs.map(a => '<tr class="click' + (a.active ? "" : " dim") + '" data-a="' + a.id + '"><td class="sm-full"><b>' + esc(a.name) + "</b>" + (a.active ? "" : ' <span class="chip lab">nonaktif</span>') + '<br><span class="small muted">' + esc(a.kind) + '</span></td><td class="sm-hide">' + esc([a.bank, a.number].filter(Boolean).join(" ")) +
        '</td><td class="r money">' + rp(a.opening) + '</td><td class="r money">' + rp(balance(a)) + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty"><strong>Belum ada akun kas</strong>Tambahkan rekening bank yayasan dan kas kecil beserta saldo awalnya.</div>') + "</div></section>" +
      '<section class="sec"><div class="sec-h"><h2>Pos anggaran</h2><button class="btn ghost" type="button" id="pNew">' + ic("plus") + 'Pos baru</button></div><div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Kode</th><th>Nama pos</th><th>Kelompok</th></tr></thead><tbody>' +
      ps.map(p => '<tr class="click' + (p.active ? "" : " dim") + '" data-p="' + p.id + '"><td class="mono">' + esc(p.code) + '</td><td class="sm-full">' + esc(p.name) + (p.active ? "" : ' <span class="chip lab">nonaktif</span>') + "</td><td>" + esc(KL[p.kind] || p.kind) + "</td></tr>").join("") + "</tbody></table></div></section>";
    const accForm = a => K.formModal(a.id ? a.name : "Akun kas baru", [
      ["name", "Nama akun", "text", null, { help: "Misalnya Rekening BNI operasional, Rekening proyek, Kas kecil" }], ["kind", "Jenis", "select", [["bank", "Rekening bank"], ["kas kecil", "Kas kecil (tunai)"], ["dompet digital", "Dompet digital"]]],
      ["bank", "Bank", "text"], ["number", "Nomor rekening", "text"], ["holder", "Atas nama", "text"], ["opening", "Saldo awal (Rp)", "money"], ["opening_date", "Per tanggal", "date"], ["active", "Status", "select", [["true", "Aktif"], ["false", "Nonaktif"]]]
    ], Object.assign({}, a, { active: a.active === false ? "false" : "true" }), {
      validate: o => !o.name.trim() ? "Nama akun wajib diisi." : "", save: async row => { await K.api("finSave", { sheet: "akun_kas", row }); K.toast("Akun disimpan."); await reload(); },
      del: a.id ? async () => { await K.api("finDelete", { sheet: "akun_kas", id: a.id }); K.toast("Akun dihapus."); await reload(); } : null, delConfirm: "Hapus akun ini? Akun yang sudah dipakai transaksi hanya bisa dinonaktifkan."
    });
    const posForm = p => K.formModal(p.id ? p.code + " " + p.name : "Pos baru", [["code", "Kode", "text", null, { help: "Misalnya B11. Kosongkan untuk kode otomatis." }], ["name", "Nama pos", "text"], ["kind", "Kelompok", "select", Object.keys(KL).map(k => [k, KL[k]])], ["active", "Status", "select", [["true", "Aktif"], ["false", "Nonaktif"]]]],
      Object.assign({ kind: "beban" }, p, { active: p.active === false ? "false" : "true" }), {
        validate: o => !o.name.trim() ? "Nama pos wajib diisi." : "", save: async row => { if (!row.id) row.order = 50 + (F.pos || []).length; await K.api("finSave", { sheet: "pos", row }); K.toast("Pos disimpan."); await reload(); },
        del: p.id ? async () => { await K.api("finDelete", { sheet: "pos", id: p.id }); K.toast("Pos dihapus."); await reload(); } : null, delConfirm: "Hapus pos ini? Pos yang sudah dipakai hanya bisa dinonaktifkan."
      });
    $("aNew").onclick = () => accForm({ kind: "bank", opening_date: thisYear() + "-01-01", active: true });
    $("pNew").onclick = () => posForm({});
    el.querySelectorAll("[data-a]").forEach(tr => (tr.onclick = () => accForm(acc(tr.dataset.a))));
    el.querySelectorAll("[data-p]").forEach(tr => (tr.onclick = () => posForm(pos(tr.dataset.p))));
  };

  /* ============================================================
     EXCEL REPORTS
     ============================================================ */
  RENDER.laporan = el => {
    const years = Array.from(new Set((F.transaksi || []).map(t => year(t.date)).concat((F.anggaran || []).map(a => String(a.year)), [thisYear()]))).filter(Boolean).sort().reverse();
    const yOpt = years.map(y => "<option>" + y + "</option>").join("");
    const card = (id, title, text, ctl) => '<section class="panel pad rep"><h3>' + title + '</h3><p class="small muted">' + text + '</p><div class="toolbar" style="margin:12px 0 0">' + ctl + '<button class="btn" type="button" id="' + id + '">' + ic("down") + "Unduh Excel</button></div></section>";
    el.innerHTML = '<div class="reps">' +
      card("r1", "Laporan keuangan proyek", "Untuk pemberi dana: anggaran, realisasi, sisa, dan serapan per pos, rincian transaksi, pengajuan dana, dan honorarium proyek.", '<select class="in grow" id="r1p">' + projOptions((projects()[0] || {}).id, "Operasional yayasan") + '</select><select class="in" id="r1y"><option value="">Seluruh periode</option>' + yOpt + "</select>") +
      card("r2", "Laporan tahunan yayasan", "Arus kas per akun, pendapatan dan belanja per pos, anggaran dan realisasi tiap proyek, serta buku kas lengkap satu tahun.", '<select class="in" id="r2y">' + yOpt + "</select>") +
      card("r3", "Rekap pajak", "Rekap bulanan PPh 21, PPh 23, PPh 4(2), dan PPN, baik yang dipotong CHARIS maupun yang dipotong pihak lain, beserta setoran dan rinciannya.", '<select class="in" id="r3y">' + yOpt + "</select>") +
      "</div>";
    $("r1").onclick = () => reportProject($("r1p").value, $("r1y").value);
    $("r2").onclick = () => reportYear($("r2y").value);
    $("r3").onclick = () => reportTax($("r3y").value);
  };
  const H = arr => arr.map(v => ({ v, s: "h" }));
  const M = n => ({ v: Math.round(n || 0), s: "m" }), MB = n => ({ v: Math.round(n || 0), s: "mb" }), B = v => ({ v, s: "b" }), P = n => ({ v: n, s: "p" });
  const titleRows = (title, lines) => [[{ v: title, s: "t" }]].concat(lines.map(l => [l]), [[]]);
  const stamp = () => "Dibuat dari Ruang Kerja CHARIS pada " + K.fmtDate(S.today) + " oleh " + S.me.name;
  const fileSafe = s => String(s).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const txRows = list => [H(["Tanggal", "Nomor", "Jenis", "Akun", "Pos", "Pihak", "Uraian", "Referensi", "Masuk", "Keluar", "Pajak dipotong", "Jenis pajak"])].concat(list.map(t => [t.date, t.number, t.type, accName(t.account_id) + (t.type === "transfer" ? " ke " + accName(t.to_account_id) : ""), posName(t.pos_id), t.party, t.description, t.ref,
    t.type === "masuk" ? M(t.amount) : "", t.type === "keluar" ? M(t.amount) : "", t.tax_amount ? M(t.tax_amount) : "", t.tax_kind]));
  const TXW = [11, 14, 9, 22, 22, 22, 40, 18, 15, 15, 14, 10];

  function budgetRows(pid, yr, kinds) {
    const yrs = yr ? [String(yr)] : Array.from(new Set((F.anggaran || []).filter(a => (a.project_id || "") === pid).map(a => String(a.year)).concat((F.transaksi || []).filter(t => (t.project_id || "") === pid).map(t => year(t.date)))));
    const rows = [H(["Kode", "Pos", "Anggaran", "Realisasi", "Sisa", "Serapan"])];
    let tp = 0, tr = 0;
    (F.pos || []).filter(p => kinds.includes(p.kind)).sort((a, b) => (a.order - b.order)).forEach(p => {
      const plan = (F.anggaran || []).filter(a => (a.project_id || "") === pid && yrs.includes(String(a.year)) && a.pos_id === p.id).reduce((x, a) => x + a.amount, 0);
      const real = yrs.reduce((x, y) => x + realised(pid, y, p.id), 0);
      if (!plan && !real) return;
      tp += plan; tr += real;
      rows.push([p.code, p.name, M(plan), M(real), M(plan - real), plan ? P(real / plan) : ""]);
    });
    rows.push(["", B("Jumlah"), MB(tp), MB(tr), MB(tp - tr), tp ? P(tr / tp) : ""]);
    return { rows, tp, tr };
  }
  function reportProject(pid, yr) {
    const name = projName(pid), p = (F.projects || []).find(x => x.id === pid) || {};
    const inYr = d => !yr || year(d) === yr;
    const tx = (F.transaksi || []).filter(t => (t.project_id || "") === pid && t.type !== "transfer" && inYr(t.date)).sort((a, b) => a.date.localeCompare(b.date));
    const exp = budgetRows(pid, yr, ["beban"]), inc = budgetRows(pid, yr, ["pendapatan"]);
    const sum = titleRows("Laporan keuangan proyek", [name, (p.client ? "Pemberi kerja: " + p.client : ""), "Periode: " + (yr || "seluruh periode") + (p.start ? " (proyek " + p.start + " sampai " + (p.end || "selesai") + ")" : ""), stamp()].filter(Boolean))
      .concat([[B("Ringkasan")], ["Total pendapatan diterima", MB(inc.tr)], ["Total belanja (bruto)", MB(exp.tr)], ["Selisih", MB(inc.tr - exp.tr)], ["Serapan anggaran belanja", exp.tp ? P(exp.tr / exp.tp) : ""], [], [B("Belanja per pos")]], exp.rows, [[], [B("Pendapatan per pos")]], inc.rows);
    const req = (F.pengajuan || []).filter(r => (r.project_id || "") === pid && inYr(String(r.created).slice(0, 10)));
    const hon = (F.honorarium || []).filter(h => (h.project_id || "") === pid && inYr(h.paid_at || String(h.created).slice(0, 10)));
    K.xlsx("Laporan-proyek-" + fileSafe(name) + (yr ? "-" + yr : "") + ".xlsx", [
      { name: "Ringkasan", widths: [26, 34, 16, 16, 16, 10], rows: sum },
      { name: "Transaksi", widths: TXW, rows: txRows(tx), freeze: 1 },
      { name: "Pengajuan dana", widths: [14, 12, 20, 22, 44, 22, 15, 16, 12], freeze: 1, rows: [H(["Nomor", "Tanggal", "Jenis", "Pengaju", "Keperluan", "Pos", "Jumlah", "Status", "Dibayar"])].concat(req.map(r => [r.number, String(r.created).slice(0, 10), KIND_L[r.kind] || r.kind, K.uName(r.uid), r.purpose, posName(r.pos_id), M(r.amount), REQ_L[r.status], r.paid_at || ""])) },
      { name: "Honorarium", widths: [14, 24, 30, 16, 15, 8, 14, 15, 12], freeze: 1, rows: [H(["Nomor", "Penerima", "Kegiatan", "Periode", "Bruto", "Tarif", "PPh 21", "Bersih", "Dibayar"])].concat(hon.map(h => { const t = Math.round(h.gross * h.tax_rate / 100); return [h.number, h.name, h.activity, h.period, M(h.gross), P(h.tax_rate / 100), M(t), M(h.gross - t), h.paid_at || "belum"]; })) }
    ]);
    K.toast("Laporan proyek diunduh.");
  }
  function reportYear(yr) {
    const start = yr + "-01-01", end = (Number(yr) + 1) + "-01-01";
    const tx = (F.transaksi || []).filter(t => year(t.date) === yr).sort((a, b) => String(a.date + a.created).localeCompare(b.date + b.created));
    const flow = [H(["Akun", "Saldo awal", "Masuk", "Keluar", "Transfer masuk", "Transfer keluar", "Saldo akhir"])]; let T = [0, 0, 0, 0, 0, 0];
    (F.akun_kas || []).forEach(a => {
      const o = balance(a, start), inn = tx.filter(t => t.type === "masuk" && t.account_id === a.id).reduce((x, t) => x + Number(t.amount), 0), out = tx.filter(t => t.type === "keluar" && t.account_id === a.id).reduce((x, t) => x + Number(t.amount), 0);
      const ti = tx.filter(t => t.type === "transfer" && t.to_account_id === a.id).reduce((x, t) => x + Number(t.amount), 0), to = tx.filter(t => t.type === "transfer" && t.account_id === a.id).reduce((x, t) => x + Number(t.amount), 0);
      const c = balance(a, end); [o, inn, out, ti, to, c].forEach((n, i) => (T[i] += n));
      flow.push([a.name, M(o), M(inn), M(out), M(ti), M(to), M(c)]);
    });
    flow.push([B("Jumlah")].concat(T.map(MB)));
    const byPos = kind => { const rows = [H(["Kode", "Pos", "Jumlah (bruto)"])]; let s = 0; (F.pos || []).filter(p => p.kind === kind).sort((a, b) => a.order - b.order).forEach(p => { const n = tx.filter(t => t.pos_id === p.id && t.type !== "transfer").reduce((x, t) => x + gross(t), 0); if (n) { s += n; rows.push([p.code, p.name, M(n)]); } }); rows.push(["", B("Jumlah"), MB(s)]); return { rows, s }; };
    const inc = byPos("pendapatan"), exp = byPos("beban"), dep = byPos("setoran");
    const sum = titleRows("Laporan keuangan tahunan Yayasan PINAR (CHARIS) " + yr, ["Periode 1 Januari sampai 31 Desember " + yr, stamp()])
      .concat([[B("Ringkasan")], ["Pendapatan", MB(inc.s)], ["Belanja", MB(exp.s)], ["Surplus atau defisit", MB(inc.s - exp.s)], ["Setoran pajak", MB(dep.s)], [], [B("Arus kas per akun")]], flow, [[], [B("Pendapatan per pos")]], inc.rows, [[], [B("Belanja per pos")]], exp.rows);
    const pids = Array.from(new Set((F.anggaran || []).filter(a => String(a.year) === yr).map(a => a.project_id || "").concat(tx.map(t => t.project_id || ""))));
    let br = [H(["Proyek", "Kode", "Pos", "Anggaran", "Realisasi", "Sisa", "Serapan"])];
    pids.forEach(pid => { const b = budgetRows(pid, yr, ["beban"]); b.rows.slice(1).forEach((r, i, arr) => br.push([i === arr.length - 1 ? B(projName(pid)) : projName(pid)].concat(r))); br.push([]); });
    let run = (F.akun_kas || []).reduce((x, a) => x + balance(a, start), 0);
    const book = [H(["Tanggal", "Nomor", "Akun", "Uraian", "Pos", "Proyek", "Masuk", "Keluar", "Saldo gabungan"])].concat([["", "", "", B("Saldo awal semua akun"), "", "", "", "", MB(run)]],
      tx.filter(t => t.type !== "transfer").map(t => { const n = Number(t.amount); run += t.type === "masuk" ? n : -n; return [t.date, t.number, accName(t.account_id), t.description || t.party, posName(t.pos_id), t.project_id ? projName(t.project_id) : "Operasional", t.type === "masuk" ? M(n) : "", t.type === "keluar" ? M(n) : "", M(run)]; }));
    K.xlsx("Laporan-tahunan-CHARIS-" + yr + ".xlsx", [
      { name: "Ringkasan", widths: [30, 34, 16, 16, 16, 16, 16], rows: sum },
      { name: "Anggaran per proyek", widths: [32, 8, 28, 16, 16, 16, 10], rows: br, freeze: 1 },
      { name: "Buku kas", widths: [11, 14, 22, 40, 22, 26, 15, 15, 17], rows: book, freeze: 1 },
      { name: "Semua transaksi", widths: TXW, rows: txRows(tx), freeze: 1 }
    ]);
    K.toast("Laporan tahunan diunduh.");
  }
  function reportTax(yr) {
    const tx = (F.transaksi || []).filter(t => year(t.date) === yr);
    const kinds = ["PPh 21", "PPh 23", "PPh 4(2)", "PPN"];
    const withheld = tx.filter(t => t.type === "keluar" && t.tax_amount), credited = tx.filter(t => t.type === "masuk" && t.tax_amount), deposits = tx.filter(t => (pos(t.pos_id) || {}).kind === "setoran");
    const invs = (F.invoice || []).filter(v => year(v.date) === yr && v.status !== "batal" && invTotals(v).ppn);
    const rows = titleRows("Rekap pajak " + yr, ["Yayasan PINAR (CHARIS)", stamp(), "Pajak dipotong CHARIS wajib disetor. Pajak dipotong pihak lain adalah kredit pajak (bukti potong diterima)."])
      .concat([H(["Bulan"].concat(kinds.map(k => k + " dipotong CHARIS"), ["PPh dipotong pihak lain", "PPN keluaran (invoice)", "Setoran pajak", "Selisih belum disetor"]))]);
    const T = new Array(8).fill(0);
    for (let m = 1; m <= 12; m++) {
      const mm = yr + "-" + ("0" + m).slice(-2), inM = t => t.date.slice(0, 7) === mm;
      const w = kinds.map(k => withheld.filter(t => inM(t) && t.tax_kind === k).reduce((x, t) => x + Number(t.tax_amount), 0));
      const c = credited.filter(inM).reduce((x, t) => x + Number(t.tax_amount), 0), ppn = invs.filter(v => v.date.slice(0, 7) === mm).reduce((x, v) => x + invTotals(v).ppn, 0), dep = deposits.filter(inM).reduce((x, t) => x + Number(t.amount), 0);
      const owe = w.reduce((x, n) => x + n, 0) + ppn - dep, vals = w.concat([c, ppn, dep, owe]);
      vals.forEach((n, i) => (T[i] += n));
      rows.push([K.MONTHS_L[m - 1]].concat(vals.map(M)));
    }
    rows.push([B("Jumlah")].concat(T.map(MB)));
    const det = [H(["Tanggal", "Nomor", "Arah", "Jenis pajak", "Pihak", "Uraian", "Dasar (bruto)", "Pajak"])]
      .concat(withheld.concat(credited).sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.number, t.type === "keluar" ? "Dipotong CHARIS" : "Dipotong pihak lain", t.tax_kind || "Lainnya", t.party, t.description, M(gross(t)), M(t.tax_amount)]))
      .concat(invs.map(v => { const t = invTotals(v); return [v.date, v.number, "PPN keluaran", "PPN", v.client, "Invoice", M(t.sub), M(t.ppn)]; }));
    const dp = [H(["Tanggal", "Nomor", "Uraian", "Referensi", "Jumlah"])].concat(deposits.map(t => [t.date, t.number, t.description, t.ref, M(t.amount)]));
    K.xlsx("Rekap-pajak-CHARIS-" + yr + ".xlsx", [
      { name: "Rekap bulanan", widths: [14, 16, 16, 16, 14, 18, 18, 15, 18], rows },
      { name: "Rincian potongan", widths: [11, 14, 20, 12, 26, 40, 16, 15], rows: det, freeze: 1 },
      { name: "Setoran", widths: [11, 14, 40, 20, 15], rows: dp, freeze: 1 }
    ]);
    K.toast("Rekap pajak diunduh.");
  }
})();
