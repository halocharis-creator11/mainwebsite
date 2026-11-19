/* CHARIS Ruang Kerja: Peluang dan proposal. Quick capture of calls, brainstorming, team decision,
   proposal writing, results, pipeline dashboard and calendar. Server side: apps-script/Peluang.gs. */
(function () {
  "use strict";
  const K = window.K; if (!K) return;
  const { S, esc, ic } = K;
  const $ = id => document.getElementById(id);
  const STAGES = [["masuk", "Peluang masuk"], ["brainstorm", "Brainstorming"], ["keputusan", "Keputusan tim"], ["eoi", "Concept note atau EOI"], ["penyusunan", "Penyusunan proposal"],
    ["telaah", "Telaah internal"], ["diajukan", "Diajukan"], ["klarifikasi", "Klarifikasi dan negosiasi"]];
  const CLOSED = [["lolos", "Lolos"], ["tidak_lolos", "Tidak lolos"], ["batal", "Batal"], ["tidak_lanjut", "Tidak dilanjutkan"]];
  const STAGE_L = Object.fromEntries(STAGES.concat(CLOSED));
  K.OPP_STAGE_L = STAGE_L;
  const OPEN = STAGES.map(s => s[0]), AFTER_GO = ["eoi", "penyusunan", "telaah", "diajukan", "klarifikasi"];
  const KINDS = [["", "Belum ditentukan"], ["hibah", "Hibah donor atau filantropi"], ["tender", "Tender atau lelang pemerintah"], ["rfp", "RFP swasta atau CSR"], ["penunjukan", "Penunjukan langsung"], ["lainnya", "Lainnya"]];
  const KIND_L = Object.fromEntries(KINDS);
  const CUR = ["IDR", "USD", "EUR", "AUD", "GBP", "SGD", "JPY", "CHF"];
  const BRIEF = [["masalah", "Masalah yang ingin dijawab"], ["pendekatan", "Ide pendekatan"], ["mitra", "Mitra potensial"], ["keunggulan", "Keunggulan CHARIS"], ["risiko", "Risiko dan tantangan"], ["syarat", "Syarat penting dari call"]];
  const CRIT = [["fit", "Kecocokan bidang"], ["win", "Peluang menang"], ["capacity", "Kapasitas tim"], ["value", "Nilai dana"]];
  const REASONS = ["Kualitas teknis", "Anggaran atau harga", "Kelayakan atau syarat administrasi", "Persaingan ketat", "Prioritas pemberi dana berubah", "Lainnya"];
  const nf = (n, d) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d == null ? 0 : d }).format(Number(n) || 0);
  const money = (n, cur) => (cur && cur !== "IDR" ? cur + " " + nf(n, 2) : "Rp" + nf(n));
  const idr = o => (o.currency === "IDR" || !o.currency ? o.value : o.value * (o.rate || 0)) || 0;
  const canDecide = o => ["superadmin", "direktur"].includes(S.me.role) || o.lead_uid === S.me.id;
  const lock = o => o.visibility === "tim" ? '<span class="chip lab" title="Hanya tim yang ditunjuk">' + ic("user") + "Tim</span>" : "";
  const svcName = k => { const s = (window.SERVICES || []).find(x => x.key === (window.svcKey ? window.svcKey(k) : k)); return s ? s.id.t : ""; };
  const fieldName = k => { const s = (window.SERVICES || []).find(x => x.key === (window.svcKey ? window.svcKey(k) : k)); return s ? ({ a: "Analisis Kesehatan", r: "Penelitian dan Pengembangan", s: "Layanan Kesehatan Terintegrasi" })[s.pillar] : ""; };
  const stageChip = o => '<span class="due ' + (o.stage === "lolos" ? "ok" : ["tidak_lolos", "batal", "tidak_lanjut"].includes(o.stage) ? "done" : AFTER_GO.includes(o.stage) ? "soon" : "lab") + '">' + esc(STAGE_L[o.stage] || o.stage) + "</span>";

  /* ============================================================
     QUICK CAPTURE: three fields, reachable from every page
     ============================================================ */
  const MONTH = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, nopember: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
  const two = n => ("0" + n).slice(-2);
  function findDate(text) {
    const tries = [], kw = /(deadline|tenggat|batas|closing|due|paling lambat|ditutup|close|submission)/i, k = text.search(kw);
    if (k >= 0) tries.push(text.slice(k, k + 80));
    tries.push(text);
    for (const s of tries) {
      let m = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(s); if (m) return m[1] + "-" + two(m[2]) + "-" + two(m[3]);
      m = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/.exec(s); if (m) return m[3] + "-" + two(m[2]) + "-" + two(m[1]);
      m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/.exec(s); if (m && MONTH[m[2].toLowerCase()]) return m[3] + "-" + two(MONTH[m[2].toLowerCase()]) + "-" + two(m[1]);
      m = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/.exec(s); if (m && MONTH[m[1].toLowerCase()]) return m[3] + "-" + two(MONTH[m[1].toLowerCase()]) + "-" + two(m[2]);
    }
    return "";
  }
  /* turn a pasted post (title, link and a date somewhere in it) into the three fields */
  function parsePost(text) {
    text = String(text || "").trim();
    const url = (text.match(/https?:\/\/[^\s)>\]"']+/) || [""])[0].replace(/[.,;]+$/, "");
    const lines = text.split(/\n+/).map(l => l.replace(/https?:\/\/\S+/g, "").replace(/[#*_>]+/g, " ").trim()).filter(l => l.length > 3);
    return { title: (lines[0] || "").slice(0, 200), link: url, deadline: findDate(text) };
  }
  function capture(pre) {
    pre = pre || {};
    K.openModal('<h3>Catat peluang</h3><form id="cpF" novalidate><p class="small muted" style="margin:-4px 0 12px">Cukup tiga isian. Rinciannya bisa dilengkapi saat diskusi. Tip: tempel teks postingan, judul, tautan, dan tanggal terisi sendiri.</p>' +
      '<label class="field"><span>Judul call</span><textarea class="in" id="cpT" rows="2" placeholder="Misalnya: Call for proposals penguatan layanan kesehatan primer 2027">' + esc(pre.title || "") + "</textarea></label>" +
      '<label class="field" style="margin-top:10px"><span>Tautan</span><input class="in" id="cpL" inputmode="url" placeholder="https://" value="' + esc(pre.link || "") + '"></label>' +
      '<label class="field" style="margin-top:10px"><span>Tenggat (deadline)</span><input class="in" id="cpD" type="date" value="' + esc(pre.deadline || "") + '"></label>' +
      (navigator.clipboard && navigator.clipboard.readText ? '<button class="btn ghost small" type="button" id="cpPaste" style="margin-top:12px">' + ic("clip") + "Tempel dari postingan</button>" : "") +
      '<p class="err" id="cpE"></p><div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">Simpan peluang</button></div></form>');
    const fill = p => { if (p.title && !$("cpT").value.trim()) $("cpT").value = p.title; if (p.link && !$("cpL").value.trim()) $("cpL").value = p.link; if (p.deadline && !$("cpD").value) $("cpD").value = p.deadline; };
    ["cpT", "cpL"].forEach(id => $(id).addEventListener("paste", e => {
      const text = (e.clipboardData || window.clipboardData).getData("text"); if (!text || text.length < 25 && !/https?:/.test(text)) return;
      const p = parsePost(text);
      if (id === "cpT" && (p.link || p.deadline)) { e.preventDefault(); fill(p); if (!$("cpT").value.trim()) $("cpT").value = p.title; }
      if (id === "cpL" && p.link) { e.preventDefault(); $("cpL").value = p.link; fill(p); }
    }));
    if ($("cpPaste")) $("cpPaste").onclick = async () => { try { const tx = await navigator.clipboard.readText(); if (tx) { fill(parsePost(tx)); if (!$("cpL").value && /^https?:/.test(tx.trim())) $("cpL").value = tx.trim(); } } catch (e) { K.toast("Izinkan akses papan klip, atau tempel langsung di kolom judul.", true); } };
    $("cpF").onsubmit = async e => {
      e.preventDefault();
      const title = $("cpT").value.trim(), link = $("cpL").value.trim(), deadline = $("cpD").value;
      if (!title) { $("cpE").textContent = "Tulis judul call."; $("cpT").focus(); return; }
      if (link && !/^https:\/\//.test(link)) { $("cpE").textContent = "Tautan harus diawali https://"; return; }
      await K.run(e.target.querySelector('[type="submit"]'), async () => {
        const j = await K.api("oppCapture", { title, link, deadline });
        S.peluang = (S.peluang || []).concat([j.item]); K.buildNav();
        K.openModal('<h3>Peluang tercatat</h3><p><b>' + esc(j.item.number) + "</b> " + esc(j.item.title) + '</p><p class="small muted">Tim bisa langsung menambah ide dan memberi skor di halaman peluangnya.</p>' +
          '<div class="m-acts" style="flex-wrap:wrap"><button class="btn ghost" type="button" data-close>Tutup</button><button class="btn ghost" type="button" id="cpMore">Catat lagi</button><a class="btn" href="#/peluang/' + j.item.id + '" id="cpOpen">Buka peluang</a></div>');
        $("cpMore").onclick = () => capture(); $("cpOpen").onclick = () => K.closeModal();
        if (location.hash.indexOf("#/peluang") === 0 && !location.hash.match(/OPP-/)) K.route(true);
      });
    };
  }
  K.capture = capture;
  /* one button on every page: in the top bar on wide screens, floating above the tab bar on phones */
  function mountButtons() {
    if ($("capBtn")) { $("capBtn").hidden = false; $("capBtn").innerHTML = ic("plus") + "<span>Catat peluang</span>"; $("capBtn").onclick = () => capture(); }
    if (!$("capFab")) {
      const b = document.createElement("button"); b.id = "capFab"; b.className = "cap-fab"; b.type = "button"; b.setAttribute("aria-label", "Catat peluang");
      b.innerHTML = ic("plus") + "<span>Peluang</span>"; b.onclick = () => capture(); document.body.appendChild(b);
    }
  }
  const fabVisible = () => { const f = $("capFab"); if (!f) return; f.hidden = !S.me || $("app").hidden || /^#\/naskah/.test(location.hash); };
  addEventListener("hashchange", fabVisible);
  /* shared from another app (installed Ruang Kerja) or opened with #/peluang/baru */
  function sharedIn() {
    const u = new URLSearchParams(location.search);
    if (u.get("title") || u.get("text") || u.get("url")) {
      const p = parsePost([u.get("title"), u.get("text"), u.get("url")].filter(Boolean).join("\n"));
      history.replaceState(null, "", location.pathname + "#/peluang");
      setTimeout(() => capture(p), 200);
    }
  }
  const boot = setInterval(() => { if (S.me && !$("app").hidden) { clearInterval(boot); mountButtons(); fabVisible(); sharedIn(); } }, 300);

  /* ============================================================
     LIST PAGE  #/peluang  (papan, daftar, kalender, dasbor)
     ============================================================ */
  let view = "papan", term = "", mine = false, calM = "";
  K.pages.peluang = (v, sub, q) => {
    if (sub && sub.indexOf("OPP-") === 0) return detail(v, sub);
    K.hold = null;
    if (sub === "baru") { history.replaceState(null, "", "#/peluang"); setTimeout(() => capture(), 60); }
    K.setTop("Peluang dan proposal");
    const VIEWS = [["papan", "board", "Papan"], ["daftar", "list", "Daftar"], ["kalender", "cal", "Kalender"], ["dasbor", "dash", "Dasbor"]];
    v.innerHTML = '<div class="toolbar"><div class="seg opp-views" role="group" aria-label="Tampilan">' + VIEWS.map(([k, i, l]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (k === view) + '">' + ic(i) + l + "</button>").join("") + "</div>" +
      '<input class="in grow" id="oQ" type="search" placeholder="Cari judul, nomor, atau pemberi dana" value="' + esc(term) + '" aria-label="Cari"><label class="check small"><input type="checkbox" id="oMine"' + (mine ? " checked" : "") + ">Yang melibatkan saya</label>" +
      '<button class="btn" type="button" id="oNew">' + ic("plus") + "Catat peluang</button></div><div id=\"oBody\"></div>";
    v.querySelectorAll("[data-v]").forEach(b => (b.onclick = () => { view = b.dataset.v; K.pages.peluang(v, "", q); }));
    $("oQ").oninput = e => { term = e.target.value; draw(); };
    $("oMine").onchange = e => { mine = e.target.checked; draw(); };
    $("oNew").onclick = () => capture();
    const draw = () => {
      const list = (S.peluang || []).filter(o => (!mine || o.team.includes(S.me.id)) && (!term || [o.number, o.title, o.funder].join(" ").toLowerCase().includes(term.toLowerCase())));
      const body = $("oBody");
      if (view === "papan") board(body, list); else if (view === "daftar") table(body, list); else if (view === "kalender") calendar(body, list); else dashboard(body, list);
    };
    draw();
  };
  const card = o => '<a class="card opp-card" href="#/peluang/' + o.id + '"><span class="t"><span>' + esc(o.title) + "</span></span>" +
    '<span class="labs"><span class="chip lab">' + esc(o.number) + "</span>" + (o.funder ? '<span class="chip lab">' + esc(o.funder) + "</span>" : "") + lock(o) + "</span>" +
    '<span class="f"><span class="ic">' + o.team.slice(0, 4).map(u => K.avatar(u, "sm")).join("") + (o.ideas ? "<span>" + ic("chat") + o.ideas + "</span>" : "") + (o.scores ? "<span>" + ic("check") + nf(o.score, 1) + "</span>" : "") + "</span>" +
    (OPEN.includes(o.stage) && !["diajukan", "klarifikasi"].includes(o.stage) ? K.dueBadge(o.deadline, false) : stageChip(o)) + "</span></a>";
  function board(el, list) {
    const closed = list.filter(o => !OPEN.includes(o.stage)).sort((a, b) => String(b.updated).localeCompare(String(a.updated))).slice(0, 30);
    el.innerHTML = list.length ? '<div class="board opp-board">' + STAGES.map(([s, l]) => { const it = list.filter(o => o.stage === s).sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
      return '<section class="col" aria-label="' + l + '"><div class="col-h"><b style="--c:' + (AFTER_GO.includes(s) ? "var(--s-dikerjakan)" : "var(--s-belum)") + '">' + l + '</b><span class="n">' + it.length + "</span></div>" + it.map(card).join("") + "</section>"; }).join("") +
      '<section class="col" aria-label="Selesai"><div class="col-h"><b style="--c:var(--s-selesai)">Hasil</b><span class="n">' + closed.length + "</span></div>" + closed.map(card).join("") + "</section></div>"
      : '<div class="panel empty"><strong>Belum ada peluang</strong>Tekan Catat peluang setiap kali menemukan call. Cukup judul, tautan, dan tenggat.</div>';
  }
  function table(el, list) {
    const rows = list.slice().sort((a, b) => (OPEN.includes(b.stage) - OPEN.includes(a.stage)) || (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    el.innerHTML = rows.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Peluang</th><th>Tahap</th><th class="sm-hide">Pemberi dana</th><th class="r sm-hide">Nilai</th><th>Tenggat</th></tr></thead><tbody>' +
      rows.map(o => '<tr class="click" data-id="' + o.id + '"><td class="wrap sm-full"><b>' + esc(o.title) + '</b><br><span class="small muted">' + esc(o.number) + (o.kind ? ", " + esc(KIND_L[o.kind]) : "") + "</span> " + lock(o) + "</td><td>" + stageChip(o) +
        '</td><td class="sm-hide">' + esc(o.funder || "") + '</td><td class="r sm-hide money">' + (o.value ? money(o.value, o.currency) : "") + "</td><td>" + (o.deadline ? (OPEN.includes(o.stage) ? K.dueBadge(o.deadline, false) : esc(K.fmtDate(o.deadline))) : "") + "</td></tr>").join("") + "</tbody></table></div>"
      : '<div class="panel empty">Tidak ada peluang yang cocok.</div>';
    el.querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => { location.hash = "#/peluang/" + tr.dataset.id; }));
  }
  function calendar(el, list) {
    const ym = calM || S.today.slice(0, 7), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    const first = new Date(Date.UTC(y, m - 1, 1)), days = new Date(Date.UTC(y, m, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    const items = list.filter(o => o.deadline && o.deadline.slice(0, 7) === ym);
    const cells = Math.ceil((lead + days) / 7) * 7;
    let grid = '<div class="ocal">' + ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => '<b class="h">' + d + "</b>").join("");
    for (let i = 0; i < cells; i++) {
      const d = i - lead + 1, ds = d >= 1 && d <= days ? ym + "-" + two(d) : "", its = ds ? items.filter(o => o.deadline === ds) : [];
      grid += '<div class="c' + (ds ? "" : " off") + (ds === S.today ? " td" : "") + '">' + (ds ? "<i>" + d + "</i>" : "") + its.map(o => '<a href="#/peluang/' + o.id + '" class="ev ' + (OPEN.includes(o.stage) ? "" : "done") + '" title="' + esc(o.title) + '">' + esc(o.title) + "</a>").join("") + "</div>";
    }
    grid += "</div>";
    const upcoming = list.filter(o => o.deadline && o.deadline >= S.today && OPEN.includes(o.stage)).sort((a, b) => a.deadline.localeCompare(b.deadline));
    el.innerHTML = '<div class="toolbar" style="margin-bottom:10px"><button class="icon-btn" type="button" id="cPrev" aria-label="Bulan sebelumnya">' + ic("back") + '</button><b style="min-width:150px;text-align:center">' + K.MONTHS_L[m - 1] + " " + y +
      '</b><button class="icon-btn" type="button" id="cNext" aria-label="Bulan berikutnya" style="transform:scaleX(-1)">' + ic("back") + '</button><button class="btn ghost small" type="button" id="cNow">Bulan ini</button></div>' +
      '<div class="panel pad ocal-wrap">' + grid + "</div>" +
      '<section class="sec"><div class="sec-h"><h2>Tenggat terdekat</h2></div><div class="panel">' + (upcoming.length ? upcoming.slice(0, 12).map(o => '<a class="trow" href="#/peluang/' + o.id + '" style="text-decoration:none;color:inherit"><span class="nic">' + ic("opp") + '</span><span style="min-width:0"><span class="t">' + esc(o.title) + '</span><span class="p">' + esc(K.fmtDate(o.deadline)) + ", " + esc(STAGE_L[o.stage]) + "</span></span>" + K.dueBadge(o.deadline, false) + "</a>").join("") : '<div class="empty">Tidak ada tenggat terbuka.</div>') + "</div></section>";
    const shift = n => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); calM = d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1); calendar(el, list); };
    $("cPrev").onclick = () => shift(-1); $("cNext").onclick = () => shift(1); $("cNow").onclick = () => { calM = ""; calendar(el, list); };
  }
  function dashboard(el, list) {
    const open = list.filter(o => OPEN.includes(o.stage)), won = list.filter(o => o.stage === "lolos"), lost = list.filter(o => o.stage === "tidak_lolos");
    const rate = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
    const kpi = (n, l, alert) => '<div class="kpi' + (alert ? " alert" : "") + '"><b class="money">' + n + "</b><span>" + l + "</span></div>";
    const group = (keyFn, label, head) => {
      const g = {}; list.forEach(o => { const k = keyFn(o) || "Belum diisi"; const x = g[k] || (g[k] = { n: 0, sub: 0, won: 0, lost: 0, val: 0 }); x.n++; if (["diajukan", "klarifikasi", "lolos", "tidak_lolos"].includes(o.stage)) x.sub++; if (o.stage === "lolos") { x.won++; x.val += idr(o); } if (o.stage === "tidak_lolos") x.lost++; });
      const rows = Object.entries(g).sort((a, b) => b[1].n - a[1].n);
      return '<section class="sec"><div class="sec-h"><h2>' + label + '</h2></div><div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>' + head + '</th><th class="r">Peluang</th><th class="r">Diajukan</th><th class="r">Lolos</th><th class="r sm-hide">Keberhasilan</th><th class="r sm-hide">Nilai lolos</th></tr></thead><tbody>' +
        rows.map(([k, x]) => '<tr><td class="wrap sm-full"><b>' + esc(k) + '</b></td><td class="r">' + x.n + '</td><td class="r">' + x.sub + '</td><td class="r">' + x.won + '</td><td class="r sm-hide">' + (x.won + x.lost ? Math.round(x.won / (x.won + x.lost) * 100) + "%" : "") + '</td><td class="r sm-hide money">' + (x.val ? "Rp" + nf(x.val) : "") + "</td></tr>").join("") + "</tbody></table></div></section>";
    };
    const byStage = STAGES.concat(CLOSED).map(([s, l]) => { const it = list.filter(o => o.stage === s); return { l, n: it.length, v: it.reduce((a, o) => a + idr(o), 0) }; }).filter(x => x.n);
    const maxN = Math.max(1, ...byStage.map(x => x.n));
    el.innerHTML = '<div class="kpis">' + kpi(open.length, "Peluang terbuka") + kpi(open.filter(o => AFTER_GO.includes(o.stage)).length, "Proposal sedang disusun atau diajukan") +
      kpi(won.length, "Proposal lolos") + kpi(rate + "%", "Tingkat keberhasilan") + kpi("Rp" + nf(open.reduce((a, o) => a + idr(o), 0)), "Nilai peluang terbuka (perkiraan)") + "</div>" +
      '<section class="sec"><div class="sec-h"><h2>Pipeline per tahap</h2><button class="btn ghost small" type="button" id="oXls">' + ic("down") + 'Unduh Excel</button></div><div class="panel pad">' +
      (byStage.length ? byStage.map(x => '<div class="absorb" style="cursor:default"><span class="t">' + esc(x.l) + '</span><span class="bar"><i style="width:' + (x.n / maxN * 100).toFixed(1) + '%"></i></span><span class="small muted">' + x.n + " peluang" + (x.v ? ", Rp" + nf(x.v) : "") + "</span></div>").join("") : '<div class="empty">Belum ada data.</div>') + "</div></section>" +
      group(o => o.funder, "Hasil per pemberi dana", "Pemberi dana") + group(o => fieldName(o.service), "Hasil per bidang", "Bidang") +
      '<p class="small muted">Nilai dalam rupiah memakai kurs yang diisi pada anggaran tiap proposal.</p>';
    $("oXls").onclick = () => exportXlsx(list);
  }
  function exportXlsx(list) {
    if (!K.xlsx) { K.toast("Modul Excel belum dimuat.", true); return; }
    const H = a => a.map(v => ({ v, s: "h" })), M = n => ({ v: Math.round(n || 0), s: "m" });
    const rows = [H(["Nomor", "Judul call", "Jenis", "Pemberi dana", "Bidang", "Layanan", "Tahap", "Tenggat", "Mata uang", "Nilai", "Kurs ke Rp", "Nilai (Rp)", "Skor rata-rata", "Penanggung jawab", "Tim", "Tautan", "Dicatat"])]
      .concat(list.map(o => [o.number, o.title, KIND_L[o.kind] || "", o.funder || "", fieldName(o.service), svcName(o.service), STAGE_L[o.stage], o.deadline || "", o.currency, o.value ? { v: o.value, s: "n" } : "", o.currency === "IDR" ? 1 : (o.rate || ""), M(idr(o)), o.score || "",
        K.uName(o.lead_uid), o.team.map(K.uName).join(", "), o.link || "", String(o.created).slice(0, 10)]));
    K.xlsx("Pipeline-peluang-CHARIS-" + S.today + ".xlsx", [{ name: "Pipeline", widths: [14, 48, 22, 24, 26, 34, 24, 12, 9, 14, 11, 16, 9, 20, 34, 40, 11], rows, freeze: 1 }]);
    K.toast("Pipeline diunduh.");
  }

  /* ============================================================
     DETAIL PAGE  #/peluang/OPP-...
     ============================================================ */
  let D = null, posList = null;
  async function detail(v, id) {
    K.setTop("Peluang", "#/peluang");
    if (!D || D.id !== id) v.innerHTML = '<p class="muted">Memuat peluang</p>';
    K.hold = () => location.hash.indexOf("#/peluang/" + id) === 0;
    let j; try { j = await K.api("oppGet", { id }); } catch (e) { v.innerHTML = '<div class="panel empty">' + esc(e.message) + "</div>"; return; }
    const keepTab = D && D.id === id ? D.tab : null;
    D = Object.assign(j, { id, tab: keepTab || (AFTER_GO.includes(j.item.stage) ? "proposal" : OPEN.includes(j.item.stage) ? "ide" : "hasil") });
    const i = S.peluang.findIndex(x => x.id === id); if (i >= 0) S.peluang[i] = j.item; else S.peluang.push(j.item);
    render(v);
  }
  const reload = () => detail($("view"), D.id);
  function render(v) {
    const o = D.item, edit = D.can_edit;
    const step = STAGES.map(([s, l], i) => { const idx = OPEN.indexOf(o.stage), cls = !OPEN.includes(o.stage) ? "past" : i < idx ? "past" : ""; return '<button type="button" data-s="' + s + '" class="' + cls + '"' + (s === o.stage ? ' aria-current="step"' : "") + (edit && OPEN.includes(o.stage) ? "" : " disabled") + ">" + l + "</button>"; }).join("");
    const acts = [];
    if (D.can_decide && ["masuk", "brainstorm", "keputusan"].includes(o.stage)) acts.push('<button class="btn" type="button" data-a="decide">Catat keputusan tim</button>');
    if (D.can_decide && AFTER_GO.includes(o.stage)) acts.push('<button class="btn' + (["diajukan", "klarifikasi"].includes(o.stage) ? "" : " ghost") + '" type="button" data-a="result">Catat hasil</button>');
    if (o.project_id && D.project) acts.push('<a class="btn ghost" href="#/proyek/' + o.project_id + '">' + ic("proj") + (o.stage === "lolos" ? "Buka proyek" : "Ruang kerja proposal") + "</a>");
    if (o.link) acts.push('<a class="btn ghost" href="' + esc(o.link) + '" target="_blank" rel="noopener">' + ic("link") + "Buka call</a>");
    if (o.project_id || !OPEN.includes(o.stage)) acts.push('<button class="btn ghost" type="button" data-a="copy">Salin ke call lain</button>');
    if (edit) acts.push('<button class="btn ghost" type="button" data-a="edit">' + ic("edit") + "Ubah info</button>");
    const TABS = [["ide", "Brainstorming"], ["proposal", "Proposal"], ["anggaran", "Anggaran"], ["hasil", "Keputusan dan hasil"]];
    v.innerHTML = '<div class="opp-head"><div class="nk-meta"><span class="chip lab">' + esc(o.number) + "</span>" + stageChip(o) + lock(o) + (o.kind ? '<span class="chip lab">' + esc(KIND_L[o.kind]) + "</span>" : "") + "</div>" +
      '<h1 class="nk-title">' + esc(o.title) + "</h1>" +
      '<dl class="opp-facts"><div><dt>Tenggat</dt><dd>' + (o.deadline ? esc(K.fmtDate(o.deadline)) + " " + (OPEN.includes(o.stage) && !["diajukan", "klarifikasi"].includes(o.stage) ? K.dueBadge(o.deadline, false) : "") : "Belum diisi") + "</dd></div>" +
      "<div><dt>Pemberi dana</dt><dd>" + esc(o.funder || "Belum diisi") + "</dd></div><div><dt>Nilai</dt><dd>" + (o.value ? money(o.value, o.currency) + (o.currency !== "IDR" && o.rate ? '<br><span class="small muted">sekitar Rp' + nf(idr(o)) + "</span>" : "") : "Belum diisi") + "</dd></div>" +
      "<div><dt>Penanggung jawab</dt><dd>" + esc(K.uName(o.lead_uid)) + "</dd></div><div><dt>Tim</dt><dd class=\"opp-team\">" + o.team.map(u => K.avatar(u, "sm")).join("") + '<span class="small muted">' + o.team.length + " orang</span></dd></div>" +
      (o.service ? "<div><dt>Layanan</dt><dd>" + esc(svcName(o.service)) + "</dd></div>" : "") + "</dl>" +
      '<div class="stepper opp-step" style="--n:' + STAGES.length + '">' + step + "</div>" + '<div class="nk-acts">' + acts.join("") + "</div></div>" +
      '<nav class="tabs" aria-label="Bagian peluang">' + TABS.map(([k, l]) => '<a href="#" data-tab="' + k + '"' + (k === D.tab ? ' aria-current="page"' : "") + ">" + l + "</a>").join("") + '</nav><div id="oTab"></div>' +
      '<section class="sec panel pad" style="margin-top:18px">' + K.COMMENTS_HTML + "</section>";
    v.querySelectorAll("[data-tab]").forEach(a => (a.onclick = e => { e.preventDefault(); D.tab = a.dataset.tab; render(v); }));
    v.querySelectorAll(".opp-step [data-s]").forEach(b => (b.onclick = () => K.run(b, async () => { await K.api("oppStage", { id: o.id, stage: b.dataset.s }); K.toast("Tahap: " + STAGE_L[b.dataset.s]); await reload(); })));
    v.querySelectorAll("[data-a]").forEach(b => (b.onclick = () => ({ decide: decideModal, result: resultModal, copy: copyModal, edit: editModal })[b.dataset.a]()));
    ({ ide: tabIdeas, proposal: tabProposal, anggaran: tabBudget, hasil: tabResult })[D.tab]($("oTab"));
    K.mountComments(o.id, o.team);
  }

  /* ---------- brainstorming: idea cards with votes, discussion sheet, feasibility scores ---------- */
  function tabIdeas(el) {
    const o = D.item, b = D.brief || {}, my = D.my_score || {};
    const avg = k => D.scores.length ? D.scores.reduce((a, s) => a + s[k], 0) / D.scores.length : 0;
    el.innerHTML = '<div class="grid2 opp-grid"><section class="sec"><div class="sec-h"><h2>Ide dari tim</h2></div><form class="idea-add" id="iF"><textarea class="in" id="iT" rows="2" placeholder="Tulis satu ide, misalnya pendekatan, mitra, atau sudut pandang"></textarea><button class="btn" type="submit">Tambah ide</button></form>' +
      '<div class="ideas">' + (D.ideas.length ? D.ideas.map(i => '<div class="idea"><p>' + esc(i.text) + '</p><div class="idea-f">' + K.avatar(i.uid, "sm") + '<span class="small muted">' + esc(K.uName(i.uid)) + '</span><button class="vote' + (i.voted ? " on" : "") + '" type="button" data-vote="' + i.id + '" aria-pressed="' + i.voted + '">' + ic("check") + i.votes + "</button>" +
        (i.uid === S.me.id || D.can_decide ? '<button class="icon-btn" type="button" data-del="' + i.id + '" aria-label="Hapus ide">' + ic("trash") + "</button>" : "") + "</div></div>").join("") : '<p class="muted small">Belum ada ide. Mulai dengan satu ide singkat.</p>') + "</div></section>" +
      '<section class="sec"><div class="sec-h"><h2>Skor kelayakan</h2><span class="small muted">1 rendah sampai 5 tinggi</span></div><form class="panel pad" id="sF"><div class="score-grid">' +
      CRIT.map(([k, l]) => '<label class="field"><span>' + l + '</span><select class="in" id="s_' + k + '">' + [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + ((my[k] || 3) === n ? " selected" : "") + ">" + n + "</option>").join("") + "</select></label>").join("") +
      '</div><label class="field" style="margin-top:10px"><span>Catatan (opsional)</span><input class="in" id="s_note" value="' + esc(my.note || "") + '"></label><div style="margin-top:10px"><button class="btn" type="submit">' + (D.my_score ? "Perbarui skor saya" : "Simpan skor saya") + "</button></div></form>" +
      (D.scores.length ? '<div class="panel" style="overflow:hidden;margin-top:12px"><table class="atable mini"><thead><tr><th>Anggota</th>' + CRIT.map(c => '<th class="r">' + c[1].split(" ")[0] + "</th>").join("") + '<th class="r">Rata-rata</th></tr></thead><tbody>' +
        D.scores.map(s => "<tr><td>" + esc(K.uName(s.uid)) + "</td>" + CRIT.map(c => '<td class="r">' + s[c[0]] + "</td>").join("") + '<td class="r"><b>' + nf((s.fit + s.win + s.capacity + s.value) / 4, 1) + "</b></td></tr>").join("") +
        '<tr class="tot"><td><b>Rata-rata tim</b></td>' + CRIT.map(c => '<td class="r">' + nf(avg(c[0]), 1) + "</td>").join("") + '<td class="r"><b>' + nf(o.score, 1) + "</b></td></tr></tbody></table></div>" : "") + "</section></div>" +
      '<section class="sec"><div class="sec-h"><h2>Lembar diskusi</h2>' + (D.can_edit ? "" : '<span class="small muted">Diisi oleh tim peluang</span>') + '</div><form class="panel pad" id="bF"><div class="props">' +
      BRIEF.map(([k, l]) => '<label class="field"><span>' + l + '</span><textarea class="in" id="b_' + k + '" rows="3"' + (D.can_edit ? "" : " disabled") + ">" + esc(b[k] || "") + "</textarea></label>").join("") + "</div>" +
      (D.can_edit ? '<div style="margin-top:12px"><button class="btn" type="submit">Simpan lembar diskusi</button></div>' : "") + "</form></section>";
    $("iF").onsubmit = e => { e.preventDefault(); const text = $("iT").value.trim(); if (!text) return; K.run(e.target.querySelector("button"), async () => { await K.api("oppIdea", { opp_id: o.id, text }); await reload(); }); };
    el.querySelectorAll("[data-vote]").forEach(btn => (btn.onclick = () => K.run(btn, async () => { await K.api("oppVote", { id: btn.dataset.vote }); await reload(); })));
    el.querySelectorAll("[data-del]").forEach(btn => (btn.onclick = () => K.confirmBox("Hapus ide ini?", "Hapus", async () => { await K.api("oppIdeaDelete", { id: btn.dataset.del }); await reload(); })));
    $("sF").onsubmit = e => { e.preventDefault(); const p = { opp_id: o.id, note: $("s_note").value }; CRIT.forEach(([k]) => (p[k] = Number($("s_" + k).value))); K.run(e.target.querySelector("button"), async () => { await K.api("oppScore", p); K.toast("Skor tersimpan."); await reload(); }); };
    if (D.can_edit) $("bF").onsubmit = e => { e.preventDefault(); const brief = {}; BRIEF.forEach(([k]) => (brief[k] = $("b_" + k).value)); K.run(e.target.querySelector("button"), async () => { await K.api("oppSave", { row: { id: o.id, brief } }); K.toast("Lembar diskusi tersimpan."); await reload(); }); };
  }
  /* ---------- proposal: workspace progress and implementation work plan ---------- */
  function tabProposal(el) {
    const o = D.item, p = D.project, wp = (D.workplan || []).map(w => Object.assign({}, w));
    el.innerHTML = (p ? '<div class="panel pad opp-ws"><div><p class="small muted" style="margin:0">Ruang kerja proposal</p><b>' + esc(p.name) + '</b><p class="small muted" style="margin:4px 0 0">' + p.done + " dari " + p.tasks + ' tugas selesai</p><div class="bar" style="margin-top:8px"><i style="width:' + (p.tasks ? p.done / p.tasks * 100 : 0) + '%"></i></div></div><a class="btn" href="#/proyek/' + p.id + '">Buka tugas proposal</a></div>'
      : '<div class="panel empty"><strong>Proposal belum disusun</strong>Setelah tim memutuskan lanjut, ruang kerja proposal dibuat otomatis lengkap dengan tugas standar: panduan call, concept note, kerangka logis, narasi, anggaran, CV dan surat dukungan, legalitas, telaah, dan pengiriman.</div>') +
      '<section class="sec"><div class="sec-h"><h2>Rencana kerja pelaksanaan</h2><span class="small muted">Menjadi milestone proyek bila lolos</span></div><form class="panel pad" id="wF"><div id="wRows" style="display:grid;gap:6px"></div>' +
      (D.can_edit ? '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost small" type="button" id="wAdd">' + ic("plus") + 'Tambah tahap</button><button class="btn small" type="submit">Simpan rencana kerja</button></div>' : "") + "</form></section>" +
      (o.notes ? '<section class="sec"><div class="sec-h"><h2>Catatan</h2></div><div class="panel pad"><p style="margin:0;white-space:pre-wrap">' + esc(o.notes) + "</p></div></section>" : "");
    const draw = () => {
      $("wRows").innerHTML = wp.length ? wp.map((w, i) => '<div class="wp-row"><input class="in" data-i="' + i + '" data-k="name" placeholder="Nama tahap, misalnya Asesmen awal" value="' + esc(w.name) + '"' + (D.can_edit ? "" : " disabled") + '><input class="in" type="date" data-i="' + i + '" data-k="due" value="' + esc(w.due || "") + '"' + (D.can_edit ? "" : " disabled") + ">" +
        (D.can_edit ? '<button class="icon-btn" type="button" data-x="' + i + '" aria-label="Hapus tahap">' + ic("close") + "</button>" : "") + "</div>").join("") : '<p class="small muted" style="margin:0">Belum ada tahap pelaksanaan.</p>';
      $("wRows").querySelectorAll("input").forEach(inp => (inp.oninput = () => { wp[inp.dataset.i][inp.dataset.k] = inp.value; }));
      $("wRows").querySelectorAll("[data-x]").forEach(b => (b.onclick = () => { wp.splice(Number(b.dataset.x), 1); draw(); }));
    };
    draw();
    if ($("wAdd")) $("wAdd").onclick = () => { wp.push({ name: "", due: "" }); draw(); };
    if (D.can_edit) $("wF").onsubmit = e => { e.preventDefault(); K.run(e.target.querySelector('[type="submit"]'), async () => { await K.api("oppSave", { row: { id: o.id, workplan: wp.filter(w => w.name.trim()) } }); K.toast("Rencana kerja tersimpan."); await reload(); }); };
  }
  /* ---------- budget: lines on the standard budget lines, any currency with the day's rate ---------- */
  async function tabBudget(el) {
    const o = D.item;
    if (!posList) { try { posList = ((await K.api("finLoad")).pos || []).filter(p => p.active && p.kind === "beban"); } catch (e) { posList = []; } }
    let lines = (D.budget || []).map(l => Object.assign({}, l)); if (!lines.length) lines.push({ pos_id: "", description: "", volume: 1, unit: "", price: 0 });
    let cur = o.currency || "IDR", rate = o.rate || (cur === "IDR" ? 1 : 0), rdate = D.rate_date || S.today;
    const dis = D.can_edit ? "" : " disabled";
    el.innerHTML = '<form class="panel pad" id="gF"><div class="props budget-head"><label class="field"><span>Mata uang</span><select class="in" id="gC"' + dis + ">" + CUR.map(c => "<option" + (c === cur ? " selected" : "") + ">" + c + "</option>").join("") + "</select></label>" +
      '<label class="field" id="gRateF"><span>Kurs: 1 <b id="gCl">' + esc(cur) + '</b> = Rp</span><input class="in" id="gR" inputmode="decimal" value="' + (rate ? String(rate).replace(".", ",") : "") + '" placeholder="Misalnya 15.850"' + dis + "></label>" +
      '<label class="field" id="gDateF"><span>Kurs per tanggal</span><input class="in" type="date" id="gD" value="' + esc(rdate) + '"' + dis + "></label></div>" +
      '<div class="rab-h small muted"><span>Pos anggaran</span><span>Uraian</span><span>Volume</span><span>Satuan</span><span>Harga satuan</span><span>Jumlah</span><span></span></div><div id="gRows"></div>' +
      (D.can_edit ? '<button class="btn ghost small" type="button" id="gAdd" style="margin-top:8px">' + ic("plus") + "Tambah baris</button>" : "") +
      '<div class="rab-tot"><span>Total</span><b id="gTot"></b><span class="small muted" id="gIdr"></span></div>' +
      (D.can_edit ? '<div style="margin-top:12px"><button class="btn" type="submit">Simpan anggaran</button></div>' : "") +
      '<p class="small muted" style="margin:12px 0 0">Bila proposal lolos, anggaran ini dijumlahkan per pos dalam rupiah dan menjadi anggaran proyek di menu Keuangan.</p></form>';
    const num = s => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
    const total = () => lines.reduce((a, l) => a + (Number(l.volume) || 0) * (Number(l.price) || 0), 0);
    const paintTot = () => { $("gTot").textContent = money(total(), cur); $("gIdr").textContent = cur === "IDR" ? "" : rate ? "sekitar Rp" + nf(total() * rate) + " dengan kurs " + nf(rate, 2) : "isi kurs untuk melihat nilai rupiah"; };
    const draw = () => {
      $("gRows").innerHTML = lines.map((l, i) => '<div class="rab-row"><select class="in" data-i="' + i + '" data-k="pos_id"' + dis + '><option value="">Pilih pos</option>' + posList.map(p => '<option value="' + p.id + '"' + (p.id === l.pos_id ? " selected" : "") + ">" + esc(p.code + " " + p.name) + "</option>").join("") + "</select>" +
        '<input class="in" data-i="' + i + '" data-k="description" placeholder="Uraian" value="' + esc(l.description || "") + '"' + dis + '><input class="in" data-i="' + i + '" data-k="volume" inputmode="decimal" placeholder="Volume" title="Volume" value="' + esc(l.volume == null ? 1 : l.volume) + '"' + dis + ' aria-label="Volume">' +
        '<input class="in" data-i="' + i + '" data-k="unit" placeholder="bulan, orang" value="' + esc(l.unit || "") + '"' + dis + ' aria-label="Satuan"><input class="in" data-i="' + i + '" data-k="price" inputmode="decimal" title="Harga satuan" value="' + (l.price ? nf(l.price, 2) : "") + '" placeholder="Harga satuan"' + dis + ' aria-label="Harga satuan">' +
        '<span class="rab-sum money">' + money((Number(l.volume) || 0) * (Number(l.price) || 0), cur) + "</span>" + (D.can_edit ? '<button class="icon-btn" type="button" data-x="' + i + '" aria-label="Hapus baris">' + ic("close") + "</button>" : "<span></span>") + "</div>").join("");
      $("gRows").querySelectorAll("[data-k]").forEach(inp => (inp.oninput = () => { const l = lines[inp.dataset.i], k = inp.dataset.k; l[k] = k === "volume" || k === "price" ? num(inp.value) : inp.value; inp.closest(".rab-row").querySelector(".rab-sum").textContent = money((Number(l.volume) || 0) * (Number(l.price) || 0), cur); paintTot(); }));
      $("gRows").querySelectorAll("[data-x]").forEach(b => (b.onclick = () => { lines.splice(Number(b.dataset.x), 1); draw(); }));
      paintTot();
    };
    const curUi = () => { $("gCl").textContent = cur; $("gRateF").hidden = cur === "IDR"; $("gDateF").hidden = cur === "IDR"; };
    $("gC").onchange = e => { cur = e.target.value; if (cur === "IDR") rate = 1; else if (rate === 1) { rate = 0; $("gR").value = ""; } curUi(); draw(); };
    $("gR").oninput = e => { rate = num(e.target.value); paintTot(); };
    $("gD").oninput = e => { rdate = e.target.value; };
    if ($("gAdd")) $("gAdd").onclick = () => { lines.push({ pos_id: "", description: "", volume: 1, unit: "", price: 0 }); draw(); };
    curUi(); draw();
    if (D.can_edit) $("gF").onsubmit = e => {
      e.preventDefault();
      if (cur !== "IDR" && !(rate > 0)) { K.toast("Isi kurs rupiah untuk " + cur + " pada hari ini.", true); $("gR").focus(); return; }
      K.run(e.target.querySelector('[type="submit"]'), async () => { await K.api("oppBudget", { id: o.id, currency: cur, rate, rate_date: rdate, lines }); K.toast("Anggaran tersimpan."); await reload(); });
    };
  }
  /* ---------- decision and result records ---------- */
  function tabResult(el) {
    const o = D.item, d = o.decision, r = o.result;
    el.innerHTML = '<div class="grid2 opp-grid"><section class="sec"><div class="sec-h"><h2>Keputusan tim</h2></div><div class="panel pad">' +
      (d ? '<p style="margin:0"><b>' + (d.d === "lanjut" ? "Lanjut menyusun proposal" : "Tidak dilanjutkan") + '</b></p><p class="small muted" style="margin:4px 0 0">Dicatat ' + esc(K.uName(d.by)) + ", " + esc(K.fmtTime(d.at)) + (d.voters ? ". Skor rata-rata " + nf(d.score, 1) + " dari " + d.voters + " penilai" : "") + "</p>" + (d.note ? '<p style="margin:10px 0 0;white-space:pre-wrap">' + esc(d.note) + "</p>" : "")
        : '<p class="muted" style="margin:0">Belum ada keputusan. Diskusikan di rapat tim, lalu catat hasilnya dengan tombol Catat keputusan tim.</p>') + "</div></section>" +
      '<section class="sec"><div class="sec-h"><h2>Hasil proposal</h2></div><div class="panel pad">' +
      (r ? '<p style="margin:0">' + stageChip({ stage: r.d }) + '</p><p class="small muted" style="margin:6px 0 0">Dicatat ' + esc(K.uName(r.by)) + ", " + esc(K.fmtTime(r.at)) + "</p>" + (r.reason ? '<p style="margin:10px 0 0"><b>Alasan utama:</b> ' + esc(r.reason) + "</p>" : "") +
        (r.feedback ? '<p style="margin:10px 0 0"><b>Umpan balik pemberi dana</b></p><p style="margin:4px 0 0;white-space:pre-wrap">' + esc(r.feedback) + "</p>" : "") + (r.note ? '<p style="margin:10px 0 0;white-space:pre-wrap">' + esc(r.note) + "</p>" : "")
        : '<p class="muted" style="margin:0">Hasil dicatat setelah pengumuman dari pemberi dana. Bila lolos, proyek, milestone, anggaran, draf kontrak, dan draf portofolio dibuat otomatis.</p>') +
      (o.parent_id ? '<p class="small" style="margin:12px 0 0">Disalin dari <a href="#/peluang/' + o.parent_id + '">peluang sebelumnya</a>.</p>' : "") + "</div></section></div>";
  }
  function teamPicker(sel) {
    const pool = S.users.filter(u => u.status === "aktif");
    return '<fieldset class="field full" style="border:0;padding:0;margin:12px 0 0"><span style="font-size:13px;font-weight:700;color:var(--muted)">Tim yang ditunjuk</span><div class="team-pick">' +
      pool.map(u => '<label class="check"><input type="checkbox" name="tm" value="' + u.id + '"' + (sel.includes(u.id) ? " checked" : "") + ">" + esc(u.name) + (u.role === "konsultan" ? ' <span class="small muted">(konsultan)</span>' : "") + "</label>").join("") + "</div></fieldset>";
  }
  const picked = () => [...document.querySelectorAll('[name="tm"]:checked')].map(x => x.value);
  function decideModal() {
    const o = D.item;
    K.openModal('<h3>Catat keputusan tim</h3><form id="dF" novalidate><p class="small muted" style="margin:-4px 0 12px">Hasil rapat tim. Skor rata-rata saat ini <b>' + (o.scores ? nf(o.score, 1) : "belum ada") + "</b>" + (o.scores ? " dari " + o.scores + " penilai" : "") + ".</p>" +
      '<div class="seg" role="radiogroup" aria-label="Keputusan" id="dSeg"><button type="button" data-d="lanjut" aria-pressed="true">Lanjut susun proposal</button><button type="button" data-d="tidak" aria-pressed="false">Tidak dilanjutkan</button></div>' +
      '<div id="dGo"><label class="check" style="margin-top:12px"><input type="checkbox" id="dEoi">Mulai dengan concept note atau EOI</label>' +
      '<label class="field" style="margin-top:10px"><span>Penanggung jawab</span><select class="in" id="dLead">' + S.users.filter(u => u.status === "aktif" && u.role !== "konsultan").map(u => '<option value="' + u.id + '"' + (u.id === o.lead_uid ? " selected" : "") + ">" + esc(u.name) + "</option>").join("") + "</select></label>" + teamPicker(o.team) +
      '<p class="small muted" style="margin:8px 0 0">Setelah lanjut, peluang ini hanya terlihat oleh tim yang ditunjuk dan pimpinan.</p></div>' +
      '<label class="field" style="margin-top:12px"><span>Catatan rapat</span><textarea class="in" id="dN" rows="3" placeholder="Alasan keputusan, pembagian peran, hal yang perlu dicek"></textarea></label>' +
      '<p class="err" id="dE"></p><div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">Simpan keputusan</button></div></form>');
    let dec = "lanjut";
    document.querySelectorAll("#dSeg [data-d]").forEach(b => (b.onclick = () => { dec = b.dataset.d; document.querySelectorAll("#dSeg [data-d]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); $("dGo").hidden = dec !== "lanjut"; }));
    $("dF").onsubmit = e => { e.preventDefault(); const team = picked(); if (dec === "lanjut" && !team.length) { $("dE").textContent = "Pilih minimal satu anggota tim."; return; }
      K.run(e.target.querySelector('[type="submit"]'), async () => { await K.api("oppDecide", { id: o.id, decision: dec, eoi: $("dEoi").checked, lead_uid: $("dLead").value, team: Array.from(new Set(team.concat([$("dLead").value]))), note: $("dN").value }); K.closeModal(); K.toast(dec === "lanjut" ? "Ruang kerja proposal dibuat." : "Peluang ditutup."); D.tab = dec === "lanjut" ? "proposal" : "hasil"; await K.reload(); await reload(); }); };
  }
  function resultModal() {
    const o = D.item, est = Math.round(idr(o));
    K.openModal('<h3>Catat hasil proposal</h3><form id="rF" novalidate><div class="seg" role="radiogroup" id="rSeg">' + [["lolos", "Lolos"], ["tidak_lolos", "Tidak lolos"], ["batal", "Batal"]].map(([k, l], i) => '<button type="button" data-r="' + k + '" aria-pressed="' + (i === 0) + '">' + l + "</button>").join("") + "</div>" +
      '<div id="rWin" class="props" style="margin-top:12px"><label class="field"><span>Mulai</span><input class="in" type="date" id="rS" value="' + S.today + '"></label><label class="field"><span>Selesai</span><input class="in" type="date" id="rEnd"></label>' +
      '<label class="field"><span>Nilai kontrak (Rp)</span><input class="in" id="rV" inputmode="numeric" value="' + (est ? nf(est) : "") + '"></label><label class="field"><span>Nomor kontrak (opsional)</span><input class="in" id="rNo"></label>' +
      '<p class="small muted full" style="margin:0">Akan dibuat otomatis: proyek berjalan, milestone dari rencana kerja, anggaran rupiah per pos, draf kontrak di Administrasi, dan draf portofolio di Alur konten.</p></div>' +
      '<div id="rLost" hidden><label class="field" style="margin-top:12px"><span>Alasan utama</span><select class="in" id="rWhy"><option value="">Pilih</option>' + REASONS.map(x => "<option>" + x + "</option>").join("") + '</select></label>' +
      '<label class="field" style="margin-top:10px"><span>Umpan balik dari pemberi dana</span><textarea class="in" id="rFb" rows="4" placeholder="Salin catatan reviewer bila ada"></textarea></label></div>' +
      '<label class="field" style="margin-top:12px"><span>Catatan</span><textarea class="in" id="rN" rows="2"></textarea></label><p class="err" id="rE"></p>' +
      '<div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">Simpan hasil</button></div></form>');
    let res = "lolos";
    $("rV").oninput = e => { const d = e.target.value.replace(/[^0-9]/g, ""); e.target.value = d ? nf(Number(d)) : ""; };
    document.querySelectorAll("#rSeg [data-r]").forEach(b => (b.onclick = () => { res = b.dataset.r; document.querySelectorAll("#rSeg [data-r]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); $("rWin").hidden = res !== "lolos"; $("rLost").hidden = res !== "tidak_lolos"; }));
    $("rF").onsubmit = e => { e.preventDefault(); if (res === "lolos" && $("rEnd").value && $("rEnd").value < $("rS").value) { $("rE").textContent = "Tanggal selesai tidak boleh sebelum tanggal mulai."; return; }
      K.run(e.target.querySelector('[type="submit"]'), async () => {
        const j = await K.api("oppResult", { id: o.id, result: res, start: $("rS").value, end: $("rEnd").value, value_idr: Number($("rV").value.replace(/\./g, "")) || 0, contract_no: $("rNo").value, reason: $("rWhy").value, feedback: $("rFb").value, note: $("rN").value });
        K.closeModal(); K.toast(res === "lolos" ? "Selamat. Proyek dan kelengkapannya sudah dibuat." : "Hasil tersimpan."); D.tab = "hasil"; await K.reload(); await reload();
        if (res === "lolos" && j.item.project_id) K.toast("Proyek siap: buka dari tombol Buka proyek.");
      }); };
  }
  function copyModal() {
    const o = D.item;
    K.openModal('<h3>Salin ke call lain</h3><form id="yF" novalidate><p class="small muted" style="margin:-4px 0 12px">Lembar diskusi, rencana kerja, anggaran, dan tim ikut disalin. Peluang baru mulai di tahap Keputusan tim.</p>' +
      '<label class="field"><span>Judul call baru</span><input class="in" id="yT" value="' + esc(o.title) + '"></label><label class="field" style="margin-top:10px"><span>Pemberi dana</span><input class="in" id="yP"></label>' +
      '<label class="field" style="margin-top:10px"><span>Tautan</span><input class="in" id="yL" inputmode="url" placeholder="https://"></label><label class="field" style="margin-top:10px"><span>Tenggat</span><input class="in" type="date" id="yD"></label>' +
      '<p class="err" id="yE"></p><div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">Buat salinan</button></div></form>');
    $("yF").onsubmit = e => { e.preventDefault(); if (!$("yT").value.trim()) { $("yE").textContent = "Tulis judul call."; return; }
      K.run(e.target.querySelector('[type="submit"]'), async () => { const j = await K.api("oppCopy", { id: o.id, title: $("yT").value, funder: $("yP").value, link: $("yL").value, deadline: $("yD").value }); K.closeModal(); await K.reload(); location.hash = "#/peluang/" + j.item.id; }); };
  }
  function editModal() {
    const o = D.item, svcOpts = [["", "Belum dipilih"]].concat((window.SERVICES || []).map(s => [s.key, s.id.t]));
    K.formModal("Ubah info peluang", [
      ["title", "Judul call", "text", null, { full: true }], ["link", "Tautan", "url", null, { full: true }], ["deadline", "Tenggat", "date"], ["kind", "Jenis peluang", "select", KINDS],
      ["funder", "Pemberi dana atau pemberi kerja", "text"], ["service", "Layanan CHARIS yang relevan", "select", svcOpts], ["visibility", "Siapa yang bisa melihat", "select", [["semua", "Semua tim CHARIS (untuk brainstorming)"], ["tim", "Hanya tim yang ditunjuk dan pimpinan"]]],
      ["notes", "Catatan", "textarea", null, { full: true, rows: 3 }]
    ], { title: o.title, link: o.link, deadline: o.deadline, kind: o.kind, funder: o.funder, service: o.service, visibility: o.visibility, notes: D.notes }, {
      extra: teamPicker(o.team), collect: () => ({ team: picked() }),
      validate: x => !x.title.trim() ? "Judul call wajib diisi." : x.link && !/^https:\/\//.test(x.link) ? "Tautan harus diawali https://" : "",
      save: async row => { row.id = o.id; await K.api("oppSave", { row }); K.toast("Info peluang disimpan."); await K.reload(); await reload(); },
      del: (S.me.role === "superadmin" || S.me.role === "direktur" || (o.created_by === S.me.id && !o.project_id)) ? async () => { await K.api("oppDelete", { id: o.id }); S.peluang = S.peluang.filter(x => x.id !== o.id); K.toast("Peluang dihapus."); location.hash = "#/peluang"; } : null,
      delConfirm: "Hapus peluang ini beserta ide, skor, dan anggarannya? Ruang kerja proposal (bila ada) tidak ikut terhapus."
    });
  }
})();
