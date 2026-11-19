/* CHARIS Ruang Kerja: content workflow (phase 3) and administration (phase 4). */
(function () {
  "use strict";
  const K = window.K; if (!K) return;
  const { S, esc, ic } = K;
  const $ = id => document.getElementById(id);

  /* ============================================================
     CONTENT WORKFLOW
     ============================================================ */
  const STAGES = [["draf", "Draf"], ["telaah", "Telaah internal"], ["tata_letak", "Tata letak dan grafik"], ["zenodo", "Unggah ke Zenodo"], ["terbit", "Terbit di web"], ["diseminasi", "Diseminasi"]];
  const STAGE_L = Object.fromEntries(STAGES);
  K.STAGE_L = STAGE_L;
  const TYPES = [["repositori", "Produk repositori"], ["berita", "Berita dan pengumuman"], ["portofolio", "Portofolio"]];
  const TYPE_L = Object.fromEntries(TYPES);
  /* news and portfolio updates skip the Zenodo step */
  const stagesFor = type => STAGES.filter(([k]) => type === "repositori" || k !== "zenodo");
  const canCreateK = () => K.seesAll() || S.me.role === "peneliti";
  const people = k => [...new Set([k.owner_uid].concat(Object.values(k.assignees || {})).filter(Boolean))];
  const canEditK = k => K.seesAll() || people(k).includes(S.me.id);
  let kType = "", kView = "papan";
  /* first name without academic titles: "Dr. Ayu Lestari" becomes "Ayu" */
  const shortName = n => { const w = String(n).split(/\s+/); return w.find(x => !/\.$/.test(x)) || w[0]; };

  K.pages.konten = (v, q) => {
    K.setTop("Alur konten");
    if (q.get("type")) kType = q.get("type");
    const list = S.konten.filter(k => !kType || k.type === kType);
    v.innerHTML = '<div class="toolbar"><div class="seg" role="group" aria-label="Jenis konten">' + [["", "Semua"]].concat(TYPES).map(([k, l]) => '<button type="button" data-t="' + k + '" aria-pressed="' + (k === kType) + '">' + l + "</button>").join("") + "</div>" +
      '<div class="seg" role="group" aria-label="Tampilan"><button type="button" data-v="papan" aria-pressed="' + (kView === "papan") + '">' + ic("board") + 'Papan</button><button type="button" data-v="daftar" aria-pressed="' + (kView === "daftar") + '">' + ic("list") + "Daftar</button>" +
      (K.seesAll() && K.renderWebView ? '<button type="button" data-v="web" aria-pressed="' + (kView === "web") + '">' + ic("web") + "Di website</button>" : "") + "</div>" +
      '<span style="flex:1"></span>' + (canCreateK() ? '<button class="btn" type="button" id="kNew">' + ic("plus") + "Konten baru</button>" : "") + "</div>" +
      '<p class="small muted" style="margin:-4px 0 14px">' + (kView === "web" ? "Semua berita, pengumuman, dan portofolio yang ada di website, dengan jumlah dibaca dan dibagikan." : "Alur: draf, telaah internal, tata letak dan grafik, unggah ke Zenodo (khusus produk repositori), terbit di web, lalu diseminasi. Berita, pengumuman, dan portofolio ditulis dan diterbitkan langsung dari sini.") + '</p><div id="kBody"></div>';
    v.querySelectorAll("[data-t]").forEach(b => (b.onclick = () => { kType = b.dataset.t; K.pages.konten(v, new URLSearchParams()); }));
    v.querySelectorAll("[data-v]").forEach(b => (b.onclick = () => { kView = b.dataset.v; K.pages.konten(v, new URLSearchParams()); }));
    if ($("kNew")) $("kNew").onclick = () => openKonten(null, { type: kType || "repositori" });
    const body = $("kBody");
    if (kView === "web" && K.renderWebView) { K.renderWebView(body); return; }
    const card = k => '<button class="card" type="button" data-k="' + k.id + '"><span class="t"><span class="pr pr-' + k.priority + '"></span><span>' + esc(k.title) + "</span></span>" +
      '<span class="labs"><span class="kchip ' + k.type + '">' + TYPE_L[k.type] + "</span>" + (K.webChip ? K.webChip(k) : "") + (k.ref_id ? '<span class="chip lab">' + esc(k.ref_id) + "</span>" : "") + "</span>" +
      '<span class="f"><span class="ic">' + K.avatar(K.whoNow(k), "sm") + '<span>' + esc(shortName(K.uName(K.whoNow(k)))) + "</span>" + (S.ccount[k.id] ? "<span>" + ic("chat") + S.ccount[k.id] + "</span>" : "") + "</span>" +
      (k.stage === "diseminasi" ? '<span class="due done">Selesai</span>' : K.dueBadge(k.due, false)) + "</span></button>";
    if (!list.length) { body.innerHTML = '<div class="panel empty"><strong>Belum ada konten di alur ini</strong>' + (canCreateK() ? "Tambahkan produk repositori, berita, atau pembaruan portofolio yang sedang disiapkan." : "Item yang melibatkan Anda akan muncul di sini.") + "</div>"; }
    else if (kView === "papan") {
      body.innerHTML = '<div class="board six">' + STAGES.map(([s, l]) => { const items = list.filter(k => k.stage === s).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
        return '<section class="col" aria-label="' + l + '"><div class="col-h"><b style="--c:' + (s === "diseminasi" ? "var(--s-selesai)" : s === "draf" ? "var(--s-belum)" : "var(--s-dikerjakan)") + '">' + l + '</b><span class="n">' + items.length + "</span></div>" + items.map(card).join("") + "</section>"; }).join("") + "</div>";
    } else {
      body.innerHTML = '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Judul</th><th>Jenis</th><th>Tahap</th><th>Giliran</th><th>Target</th></tr></thead><tbody>' +
        list.sort((a, b) => STAGES.findIndex(x => x[0] === a.stage) - STAGES.findIndex(x => x[0] === b.stage) || (a.due || "9999").localeCompare(b.due || "9999"))
          .map(k => '<tr class="click" data-k="' + k.id + '"><td class="wrap sm-full"><b>' + esc(k.title) + "</b>" + (k.ref_id ? '<br><span class="small muted">' + esc(k.ref_id) + "</span>" : "") + '</td><td class="sm-hide"><span class="kchip ' + k.type + '">' + TYPE_L[k.type] + "</span>" + (K.webChip ? " " + K.webChip(k) : "") + "</td><td>" + esc(STAGE_L[k.stage]) +
            '</td><td class="sm-hide">' + esc(K.uName(K.whoNow(k))) + "</td><td>" + (k.stage === "diseminasi" ? '<span class="due done">Selesai</span>' : K.dueBadge(k.due, false)) + "</td></tr>").join("") + "</tbody></table></div>";
    }
    body.querySelectorAll("[data-k]").forEach(el => (el.onclick = () => openKonten(el.dataset.k)));
  };

  function openKonten(id, preset) {
    let k = id ? S.konten.find(x => x.id === id) : null;
    if (id && !k) { K.toast("Item tidak ditemukan atau Anda tidak memiliki akses.", true); return; }
    const isNew = !k;
    k = JSON.parse(JSON.stringify(k || Object.assign({ type: "repositori", title: "", ref_id: "", stage: "draf", owner_uid: S.me.id, assignees: {}, due: "", priority: "sedang", notes: "", link: "", doi: "", project_id: "" }, preset || {})));
    const edit = isNew || canEditK(k);
    const dis = edit ? "" : " disabled";
    const pool = S.users.filter(u => u.status === "aktif" && u.role !== "konsultan" || people(k).includes(u.id));
    const userSel = (id, val) => '<select class="in" id="' + id + '"' + dis + '><option value="">Belum ditentukan</option>' + pool.map(u => '<option value="' + u.id + '"' + (u.id === val ? " selected" : "") + ">" + esc(u.name) + "</option>").join("") + "</select>";
    let dirty = false;
    const dr = $("drawer");
    const refOptions = () => (k.type === "repositori" ? S.repo.map(r => [r.id, r.title]) : k.type === "portofolio" ? S.portfolio.map(p => [p.id, p.title]) : []);
    dr.innerHTML = '<div class="dr-h"><span class="crumb">Alur konten' + (isNew ? ": item baru" : "") + "</span>" + (!isNew && (K.seesAll() || k.created_by === S.me.id) ? '<button class="icon-btn" id="kDel" type="button" aria-label="Hapus item">' + ic("trash") + "</button>" : "") +
      '<button class="icon-btn" id="kClose" type="button" aria-label="Tutup">' + ic("close") + "</button></div>" +
      '<div class="dr-b"><div><label class="sr-only" for="kTitle">Judul</label><textarea class="title-in" id="kTitle" rows="1" placeholder="Judul produk, berita, atau pembaruan"' + dis + ">" + esc(k.title) + "</textarea></div>" +
      (!isNew && K.WEB && K.WEB[k.type] ? '<div class="nk-box"><div style="min-width:0"><b>Naskah website</b><span class="small muted">' + (k.web_status === "tayang" ? "Tayang di website" + (k.pending ? ", ada perubahan yang belum tayang" : "") : k.web_status === "ditarik" ? "Ditarik dari website" : k.has_draft ? "Sedang ditulis, belum tayang" : "Belum ada naskah") + '</span></div><button class="btn small" type="button" id="kEd">' + ic("edit") + (k.has_draft ? "Buka editor" : "Tulis naskah") + "</button></div>" : "") +
      '<div><div class="dlabel"><span>Tahap</span>' + (k.due && k.stage !== "diseminasi" ? K.dueBadge(k.due, false) : "") + '</div><div class="stepper" id="kStep"></div></div>' +
      '<div class="props"><label class="field"><span>Jenis</span><select class="in" id="kType"' + dis + ">" + TYPES.map(([a, b]) => '<option value="' + a + '"' + (a === k.type ? " selected" : "") + ">" + b + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Kode atau ID terkait</span><input class="in" id="kRef" value="' + esc(k.ref_id) + '" list="kRefList" placeholder="mis. CHARIS-2026-008"' + dis + '><datalist id="kRefList"></datalist></label>' +
      '<label class="field"><span>Penanggung jawab utama</span>' + userSel("kOwner", k.owner_uid) + "</label>" +
      '<label class="field"><span>Target tahap saat ini</span><input class="in" type="date" id="kDue" value="' + esc(k.due) + '"' + dis + "></label>" +
      '<label class="field"><span>Prioritas</span><select class="in" id="kPrio"' + dis + ">" + K.PRIO.map(([a, b]) => '<option value="' + a + '"' + (a === k.priority ? " selected" : "") + ">" + b + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Proyek terkait (opsional)</span><select class="in" id="kProj"' + dis + '><option value="">Tidak ada</option>' + S.projects.map(p => '<option value="' + p.id + '"' + (p.id === k.project_id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + "</select></label>" +
      '<label class="field full" id="kDoiF"><span>DOI Zenodo</span><input class="in" id="kDoi" value="' + esc(k.doi) + '" placeholder="10.5281/zenodo.xxxxxxx"' + dis + "></label>" +
      '<label class="field full"><span>Tautan setelah terbit (https://)</span><input class="in" id="kLink" value="' + esc(k.link) + '" inputmode="url"' + dis + "></label></div>" +
      '<div><div class="dlabel"><span>Penanggung jawab tiap tahap</span></div><div class="props" id="kAss"></div></div>' +
      '<label class="field"><span>Catatan telaah dan revisi</span><textarea class="in" id="kNotes" placeholder="Masukan penelaah, daftar revisi, keputusan"' + dis + ">" + esc(k.notes) + "</textarea></label>" +
      (isNew ? "" : K.COMMENTS_HTML) + "</div>" +
      '<div class="dr-f"><span class="dirty-note" id="kDirty"></span><div style="display:flex;gap:8px;margin-left:auto"><button class="btn ghost" type="button" id="kCancel">' + (isNew ? "Batal" : "Tutup") + "</button>" +
      (edit ? '<button class="btn" type="button" id="kSave"' + (isNew ? "" : " hidden") + ">" + (isNew ? "Buat item" : "Simpan perubahan") + "</button>" : "") + "</div></div>";
    dr.hidden = false; $("scrim").hidden = false; document.body.style.overflow = "hidden";
    const title = $("kTitle"), grow = () => { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; }; grow(); title.addEventListener("input", grow);
    K.extDirty = () => dirty;
    const markDirty = () => { if (isNew) return; dirty = true; $("kDirty").textContent = "Ada perubahan yang belum disimpan"; if ($("kSave")) $("kSave").hidden = false; };
    function drawType() {
      const st = stagesFor(k.type);
      if (!st.find(s => s[0] === k.stage)) k.stage = st[0][0];
      const idx = st.findIndex(s => s[0] === k.stage);
      $("kStep").style.setProperty("--n", st.length);
      $("kStep").innerHTML = st.map(([s, l], i) => '<button type="button" data-s="' + s + '" class="' + (i < idx ? "past" : "") + '"' + (s === k.stage ? ' aria-current="step"' : "") + (edit ? "" : " disabled") + ">" + l + "</button>").join("");
      $("kStep").querySelectorAll("button").forEach(b => (b.onclick = async () => {
        k.stage = b.dataset.s; drawType();
        if (!isNew) await quick({ stage: k.stage }, "Tahap: " + STAGE_L[k.stage]);
      }));
      $("kAss").innerHTML = st.map(([s, l]) => '<label class="field"><span>' + l + "</span>" + userSel("kA_" + s, (k.assignees || {})[s] || "") + "</label>").join("");
      st.forEach(([s]) => $("kA_" + s).addEventListener("input", markDirty));
      $("kDoiF").hidden = k.type !== "repositori";
      $("kRefList").innerHTML = refOptions().map(([a, b]) => '<option value="' + esc(a) + '">' + esc(String(b || "").slice(0, 70)) + "</option>").join("");
    }
    drawType();
    $("kType").addEventListener("input", e => { k.type = e.target.value; drawType(); markDirty(); });
    ["kTitle", "kRef", "kOwner", "kDue", "kPrio", "kProj", "kDoi", "kLink", "kNotes"].forEach(i => $(i).addEventListener("input", markDirty));
    const collect = () => {
      const a = {}; stagesFor(k.type).forEach(([s]) => { const v = $("kA_" + s).value; if (v) a[s] = v; });
      return { type: k.type, title: $("kTitle").value.trim(), ref_id: $("kRef").value.trim(), owner_uid: $("kOwner").value, due: $("kDue").value, priority: $("kPrio").value,
        project_id: $("kProj").value, doi: $("kDoi").value.trim(), link: $("kLink").value.trim(), notes: $("kNotes").value, stage: k.stage, assignees: a };
    };
    const upsert = item => { const i = S.konten.findIndex(x => x.id === item.id); if (i >= 0) S.konten[i] = item; else S.konten.push(item); };
    async function quick(patch, msg) {
      try { const j = await K.api("kontenSave", { row: Object.assign({ id: k.id }, patch) }); upsert(j.item); Object.assign(k, j.item); K.toast(msg); K.buildNav(); K.route(true); }
      catch (e) { K.toast(e.message, true); }
    }
    if ($("kSave")) $("kSave").onclick = () => K.run($("kSave"), async () => {
      const row = collect();
      if (!row.title) { K.toast("Judul wajib diisi.", true); return; }
      if (row.link && !/^https:\/\//.test(row.link)) { K.toast("Tautan harus diawali https://", true); return; }
      if (!isNew) row.id = k.id;
      const j = await K.api("kontenSave", { row }); upsert(j.item);
      dirty = false; K.closeDrawer(true); K.toast(isNew ? "Item dibuat." : "Perubahan disimpan."); K.buildNav();
      if (isNew && K.WEB && K.WEB[j.item.type]) { location.hash = "#/naskah/" + j.item.id; return; }   /* news and portfolio: straight to writing */
      K.route(true);
    });
    $("kClose").onclick = () => K.closeDrawer(); $("kCancel").onclick = () => K.closeDrawer();
    if ($("kEd")) $("kEd").onclick = () => { K.closeDrawer(true); location.hash = "#/naskah/" + k.id; };
    if ($("kDel")) $("kDel").onclick = () => K.confirmBox("Hapus item ini beserta komentarnya?", "Hapus item", async () => {
      await K.api("kontenDelete", { id: k.id }); S.konten = S.konten.filter(x => x.id !== k.id); K.closeDrawer(true); K.toast("Item dihapus."); K.route(true);
    });
    if (!isNew) K.mountComments(k.id, people(k));
    if (isNew) setTimeout(() => title.focus(), 60);
  }
  K.openKonten = openKonten;

  /* ============================================================
     ADMINISTRATION
     ============================================================ */
  const CODES = [["SK", "Surat Keterangan"], ["SKEP", "Surat Keputusan"], ["ST", "Surat Tugas"], ["UND", "Undangan"], ["SP", "Surat Pengantar"], ["SPM", "Surat Permohonan"], ["SPK", "Surat Perintah Kerja"],
    ["PKS", "Perjanjian Kerja Sama"], ["MOU", "Nota Kesepahaman (MoU)"], ["BA", "Berita Acara"], ["SE", "Surat Edaran"], ["SKU", "Surat Kuasa"], ["PENG", "Pengumuman"], ["LL", "Lainnya"]];
  const CODE_L = Object.fromEntries(CODES);
  const rupiah = n => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n || 0));
  const role = () => S.me.role;
  const approver = () => ["direktur", "superadmin"].includes(role());
  const TABS = [
    ["surat", "Surat", () => K.seesAll() || role() === "bendahara"],
    ["kontrak", "Kontrak dan MoU", () => K.seesAll() || role() === "bendahara"],
    ["rapat", "Rapat dan daftar hadir", () => role() !== "konsultan"],
    ["cuti", "Cuti", () => role() !== "konsultan"],
    ["timesheet", "Timesheet", () => true],
    ["aset", "Inventaris aset", () => K.seesAll() || role() === "bendahara"]
  ];
  const cache = {};
  const projName = id => (K.proj(id) || {}).name || "";

  K.pages.admin = async (v, tab, q) => {
    const tabs = TABS.filter(t => t[2]());
    if (!tabs.find(t => t[0] === tab)) tab = tabs[0][0];
    K.setTop("Administrasi");
    v.innerHTML = '<nav class="tabs" aria-label="Administrasi">' + tabs.map(([k, l]) => '<a href="#/administrasi/' + k + '"' + (k === tab ? ' aria-current="page"' : "") + ">" + l +
      (k === "cuti" && approver() && S.summary.leave_pending ? '<span class="cnt">' + S.summary.leave_pending + "</span>" : "") + "</a>").join("") + '</nav><div id="aBody"><p class="muted">Memuat data</p></div>';
    /* show the copy we already have, ask the server only when something changed */
    const c = cache[tab], hash = location.hash;
    if (c && c.me === S.me.id) { RENDER[tab]($("aBody"), c.rows, q); if (c.rev === S.rev) return; q = new URLSearchParams(q); q.delete("id"); }
    try {
      const rev = S.rev, j = await K.api("regList", { reg: tab });
      cache[tab] = { rows: j.rows, rev, me: S.me.id };
      if (!$("aBody") || location.hash !== hash) return;
      RENDER[tab]($("aBody"), j.rows, q);
    } catch (e) { if ($("aBody") && !c) $("aBody").innerHTML = '<div class="panel empty">' + esc(e.message) + "</div>"; else K.toast(e.message, true); }
  };
  const reload = () => K.route(true);

  /* generic form: [key, label, type, options, extra] */
  function field(f, val) {
    const [key, label, type, opts, x] = f, id = "f_" + key, full = x && x.full ? " full" : "", help = x && x.help ? '<small class="muted">' + esc(x.help) + "</small>" : "";
    val = val == null ? "" : val;
    let input;
    if (type === "textarea") input = '<textarea class="in" id="' + id + '"' + (x && x.rows ? ' rows="' + x.rows + '"' : "") + ">" + esc(val) + "</textarea>";
    else if (type === "select") input = '<select class="in" id="' + id + '">' + opts.map(([a, b]) => '<option value="' + esc(a) + '"' + (String(a) === String(val) ? " selected" : "") + ">" + esc(b) + "</option>").join("") + "</select>";
    else if (type === "user") input = '<select class="in" id="' + id + '"><option value="">Tidak ada</option>' + S.users.filter(u => u.status === "aktif" || u.id === val).map(u => '<option value="' + u.id + '"' + (u.id === val ? " selected" : "") + ">" + esc(u.name) + "</option>").join("") + "</select>";
    else if (type === "project") input = '<select class="in" id="' + id + '"><option value="">Tidak terkait proyek</option>' + S.projects.map(p => '<option value="' + p.id + '"' + (p.id === val ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + "</select>";
    else if (type === "money") input = '<input class="in" id="' + id + '" inputmode="numeric" value="' + (val ? new Intl.NumberFormat("id-ID").format(val) : "") + '" placeholder="0">';
    else input = '<input class="in" id="' + id + '" type="' + (type === "date" ? "date" : type === "number" ? "number" : "text") + '"' + (type === "url" ? ' inputmode="url" placeholder="https://"' : "") + (type === "number" ? ' step="0.25" min="0"' : "") + ' value="' + esc(val) + '">';
    return '<label class="field' + full + '"><span>' + esc(label) + "</span>" + input + help + "</label>";
  }
  const readField = f => { const el = $("f_" + f[0]); if (!el) return undefined; const v = el.value; return f[2] === "money" ? Number(v.replace(/\./g, "").replace(",", ".")) || 0 : v; };
  function formModal(title, fields, row, opts) {
    opts = opts || {};
    K.openModal("<h3>" + esc(title) + '</h3><form id="aForm" novalidate>' + (opts.top || "") + '<div class="props">' + fields.map(f => field(f, row[f[0]])).join("") + "</div>" + (opts.extra || "") +
      '<p class="err" id="aErr"></p><div class="m-acts">' + (opts.del ? '<button class="btn danger" type="button" id="aDel" style="margin-right:auto">' + esc(opts.delLabel || "Hapus") + "</button>" : "") +
      '<button class="btn ghost" type="button" data-close>' + (opts.readonly ? "Tutup" : "Batal") + "</button>" + (opts.readonly ? "" : '<button class="btn" type="submit">' + esc(opts.ok || "Simpan") + "</button>") + "</div></form>");
    document.querySelectorAll('#aForm [id^="f_"]').forEach(el => { if (el.dataset && el.closest) el.toggleAttribute("disabled", !!opts.readonly); });
    document.querySelectorAll('#aForm input[inputmode="numeric"]').forEach(el => el.addEventListener("input", () => { const n = el.value.replace(/[^0-9]/g, ""); el.value = n ? new Intl.NumberFormat("id-ID").format(Number(n)) : ""; }));
    if (opts.after) opts.after();
    $("aForm").onsubmit = async e => {
      e.preventDefault();
      const out = {}; fields.forEach(f => { const v = readField(f); if (v !== undefined) out[f[0]] = v; });
      if (opts.collect) Object.assign(out, opts.collect());
      const err = opts.validate && opts.validate(out); if (err) { $("aErr").textContent = err; return; }
      if (row.id) out.id = row.id;
      await K.run(e.target.querySelector('[type="submit"]'), async () => { await opts.save(out); K.closeModal(); });
    };
    if ($("aDel")) $("aDel").onclick = () => K.confirmBox(opts.delConfirm || "Hapus data ini?", opts.delLabel || "Hapus", opts.del);
  }
  Object.assign(K, { formModal, field, readField });
  const saveReg = (reg, msg) => async row => { const j = await K.api("regSave", { reg, row }); K.toast(msg || "Tersimpan."); reload(); return j; };
  const delReg = (reg, id) => async () => { await K.api("regDelete", { reg, id }); K.toast("Dihapus."); reload(); };
  const header = (lead, btn) => '<div class="sec-h"><p class="muted" style="max-width:70ch">' + lead + "</p>" + (btn || "") + "</div>";
  const searchBar = (ph, extra) => '<div class="filters" style="margin-top:0"><input class="in grow" id="aQ" type="search" placeholder="' + esc(ph) + '" aria-label="Cari">' + (extra || "") + "</div>";
  const matches = (q, ...parts) => !q || parts.join(" ").toLowerCase().includes(q.toLowerCase());
  const openFromQuery = (rows, q, fn) => { const id = q.get("id"); if (id) { const r = rows.find(x => x.id === id); if (r) setTimeout(() => fn(r), 30); } };

  const RENDER = {};

  /* ---------- letters ---------- */
  RENDER.surat = (el, rows, q) => {
    const can = K.seesAll();
    let dir = "keluar", term = "", code = "";
    el.innerHTML = header("Nomor surat keluar dibuat otomatis dengan format nomor urut/CHARIS/kode/bulan/tahun, misalnya 012/CHARIS/ST/XI/2026. Surat masuk mendapat nomor agenda.",
      can ? '<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="sIn" type="button">' + ic("plus") + 'Surat masuk</button><button class="btn" id="sOut" type="button">' + ic("plus") + "Surat keluar</button></span>" : "") +
      '<div class="toolbar"><div class="seg" role="group"><button type="button" data-d="keluar">Surat keluar</button><button type="button" data-d="masuk">Surat masuk</button></div>' +
      '<select class="in" id="sCode"><option value="">Semua jenis</option>' + CODES.map(([a, b]) => '<option value="' + a + '">' + a + ": " + b + "</option>").join("") + '</select><input class="in grow" id="aQ" type="search" placeholder="Cari perihal, nomor, atau pihak"></div><div id="sList"></div>';
    const draw = () => {
      el.querySelectorAll("[data-d]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.d === dir)));
      const list = rows.filter(r => r.direction === dir && (!code || r.code === code) && matches(term, r.number, r.subject, r.party, r.ref_number)).sort((a, b) => (b.seq - a.seq) || String(b.date).localeCompare(a.date));
      $("sList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Nomor</th><th>Tanggal</th><th>Perihal</th><th>' + (dir === "keluar" ? "Kepada" : "Dari") + "</th><th>Jenis</th></tr></thead><tbody>" +
        list.map(r => '<tr class="click" data-id="' + r.id + '"><td class="mono">' + esc(r.number) + "</td><td>" + esc(K.fmtDate(r.date)) + '</td><td class="wrap sm-full"><b>' + esc(r.subject) + "</b>" + (r.ref_number ? '<br><span class="small muted">No. pengirim: ' + esc(r.ref_number) + "</span>" : "") + (r.file_url ? ' <a href="' + esc(r.file_url) + '" target="_blank" rel="noopener" class="small">Berkas</a>' : "") +
          '</td><td class="sm-hide">' + esc(r.party) + '</td><td class="sm-hide"><span class="chip lab" title="' + esc(CODE_L[r.code] || "") + '">' + esc(r.code) + "</span></td></tr>").join("") + "</tbody></table></div>"
        : '<div class="panel empty"><strong>Belum ada surat ' + dir + "</strong>" + (can ? "Catat surat pertama dengan tombol di atas." : "") + "</div>";
      $("sList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = e => { if (e.target.closest("a")) return; form(rows.find(r => r.id === tr.dataset.id)); }));
    };
    const form = r => {
      r = r || { direction: dir, date: S.today, code: "ST" };
      const isOut = r.direction === "keluar";
      formModal(r.id ? (isOut ? "Surat keluar " + r.number : "Surat masuk " + r.number) : isOut ? "Surat keluar baru" : "Surat masuk baru", [
        ["code", "Jenis surat", "select", CODES.map(([a, b]) => [a, a + ": " + b]), { help: r.id && isOut ? "Nomor tidak berubah walau jenis diganti." : "" }], ["date", "Tanggal surat", "date"],
        ["subject", "Perihal", "text", null, { full: true }], ["party", isOut ? "Kepada" : "Dari", "text"], ["ref_number", isOut ? "Nomor rujukan (opsional)" : "Nomor surat dari pengirim", "text"],
        ["project_id", "Proyek terkait", "project"], ["file_url", "Berkas di Google Drive", "url"], ["notes", "Catatan", "textarea", null, { full: true }]
      ], r, { readonly: !can, top: r.id ? '<p class="secret" style="font-size:16px">' + esc(r.number) + "</p>" : "",
        validate: o => !o.subject ? "Perihal wajib diisi." : o.file_url && !/^https:\/\//.test(o.file_url) ? "Tautan berkas harus diawali https://" : "",
        collect: () => ({ direction: r.direction }), save: saveReg("surat", r.id ? "Surat disimpan." : "Nomor surat dibuat."),
        del: r.id && (role() === "superadmin" || role() === "direktur") ? delReg("surat", r.id) : null, delConfirm: "Hapus catatan surat ini? Nomor yang sudah terpakai tidak dipakai ulang." });
    };
    el.querySelectorAll("[data-d]").forEach(b => (b.onclick = () => { dir = b.dataset.d; draw(); }));
    $("sCode").oninput = e => { code = e.target.value; draw(); };
    $("aQ").oninput = e => { term = e.target.value; draw(); };
    if ($("sOut")) $("sOut").onclick = () => form({ direction: "keluar", date: S.today, code: "ST" });
    if ($("sIn")) $("sIn").onclick = () => form({ direction: "masuk", date: S.today, code: "LL" });
    draw(); openFromQuery(rows, q, form);
  };

  /* ---------- contracts and MoUs ---------- */
  RENDER.kontrak = (el, rows, q) => {
    const can = K.seesAll();
    const state = r => !r.end ? ["", "Tanpa tanggal akhir"] : K.diffDays(r.end) < 0 ? ["late", "Berakhir"] : K.diffDays(r.end) <= 30 ? ["soon", "Akan berakhir"] : ["ok", "Aktif"];
    let term = "", only = "";
    el.innerHTML = header("Pengingat muncul di notifikasi pimpinan 30 hari, 7 hari, dan pada hari terakhir masa berlaku.", can ? '<button class="btn" id="cNew" type="button">' + ic("plus") + "Kontrak atau MoU</button>" : "") +
      '<div class="toolbar"><div class="seg" role="group"><button type="button" data-o="">Semua</button><button type="button" data-o="ok">Aktif</button><button type="button" data-o="soon">Akan berakhir</button><button type="button" data-o="late">Berakhir</button></div><input class="in grow" id="aQ" type="search" placeholder="Cari judul, nomor, atau mitra"></div><div id="cList"></div>';
    const draw = () => {
      el.querySelectorAll("[data-o]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.o === only)));
      const list = rows.filter(r => (!only || state(r)[0] === only) && matches(term, r.title, r.number, r.party)).sort((a, b) => String(a.end || "9999").localeCompare(b.end || "9999"));
      const total = list.reduce((a, r) => a + (r.value || 0), 0);
      $("cList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Dokumen</th><th>Mitra</th><th>Masa berlaku</th><th>Nilai</th><th>Status</th></tr></thead><tbody>' +
        list.map(r => { const s = state(r); return '<tr class="click" data-id="' + r.id + '"><td class="wrap sm-full"><span class="chip lab">' + esc(r.kind) + "</span> <b>" + esc(r.title) + "</b>" + (r.number ? '<br><span class="small muted">' + esc(r.number) + "</span>" : "") +
          '</td><td class="sm-hide">' + esc(r.party) + "</td><td>" + (r.start ? esc(K.fmtShort(r.start)) + " sampai " : "") + esc(K.fmtDate(r.end)) + '</td><td class="mono sm-hide">' + (r.value ? rupiah(r.value) : "") + "</td><td>" +
          (s[0] ? '<span class="due ' + s[0] + '">' + s[1] + (s[0] === "soon" ? ", " + K.dueInfo(r.end).txt : "") + "</span>" : '<span class="small muted">' + s[1] + "</span>") + "</td></tr>"; }).join("") +
        "</tbody></table></div>" + (total ? '<p class="small muted" style="margin-top:8px">Total nilai yang ditampilkan: <b>' + rupiah(total) + "</b></p>" : "")
        : '<div class="panel empty"><strong>Belum ada kontrak atau MoU</strong></div>';
      $("cList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => form(rows.find(r => r.id === tr.dataset.id))));
    };
    const form = r => {
      r = r || { kind: "Kontrak" };
      formModal(r.id ? r.kind + ": " + r.title : "Kontrak atau MoU baru", [
        ["kind", "Jenis", "select", ["Kontrak", "MoU", "PKS", "SPK", "Addendum"].map(x => [x, x])], ["number", "Nomor dokumen", "text"],
        ["title", "Judul atau ruang lingkup", "text", null, { full: true }], ["party", "Mitra atau pemberi kerja", "text"], ["value", "Nilai (Rp)", "money"],
        ["start", "Mulai berlaku", "date"], ["end", "Berakhir", "date"], ["project_id", "Proyek terkait", "project"], ["file_url", "Berkas di Google Drive", "url"], ["notes", "Catatan", "textarea", null, { full: true }]
      ], r, { readonly: !can, validate: o => !o.title ? "Judul wajib diisi." : o.start && o.end && o.end < o.start ? "Tanggal berakhir tidak boleh sebelum tanggal mulai." : "",
        save: saveReg("kontrak", "Kontrak disimpan."), del: r.id && can ? delReg("kontrak", r.id) : null });
    };
    el.querySelectorAll("[data-o]").forEach(b => (b.onclick = () => { only = b.dataset.o; draw(); }));
    $("aQ").oninput = e => { term = e.target.value; draw(); };
    if ($("cNew")) $("cNew").onclick = () => form();
    draw(); openFromQuery(rows, q, form);
  };

  /* ---------- meetings, minutes and attendance ---------- */
  RENDER.rapat = (el, rows, q) => {
    let term = "";
    el.innerHTML = header("Notulen, keputusan, tindak lanjut, dan daftar hadir peserta internal maupun eksternal. Daftar hadir bisa dicetak untuk ditandatangani.", role() !== "konsultan" ? '<button class="btn" id="rNew" type="button">' + ic("plus") + "Rapat atau kegiatan</button>" : "") +
      searchBar("Cari judul, tempat, atau isi notulen") + '<div id="rList"></div>';
    const draw = () => {
      const list = rows.filter(r => matches(term, r.title, r.place, r.minutes, r.decisions)).sort((a, b) => String(b.date).localeCompare(a.date));
      $("rList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Tanggal</th><th>Rapat atau kegiatan</th><th>Peserta</th><th></th></tr></thead><tbody>' +
        list.map(r => '<tr class="click" data-id="' + r.id + '"><td style="white-space:nowrap">' + esc(K.fmtDate(r.date)) + (r.time ? '<br><span class="small muted">' + esc(r.time) + "</span>" : "") + '</td><td class="wrap sm-full"><b>' + esc(r.title) + '</b><br><span class="small muted">' + esc(r.kind) + (r.place ? ", " + esc(r.place) : "") + (r.project_id ? ", " + esc(projName(r.project_id)) : "") + "</span></td>" +
          '<td><span class="avs">' + r.internal.slice(0, 5).map(u => K.avatar(u, "sm")).join("") + "</span>" + (r.external.length ? '<span class="small muted"> +' + r.external.length + " eksternal</span>" : "") + '</td><td class="sm-hide"><button class="btn ghost small" type="button" data-print="' + r.id + '">Cetak daftar hadir</button></td></tr>').join("") + "</tbody></table></div>"
        : '<div class="panel empty"><strong>Belum ada catatan rapat atau kegiatan</strong></div>';
      $("rList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = e => { if (e.target.closest("[data-print]")) return; form(rows.find(r => r.id === tr.dataset.id)); }));
      $("rList").querySelectorAll("[data-print]").forEach(b => (b.onclick = () => printAttendance(rows.find(r => r.id === b.dataset.print))));
    };
    const form = r => {
      r = r || { kind: "rapat internal", date: S.today, internal: [S.me.id], external: [] };
      const can = !r.id || K.seesAll() || r.created_by === S.me.id;
      let ext = (r.external || []).map(x => Object.assign({}, x));
      const users = S.users.filter(u => u.status === "aktif" || (r.internal || []).includes(u.id));
      const extra = '<fieldset class="field full" style="border:0;padding:0;margin:14px 0 0"><span style="font-size:13px;font-weight:700;color:var(--muted)">Peserta internal</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px;margin-top:6px">' +
        users.map(u => '<label class="check"><input type="checkbox" name="rin" value="' + u.id + '"' + ((r.internal || []).includes(u.id) ? " checked" : "") + (can ? "" : " disabled") + ">" + esc(u.name) + "</label>").join("") + "</div></fieldset>" +
        '<div class="field full" style="margin-top:14px"><span style="font-size:13px;font-weight:700;color:var(--muted)">Peserta eksternal</span><div id="extRows" style="display:grid;gap:6px;margin-top:6px"></div>' +
        (can ? '<button class="btn ghost small" type="button" id="extAdd" style="margin-top:6px;justify-self:start">Tambah peserta</button>' : "") + "</div>" +
        (r.id ? '<div style="margin-top:14px"><button class="btn ghost small" type="button" id="rPrint">Cetak daftar hadir</button></div>' : "");
      const drawExt = () => {
        $("extRows").innerHTML = ext.length ? ext.map((x, i) => '<div class="ext-row"><input class="in" data-i="' + i + '" data-k="n" placeholder="Nama" value="' + esc(x.n || "") + '"' + (can ? "" : " disabled") + '><input class="in" data-i="' + i + '" data-k="org" placeholder="Lembaga" value="' + esc(x.org || "") + '"' + (can ? "" : " disabled") + '><input class="in" data-i="' + i + '" data-k="role" placeholder="Jabatan" value="' + esc(x.role || "") + '"' + (can ? "" : " disabled") + ">" +
          (can ? '<button class="icon-btn" type="button" data-x="' + i + '" aria-label="Hapus peserta" style="width:32px;height:32px">' + ic("close") + "</button>" : "<span></span>") + "</div>").join("") : '<p class="small muted">Belum ada peserta eksternal.</p>';
        $("extRows").querySelectorAll("input").forEach(inp => (inp.oninput = () => { ext[inp.dataset.i][inp.dataset.k] = inp.value; }));
        $("extRows").querySelectorAll("[data-x]").forEach(b => (b.onclick = () => { ext.splice(Number(b.dataset.x), 1); drawExt(); }));
      };
      formModal(r.id ? r.title : "Rapat atau kegiatan baru", [
        ["kind", "Jenis", "select", ["rapat internal", "rapat dengan mitra", "kegiatan lapangan", "pelatihan", "lokakarya"].map(x => [x, x[0].toUpperCase() + x.slice(1)])], ["title", "Judul", "text"],
        ["date", "Tanggal", "date"], ["time", "Waktu (mis. 09.00 sampai 11.00 WITA)", "text"], ["place", "Tempat atau tautan daring", "text"], ["project_id", "Proyek terkait", "project"],
        ["agenda", "Agenda", "textarea", null, { full: true, rows: 3 }], ["minutes", "Notulen dan pembahasan", "textarea", null, { full: true, rows: 6 }],
        ["decisions", "Keputusan", "textarea", null, { full: true, rows: 3 }], ["followups", "Tindak lanjut (siapa, apa, kapan)", "textarea", null, { full: true, rows: 3 }], ["file_url", "Materi atau dokumentasi di Drive", "url", null, { full: true }]
      ], r, { readonly: !can, extra,
        after: () => { drawExt(); if ($("extAdd")) $("extAdd").onclick = () => { ext.push({ n: "", org: "", role: "" }); drawExt(); }; if ($("rPrint")) $("rPrint").onclick = () => printAttendance(r); },
        collect: () => ({ internal: [...document.querySelectorAll('[name="rin"]:checked')].map(x => x.value), external: ext.filter(x => (x.n || "").trim()) }),
        validate: o => !o.title ? "Judul wajib diisi." : "", save: saveReg("rapat", "Catatan disimpan."), del: r.id && can ? delReg("rapat", r.id) : null });
    };
    $("aQ").oninput = e => { term = e.target.value; draw(); };
    if ($("rNew")) $("rNew").onclick = () => form();
    draw(); openFromQuery(rows, q, form);
  };
  /* printable attendance sheet: internal participants first, then external, with blank rows to sign */
  function printAttendance(r) {
    const people = r.internal.map(uid => { const u = K.user(uid) || {}; return [u.name || "", "CHARIS", u.title || K.ROLE[u.role] || ""]; }).concat(r.external.map(x => [x.n, x.org, x.role]));
    const target = Math.max(10, people.length + 3);
    while (people.length < target) people.push(["", "", ""]);
    const w = window.open("", "_blank");
    if (!w) { K.toast("Izinkan jendela baru (pop-up) untuk mencetak.", true); return; }
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Daftar hadir ' + esc(r.title) + '</title><style>body{font:13px/1.45 Arial,sans-serif;color:#142826;margin:28px}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 3px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #444;padding:8px 6px;text-align:left;vertical-align:top}th{background:#E7F0EE}td.no{width:28px;text-align:center}td.sig{width:130px;height:30px}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E5A55;padding-bottom:10px;margin-bottom:12px}.org{font-weight:700;color:#0E5A55}@media print{body{margin:12mm}}</style></head><body>' +
      '<div class="head"><div><p class="org">CHARIS (Center for Health Analytics, Research and Integrated Services)</p><p>Yayasan Peduli Insan Rentan (PINAR Foundation)</p></div><p>Daftar hadir</p></div>' +
      "<h1>" + esc(r.title) + "</h1><p>" + esc(K.fmtDate(r.date)) + (r.time ? ", " + esc(r.time) : "") + "</p>" + (r.place ? "<p>" + esc(r.place) + "</p>" : "") +
      '<table><thead><tr><th>No</th><th>Nama</th><th>Lembaga</th><th>Jabatan</th><th>Tanda tangan</th></tr></thead><tbody>' +
      people.map((p, i) => '<tr><td class="no">' + (i + 1) + "</td><td>" + esc(p[0]) + "</td><td>" + esc(p[1]) + "</td><td>" + esc(p[2]) + '</td><td class="sig"></td></tr>').join("") + "</tbody></table>" +
      "<script>setTimeout(function(){window.print()},300)<\/script></body></html>");
    w.document.close();
  }

  /* ---------- leave ---------- */
  RENDER.cuti = (el, rows) => {
    const mine = rows.filter(r => r.uid === S.me.id).sort((a, b) => String(b.start).localeCompare(a.start));
    const others = rows.filter(r => r.uid !== S.me.id).sort((a, b) => (a.status !== "diajukan") - (b.status !== "diajukan") || String(b.start).localeCompare(a.start));
    const usedYear = mine.filter(r => r.status === "disetujui" && r.kind === "tahunan" && String(r.start).slice(0, 4) === S.today.slice(0, 4)).reduce((a, r) => a + r.days, 0);
    const row = (r, who) => '<tr class="click" data-id="' + r.id + '">' + (who ? '<td class="sm-full"><span style="display:flex;gap:8px;align-items:center">' + K.avatar(r.uid, "sm") + "<b>" + esc(K.uName(r.uid)) + "</b></span></td>" : "") +
      "<td>" + esc(r.kind[0].toUpperCase() + r.kind.slice(1)) + "</td><td>" + esc(K.fmtShort(r.start)) + " sampai " + esc(K.fmtDate(r.end)) + '<br><span class="small muted">' + r.days + " hari kerja</span></td>" +
      '<td><span class="lv ' + r.status + '">' + esc(r.status[0].toUpperCase() + r.status.slice(1)) + "</span>" + (r.decided_by ? '<br><span class="small muted">oleh ' + esc(K.uName(r.decided_by)) + "</span>" : "") + "</td></tr>";
    const table = (list, who) => '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr>' + (who ? "<th>Nama</th>" : "") + "<th>Jenis</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>" + list.map(r => row(r, who)).join("") + "</tbody></table></div>";
    el.innerHTML = header("Pengajuan cuti diputuskan oleh direktur. Jumlah hari dihitung dari hari kerja Senin sampai Jumat; libur nasional belum dikurangkan otomatis.", '<button class="btn" id="lNew" type="button">' + ic("plus") + "Ajukan cuti</button>") +
      (approver() ? '<section class="sec"><div class="sec-h"><h2>Pengajuan tim</h2></div>' + (others.length ? table(others, true) : '<div class="panel empty">Belum ada pengajuan dari tim.</div>') + "</section>" : "") +
      '<section class="sec"><div class="sec-h"><h2>Cuti saya</h2><span class="small muted">Cuti tahunan disetujui tahun ini: <b>' + usedYear + " hari</b></span></div>" + (mine.length ? table(mine, false) : '<div class="panel empty">Anda belum pernah mengajukan cuti.</div>') + "</section>";
    el.querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => open(rows.find(r => r.id === tr.dataset.id))));
    $("lNew").onclick = () => open();
    function open(r) {
      const isMine = !r || r.uid === S.me.id, editable = !r || (isMine && r.status === "diajukan");
      r = r || { kind: "tahunan", start: S.today, end: S.today };
      const decide = r.id && approver() && r.status === "diajukan" && (!isMine || role() === "superadmin");
      formModal(r.id ? "Cuti " + K.uName(r.uid) : "Ajukan cuti", [
        ["kind", "Jenis cuti", "select", ["tahunan", "sakit", "alasan penting", "melahirkan", "lainnya"].map(x => [x, x[0].toUpperCase() + x.slice(1)])], ["start", "Mulai", "date"], ["end", "Selesai", "date"],
        ["reason", "Alasan atau keterangan", "textarea", null, { full: true, rows: 3 }]
      ], r, { readonly: !editable, ok: r.id ? "Simpan perubahan" : "Kirim pengajuan",
        top: r.id ? '<p><span class="lv ' + r.status + '">' + esc(r.status) + "</span> " + r.days + " hari kerja" + (r.decision_note ? '<br><span class="small muted">Catatan: ' + esc(r.decision_note) + "</span>" : "") + "</p>" : "",
        extra: decide ? '<div class="field" style="margin-top:14px"><span style="font-size:13px;font-weight:700;color:var(--muted)">Keputusan direktur</span><textarea class="in" id="lNote" rows="2" placeholder="Catatan untuk pemohon (opsional)"></textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" type="button" id="lOk">Setujui</button><button class="btn danger" type="button" id="lNo">Tolak</button></div></div>' : "",
        after: () => {
          if (!decide) return;
          const go = d => K.run($(d === "disetujui" ? "lOk" : "lNo"), async () => { await K.api("leaveDecide", { id: r.id, decision: d, note: $("lNote").value }); S.summary.leave_pending = Math.max(0, (S.summary.leave_pending || 1) - 1); K.closeModal(); K.toast("Cuti " + d + "."); K.buildNav(); reload(); });
          $("lOk").onclick = () => go("disetujui"); $("lNo").onclick = () => go("ditolak");
        },
        validate: o => !o.start || !o.end || o.end < o.start ? "Isi tanggal mulai dan selesai dengan benar." : "",
        save: saveReg("cuti", r.id ? "Pengajuan diperbarui." : "Pengajuan cuti terkirim ke direktur."),
        del: r.id && editable ? delReg("cuti", r.id) : null, delLabel: "Batalkan pengajuan", delConfirm: "Batalkan pengajuan cuti ini?" });
    }
  };

  /* ---------- timesheet ---------- */
  let tsWeek = null, tsWho = "";
  RENDER.timesheet = (el, rows) => {
    const monday = s => K.addDays(s, -((new Date(K.dnum(s) * 86400000).getUTCDay() + 6) % 7));
    if (!tsWeek) tsWeek = monday(S.today);
    if (!tsWho) tsWho = S.me.id;
    const viewers = [...new Set(rows.map(r => r.uid).concat([S.me.id]))];
    const days = [...Array(7)].map((_, i) => K.addDays(tsWeek, i));
    const mine = rows.filter(r => r.uid === tsWho);
    const inWeek = mine.filter(r => r.date >= days[0] && r.date <= days[6]);
    const total = inWeek.reduce((a, r) => a + r.hours, 0);
    const byProj = {}; inWeek.forEach(r => { const k = r.project_id || ""; byProj[k] = (byProj[k] || 0) + r.hours; });
    const monthKey = S.today.slice(0, 7), month = mine.filter(r => r.date.slice(0, 7) === monthKey).reduce((a, r) => a + r.hours, 0);
    const taskTitle = id => (S.tasks.find(t => t.id === id) || {}).title || "";
    el.innerHTML = header("Catat jam kerja per tugas atau per proyek. Jam yang dicatat pada tugas ikut tampil di detail tugas sebagai pembanding perkiraan.", '<button class="btn" id="tsNew" type="button">' + ic("plus") + "Catat jam</button>") +
      '<div class="toolbar">' + (viewers.length > 1 ? '<select class="in" id="tsWho">' + viewers.map(u => '<option value="' + u + '"' + (u === tsWho ? " selected" : "") + ">" + esc(K.uName(u)) + "</option>").join("") + "</select>" : "") +
      '<span style="display:flex;gap:6px;align-items:center"><button class="icon-btn" id="tsPrev" type="button" aria-label="Minggu sebelumnya">' + ic("back") + '</button><b style="font-size:14px">' + esc(K.fmtShort(days[0])) + " sampai " + esc(K.fmtDate(days[6])) +
      '</b><button class="icon-btn" id="tsNext" type="button" aria-label="Minggu berikutnya" style="transform:scaleX(-1)">' + ic("back") + '</button><button class="btn ghost small" id="tsNow" type="button">Minggu ini</button></span></div>' +
      '<div class="sumgrid" style="margin-bottom:14px"><div class="panel"><b>' + K.fmtNum(total) + ' jam</b><span class="small muted">minggu ini</span></div><div class="panel"><b>' + K.fmtNum(month) + ' jam</b><span class="small muted">bulan ' + K.MONTHS_L[Number(monthKey.slice(5)) - 1] + "</span></div>" +
      Object.keys(byProj).map(pid => '<div class="panel"><b>' + K.fmtNum(byProj[pid]) + ' jam</b><span class="small muted">' + esc(projName(pid) || "Tanpa proyek") + "</span></div>").join("") + "</div>" +
      '<div class="week">' + days.map(d => { const list = inWeek.filter(r => r.date === d), h = list.reduce((a, r) => a + r.hours, 0);
        return '<div class="wd' + (d === S.today ? " td" : "") + '"><b>' + ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][days.indexOf(d)] + " " + Number(d.slice(8)) + '</b><span class="h">' + (h ? K.fmtNum(h) : "") + "</span>" +
          list.map(r => '<span class="e" data-id="' + r.id + '" title="' + esc((taskTitle(r.task_id) || projName(r.project_id)) + (r.note ? ": " + r.note : "")) + '">' + K.fmtNum(r.hours) + " j " + esc(taskTitle(r.task_id) || projName(r.project_id) || r.note || "") + "</span>").join("") + "</div>"; }).join("") + "</div>";
    const rerender = () => RENDER.timesheet(el, rows);
    if ($("tsWho")) $("tsWho").oninput = e => { tsWho = e.target.value; rerender(); };
    $("tsPrev").onclick = () => { tsWeek = K.addDays(tsWeek, -7); rerender(); };
    $("tsNext").onclick = () => { tsWeek = K.addDays(tsWeek, 7); rerender(); };
    $("tsNow").onclick = () => { tsWeek = monday(S.today); rerender(); };
    el.querySelectorAll("[data-id]").forEach(x => (x.onclick = () => form(rows.find(r => r.id === x.dataset.id))));
    $("tsNew").onclick = () => form();
    function form(r) {
      const own = !r || r.uid === S.me.id || role() === "superadmin";
      r = r || { date: S.today, hours: "" };
      const myTasks = S.tasks.filter(t => t.assignee_uid === S.me.id && (t.status !== "selesai" || t.id === r.task_id));
      formModal(r.id ? "Catatan jam " + K.uName(r.uid) : "Catat jam kerja", [
        ["date", "Tanggal", "date"], ["hours", "Jumlah jam", "number"],
        ["task_id", "Tugas", "select", [["", "Tidak terkait tugas tertentu"]].concat(myTasks.map(t => [t.id, t.title + " (" + projName(t.project_id) + ")"]))],
        ["project_id", "Proyek (jika tanpa tugas)", "project"], ["note", "Catatan", "text", null, { full: true }]
      ], r, { readonly: !own, validate: o => !(Number(o.hours) > 0 && Number(o.hours) <= 24) ? "Jumlah jam harus antara 0 dan 24." : "",
        save: async o => { o.hours = Number(o.hours); await saveReg("timesheet", "Jam kerja dicatat.")(o); },
        del: r.id && own ? delReg("timesheet", r.id) : null });
    }
  };

  /* ---------- assets ---------- */
  RENDER.aset = (el, rows, q) => {
    const can = K.seesAll();
    let term = "", cond = "";
    el.innerHTML = header("Kode inventaris dibuat otomatis (INV-tahun-nomor). Pemegang aset menerima notifikasi saat aset dicatat atas namanya.", can ? '<button class="btn" id="aNew" type="button">' + ic("plus") + "Aset baru</button>" : "") +
      '<div class="toolbar"><select class="in" id="aCond"><option value="">Semua kondisi</option>' + ["baik", "perlu perbaikan", "rusak", "dihapuskan"].map(c => '<option value="' + c + '">' + c[0].toUpperCase() + c.slice(1) + "</option>").join("") +
      '</select><input class="in grow" id="aQ" type="search" placeholder="Cari nama, kode, nomor seri, atau lokasi"></div><div id="aList"></div>';
    const draw = () => {
      const list = rows.filter(r => (!cond || r.condition === cond) && matches(term, r.name, r.code, r.serial, r.location, K.uName(r.holder_uid))).sort((a, b) => String(a.code).localeCompare(b.code));
      const total = list.filter(r => r.condition !== "dihapuskan").reduce((a, r) => a + (r.value || 0), 0);
      $("aList").innerHTML = list.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Kode</th><th>Aset</th><th>Pemegang</th><th>Kondisi</th><th>Nilai perolehan</th></tr></thead><tbody>' +
        list.map(r => '<tr class="click" data-id="' + r.id + '"><td class="mono">' + esc(r.code) + '</td><td class="wrap sm-full"><b>' + esc(r.name) + '</b><br><span class="small muted">' + esc(r.category || "") + (r.location ? ", " + esc(r.location) : "") + "</span></td>" +
          '<td class="sm-hide">' + (r.holder_uid ? esc(K.uName(r.holder_uid)) : '<span class="muted">Kantor</span>') + '</td><td><span class="due ' + ({ baik: "ok", "perlu perbaikan": "soon", rusak: "late", dihapuskan: "" }[r.condition] || "") + '">' + esc(r.condition) + '</span></td><td class="mono sm-hide">' + (r.value ? rupiah(r.value) : "") + "</td></tr>").join("") +
        "</tbody></table></div>" + (total ? '<p class="small muted" style="margin-top:8px">Total nilai perolehan (tanpa aset yang dihapuskan): <b>' + rupiah(total) + "</b></p>" : "")
        : '<div class="panel empty"><strong>Belum ada aset tercatat</strong></div>';
      $("aList").querySelectorAll("[data-id]").forEach(tr => (tr.onclick = () => form(rows.find(r => r.id === tr.dataset.id))));
    };
    const form = r => {
      r = r || { condition: "baik", category: "Laptop dan komputer", purchase_date: S.today };
      formModal(r.id ? r.code + ": " + r.name : "Aset baru", [
        ["name", "Nama aset", "text", null, { full: true }], ["category", "Kategori", "select", ["Laptop dan komputer", "Perangkat elektronik", "Perabot", "Kendaraan", "Peralatan lapangan", "Perangkat lunak", "Lainnya"].map(x => [x, x])],
        ["serial", "Nomor seri atau merek", "text"], ["purchase_date", "Tanggal perolehan", "date"], ["value", "Nilai perolehan (Rp)", "money"],
        ["condition", "Kondisi", "select", ["baik", "perlu perbaikan", "rusak", "dihapuskan"].map(x => [x, x[0].toUpperCase() + x.slice(1)])], ["location", "Lokasi", "text"],
        ["holder_uid", "Pemegang", "user"], ["file_url", "Foto atau bukti pembelian di Drive", "url"], ["notes", "Catatan", "textarea", null, { full: true }]
      ], r, { readonly: !can, validate: o => !o.name ? "Nama aset wajib diisi." : "", save: saveReg("aset", r.id ? "Aset disimpan." : "Aset dicatat."), del: r.id && can ? delReg("aset", r.id) : null });
    };
    $("aCond").oninput = e => { cond = e.target.value; draw(); };
    $("aQ").oninput = e => { term = e.target.value; draw(); };
    if ($("aNew")) $("aNew").onclick = () => form();
    draw(); openFromQuery(rows, q, form);
  };
})();
