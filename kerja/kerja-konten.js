/* CHARIS Ruang Kerja: write, review and publish website news, announcements and portfolio entries.
   Server side: the PHASE 6 section of apps-script/Kerja.gs. Field lists come from assets/js/content-defs.js,
   the same definitions the /admin/ panel uses. Repository products are still published through GitHub. */
(function () {
  "use strict";
  const K = window.K; if (!K) return;
  const { S, esc, ic } = K;
  const $ = id => document.getElementById(id);
  const DEFS = window.CHARIS_DEFS || {};
  const WEB = { berita: "news", portofolio: "projects" };
  const SITE = "https://charisforhealth.org/";
  const canPublish = () => ["superadmin", "direktur", "admin"].includes(S.me.role);
  K.canPublish = canPublish; K.WEB = WEB;
  const people = k => [...new Set([k.owner_uid].concat(Object.values(k.assignees || {})).filter(Boolean))];
  const canEdit = k => K.seesAll() || people(k).includes(S.me.id);
  const isReviewer = k => (k.assignees || {}).telaah === S.me.id || K.seesAll();
  const driveId = u => { const m = String(u || "").match(/(?:\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : ""; };
  const imgSrc = (u, w) => driveId(u) ? "https://drive.google.com/thumbnail?id=" + driveId(u) + "&sz=w" + (w || 1000) : (/^https:\/\//.test(u || "") ? u : "");
  const paras = s => String(s || "").split(/\n\s*\n/).filter(p => p.trim()).map(p => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join("");
  const fmtLong = d => { const x = new Date(d); return isNaN(x) ? esc(d || "") : x.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };
  const nf = n => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

  /* status chip used on cards, lists and the editor */
  K.webChip = k => {
    if (!WEB[k.type]) return "";
    if (k.web_status === "tayang") return k.pending ? '<span class="wchip pend">Ada perubahan belum tayang</span>' : '<span class="wchip live">Tayang</span>';
    if (k.web_status === "ditarik") return '<span class="wchip off">Ditarik dari web</span>';
    return k.has_draft ? '<span class="wchip">Naskah belum tayang</span>' : "";
  };

  /* ============================================================
     EDITOR PAGE  #/naskah/<konten id>
     ============================================================ */
  const PROJECT_CORE = ["title_id", "title_en", "client_type", "service", "component", "region", "year_start", "year_end", "duration_months", "status", "role",
    "summary_id", "summary_en", "methods_id", "methods_en", "outputs_id", "outputs_en", "capacity_id", "capacity_en", "keywords", "sdg", "date", "areas"];
  const PROJECT_NAMED = ["client", "funder", "partners", "official_title", "location_detail", "image_url", "testimonial_id", "testimonial_en", "testimonial_by"];
  const publicFields = lv => lv === "A" ? PROJECT_CORE.concat(PROJECT_NAMED, ["related_publications"]) : lv === "B" ? PROJECT_CORE.concat(PROJECT_NAMED) : lv === "C" ? PROJECT_CORE : [];
  let ED = null;   /* current editor state */

  K.pages.naskah = async (v, id) => {
    if (ED && ED.id === id && $("nkForm")) return;          /* already open: background refreshes leave it alone */
    K.closeDrawer(true);
    K.setTop("Naskah website", "#/konten");
    v.innerHTML = '<p class="muted">Memuat naskah</p>';
    let j;
    try { j = await K.api("kontenGet", { id }); } catch (e) { v.innerHTML = '<div class="panel empty">' + esc(e.message) + "</div>"; return; }
    if (!j.web_type) { v.innerHTML = '<div class="panel empty"><strong>Produk repositori diterbitkan lewat GitHub</strong>Naskah website hanya untuk berita, pengumuman, dan portofolio.</div>'; return; }
    ED = { id, k: j.item, wt: j.web_type, d: j.draft, web: j.web || null, url: j.url || "", stats: j.stats || null, dirty: false, saving: null, timer: 0, lang: "id", tab: "tulis" };
    K.hold = () => location.hash.indexOf("#/naskah/" + id) === 0;
    render(v);
  };
  addEventListener("hashchange", () => { if (ED && location.hash.indexOf("#/naskah/" + ED.id) !== 0) { if (ED.dirty) save(true); ED = null; K.hold = null; } });
  addEventListener("beforeunload", e => { if (ED && ED.dirty) { save(true); e.preventDefault(); e.returnValue = ""; } });

  function fieldsOf(wt) { return ((DEFS[wt] || {}).fields || []).filter(f => f[0] !== "published"); }
  function fieldHtml(f, val, dis) {
    const [key, label, kind, opts] = f, id = "nk_" + key;
    if (kind === "heading") return '<h3 class="nk-sec">' + esc(label) + "</h3>";
    if (kind === "bool") return '<label class="check nk-f"><input type="checkbox" id="' + id + '" data-f="' + key + '"' + (val === true || val === "true" ? " checked" : "") + dis + "><span>" + esc(key === "featured" ? "Sematkan di slider beranda" : label) + "</span></label>";
    let ctl;
    if (kind === "select") ctl = '<select class="in" id="' + id + '" data-f="' + key + '"' + dis + '><option value="">Pilih</option>' + (opts || []).map(([a, b]) => '<option value="' + esc(a) + '"' + (String(a) === String(val) ? " selected" : "") + ">" + esc(b) + "</option>").join("") + "</select>";
    else if (kind === "textarea" || kind === "long") ctl = '<textarea class="in" id="' + id + '" data-f="' + key + '" rows="' + (kind === "long" ? 14 : 4) + '"' + dis + ">" + esc(val) + "</textarea>" + (kind === "long" ? '<small class="muted">Pisahkan paragraf dengan satu baris kosong.</small>' : "");
    else if (kind === "image") ctl = '<div class="nk-img"><span class="nk-thumb" id="' + id + '_t">' + (imgSrc(val, 400) ? '<img alt="" src="' + esc(imgSrc(val, 400)) + '">' : ic("clip")) + '</span><div style="display:grid;gap:6px;min-width:0"><input class="in" id="' + id + '" data-f="' + key + '" inputmode="url" placeholder="Tempel tautan Google Drive (akses: siapa saja yang memiliki link)" value="' + esc(val) + '"' + dis + ">" +
      (dis ? "" : '<label class="btn ghost small nk-up"><input type="file" accept="image/jpeg,image/png,image/webp" data-up="' + key + '" hidden>' + ic("plus") + "Unggah foto</label>") + "</div></div>";
    else if (kind === "video") ctl = '<input class="in" id="' + id + '" data-f="' + key + '" inputmode="url" placeholder="https://www.youtube.com/watch?v=..." value="' + esc(val) + '"' + dis + '><small class="nk-vchip" id="' + id + '_c"></small>';
    else if (kind === "gallery") ctl = '<textarea class="in" id="' + id + '" data-f="' + key + '" rows="3" placeholder="Satu tautan foto per baris"' + dis + ">" + esc(val) + '</textarea><div class="nk-gal" id="' + id + '_g"></div>' +
      (dis ? "" : '<label class="btn ghost small nk-up"><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-gal="' + key + '" hidden>' + ic("plus") + "Unggah beberapa foto</label>");
    else ctl = '<input class="in" id="' + id + '" data-f="' + key + '" type="' + (kind === "date" ? "date" : kind === "number" ? "number" : "text") + '" value="' + esc(val) + '"' + dis + ">";
    const wide = ["textarea", "long", "image", "video", "gallery"].includes(kind) || /^(title|summary|testimonial|official|areas|keywords)/.test(key);
    return '<label class="field nk-f' + (wide ? " full" : "") + '"><span>' + esc(label) + "</span>" + ctl + "</label>";
  }

  function render(v) {
    const { k, wt } = ED, edit = canEdit(k), dis = edit ? "" : " disabled";
    const typeL = wt === "news" ? "Berita dan pengumuman" : "Portofolio";
    v.innerHTML = '<div class="nk-top"><div class="nk-meta"><span class="kchip ' + k.type + '">' + typeL + '</span><span class="chip lab">' + esc(K.STAGE_L[k.stage] || k.stage) + "</span>" + K.webChip(k) +
      (ED.stats ? '<span class="nk-stat">' + ic("check") + nf(ED.stats.reads) + " dibaca, " + nf(ED.stats.shares) + " dibagikan</span>" : "") + '</div><h1 class="nk-title" id="nkTitle"></h1>' +
      '<div class="nk-review" id="nkReview"></div><div class="nk-acts" id="nkActs"></div></div>' +
      '<div class="seg nk-mtabs" role="group" aria-label="Tampilan"><button type="button" data-tab="tulis">Tulis</button><button type="button" data-tab="pratinjau">Pratinjau</button></div>' +
      '<div class="nk-grid" data-tab="' + ED.tab + '"><form class="panel pad nk-form" id="nkForm" novalidate><div class="props">' + fieldsOf(wt).map(f => fieldHtml(f, ED.d[f[0]] == null ? "" : ED.d[f[0]], dis)).join("") + "</div>" +
      '<p class="small muted" id="nkSaved" style="margin:14px 0 0">' + (edit ? "Perubahan tersimpan otomatis." : "Anda dapat membaca naskah ini. Hanya tim konten item ini yang dapat mengubahnya.") + "</p></form>" +
      '<aside class="nk-prev"><div class="nk-prev-h"><b>Pratinjau</b><div class="seg" role="group" aria-label="Bahasa"><button type="button" data-lang="id">Indonesia</button><button type="button" data-lang="en">English</button></div></div><div id="nkPrev"></div></aside></div>' +
      '<section class="sec panel pad" style="margin-top:18px">' + K.COMMENTS_HTML + "</section>";
    v.querySelectorAll("[data-tab]").forEach(b => b.tagName === "BUTTON" && (b.onclick = () => { ED.tab = b.dataset.tab; v.querySelector(".nk-grid").dataset.tab = ED.tab; paintSeg(v); if (ED.tab === "pratinjau") preview(); }));
    v.querySelectorAll("[data-lang]").forEach(b => (b.onclick = () => { ED.lang = b.dataset.lang; paintSeg(v); preview(); }));
    paintSeg(v);
    const form = $("nkForm");
    form.addEventListener("input", e => { const f = e.target.dataset.f; if (!f) return; ED.d[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value; if (f === "image_url" || f === "thumb_url") thumb(f); if (f === "gallery") gal(); if (f === "video_url") vchip(); changed(); });
    form.addEventListener("change", e => { if (e.target.dataset.up) upload(e.target); if (e.target.dataset.gal) uploadGal(e.target); });
    form.addEventListener("click", e => {
      const b = e.target.closest("[data-gi]"); if (!b) return; e.preventDefault();
      const u = M.list(ED.d.gallery), i = +b.dataset.gi, d = b.dataset.gd;
      if (d === "x") u.splice(i, 1); else { const j = i + +d; [u[i], u[j]] = [u[j], u[i]]; }
      ED.d.gallery = u.join("\n"); $("nk_gallery").value = ED.d.gallery; gal(); changed();
    });
    gal(); vchip();
    form.onsubmit = e => { e.preventDefault(); save(); };
    head(); preview();
    K.mountComments(k.id, people(k));
  }
  function paintSeg(v) {
    v.querySelectorAll("button[data-tab]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === ED.tab)));
    v.querySelectorAll("button[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === ED.lang)));
  }
  const M = window.CHARIS_MEDIA || { list: () => [], parse: () => null, img: u => u };
  function gal() {
    const box = $("nk_gallery_g"); if (!box) return;
    const u = M.list(ED.d.gallery), ro = !canEdit(ED.k);
    box.innerHTML = u.map((x, i) => '<figure><img alt="" src="' + esc(M.img(x, 300)) + '"><span>' + (i + 1) + "</span>" + (ro ? "" : '<div><button type="button" data-gi="' + i + '" data-gd="-1" aria-label="Geser ke kiri"' + (i ? "" : " disabled") + '>‹</button><button type="button" data-gi="' + i + '" data-gd="1" aria-label="Geser ke kanan"' + (i < u.length - 1 ? "" : " disabled") + '>›</button><button type="button" data-gi="' + i + '" data-gd="x" aria-label="Hapus foto">×</button></div>') + "</figure>").join("");
  }
  function vchip() {
    const c = $("nk_video_url_c"); if (!c) return;
    const v = String(ED.d.video_url || "").trim(), p = v ? M.parse(v) : null;
    c.className = "nk-vchip" + (v ? (p && p.embed ? " ok" : " warn") : "");
    c.textContent = !v ? "" : !p ? "Tautan belum dikenali. Pastikan diawali https://" : p.embed ? p.label + " dikenali: video diputar langsung di halaman berita." : p.label + ": tampil sebagai tombol menuju " + p.label + ".";
  }
  async function uploadGal(input) {
    const files = [...input.files].filter(f => f.size <= 8 * 1024 * 1024), lab = input.closest("label");
    if (files.length < input.files.length) K.toast("Foto di atas 8 MB dilewati.", true);
    lab.classList.add("busy");
    try {
      for (let i = 0; i < files.length; i++) {
        const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(files[i]); });
        const j = await K.api("upload", { name: files[i].name, mimeType: files[i].type, data });
        const u = M.list(ED.d.gallery); u.push(j.data.url); ED.d.gallery = u.join("\n"); $("nk_gallery").value = ED.d.gallery; gal(); changed();
      }
      K.toast(files.length + " foto diunggah.");
    } catch (e) { K.toast(e.message, true); } finally { lab.classList.remove("busy"); input.value = ""; }
  }
  function thumb(f) { const t = $("nk_" + f + "_t"); if (t) t.innerHTML = imgSrc(ED.d[f], 400) ? '<img alt="" src="' + esc(imgSrc(ED.d[f], 400)) + '">' : ic("clip"); }
  let pvT = 0;
  function changed() {
    ED.dirty = true; $("nkSaved").textContent = "Belum tersimpan";
    clearTimeout(pvT); pvT = setTimeout(() => { preview(); head(); }, 250);
    clearTimeout(ED.timer); ED.timer = setTimeout(() => save(), 2500);
  }
  async function save(quiet) {
    if (!ED || !ED.dirty) return ED && ED.saving;
    clearTimeout(ED.timer);
    const ed = ED, draft = Object.assign({}, ed.d);
    ed.dirty = false;
    if ($("nkSaved")) $("nkSaved").textContent = "Menyimpan";
    ed.saving = K.api("kontenDraft", { id: ed.id, draft }).then(j => {
      Object.assign(ed.k, j.item); upsert(j.item);
      if (ED === ed && !quiet) { if ($("nkSaved") && !ed.dirty) $("nkSaved").textContent = "Tersimpan " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":"); head(); }
    }).catch(e => { ed.dirty = true; if ($("nkSaved")) $("nkSaved").textContent = "Gagal menyimpan: " + e.message; K.toast(e.message, true); })
      .finally(() => { ed.saving = null; });
    return ed.saving;
  }
  const upsert = item => { const i = S.konten.findIndex(x => x.id === item.id); if (i >= 0) S.konten[i] = item; else S.konten.push(item); };

  async function upload(input) {
    const file = input.files[0], key = input.dataset.up; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { K.toast("Foto maksimal 8 MB.", true); return; }
    const lab = input.closest("label"); lab.classList.add("busy");
    try {
      const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(file); });
      const j = await K.api("upload", { name: file.name, mimeType: file.type, data });
      ED.d[key] = j.data.url; $("nk_" + key).value = j.data.url; thumb(key); changed(); K.toast("Foto diunggah.");
    } catch (e) { K.toast(e.message, true); } finally { lab.classList.remove("busy"); input.value = ""; }
  }

  /* which fields differ from what is live on the website */
  function diffWeb() {
    if (!ED.web) return [];
    const labels = Object.fromEntries(fieldsOf(ED.wt).map(f => [f[0], f[1]]));
    return Object.keys(labels).filter(f => labels[f] && String(ED.d[f] == null ? "" : ED.d[f]).trim() !== String(ED.web[f] == null ? "" : ED.web[f]).trim() && !(typeof ED.web[f] === "boolean" && !!ED.d[f] === ED.web[f]))
      .map(f => labels[f].split(" (")[0].split(",")[0]);
  }
  function head() {
    const { k } = ED, rv = k.review;
    $("nkTitle").textContent = ED.d.title_id || k.title || "Tanpa judul";
    let note = "";
    if (rv && rv.d === "setuju") note = k.review_ok ? '<span class="ok">' + ic("check") + "Disetujui " + esc(K.uName(rv.by)) + ", " + esc(K.fmtTime(rv.at)) + "</span>" : '<span class="warn">' + ic("alert") + "Naskah berubah sejak disetujui " + esc(K.uName(rv.by)) + ". Perlu telaah ulang atau terbitkan dengan konfirmasi.</span>";
    else if (rv && rv.d === "revisi") note = '<span class="warn">' + ic("alert") + "Perlu revisi menurut " + esc(K.uName(rv.by)) + (rv.note ? ": " + esc(rv.note) : "") + "</span>";
    else if (k.stage === "telaah") note = '<span>' + ic("flag") + "Menunggu telaah " + esc(K.uName((k.assignees || {}).telaah) || "pimpinan") + "</span>";
    const diff = k.web_status === "tayang" ? diffWeb() : [];
    if (diff.length) note += '<span class="warn">' + ic("alert") + "Belum tayang: " + esc(diff.slice(0, 6).join(", ")) + (diff.length > 6 ? " dan " + (diff.length - 6) + " lainnya" : "") + "</span>";
    if (ED.wt === "projects" && ED.d.disclosure === "D") note += '<span class="warn">' + ic("alert") + "Tingkat D tidak ditayangkan di website.</span>";
    $("nkReview").innerHTML = note;
    const acts = [], edit = canEdit(k);
    if (edit && ["draf"].includes(k.stage)) acts.push('<button class="btn" type="button" data-a="submit">Kirim untuk telaah</button>');
    if (k.stage === "telaah" && isReviewer(k)) acts.push('<button class="btn ghost" type="button" data-a="revise">Minta revisi</button>', '<button class="btn" type="button" data-a="approve">Setujui naskah</button>');
    if (canPublish()) {
      if (k.web_status === "tayang") { acts.push('<button class="btn' + (diff.length ? "" : " ghost") + '" type="button" data-a="publish"' + (diff.length ? "" : " disabled") + ">Perbarui versi tayang</button>", '<button class="btn ghost danger" type="button" data-a="unpublish">Tarik dari website</button>'); }
      else acts.push('<button class="btn" type="button" data-a="publish">' + (k.web_status === "ditarik" ? "Tayangkan lagi" : "Terbitkan ke website") + "</button>");
    }
    if (ED.url && k.web_status === "tayang") acts.push('<a class="btn ghost" href="' + esc(ED.url) + '" target="_blank" rel="noopener">Lihat di website</a>');
    acts.push('<a class="btn ghost" href="#/konten?k=' + k.id + '">Detail alur</a>');
    $("nkActs").innerHTML = acts.join("");
    $("nkActs").querySelectorAll("[data-a]").forEach(b => (b.onclick = () => act(b.dataset.a, b)));
  }
  async function refreshItem() {
    const j = await K.api("kontenGet", { id: ED.id });
    Object.assign(ED, { k: j.item, web: j.web || null, url: j.url || "", stats: j.stats || null }); upsert(j.item); head();
    const meta = document.querySelector(".nk-meta"); if (meta) meta.outerHTML = '<div class="nk-meta"><span class="kchip ' + ED.k.type + '">' + (ED.wt === "news" ? "Berita dan pengumuman" : "Portofolio") + '</span><span class="chip lab">' + esc(K.STAGE_L[ED.k.stage]) + "</span>" + K.webChip(ED.k) +
      (ED.stats ? '<span class="nk-stat">' + ic("check") + nf(ED.stats.reads) + " dibaca, " + nf(ED.stats.shares) + " dibagikan</span>" : "") + "</div>";
    K.buildNav();
  }
  function noteModal(title, text, ok, required, fn, extra) {
    K.openModal("<h3>" + esc(title) + '</h3><form id="nmF" novalidate><p>' + text + "</p>" + (extra || "") + '<label class="field" style="margin-top:10px"><span>Catatan' + (required ? "" : " (opsional)") + '</span><textarea class="in" id="nmN" rows="4"></textarea></label><p class="err" id="nmE"></p>' +
      '<div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">' + esc(ok) + "</button></div></form>");
    $("nmF").onsubmit = async e => {
      e.preventDefault(); const note = $("nmN").value.trim();
      if (required && !note) { $("nmE").textContent = "Tuliskan apa yang perlu diperbaiki."; return; }
      await K.run(e.target.querySelector('[type="submit"]'), async () => { await fn(note); K.closeModal(); });
    };
  }
  async function act(a, btn) {
    const k = ED.k;
    if (ED.dirty || ED.saving) { await save(); await ED.saving; }
    if (a === "submit") {
      const cur = (k.assignees || {}).telaah;
      const pool = S.users.filter(u => u.status === "aktif" && u.id !== S.me.id && u.role !== "konsultan");
      noteModal("Kirim untuk telaah", "Penelaah akan menerima notifikasi untuk membaca dan menyetujui naskah ini.", "Kirim", false, async note => {
        const rid = $("nmR").value; if (!rid) throw new Error("Pilih penelaah.");
        await K.api("kontenSave", { row: { id: k.id, stage: "telaah", assignees: Object.assign({}, k.assignees, { telaah: rid }) } });
        if (note) await K.api("commentAdd", { task_id: k.id, body: note, mentions: [rid] });
        K.toast("Naskah dikirim ke " + K.uName(rid) + "."); await refreshItem(); K.mountComments(k.id, people(ED.k));
      }, '<label class="field"><span>Penelaah</span><select class="in" id="nmR"><option value="">Pilih penelaah</option>' + pool.map(u => '<option value="' + u.id + '"' + (u.id === cur ? " selected" : "") + ">" + esc(u.name) + "</option>").join("") + "</select></label>");
    } else if (a === "approve" || a === "revise") {
      const ok = a === "approve";
      noteModal(ok ? "Setujui naskah" : "Minta revisi", ok ? "Naskah dinyatakan siap terbit. Admin, direktur, dan superadmin akan diberi tahu." : "Naskah dikembalikan ke tahap draf. Penulis menerima catatan Anda.", ok ? "Setujui" : "Kembalikan", !ok, async note => {
        await K.api("kontenReview", { id: k.id, decision: ok ? "setuju" : "revisi", note }); K.toast(ok ? "Naskah disetujui." : "Dikembalikan untuk revisi."); await refreshItem(); K.mountComments(k.id, people(ED.k));
      });
    } else if (a === "publish") {
      const go = async force => {
        const j = await K.api("kontenPublish", { id: k.id, force: !!force }).catch(e => ({ ok: false, error: e.message }));
        if (j.need_force) { K.confirmBox(j.error + " Tetap terbitkan sekarang?", "Terbitkan", () => go(true)); return; }
        if (!j.ok) { K.toast(j.error, true); return; }
        K.toast(k.web_status === "tayang" ? "Versi tayang diperbarui." : "Tayang di website."); await refreshItem();
      };
      await K.run(btn, () => go(false));
    } else if (a === "unpublish") {
      K.confirmBox("Tarik item ini dari website? Halaman dan kartunya tidak lagi tampil untuk pengunjung. Naskah tetap tersimpan.", "Tarik dari website", async () => {
        await K.api("kontenUnpublish", { id: k.id }); K.toast("Ditarik dari website."); await refreshItem();
      });
    }
  }

  /* ---------- preview ---------- */
  function preview() {
    const el = $("nkPrev"); if (!el || !ED) return;
    const d = ED.d, L = ED.lang, pick = f => (L === "en" && d[f + "_en"]) || d[f + "_id"] || "";
    if (ED.wt === "news") {
      const img = imgSrc(d.image_url, 1200), vp = M.parse(d.video_url), gl = M.list(d.gallery);
      const cardImg = imgSrc(d.thumb_url, 800) || img || (gl[0] ? M.img(gl[0], 800) : "") || (vp && vp.thumb) || "";
      const media = (vp && vp.embed ? '<div class="pv-vid"><span>' + esc(vp.label) + "</span>Video diputar di sini</div>" : vp ? '<p class="pv-vlink">Tombol: Tonton di ' + esc(vp.label) + "</p>" : img ? '<img alt="" src="' + esc(img) + '">' : "");
      const galH = gl.length ? '<div class="pv-gal">' + gl.slice(0, 6).map(u => '<img alt="" src="' + esc(M.img(u, 300)) + '">').join("") + "</div><p class=\"small muted\">Galeri carousel, " + gl.length + " foto</p>" : "";
      el.innerHTML = '<p class="pv-l">Kartu di beranda dan halaman Terbaru</p><div class="pv-card">' + (cardImg ? '<img alt="" src="' + esc(cardImg) + '">' : '<span class="pv-noimg">Tanpa foto</span>') +
        '<div><p class="pv-cat"><span>' + esc(d.category || "Berita") + "</span><time>" + fmtLong(d.date) + "</time></p><b>" + esc(pick("title") || "Judul berita") + "</b><p>" + esc(pick("excerpt").slice(0, 160)) + "</p></div></div>" +
        '<p class="pv-l">Halaman berita</p><article class="pv-art"><p class="pv-cat"><span>' + esc(d.category || "Berita") + "</span><time>" + fmtLong(d.date) + "</time></p><h2>" + esc(pick("title") || "Judul berita") + "</h2>" + media +
        '<div class="pv-body">' + (paras(pick("body")) || '<p class="muted">Isi berita akan tampil di sini.</p>') + "</div>" + galH + '<div class="pv-share"><span class="pv-btn">Bagikan</span><span class="small muted">' + nf(ED.stats ? ED.stats.reads : 0) + " dibaca, " + nf(ED.stats ? ED.stats.shares : 0) + " dibagikan</span></div></article>" +
        (L === "en" && !d.title_en ? '<p class="small muted">Versi English belum diisi; pengunjung berbahasa Inggris melihat teks Indonesia.</p>' : "");
      return;
    }
    const lv = String(d.disclosure || "").toUpperCase(), show = publicFields(lv), labels = Object.fromEntries(fieldsOf("projects").map(f => [f[0], f[1]]));
    const svc = (window.SERVICES || []).find(s => s.key === d.service);
    const hidden = Object.keys(labels).filter(f => labels[f] && d[f] && !show.includes(f) && !["disclosure", "photo_public"].includes(f) && !(lv === "C" && f === "image_url" && d.photo_public));
    const img = (show.includes("image_url") || (lv === "C" && d.photo_public)) ? imgSrc(d.image_url, 1000) : "";
    const row = (l, v) => v ? "<dt>" + esc(l) + "</dt><dd>" + esc(v) + "</dd>" : "";
    el.innerHTML = (!show.length ? '<div class="note warn">' + (lv === "D" ? "Tingkat D: proyek ini tidak tampil di website." : "Pilih tingkat keterbukaan untuk melihat apa yang tampil di website.") + "</div>" :
      '<p class="pv-l">Tampil di halaman Portofolio (tingkat ' + lv + ")</p><article class=\"pv-art\">" + (img ? '<img alt="" src="' + esc(img) + '">' : "") + '<p class="pv-cat"><span>' + esc(svc ? svc.id.t : d.service || "Lini layanan") + "</span><span>" + esc([d.year_start, d.year_end].filter(Boolean).join(" sampai ")) + "</span></p><h2>" + esc(pick("title") || "Judul proyek") + "</h2>" +
      (show.includes("client") && d.client ? '<p class="small"><b>' + esc(d.client) + "</b></p>" : "") + '<div class="pv-body">' + paras(pick("summary")) + "</div><dl class=\"dl\">" +
      row("Jenis klien", d.client_type) + row("Wilayah", d.region) + row("Peran CHARIS", d.role) + row("Status", d.status) + row("Pendekatan", pick("methods")) + row("Keluaran", pick("outputs")) + row("Peningkatan kapasitas", pick("capacity")) +
      (show.includes("funder") ? row("Pendanaan", d.funder) + row("Mitra pelaksana", d.partners) + row("Lokasi", d.location_detail) : "") + row("SDG", d.sdg) + "</dl>" +
      (show.includes("testimonial_id") && pick("testimonial") ? '<blockquote class="pv-q">' + esc(pick("testimonial")) + (d.testimonial_by ? "<br><span class=\"small muted\">" + esc(d.testimonial_by) + "</span>" : "") + "</blockquote>" : "") + "</article>") +
      (hidden.length ? '<p class="pv-l">Terisi tetapi tidak tampil untuk tingkat ' + (lv || "ini") + '</p><p class="small muted">' + esc(hidden.map(f => labels[f].split(" (")[0].split(",")[0]).join(", ")) + "</p>" : "");
  }

  /* ============================================================
     "DI WEBSITE" VIEW: everything live, with reads, shares and switches
     ============================================================ */
  let webTab = "news";
  K.renderWebView = async body => {
    body.innerHTML = '<p class="muted">Memuat isi website</p>';
    let j; try { j = await K.api("webList"); } catch (e) { body.innerHTML = '<div class="panel empty">' + esc(e.message) + "</div>"; return; }
    const draw = () => {
      const rows = (webTab === "news" ? j.news : j.projects).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const can = j.can_publish;
      body.innerHTML = '<div class="toolbar"><div class="seg" role="group" aria-label="Jenis"><button type="button" data-w="news" aria-pressed="' + (webTab === "news") + '">Berita dan pengumuman (' + j.news.length + ')</button><button type="button" data-w="projects" aria-pressed="' + (webTab === "projects") + '">Portofolio (' + j.projects.length + ")</button></div></div>" +
        (rows.length ? '<div class="panel" style="overflow:hidden"><table class="atable"><thead><tr><th>Judul</th><th class="sm-hide">' + (webTab === "news" ? "Kategori" : "Tingkat") + '</th><th class="r">Dibaca</th><th class="r sm-hide">Dibagikan</th><th>Tayang</th>' + (webTab === "news" ? '<th class="sm-hide">Slider</th>' : "") + "<th></th></tr></thead><tbody>" +
          rows.map(r => '<tr data-id="' + esc(r.id) + '"><td class="wrap sm-full"><b>' + esc(r.title || "(tanpa judul)") + '</b><br><span class="small muted">' + esc(fmtLong(r.date)) + (r.konten_id ? "" : ", belum dikelola di alur konten") + '</span></td><td class="sm-hide">' + esc(webTab === "news" ? r.category : r.disclosure || "kosong") +
            '</td><td class="r">' + nf(r.reads) + '</td><td class="r sm-hide">' + nf(r.shares) + '</td><td><label class="sw"><input type="checkbox" data-t="published"' + (r.published ? " checked" : "") + (can ? "" : " disabled") + '><span></span><b class="sr-only">Tayang</b></label></td>' +
            (webTab === "news" ? '<td class="sm-hide"><label class="sw"><input type="checkbox" data-t="featured"' + (r.featured ? " checked" : "") + (can ? "" : " disabled") + '><span></span><b class="sr-only">Slider</b></label></td>' : "") +
            '<td class="acts"><button class="btn ghost small" type="button" data-edit>' + (r.konten_id ? "Edit naskah" : "Kelola") + "</button>" + (r.published ? '<a class="icon-btn" href="' + esc(r.url) + '" target="_blank" rel="noopener" aria-label="Lihat di website">' + ic("link") + "</a>" : "") + "</td></tr>").join("") + "</tbody></table></div>"
          : '<div class="panel empty"><strong>Belum ada isi di website</strong>Buat item baru di alur konten, tulis naskahnya, lalu terbitkan.</div>') +
        '<p class="small muted" style="margin-top:10px">Saklar langsung mengubah website. Produk repositori tetap diterbitkan lewat GitHub.</p>';
      body.querySelectorAll("[data-w]").forEach(b => (b.onclick = () => { webTab = b.dataset.w; draw(); }));
      body.querySelectorAll("input[data-t]").forEach(inp => (inp.onchange = async () => {
        const id = inp.closest("tr").dataset.id, r = rows.find(x => x.id === id);
        inp.disabled = true;
        try { await K.api("webToggle", { type: webTab, web_id: id, field: inp.dataset.t, value: inp.checked }); r[inp.dataset.t] = inp.checked; K.toast(inp.dataset.t === "published" ? (inp.checked ? "Tayang di website." : "Disembunyikan dari website.") : (inp.checked ? "Disematkan di slider beranda." : "Dilepas dari slider.")); }
        catch (e) { inp.checked = !inp.checked; K.toast(e.message, true); } finally { inp.disabled = false; }
      }));
      body.querySelectorAll("[data-edit]").forEach(b => (b.onclick = () => K.run(b, async () => {
        const id = b.closest("tr").dataset.id, r = rows.find(x => x.id === id);
        let kid = r.konten_id;
        if (!kid) { const x = await K.api("webImport", { type: webTab, web_id: id }); upsert(x.item); kid = x.item.id; }
        location.hash = "#/naskah/" + kid;
      })));
    };
    draw();
  };
})();
