/* CHARIS site: hash router + bilingual rendering. */
(function () {
  const cfg = window.CHARIS_CONFIG || {};
  const API = window.CharisAPI;
  const app = document.getElementById("app");
  const SV = window.SERVICES;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timers = [];

  /* ---------- language ---------- */
  let lang = cfg.DEFAULT_LANG || "id";
  try { lang = localStorage.getItem("charis_lang") || lang; } catch (e) {}
  const t = k => (window.I18N[lang] && window.I18N[lang][k]) || window.I18N.id[k] || k;
  const f = (row, field) => row[field + "_" + lang] || row[field + "_id"] || row[field + "_en"] || "";

  function setLang(l) {
    lang = l;
    try { localStorage.setItem("charis_lang", l); } catch (e) {}
    document.documentElement.lang = l;
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.getElementById("q").placeholder = t("search.ph");
    const demo = document.getElementById("demoBar");
    if (API.isDemo) { demo.hidden = false; demo.textContent = t("demo"); }
    route();
  }

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paras = s => String(s || "").split(/\n\s*\n/).map(p => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join("");
  const fmtDate = d => {
    if (!d) return "";
    const dt = new Date(d);
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  };
  const byDate = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
  const isTrue = v => v === true || String(v).toUpperCase() === "TRUE";
  const svc = key => SV.find(x => x.key === key);
  const serviceName = key => { const s = svc(key); return s ? s[lang].t : (key || ""); };
  const shape = p => '<span class="shape sh-' + p + '" aria-hidden="true"></span>';
  const svgI = d => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";

  /* placeholder made from the logo shapes, stable per record */
  function tile(seed, big) {
    let h = 0; String(seed || "x").split("").forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    const L = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1]][h % 4], pos = [["4%", "52%"], ["52%", "52%"], ["52%", "4%"]];
    return '<div class="tile' + (big ? " tile-big" : "") + '" aria-hidden="true"><div class="tile-in">' + L.map((k, i) => '<span class="ts ts' + k + '" style="left:' + pos[i][0] + ";top:" + pos[i][1] + '"></span>').join("") + "</div></div>";
  }
  const media = (url, alt, seed, w) => url ? '<img src="' + esc(API.img(url, w)) + '" alt="' + esc(alt || "") + '" loading="lazy">' : tile(seed);
  /* product type in the current language */
  const typeLabel = r => (lang === "en" ? (r.type_en || r.type) : r.type) || "";
  /* short, even-length teaser for cards and slides: subtitle first, then the abstract without its "Background:" label */
  const brief = (s, n) => {
    s = String(s || "").replace(/^\s*(Latar belakang|Background|Konteks|Context)\s*:\s*/i, "").replace(/\s+/g, " ").trim();
    n = n || 190; if (s.length <= n) return s;
    const cut = s.slice(0, n), dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
    return dot > n * 0.55 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "");
  };
  const CS = window.CharisShare;
  const shareBox = (id, url, title) => CS ? CS.html({ id, url, title, compact: true, label: t("share") }) : "";
  const absHash = h => location.origin + location.pathname + h;
  /* Creative Commons badge for a licence string such as "CC BY-NC 4.0" */
  const ccBadge = lic => {
    const m = /^CC\s+(BY(?:-NC)?(?:-ND|-SA)?)\s+(\d\.\d)$/i.exec(String(lic || "").trim());
    if (!m) return lic ? '<span class="badge">' + esc(lic) + "</span>" : "";
    const code = m[1].toLowerCase();
    return '<a class="cc-badge" href="https://creativecommons.org/licenses/' + code + "/" + m[2] + '/" target="_blank" rel="license noopener" title="' + esc(lic) + '"><img src="repositori/assets/cc/' + code.replace(/-/g, "_") + '.svg" alt="' + esc(lic) + '" width="63" height="22" loading="lazy"></a>';
  };
  const flipAttrs = (r) => ' data-flip-pages="' + esc(JSON.stringify(r.preview)) + '" data-flip-title="' + esc(f(r, "title")) + '" data-flip-request="#/request/' + encodeURIComponent(r.id) + '" data-flip-read="' + esc(r.url || "") + '"';
  const hasFlip = r => r && Array.isArray(r.preview) && r.preview.length > 1;
  const coverBox = (thumb, full, alt, seed, r) => thumb
    ? (hasFlip(r)
      ? '<button type="button" class="cover-btn has-flip"' + flipAttrs(r) + ' aria-label="' + esc(t("flip.open").replace("{n}", r.preview.length)) + ': ' + esc(alt) + '"><img src="' + esc(thumb) + '"' + (full && full !== thumb ? ' srcset="' + esc(thumb) + " 720w, " + esc(full) + ' 1800w" sizes="(max-width: 600px) 140px, 200px"' : "") + ' alt="" loading="lazy" decoding="async"><span class="flip-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 5.5v14C9.5 18 6.5 18 4 19.5zM20 5.5C17.5 4 14.5 4 12 5.5v14c2.5-1.5 5.5-1.5 8 0z"/></svg>' + r.preview.length + "</span></button>"
      : '<button type="button" class="cover-btn" data-zoom="' + esc(full || thumb) + '" data-alt="' + esc(alt) + '" aria-label="' + esc(t("cover.zoom")) + ': ' + esc(alt) + '"><img src="' + esc(thumb) + '"' + (full && full !== thumb ? ' srcset="' + esc(thumb) + " 720w, " + esc(full) + ' 1800w" sizes="(max-width: 600px) 140px, 200px"' : "") + ' alt="" loading="lazy" decoding="async"></button>')
    : tile(seed);
  /* configured photos (config.js PHOTOS) with their licence credit */
  const photo = k => { const p = (cfg.PHOTOS || {})[k] || {}; return p.src ? p : (k === "highlight" && cfg.HIGHLIGHT_IMAGE ? { src: cfg.HIGHLIGHT_IMAGE } : null); };
  const credit = p => p && p.credit ? '<figcaption class="photo-credit">' + esc(t("photo.by")) + " " + (p.credit_url ? '<a href="' + esc(p.credit_url) + '" target="_blank" rel="noopener">' + esc(p.credit) + "</a>" : esc(p.credit)) + "</figcaption>" : "";
  const banner = k => { const p = photo(k); return p ? '<figure class="page-photo"><div class="wrap"><div class="pp-frame"><img src="' + esc(API.img(p.src, 2000)) + '" alt="' + esc(p.alt || "") + '" decoding="async"></div>' + credit(p) + "</div></figure>" : ""; };
  const pageTop = (title, lead) => '<header class="page-top"><div class="wrap"><h1>' + esc(title) + "</h1>" + (lead ? "<p>" + esc(lead) + "</p>" : "") + "</div></header>";
  const secHead = (title, link) => '<div class="sec-head"><h2>' + esc(title) + "</h2>" + (link ? '<a class="see-all" href="' + link + '">' + esc(t("all")) + "</a>" : "") + "</div>";
  const msg = k => '<p class="state">' + esc(t(k)) + "</p>";
  const errMsg = () => '<p class="state err">' + esc(t("error.load")) + "</p>";
  async function safeList(type) { try { return await API.list(type); } catch (e) { console.error(e); return null; } }

  /* unified feed item for news / publications / projects */
  function toItem(type, r) {
    if (type === "news") return { type, id: r.id, cat: r.category || t("type.news"), title: f(r, "title"), text: brief(f(r, "excerpt")), img: r.image_url, date: r.date, href: "#/latest/" + encodeURIComponent(r.id), featured: isTrue(r.featured) };
    if (type === "publications") return { type, id: r.id, cat: typeLabel(r) || t("type.publications"), title: f(r, "title"), text: brief((lang === "en" ? r.subtitle_en : r.subtitle_id) || f(r, "summary")), img: r.cover_url, isCover: !!r.cover_url, date: r.date, href: r.url || "#/research", featured: isTrue(r.featured) };
    return { type, id: r.id, cat: serviceName(r.service) || t("type.projects"), title: f(r, "title"), text: brief(f(r, "summary")), img: r.image_url, date: r.date || (r.year_start ? r.year_start + "-01-01" : ""), href: "#/projects/" + encodeURIComponent(r.id), featured: false };
  }
  const card = it => '<li class="card"><a href="' + esc(it.href) + '"><div class="card-media' + (it.isCover ? " is-cover" : "") + '">' + media(it.img, it.title, it.id, 800) + '</div><div class="card-body">' +
    '<p class="card-meta"><span class="card-cat">' + esc(it.cat) + "</span>" + (it.date && it.type !== "projects" ? "<time>" + fmtDate(it.date) + "</time>" : "") + "</p><h3>" + esc(it.title) + "</h3></div></a></li>";

  /* ---------- home: slider ---------- */
  async function buildSlider() {
    const host = document.getElementById("slider");
    const [news, pubs] = await Promise.all([safeList("news"), safeList("publications")]);
    const items = [].concat((news || []).map(r => toItem("news", r)), (pubs || []).map(r => toItem("publications", r)));
    let feat = items.filter(i => i.featured).sort(byDate);
    if (!feat.length) feat = items.sort(byDate).slice(0, 3);
    const hero = photo("hero");
    /* publications show their cover as a framed thumbnail, not as a background behind the text; long titles keep the part before the colon */
    const short = tt => { const i = tt.indexOf(": "); return tt.length > 70 && i >= 25 ? tt.slice(0, i) : tt; };
    feat = feat.map(i => i.type === "publications" ? Object.assign({}, i, { title: short(i.title), cover: i.img, img: "" }) : i);
    const slides = [{ mission: true, cat: t("slide.mission.cat"), title: t("slide.mission.t"), text: t("slide.mission.d"), href: "#/about", id: "mission", img: hero ? hero.src : "", credit: hero }].concat(feat.slice(0, 4));
    host.innerHTML = '<div class="slides">' + slides.map((s, i) =>
      '<article class="slide' + (s.img ? " has-img" : "") + (i ? "" : " on") + '" aria-roledescription="slide" aria-label="' + (i + 1) + " / " + slides.length + '"' + (i ? ' aria-hidden="true" inert' : "") + ">" +
      (s.img ? '<img class="slide-bg" src="' + esc(API.img(s.img, 1800)) + '" alt="">' : '<div class="slide-art" aria-hidden="true">' + (s.mission ? '<span class="sa sa0"></span><span class="sa sa1"></span><span class="sa sa2"></span>' : s.cover ? '<span class="slide-cover"><img src="' + esc(API.img(s.cover, 900)) + '" alt="" loading="lazy" decoding="async"></span>' : tile(s.id, true)) + "</div>") +
      '<div class="wrap slide-in"><div class="slide-copy"><p class="slide-cat">' + esc(s.cat) + "</p><h2>" + esc(s.title) + "</h2><p>" + esc(s.text) + '</p><a class="btn btn-light" href="' + esc(s.href) + '">' + esc(t("more")) + "</a></div></div>" + (s.credit && s.credit.credit ? '<p class="slide-credit">' + esc(t("photo.by")) + " " + esc(s.credit.credit) + "</p>" : "") + "</article>").join("") + "</div>" +
      '<div class="wrap slider-ctrl"><button type="button" class="sc-btn" id="scPrev" aria-label="' + esc(t("prev")) + '">' + svgI('<path d="m15 6-6 6 6 6"/>') + "</button>" +
      '<div class="dots" role="group">' + slides.map((s, i) => '<button type="button" class="dot" data-i="' + i + '" aria-label="' + (i + 1) + '" aria-current="' + (i === 0) + '"></button>').join("") + "</div>" +
      '<button type="button" class="sc-btn" id="scNext" aria-label="' + esc(t("next")) + '">' + svgI('<path d="m9 6 6 6-6 6"/>') + "</button>" +
      '<button type="button" class="sc-btn" id="scPause" aria-pressed="false"></button></div>';
    let cur = 0, paused = reduceMotion, hover = false;
    const go = i => {
      cur = (i + slides.length) % slides.length;
      host.querySelectorAll(".slide").forEach((el, k) => { const on = k === cur; el.classList.toggle("on", on); el.inert = !on; if (on) el.removeAttribute("aria-hidden"); else el.setAttribute("aria-hidden", "true"); });
      host.querySelectorAll(".dot").forEach((d, k) => d.setAttribute("aria-current", String(k === cur)));
    };
    host.querySelector("#scPrev").addEventListener("click", () => go(cur - 1));
    host.querySelector("#scNext").addEventListener("click", () => go(cur + 1));
    host.querySelector(".dots").addEventListener("click", e => { const d = e.target.closest(".dot"); if (d) go(Number(d.dataset.i)); });
    const pb = host.querySelector("#scPause");
    const setPause = p => { paused = p; pb.setAttribute("aria-pressed", String(p)); pb.setAttribute("aria-label", t(p ? "play" : "pause")); pb.innerHTML = svgI(p ? '<path d="M8 5l11 7-11 7z"/>' : '<path d="M9 6v12M15 6v12"/>'); };
    pb.addEventListener("click", () => setPause(!paused));
    setPause(paused);
    host.addEventListener("mouseenter", () => { hover = true; }); host.addEventListener("mouseleave", () => { hover = false; });
    host.addEventListener("focusin", () => { hover = true; }); host.addEventListener("focusout", () => { hover = false; });
    timers.push(setInterval(() => { if (!paused && !hover && !document.hidden) go(cur + 1); }, 7000));
  }

  /* ---------- latest feed with tabs ---------- */
  async function buildLatest(hostId, limit) {
    const host = document.getElementById(hostId);
    host.innerHTML = msg("loading");
    const [news, pubs, proj] = await Promise.all([safeList("news"), safeList("publications"), safeList("projects")]);
    if (!news && !pubs && !proj) { host.innerHTML = errMsg(); return; }
    const all = [].concat((news || []).map(r => toItem("news", r)), (pubs || []).map(r => toItem("publications", r)), (proj || []).map(r => toItem("projects", r))).sort(byDate);
    const tabs = [["all", "tab.all"], ["news", "tab.news"], ["publications", "tab.pubs"], ["projects", "tab.projects"]];
    host.innerHTML = '<div class="tabs" role="group">' + tabs.map((x, i) => '<button type="button" data-k="' + x[0] + '" aria-pressed="' + (i === 0) + '">' + esc(t(x[1])) + "</button>").join("") + '</div><ul class="cards" id="' + hostId + 'List"></ul>';
    const list = document.getElementById(hostId + "List");
    const draw = k => {
      host.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
      const sel = (k === "all" ? all : all.filter(i => i.type === k)).slice(0, limit);
      list.innerHTML = sel.length ? sel.map(card).join("") : msg("empty");
    };
    host.addEventListener("click", e => { const b = e.target.closest(".tabs button"); if (b) draw(b.dataset.k); });
    draw("all");
  }

  /* ---------- team with tabs ---------- */
  async function buildTeam(hostId) {
    const host = document.getElementById(hostId);
    host.innerHTML = msg("loading");
    const rows = await safeList("team");
    if (!rows) { host.innerHTML = errMsg(); return; }
    const sorted = rows.slice().sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    const groups = ["leadership", "experts", "associates"].filter(g => sorted.some(r => (r.group || "experts") === g));
    if (!groups.length) { host.innerHTML = msg("empty"); return; }
    host.innerHTML = '<div class="tabs" role="group">' + groups.map((g, i) => '<button type="button" data-g="' + g + '" aria-pressed="' + (i === 0) + '">' + esc(t("grp." + g)) + "</button>").join("") + '</div><ul class="people" id="' + hostId + 'List"></ul>';
    const list = document.getElementById(hostId + "List");
    const draw = g => {
      host.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === g)));
      list.innerHTML = sorted.filter(r => (r.group || "experts") === g).map(m => '<li class="person"><div class="person-photo">' +
        (m.photo_url ? media(m.photo_url, m.name, m.id, 500) : '<span class="initials" aria-hidden="true">' + esc((m.name || "?").replace(/[\[\]]/g, "").split(/\s+/).map(w => w[0] || "").slice(0, 2).join("")) + "</span>") +
        "</div><h3>" + esc(m.name) + '</h3><p class="person-role">' + esc(f(m, "role")) + "</p>" + (f(m, "bio") ? '<p class="person-bio">' + esc(f(m, "bio")) + "</p>" : "") + "</li>").join("");
    };
    host.addEventListener("click", e => { const b = e.target.closest(".tabs button"); if (b) draw(b.dataset.g); });
    draw(groups[0]);
  }

  /* ---------- partners (scrolling row when there are many) ---------- */
  /* ---------- partners & team experience ---------- */
  const CATS = ["gov", "un", "intl", "ngo", "uni"];
  const ord = (x, y) => (Number(x.order) || 999) - (Number(y.order) || 999);
  /* a logo only when permission is recorded (the API blanks it otherwise); else a typeset name tile */
  /* logo only, no caption: the full name stays in alt/title for screen readers and on hover.
     Without a permitted logo, the short name is set as a wordmark in the same box. */
  const orgTile = (r, hide) => {
    const inner = r.logo_url
      ? '<img class="org-img" src="' + esc(API.img(r.logo_url, 600)) + '" alt="' + (hide ? "" : esc(r.name)) + '" loading="lazy" decoding="async">'
      : '<span class="org-short" aria-hidden="true">' + esc(r.short || r.name) + '</span><span class="sr-only">' + esc(r.name) + "</span>";
    const attrs = ' title="' + esc(r.name) + '"' + (hide ? ' tabindex="-1"' : "");
    return '<li class="org' + (r.logo_url ? " has-logo" : "") + '" data-cat="' + esc(r.category || "") + '"' + (hide ? ' aria-hidden="true"' : "") + ">" +
      (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener"' + attrs + ">" + inner + "</a>" : "<div" + attrs + ">" + inner + "</div>") + "</li>";
  };
  /* optical sizing: wide and square logos get the same visual weight (equal area, capped by the box) */
  document.addEventListener("load", e => {
    const img = e.target;
    if (!img.classList || !img.classList.contains("org-img") || !img.naturalWidth) return;
    const r = img.naturalWidth / img.naturalHeight, area = 9600;
    let w = Math.sqrt(area * r), h = Math.sqrt(area / r);
    const box = img.parentElement.getBoundingClientRect(), maxW = Math.max(60, box.width - 36), maxH = Math.max(40, box.height - 30);
    const k = Math.min(1, maxW / w, maxH / h);
    img.style.width = Math.round(w * k) + "px"; img.style.height = Math.round(h * k) + "px";
  }, true);
  async function buildPartners() {
    const rows = (await safeList("partners") || []).slice().sort(ord);
    const mitra = rows.filter(r => r.relation === "mitra"), team = rows.filter(r => r.relation !== "mitra");
    const mHost = document.getElementById("partners"), eHost = document.getElementById("experience");
    if (mHost) {
      if (!mitra.length) mHost.closest("section").hidden = true;
      else {
        const scroll = mitra.length > 4 && !reduceMotion;
        mHost.innerHTML = '<ul class="orgs marquee' + (scroll ? " run" : "") + '">' + mitra.map(r => orgTile(r)).join("") + (scroll ? mitra.map(r => orgTile(r, true)).join("") : "") + "</ul>";
      }
    }
    if (eHost) {
      if (!team.length) { eHost.closest("section").hidden = true; return; }
      /* two rows that drift in opposite directions; pauses on hover */
      const half = Math.ceil(team.length / 2), rowsHtml = [team.slice(0, half), team.slice(half)].map((g, k) =>
        '<div class="orgs-lane"><ul class="orgs marquee' + (reduceMotion ? "" : " run" + (k ? " rev" : "")) + '">' + g.map(r => orgTile(r)).join("") + (reduceMotion ? "" : g.map(r => orgTile(r, true)).join("")) + "</ul></div>").join("");
      eHost.innerHTML = rowsHtml;
      const foot = document.getElementById("expFoot");
      if (foot) foot.innerHTML = "<span>" + esc(t("exp.count").replace("{n}", team.length)) + '</span><a class="btn-text" href="#/about" data-pillar="exp">' + esc(t("exp.more")) + "</a>";
    }
  }
  async function buildExperienceGrid(host) {
    const rows = (await safeList("partners") || []).filter(r => r.relation !== "mitra").sort(ord);
    if (!rows.length) { host.closest("section").hidden = true; return; }
    const cats = CATS.filter(c => rows.some(r => r.category === c));
    host.innerHTML = '<div class="tabs exp-tabs" role="tablist">' + ["all"].concat(cats).map((c, i) =>
      '<button type="button" role="tab" data-cat="' + c + '" aria-selected="' + (i === 0) + '">' + esc(c === "all" ? t("exp.all") : t("cat." + c)) + ' <small>' + (c === "all" ? rows.length : rows.filter(r => r.category === c).length) + "</small></button>").join("") + "</div>" +
      '<ul class="orgs org-grid">' + rows.map(r => orgTile(r)).join("") + "</ul>";
    host.querySelector(".exp-tabs").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      host.querySelectorAll(".exp-tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      host.querySelectorAll(".org-grid .org").forEach(li => { li.hidden = b.dataset.cat !== "all" && li.dataset.cat !== b.dataset.cat; });
    });
  }

  /* ---------- newsletter ---------- */
  function newsletter() {
    return '<section class="nl"><div class="wrap nl-in"><div><h2>' + esc(t("nl.t")) + "</h2><p>" + esc(t("nl.d")) + '</p></div><form class="nl-form" id="nlForm" novalidate>' +
      '<div class="nl-row"><label for="nlEmail" class="sr-only">' + esc(t("nl.ph")) + '</label><input id="nlEmail" type="email" name="email" autocomplete="email" placeholder="' + esc(t("nl.ph")) + '">' +
      '<button class="btn" type="submit">' + esc(t("nl.btn")) + "</button></div>" +
      '<div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<p class="nl-status" id="nlStatus" role="status"></p><a class="nl-privacy" href="#/privacy">' + esc(t("nl.privacy")) + "</a></form></div></section>";
  }
  function bindNewsletter() {
    const form = document.getElementById("nlForm"); if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const email = form.email.value.trim(), st = document.getElementById("nlStatus");
      st.className = "nl-status";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = t("form.invalidEmail"); st.classList.add("err"); form.email.focus(); return; }
      const btn = form.querySelector("button"); btn.disabled = true;
      try {
        const r = await API.post({ action: "subscribe", email, lang, website: form.website.value });
        if (!r.ok) throw new Error(r.error);
        form.reset(); st.textContent = t("nl.ok"); st.classList.add("ok");
      } catch (err) { st.textContent = t("nl.err"); st.classList.add("err"); }
      btn.disabled = false;
    });
  }

  const steps = () => '<ol class="steps">' + [1, 2, 3, 4].map(i => "<li><h3>" + esc(t("step" + i + ".t")) + "</h3><p>" + esc(t("step" + i + ".d")) + "</p></li>").join("") + "</ol>";
  const PILLARS = ["a", "r", "s", "c"];
  const pillars = (withLink, keys) => '<ul class="pillars' + ((keys || PILLARS).length === 4 ? " pillars-4" : "") + '">' + (keys || PILLARS).map(p => '<li class="pillar">' + (keys ? shape(p) : pillarIcon(p)) + "<h3>" + esc(t("p." + p + ".t")) + "</h3><p>" + esc(t("p." + p + ".d")) + "</p>" +
    (withLink ? '<ul class="pl-svcs">' + SV.filter(s => s.pillar === p).map(s => '<li class="hov"><a href="#/services" data-pillar="' + s.key + '">' + svcIcon(s.key) + "<span>" + esc(s[lang].t) + "</span></a></li>").join("") + "</ul>" +
      '<a href="#/services" data-pillar="' + p + '">' + esc(t("more")) + "</a>" : "") + "</li>").join("") + "</ul>";

  /* ---------- views ---------- */
  const views = {
    home() {
      app.innerHTML =
        '<section class="slider" id="slider" aria-roledescription="carousel" aria-label="CHARIS"></section>' +
        '<section class="highlight"><div class="wrap hl-in"><div class="hl-media">' + (photo("highlight") ? '<figure><img src="' + esc(API.img(photo("highlight").src, 1400)) + '" alt="' + esc(photo("highlight").alt || "") + '" decoding="async">' + credit(photo("highlight")) + "</figure>" : tile("highlight", true)) + '</div><div class="hl-copy"><h2>' + esc(t("hl.t")) + "</h2><p>" + esc(t("hl.d")) + "</p>" +
        '<div class="actions"><a class="btn" href="#/contact">' + esc(t("hl.cta")) + '</a><a class="btn-text" href="#/services" data-pillar="a">' + esc(t("hl.cta2")) + "</a></div></div></div></section>" +
        '<section class="sec"><div class="wrap">' + secHead(t("latest.t"), "#/latest") + '<div id="homeLatest"></div></div></section>' +
        '<section class="sec sec-tint"><div class="wrap">' + secHead(t("work.t"), "#/work") + '<p class="sec-lead">' + esc(t("work.lead")) + "</p>" + pillars(true) + "</div></section>" +
        '<section class="sec"><div class="wrap team-sec"><div class="team-intro">' + secHead(t("team.t"), "#/team") + "<p>" + esc(t("team.lead")) + '</p></div><div id="homeTeam"></div></div></section>' +
        '<section class="sec partners-sec"><div class="wrap">' + secHead(t("partners.t")) + '<div id="partners" class="partners"></div></div></section>' +
        '<section class="sec exp-sec"><div class="wrap">' + secHead(t("exp.t")) + '<p class="sec-lead">' + esc(t("exp.lead")) + '</p></div><div id="experience" class="experience"></div><div class="wrap"><p class="exp-foot" id="expFoot"></p></div></section>' +
        newsletter();
      buildSlider(); buildLatest("homeLatest", 6); buildTeam("homeTeam"); buildPartners(); bindNewsletter();
    },

    about() {
      app.innerHTML = pageTop(t("about.t")) + banner("about") +
        '<section class="sec"><div class="wrap about"><div class="prose"><p class="big">' + esc(t("about.lead")) + "</p><p>" + esc(t("about.p2")) + "</p><p>" + esc(t("about.p3")) + "</p></div>" +
        '<aside class="vm"><h2>' + esc(t("about.vision")) + "</h2><p>" + esc(t("about.vision.d")) + "</p><h2>" + esc(t("about.mission")) + "</h2><ol>" +
        [1, 2, 3].map(i => "<li>" + esc(t("mis" + i)) + "</li>").join("") + "</ol></aside></div></section>" +
        '<section class="sec sec-tint"><div class="wrap logo-mean"><img src="assets/img/logo-symbol.svg" alt="" width="160" height="160"><div><h2>' + esc(t("about.logo")) + "</h2>" + pillars(false, ["a", "r", "s"]) + "</div></div></section>" +
        '<section class="sec" id="experience-all"><div class="wrap">' + secHead(t("exp.t")) + '<p class="sec-lead">' + esc(t("exp.lead")) + '</p><div id="expGrid"></div><p class="exp-note">' + esc(t("exp.note")) + "</p></div></section>" +
        '<section class="sec sec-tint"><div class="wrap">' + secHead(t("steps.t")) + steps() + "</div></section>" + newsletter();
      bindNewsletter();
      const toExp = pendingPillar === "exp";
      buildExperienceGrid(document.getElementById("expGrid")).then(() => {
        if (toExp) requestAnimationFrame(() => document.getElementById("experience-all").scrollIntoView({ block: "start" }));
      });
    },

    async services(focus) {
      const jump = '<nav class="svc-jump" aria-label="' + esc(t("svc.jump")) + '"><div class="wrap"><ul>' + SV.map(s => '<li><a href="#/services" data-svc-jump="' + s.key + '">' + svcIcon(s.key, "ic-mini") + "<span>" + esc(s[lang].t) + "</span></a></li>").join("") + "</ul></div></nav>";
      app.innerHTML = pageTop(t("work.t"), t("work.page.lead")) + banner("services") + jump +
        '<section class="sec svc-sec"><div class="wrap">' + PILLARS.map(p =>
          '<section class="pgroup2" id="pillar-' + p + '"><header class="pgroup2-head">' + pillarIcon(p) + "<div><p class=\"pg-kicker\">" + esc(t("svc.pillar")) + '</p><h2>' + esc(t("p." + p + ".t")) + "</h2><p>" + esc(t("p." + p + ".d")) + "</p></div></header>" +
          SV.filter(s => s.pillar === p).map(s =>
            '<article class="svc" id="svc-' + s.key + '"><div class="svc-main"><div class="svc-head"><span class="ic-tile ic-tile-' + s.pillar + '">' + svcIcon(s.key) + "</span><h3>" + esc(s[lang].t) + "</h3></div><p>" + esc(s[lang].d) + '</p><p class="svc-label">' + esc(t("svc.scope")) + '</p><ul class="svc-scope">' + s[lang].items.map(i => "<li>" + esc(i) + "</li>").join("") + "</ul>" +
            '<p class="svc-links"><a class="btn-text" href="#/research" data-svc-repo="' + s.key + '">' + esc(t("svc.allRepo")) + '</a><a class="btn-text" href="#/projects" data-svc-proj="' + s.key + '">' + esc(t("svc.projects")) + "</a></p></div>" +
            '<div class="svc-out"><p class="svc-label">' + esc(t("svc.outputs")) + '</p><ol class="out-list">' + (s[lang].outputs || []).map(o => "<li><span>" + esc(o[0]) + "</span>" + (o[1] ? "<small>" + esc(o[1]) + "</small>" : "") + "</li>").join("") + "</ol></div>" +
            '<div class="svc-ex" data-ex="' + s.key + '"><p class="svc-label">' + esc(t("svc.examples")) + '</p><div class="ex-row">' + msg("loading") + "</div></div></article>").join("") +
          "</section>").join("") + "</div></section>" +
        '<section class="sec sec-tint"><div class="wrap">' + secHead(t("steps.t")) + steps() + '<p class="cta-line"><a class="btn" href="#/contact">' + esc(t("svc.ask")) + "</a></p></div></section>";
      const target = focus && (document.getElementById("svc-" + focus) || document.getElementById("pillar-" + focus));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      app.querySelector(".svc-jump").addEventListener("click", e => {
        const a = e.target.closest("[data-svc-jump]"); if (!a) return; e.preventDefault();
        const el = document.getElementById("svc-" + a.dataset.svcJump); if (el) el.scrollIntoView({ behavior: smoothOK() ? "smooth" : "auto", block: "start" });
      });
      /* highlight the service currently on screen in the jump bar */
      if ("IntersectionObserver" in window) {
        const links = [...app.querySelectorAll("[data-svc-jump]")];
        const spy = new IntersectionObserver(es => es.forEach(en => {
          if (!en.isIntersecting) return;
          links.forEach(l => { const on = "svc-" + l.dataset.svcJump === en.target.id; l.classList.toggle("on", on); if (on) l.scrollIntoView({ block: "nearest", inline: "nearest" }); });
        }), { rootMargin: "-35% 0px -60% 0px" });
        app.querySelectorAll(".svc").forEach(el => spy.observe(el));
      }
      let repo = [];
      try { repo = await API.repo(); } catch (e) { /* show empty states */ }
      app.querySelectorAll("[data-ex]").forEach(box => {
        const items = repo.filter(r => r.service === box.dataset.ex).sort((a, b) => b.sort_date.localeCompare(a.sort_date)).slice(0, 3);
        box.querySelector(".ex-row").innerHTML = items.length ? items.map(r =>
          '<div class="ex">' + '<div class="ex-cover">' + coverBox(r.thumb || r.cover, r.cover, f(r, "title"), r.id, r) + '</div><div class="ex-body"><p class="card-meta"><span class="card-cat">' + esc(typeLabel(r)) + "</span><time>" + fmtDate(r.date_published) + "</time></p>" +
          '<h4><a href="' + esc(r.url) + '">' + esc(f(r, "title")) + '</a></h4><p class="ex-act">' + (hasFlip(r) ? '<button type="button" class="link-btn"' + flipAttrs(r) + ">" + esc(t("flip.open").replace("{n}", r.preview.length)) + "</button>" : "") + '<a href="' + esc(r.url) + '">' + esc(t("repo.read")) + "</a></p></div></div>").join("")
          : '<p class="ex-empty">' + esc(t("svc.none")) + "</p>";
      });
    },

    async research(focus) {
      app.innerHTML = '<header class="page-top repo-top"><div class="wrap"><h1>' + esc(t("repo.t")) + "</h1><p>" + esc(t("repo.lead")) + '</p>' +
        '<form class="repo-search" id="repoSearch" role="search"><label for="repoQ" class="sr-only">' + esc(t("repo.search")) + '</label><input id="repoQ" type="search" placeholder="' + esc(t("repo.search")) + '" autocomplete="off"><button class="btn btn-light" type="submit">' + esc(t("repo.searchBtn")) + "</button></form>" +
        '<p class="repo-stats" id="repoStats"></p></div></header>' +
        '<section class="sec repo"><div class="wrap repo-in"><details class="facet-wrap" id="facetWrap" open><summary>' + esc(t("repo.filter")) + '</summary><aside class="facets" id="facets" aria-label="' + esc(t("repo.filter")) + '"></aside></details><div class="repo-main">' +
        '<div class="repo-bar"><p id="repoCount" role="status"></p><label class="sort">' + esc(t("repo.sort")) + ' <select id="repoSort"><option value="new">' + esc(t("repo.sort.new")) + '</option><option value="old">' + esc(t("repo.sort.old")) + '</option><option value="title">' + esc(t("repo.sort.title")) + "</option></select></label></div>" +
        '<div class="chips" id="repoChips"></div><ol class="repo-list" id="repoList">' + msg("loading") + "</ol>" +
        '<p class="repo-browse"><a href="repositori/">' + esc(t("repo.browse")) + "</a></p></div></div></section>" + newsletter();
      bindNewsletter();
      if (window.matchMedia("(max-width: 900px)").matches) document.getElementById("facetWrap").open = false;
      let rows;
      try { rows = await API.repo(); } catch (e) { document.getElementById("repoList").innerHTML = errMsg(); return; }
      const st = { q: "", type: new Set(), service: new Set(focus && rows.some(r => r.service === focus) ? [focus] : []), year: new Set(), sort: "new" };
      const yr = r => (r.date_published || "").slice(0, 4);
      const typeEn = {}; rows.forEach(r => { typeEn[r.type] = r.type_en || r.type; });
      const facetDefs = [["type", t("repo.f.type"), r => r.type, v => (lang === "en" ? typeEn[v] || v : v)], ["service", t("repo.f.topic"), r => r.service, v => serviceName(v)], ["year", t("repo.f.year"), yr, v => v]];
      const years = [...new Set(rows.map(yr))];
      document.getElementById("repoStats").textContent = rows.length + " " + t("repo.products") + (years.length ? ", " + (Math.min(...years) === Math.max(...years) ? Math.min(...years) : Math.min(...years) + (lang === "en" ? " to " : " sampai ") + Math.max(...years)) : "");
      const match = (r, skip) => {
        if (st.q) { const hay = [r.title_id, r.title_en, r.abstract_id, r.abstract_en, (r.keywords || []).join(" "), r.authors.map(a => a.name).join(" "), r.series, r.doi].join(" ").toLowerCase(); if (!st.q.split(/\s+/).every(w => hay.includes(w))) return false; }
        return facetDefs.every(([k, , get]) => k === skip || !st[k].size || st[k].has(String(get(r))));
      };
      const facets = document.getElementById("facets");
      function drawFacets() {
        facets.innerHTML = facetDefs.map(([k, label, get, show]) => {
          const counts = {};
          rows.filter(r => match(r, k)).forEach(r => { const v = String(get(r) || ""); if (v) counts[v] = (counts[v] || 0) + 1; });
          const all = [...new Set(rows.map(r => String(get(r) || "")).filter(Boolean))].sort((a, b) => k === "year" ? b.localeCompare(a) : show(a).localeCompare(show(b)));
          if (!all.length) return "";
          return '<fieldset class="facet"><legend>' + esc(label) + "</legend>" + all.map(v => '<label class="fopt"><input type="checkbox" data-f="' + k + '" value="' + esc(v) + '"' + (st[k].has(v) ? " checked" : "") + "><span>" + esc(show(v)) + '</span><span class="fcount">' + (counts[v] || 0) + "</span></label>").join("") + "</fieldset>";
        }).join("");
      }
      const list = document.getElementById("repoList");
      const authorsStr = a => a.length > 3 ? a.slice(0, 3).map(x => x.name).join(", ") + " et al." : a.map(x => x.name).join(", ");
      function draw() {
        let sel = rows.filter(r => match(r));
        sel = sel.slice().sort(st.sort === "old" ? (a, b) => a.sort_date.localeCompare(b.sort_date) : st.sort === "title" ? (a, b) => f(a, "title").localeCompare(f(b, "title")) : (a, b) => b.sort_date.localeCompare(a.sort_date));
        document.getElementById("repoCount").textContent = sel.length + " " + t("repo.results");
        const chips = []; facetDefs.forEach(([k, , , show]) => st[k].forEach(v => chips.push('<button type="button" data-chip="' + k + '" data-v="' + esc(v) + '">' + esc(show(v)) + ' <span aria-hidden="true">×</span><span class="sr-only">' + esc(t("repo.remove")) + "</span></button>")));
        if (st.q) chips.unshift('<button type="button" data-chip="q"><em>' + esc(st.q) + '</em> <span aria-hidden="true">×</span></button>');
        document.getElementById("repoChips").innerHTML = chips.length ? chips.join("") + '<button type="button" class="clear" data-chip="all">' + esc(t("repo.clear")) + "</button>" : "";
        list.innerHTML = sel.length ? sel.map(r => '<li class="ritem"><div class="ritem-cover">' + coverBox(r.thumb || r.cover, r.cover, f(r, "title"), r.id, r) + '</div><div class="ritem-body">' +
          '<p class="card-meta"><span class="card-cat">' + esc(typeLabel(r)) + "</span>" + (r.series ? "<span>" + esc(r.series) + "</span>" : "") + "<time>" + fmtDate(r.date_published) + "</time></p>" +
          '<h2><a href="' + esc(r.url) + '">' + esc(f(r, "title")) + "</a></h2><p class=\"ritem-auth\">" + esc(authorsStr(r.authors)) + '</p><p class="ritem-abs">' + esc(f(r, "abstract")) + "</p>" +
          '<p class="badges">' + (r.doi ? '<a class="badge doi" href="https://doi.org/' + esc(r.doi) + '">DOI ' + esc(r.doi) + "</a>" : "") + '<span class="badge open">' + esc(t("repo.html")) + "</span>" +
          '<span class="badge lock">' + esc(t("repo.pdfReq")) + "</span>" + ccBadge(r.license) + "</p>" +
          '<p class="ritem-stats" data-stats-for="' + esc(r.id) + '"></p>' +
          '<div class="ritem-act"><a class="btn btn-sm" href="' + esc(r.url) + '">' + esc(t("repo.read")) + "</a>" + '<a class="btn btn-sm btn-ghost" href="#/request/' + encodeURIComponent(r.id) + '">' + esc(t("repo.request")) + "</a>" + (hasFlip(r) ? '<button type="button" class="btn btn-sm btn-ghost"' + flipAttrs(r) + ">" + esc(t("flip.open").replace("{n}", r.preview.length)) + "</button>" : "") + shareBox(r.id, r.url, f(r, "title")) + "</div></div></li>").join("")
          : '<li class="state">' + esc(t("repo.none")) + "</li>";
        drawFacets();
        if (CS) CS.paint();
      }
      facets.addEventListener("change", e => { const c = e.target.closest("[data-f]"); if (!c) return; const s = st[c.dataset.f]; c.checked ? s.add(c.value) : s.delete(c.value); draw(); });
      document.getElementById("repoChips").addEventListener("click", e => {
        const b = e.target.closest("[data-chip]"); if (!b) return;
        const k = b.dataset.chip;
        if (k === "all") { st.q = ""; document.getElementById("repoQ").value = ""; facetDefs.forEach(([fk]) => st[fk].clear()); }
        else if (k === "q") { st.q = ""; document.getElementById("repoQ").value = ""; }
        else st[k].delete(b.dataset.v);
        draw();
      });
      document.getElementById("repoSort").addEventListener("change", e => { st.sort = e.target.value; draw(); });
      const qi = document.getElementById("repoQ");
      document.getElementById("repoSearch").addEventListener("submit", e => { e.preventDefault(); st.q = qi.value.trim().toLowerCase(); draw(); });
      qi.addEventListener("input", () => { st.q = qi.value.trim().toLowerCase(); draw(); });
      draw();
    },

    async request(id) {
      app.innerHTML = pageTop(t("req.t"), t("req.lead")) + '<section class="sec"><div class="wrap req">' + msg("loading") + "</div></section>";
      let rows = []; try { rows = await API.repo(); } catch (e) { /* show form anyway */ }
      const r = rows.find(x => x.id === id);
      const box = app.querySelector(".req");
      if (!r) { box.innerHTML = '<p class="state">' + esc(t("req.notfound")) + ' <a href="#/research">' + esc(t("repo.t")) + "</a></p>"; return; }
      box.innerHTML = '<aside class="req-item">' + (r.thumb || r.cover ? '<div class="req-cover">' + coverBox(r.thumb || r.cover, r.cover, f(r, "title"), r.id, r) + "</div>" : "") + '<p class="card-meta"><span class="card-cat">' + esc(typeLabel(r)) + "</span><time>" + fmtDate(r.date_published) + "</time></p><h2>" + esc(f(r, "title")) + "</h2>" +
        "<p>" + esc(r.authors.map(a => a.name).join(", ")) + "</p>" + (r.doi ? '<p>DOI <a href="https://doi.org/' + esc(r.doi) + '">' + esc(r.doi) + "</a></p>" : "") +
        '<a href="' + esc(r.url) + '">' + esc(t("repo.readOpen")) + "</a></aside>" +
        '<form class="form" id="reqForm" novalidate><input type="hidden" name="report_id" value="' + esc(r.id) + '"><input type="hidden" name="report_title" value="' + esc(r.title_id) + '">' +
        field("name", "text", true) + '<div class="field"><label for="f-institution">' + esc(t("req.inst")) + ' <span class="req" aria-hidden="true">*</span></label><input id="f-institution" name="institution" type="text" autocomplete="organization" required><p class="field-err" id="e-institution"></p></div>' +
        field("email", "email", true) +
        '<div class="field"><label for="f-reason">' + esc(t("req.reason")) + ' <span class="req" aria-hidden="true">*</span></label><p class="hint" id="h-reason">' + esc(t("req.reasonHint")) + '</p><textarea id="f-reason" name="reason" rows="5" aria-describedby="h-reason" required></textarea><p class="field-err" id="e-reason"></p></div>' +
        '<div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
        '<p class="consent">' + esc(t("form.consent")) + ' <a href="#/privacy">' + esc(t("f.privacy")) + "</a>.</p>" +
        '<div class="form-end"><button class="btn" type="submit" id="reqBtn">' + esc(t("req.submit")) + '</button><p class="form-status" id="reqStatus" role="status"></p></div>' +
        '<p class="hint">' + esc(t("req.haveAccess")) + ' <a href="#/member">' + esc(t("mem.signin")) + "</a></p></form>";
      document.getElementById("reqForm").addEventListener("submit", async e => {
        e.preventDefault();
        const form = e.target, data = Object.fromEntries(new FormData(form).entries());
        let ok = true;
        const setErr = (n, m) => { const el = document.getElementById("e-" + n); if (el) el.textContent = m || ""; const inp = document.getElementById("f-" + n); if (inp) inp.setAttribute("aria-invalid", m ? "true" : "false"); };
        ["name", "institution", "email", "reason"].forEach(n => { if (!String(data[n] || "").trim()) { setErr(n, t("form.required")); ok = false; } else setErr(n, ""); });
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setErr("email", t("form.invalidEmail")); ok = false; }
        if (data.reason && data.reason.trim().length < 20) { setErr("reason", t("req.reasonShort")); ok = false; }
        if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
        const btn = document.getElementById("reqBtn"), s = document.getElementById("reqStatus");
        btn.disabled = true; btn.textContent = t("form.sending"); s.className = "form-status"; s.textContent = "";
        try {
          const res = await API.post(Object.assign({ action: "requestReport", lang }, data));
          if (!res.ok) throw new Error(res.error);
          if (res.demo) { s.textContent = t("req.demo"); s.classList.add("err"); btn.disabled = false; btn.textContent = t("req.submit"); return; }
          form.innerHTML = '<div class="req-done"><h2>' + esc(t("req.doneT")) + "</h2><p>" + esc(res.duplicate ? t("req.dup") : t("req.doneD")) + '</p><p><a href="' + esc(r.url) + '">' + esc(t("repo.readOpen")) + '</a><a href="#/research">' + esc(t("repo.t")) + "</a></p></div>";
        } catch (err) { s.textContent = t("form.err"); s.classList.add("err"); btn.disabled = false; btn.textContent = t("req.submit"); }
      });
    },

    async member() {
      let mt = null; try { mt = sessionStorage.getItem("charis_mtoken"); } catch (e) {}
      app.innerHTML = pageTop(t("mem.t"), t("mem.lead")) + '<section class="sec"><div class="wrap mem" id="mem"></div></section>';
      const box = document.getElementById("mem");
      const showLogin = (note) => {
        box.innerHTML = '<form class="form mem-login" id="memLogin" novalidate><h2>' + esc(t("mem.signin")) + "</h2>" + (note ? '<p class="form-status err">' + esc(note) + "</p>" : "") +
          field("email", "email", true) + '<div class="field"><label for="f-code">' + esc(t("mem.code")) + ' <span class="req" aria-hidden="true">*</span></label><input id="f-code" name="code" type="text" autocomplete="one-time-code" autocapitalize="characters" required><p class="field-err" id="e-code"></p></div>' +
          '<div class="form-end"><button class="btn" type="submit" id="memBtn">' + esc(t("mem.signin")) + '</button><p class="form-status" id="memStatus" role="status"></p></div>' +
          '<p class="hint"><button type="button" class="linkish" id="newCode">' + esc(t("mem.newCode")) + "</button></p></form>" +
          '<aside class="mem-help"><h2>' + esc(t("mem.howT")) + "</h2><ol><li>" + esc(t("mem.how1")) + "</li><li>" + esc(t("mem.how2")) + "</li><li>" + esc(t("mem.how3")) + '</li></ol><a class="btn btn-ghost" href="#/research">' + esc(t("repo.t")) + "</a>" +
          (API.isDemo ? '<p class="hint">' + esc(t("mem.demo")) + "</p>" : "") + "</aside>";
        const form = document.getElementById("memLogin");
        form.addEventListener("submit", async e => {
          e.preventDefault();
          const email = form.email.value.trim(), code = form.code.value.trim(), s = document.getElementById("memStatus");
          s.className = "form-status"; s.textContent = "";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !code) { s.textContent = t("mem.fill"); s.classList.add("err"); return; }
          const btn = document.getElementById("memBtn"); btn.disabled = true;
          try {
            const r = await API.post({ action: "memberLogin", email, code });
            if (!r.ok) throw new Error(r.error);
            mt = r.mtoken; try { sessionStorage.setItem("charis_mtoken", mt); } catch (er) {}
            showLibrary();
          } catch (err) { s.textContent = t(err.message === "locked" ? "mem.locked" : "mem.invalid"); s.classList.add("err"); btn.disabled = false; }
        });
        document.getElementById("newCode").addEventListener("click", async () => {
          const email = form.email.value.trim(), s = document.getElementById("memStatus");
          s.className = "form-status";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { s.textContent = t("mem.emailFirst"); s.classList.add("err"); form.email.focus(); return; }
          await API.post({ action: "memberNewCode", email }).catch(() => {});
          s.textContent = t("mem.codeSent"); s.classList.add("ok");
        });
      };
      async function showLibrary() {
        box.innerHTML = msg("loading");
        let r;
        try { r = await API.post({ action: "memberLibrary", mtoken: mt }); if (!r.ok) throw new Error(r.error); }
        catch (e) { try { sessionStorage.removeItem("charis_mtoken"); } catch (er) {} showLogin(t("mem.expired")); return; }
        const stLabel = s => t("mem.st." + s);
        box.innerHTML = '<div class="mem-lib"><div class="mem-head"><div><h2>' + esc(t("mem.hello")) + " " + esc(r.name || "") + '</h2><p class="hint">' + esc(r.email || "") + '</p></div><button type="button" class="btn btn-ghost" id="memOut">' + esc(t("mem.signout")) + "</button></div>" +
          (r.data.length ? '<ul class="mem-list">' + r.data.map(x => '<li><div><h3>' + esc(x.title) + '</h3><p class="card-meta"><span class="pill st-' + esc(x.status) + '">' + esc(stLabel(x.status)) + "</span><span>" + esc(x.report_id) + "</span></p></div>" +
            (x.status === "disetujui" ? (x.available ? '<button type="button" class="btn btn-sm" data-dl="' + esc(x.report_id) + '">' + esc(t("download")) + "</button>" : '<span class="hint">' + esc(t("mem.preparing")) + "</span>") : "") + "</li>").join("") + "</ul>"
            : msg("empty")) + '<p class="mem-more"><a href="#/research">' + esc(t("mem.more")) + '</a></p><p class="form-status" id="dlStatus" role="status"></p></div>';
        document.getElementById("memOut").addEventListener("click", () => { API.post({ action: "memberLogout", mtoken: mt }).catch(() => {}); try { sessionStorage.removeItem("charis_mtoken"); } catch (e) {} mt = null; showLogin(); });
        box.querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", async () => {
          const s = document.getElementById("dlStatus"); s.className = "form-status"; s.textContent = t("mem.dlWait"); b.disabled = true;
          try {
            const d = await API.post({ action: "memberDownload", mtoken: mt, report_id: b.dataset.dl });
            if (!d.ok) throw new Error(d.error);
            const bin = atob(d.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([bytes], { type: d.mimeType || "application/pdf" }));
            const a = document.createElement("a"); a.href = url; a.download = d.name; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            s.textContent = t("mem.dlDone"); s.classList.add("ok");
          } catch (err) { s.textContent = t(err.message === "demo" ? "mem.dlDemo" : "mem.dlErr"); s.classList.add("err"); }
          b.disabled = false;
        }));
      }
      if (mt) showLibrary(); else showLogin();
    },

    async projects(focus, pid) {
      app.innerHTML = pageTop(t("nav.projects"), t("projects.lead")) +
        '<section class="sec"><div class="wrap"><div class="proj-filters"><div class="filters" id="projFilters" role="group" aria-label="' + esc(t("proj.f.service")) + '"></div>' +
        '<label class="sort">' + esc(t("proj.f.client")) + ' <select id="projClient"><option value="">' + esc(t("filter.all")) + "</option></select></label></div>" +
        '<p class="proj-count" id="projCount" role="status"></p><ul class="proj-list2" id="projList"></ul><p class="proj-note">' + esc(t("proj.note")) + "</p></div></section>" + newsletter();
      bindNewsletter();
      const [rows, repo, pcov] = await Promise.all([safeList("projects"), API.repo().catch(() => []), API.portfolioCovers().catch(() => ({}))]);
      const list = document.getElementById("projList");
      if (!rows) { list.innerHTML = errMsg(); return; }
      rows.sort((a, b) => String(b.date || b.year_start || "").localeCompare(String(a.date || a.year_start || "")));
      const keys = ["all"].concat(SV.map(s => s.key).filter(k => rows.some(r => r.service === k)));
      const ctypes = [...new Set(rows.map(r => r.client_type).filter(Boolean))].sort();
      const sel = document.getElementById("projClient");
      sel.innerHTML += ctypes.map(c => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("");
      const filt = document.getElementById("projFilters");
      let svcK = focus && keys.includes(focus) ? focus : "all";
      if (pid && !rows.some(r => r.id === pid)) pid = null;
      const years = r => r.year_start && r.year_end && String(r.year_start) !== String(r.year_end) ? r.year_start + (lang === "en" ? " to " : " sampai ") + r.year_end : (r.year_start || r.year_end || "");
      const roleLabel = v => { const k = "role." + v, x = t(k); return x === k ? v : x; };
      const row = (label, val) => val ? "<div><dt>" + esc(label) + "</dt><dd>" + esc(val) + "</dd></div>" : "";
      const item = r => {
        const named = r.disclosure === "A" || r.disclosure === "B";
        const pubs = String(r.related_publications || "").split(",").map(x => x.trim()).filter(Boolean).map(id => repo.find(p => p.id === id)).filter(Boolean);
        const comp = t("comp." + (r.component || ""));
        const cv = named && pcov[r.id];                       /* GitHub covers only for levels A and B */
        return '<li class="pj" id="pj-' + esc(r.id) + '">' + (cv ? '<div class="pj-media pj-cover">' + coverBox(cv.thumb, cv.cover, f(r, "title"), r.id) + "</div>"
          : named && r.image_url ? '<div class="pj-media">' + media(r.image_url, f(r, "title"), r.id, 800) + "</div>" : "") +
          '<div class="pj-body"><p class="card-meta"><span class="card-cat">' + esc(serviceName(r.service)) + "</span>" + (r.component ? "<span>" + esc(comp) + "</span>" : "") +
          '<span class="pj-status st-' + esc(r.status || "") + '">' + esc(t("proj.st." + (r.status || "selesai"))) + "</span>" +
          (/sebelum CHARIS/i.test(r.role || "") ? '<span class="pj-prior" title="' + esc(t("proj.prior.d")) + '">' + esc(t("proj.prior")) + "</span>" : "") + "</p>" +
          "<h3>" + esc(f(r, "title")) + "</h3>" +
          '<p class="pj-client">' + esc(named && r.client ? r.client : r.client_type || "") + (named && r.location_detail ? ", " + esc(r.location_detail) : "") + (r.region ? ", " + esc(r.region) : "") + (years(r) ? ", " + esc(years(r)) : "") + "</p>" +
          "<p>" + esc(f(r, "summary")) + "</p>" +
          '<dl class="pj-facts">' + row(t("proj.role"), roleLabel(r.role)) + row(t("proj.duration"), r.duration_months ? r.duration_months + " " + t("proj.months") : "") +
          row(t("proj.methods"), f(r, "methods")) + row(t("proj.outputs"), f(r, "outputs")) + row(t("proj.capacity"), f(r, "capacity")) +
          (named ? row(t("proj.funder"), r.funder) + row(t("proj.partners"), r.partners) : "") + row("SDG", r.sdg) + "</dl>" +
          (named && f(r, "testimonial") ? '<blockquote class="pj-quote"><p>' + esc(f(r, "testimonial")) + "</p>" + (r.testimonial_by ? "<cite>" + esc(r.testimonial_by) + "</cite>" : "") + "</blockquote>" : "") +
          (pubs.length ? '<p class="pj-pubs"><span>' + esc(t("proj.pubs")) + ":</span> " + pubs.map(p => '<a href="' + esc(p.url) + '">' + esc(f(p, "title")) + "</a>").join("; ") + "</p>" : "") +
          (r.keywords ? '<p class="badges">' + String(r.keywords).split(",").map(k => k.trim()).filter(Boolean).map(k => '<span class="badge">' + esc(k) + "</span>").join("") + "</p>" : "") +
          '<div class="pj-share">' + shareBox(r.id, absHash("#/projects/" + encodeURIComponent(r.id)), f(r, "title")) + "</div></div></li>";
      };
      const draw = () => {
        filt.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === svcK)));
        const out = rows.filter(r => (svcK === "all" || r.service === svcK) && (!sel.value || r.client_type === sel.value));
        document.getElementById("projCount").textContent = out.length + " " + t("proj.count");
        list.innerHTML = out.length ? out.map(item).join("") : msg("empty");
        if (pid) {   /* opened from a shared link: bring that project into view */
          const el = document.getElementById("pj-" + pid);
          if (el) { app.dataset.keep = "1"; el.classList.add("pj-focus"); requestAnimationFrame(() => el.scrollIntoView({ block: "start" })); setTimeout(() => { delete app.dataset.keep; }, 800); }
          pid = null;
        }
      };
      filt.innerHTML = keys.map(k => '<button type="button" data-k="' + k + '">' + esc(k === "all" ? t("filter.all") : serviceName(k)) + "</button>").join("");
      filt.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { svcK = b.dataset.k; draw(); } });
      sel.addEventListener("change", draw);
      draw();
    },

    async latest() {
      app.innerHTML = pageTop(t("nav.latest"), t("latest.lead")) + '<section class="sec"><div class="wrap"><div class="filters" id="newsFilters" role="group"></div><ul class="cards" id="newsList"></ul></div></section>' + newsletter();
      bindNewsletter();
      const rows0 = await safeList("news");
      const list = document.getElementById("newsList");
      if (!rows0) { list.innerHTML = errMsg(); return; }
      const rows = rows0.slice().sort(byDate);
      const cats = ["all"].concat([...new Set(rows.map(r => r.category).filter(Boolean))]);
      const filt = document.getElementById("newsFilters");
      const draw = k => {
        filt.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
        const sel = k === "all" ? rows : rows.filter(r => r.category === k);
        list.innerHTML = sel.length ? sel.map(r => card(toItem("news", r))).join("") : msg("empty");
      };
      filt.innerHTML = cats.map(k => '<button type="button" data-k="' + esc(k) + '">' + esc(k === "all" ? t("filter.all") : k) + "</button>").join("");
      filt.addEventListener("click", e => { const b = e.target.closest("button"); if (b) draw(b.dataset.k); });
      draw("all");
    },

    async article(id) {
      app.innerHTML = '<section class="sec"><div class="wrap narrow">' + msg("loading") + "</div></section>";
      const rows = await safeList("news");
      if (!rows) { app.innerHTML = '<section class="sec"><div class="wrap narrow">' + errMsg() + "</div></section>"; return; }
      const n = rows.find(r => String(r.id) === id);
      if (!n) { app.innerHTML = '<section class="sec"><div class="wrap narrow">' + msg("empty") + "</div></section>"; return; }
      document.title = f(n, "title") + " | CHARIS";
      app.innerHTML = '<article class="sec"><div class="wrap narrow"><a class="back" href="#/latest">' + esc(t("back")) + '</a><p class="card-meta"><span class="card-cat">' + esc(n.category || t("type.news")) + "</span><time>" + fmtDate(n.date) + "</time></p>" +
        '<h1 class="article-h">' + esc(f(n, "title")) + "</h1>" + (n.image_url ? '<figure class="article-img">' + media(n.image_url, f(n, "title"), n.id, 1600) + "</figure>" : "") +
        '<div class="prose">' + paras(f(n, "body")) + '</div><div class="share-row"><span>' + esc(t("share.this")) + "</span>" + shareBox(String(n.id), absHash("#/latest/" + encodeURIComponent(n.id)), f(n, "title")) + "</div></div></article>" + newsletter();
      bindNewsletter();
      if (CS) CS.track(String(n.id), "read");
    },

    team() {
      app.innerHTML = pageTop(t("team.t"), t("team.lead")) + '<section class="sec"><div class="wrap"><div id="pageTeam"></div></div></section>';
      buildTeam("pageTeam");
    },

    contact() {
      const opts = SV.map(s => '<option value="' + s.key + '">' + esc(s[lang].t) + "</option>").join("") + '<option value="other">' + esc(t("form.other")) + "</option>";
      const L = lang === "id" ? ["Alamat", "Email", "Telepon"] : ["Address", "Email", "Phone"];
      app.innerHTML = pageTop(t("nav.contact"), t("contact.lead")) +
        '<section class="sec"><div class="wrap contact"><form class="form" id="contactForm" novalidate>' +
        field("name", "text", true) + field("org", "text", false) + '<div class="row2">' + field("email", "email", true) + field("phone", "tel", false) + "</div>" +
        '<div class="field"><label for="f-service">' + esc(t("form.service")) + '</label><select id="f-service" name="service"><option value="">' + esc(t("form.choose")) + "</option>" + opts + "</select></div>" +
        '<div class="field"><label for="f-message">' + esc(t("form.message")) + ' <span class="req" aria-hidden="true">*</span></label><textarea id="f-message" name="message" rows="6" required></textarea><p class="field-err" id="e-message"></p></div>' +
        '<div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="consent">' + esc(t("form.consent")) + ' <a href="#/privacy">' + esc(t("f.privacy")) + "</a>.</p>" +
        '<div class="form-end"><button type="submit" class="btn" id="sendBtn">' + esc(t("form.submit")) + '</button><p class="form-status" id="formStatus" role="status"></p></div></form>' +
        '<aside class="contact-side"><dl><div><dt>' + L[0] + "</dt><dd>" + esc(cfg.ADDRESS) + "</dd></div><div><dt>" + L[1] + "</dt><dd>" + esc(cfg.CONTACT_EMAIL) + "</dd></div><div><dt>" + L[2] + "</dt><dd>" + esc(cfg.CONTACT_PHONE) + "</dd></div></dl></aside></div></section>";
      document.getElementById("contactForm").addEventListener("submit", submitContact);
    },

    privacy() {
      app.innerHTML = pageTop(t("privacy.t")) + '<section class="sec"><div class="wrap narrow prose">' + paras(t("privacy.body")) + "</div></section>";
    },

    async search(q) {
      const term = (q || "").trim();
      app.innerHTML = pageTop(t("search.t"), term ? t("search.for") + ": " + term : "") + '<section class="sec"><div class="wrap"><ul class="cards" id="searchList">' + msg("loading") + "</ul></div></section>";
      document.getElementById("q").value = term;
      const [news, pubs, proj] = await Promise.all([safeList("news"), safeList("publications"), safeList("projects")]);
      const ql = term.toLowerCase();
      const hit = (r, fields) => fields.some(k => String(r[k] || "").toLowerCase().includes(ql));
      const res = [].concat(
        (news || []).filter(r => hit(r, ["title_id", "title_en", "excerpt_id", "excerpt_en", "body_id", "body_en"])).map(r => toItem("news", r)),
        (pubs || []).filter(r => hit(r, ["title_id", "title_en", "summary_id", "summary_en", "category", "series", "doi"])).map(r => toItem("publications", r)),
        (proj || []).filter(r => hit(r, ["title_id", "title_en", "summary_id", "summary_en", "client", "location"])).map(r => toItem("projects", r))
      ).sort(byDate);
      document.getElementById("searchList").innerHTML = term && res.length ? res.map(card).join("") : '<p class="state">' + esc(t("search.none")) + "</p>";
    }
  };

  function field(name, type, req) {
    return '<div class="field"><label for="f-' + name + '">' + esc(t("form." + name)) + (req ? ' <span class="req" aria-hidden="true">*</span>' : "") + "</label>" +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '"' + (req ? " required" : "") + ' autocomplete="' + ({ name: "name", email: "email", phone: "tel", org: "organization" }[name] || "off") + '">' +
      '<p class="field-err" id="e-' + name + '"></p></div>';
  }

  async function submitContact(e) {
    e.preventDefault();
    const form = e.target, data = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    const setErr = (n, m) => { const el = document.getElementById("e-" + n); if (el) el.textContent = m || ""; const inp = document.getElementById("f-" + n); if (inp) inp.setAttribute("aria-invalid", m ? "true" : "false"); };
    ["name", "email", "message"].forEach(n => { if (!String(data[n] || "").trim()) { setErr(n, t("form.required")); ok = false; } else setErr(n, ""); });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setErr("email", t("form.invalidEmail")); ok = false; }
    if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
    const btn = document.getElementById("sendBtn"), status = document.getElementById("formStatus");
    btn.disabled = true; btn.textContent = t("form.sending"); status.textContent = ""; status.className = "form-status";
    try {
      const res = await API.post(Object.assign({ action: "contact", lang: lang }, data));
      if (!res.ok) throw new Error(res.error || "failed");
      if (res.demo) { status.textContent = t("form.demo"); status.classList.add("err"); btn.disabled = false; btn.textContent = t("form.submit"); return; }
      form.reset(); status.textContent = t("form.ok"); status.classList.add("ok");
    } catch (err) { status.textContent = t("form.err"); status.classList.add("err"); }
    btn.disabled = false; btn.textContent = t("form.submit");
  }
  document.addEventListener("input", e => { if (e.target.matches("[aria-invalid='true']")) { e.target.setAttribute("aria-invalid", "false"); const el = document.getElementById("e-" + e.target.name); if (el) el.textContent = ""; } });

  /* lightbox for covers */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-zoom]"); if (!b) return;
    const d = document.createElement("dialog"); d.className = "zoom";
    d.setAttribute("aria-label", b.dataset.alt || "");
    d.innerHTML = '<img src="' + esc(b.dataset.zoom) + '" alt="' + esc(b.dataset.alt || "") + '"><button type="button" class="zoom-x" aria-label="' + esc(t("cover.close")) + '">×</button>';
    document.body.appendChild(d); d.showModal();
    const close = () => { if (d.open) d.close(); d.remove(); b.focus(); };
    d.querySelector(".zoom-x").addEventListener("click", close);
    d.addEventListener("click", ev => { if (ev.target === d) close(); });
    d.addEventListener("close", () => d.remove());
  });

  let pendingPillar = null;
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-pillar],[data-svc-repo],[data-svc-proj]"); if (!a) return;
    pendingPillar = a.dataset.pillar || a.dataset.svcRepo || a.dataset.svcProj;
  });
  const smoothOK = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toTop = () => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; };
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  /* clicking a link to the page you are already on: go back to the top */
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href^='#']"); if (!a || e.defaultPrevented || a.hasAttribute("data-svc-jump")) return;
    const norm = h => h.replace(/^#\/?/, "") || "home";
    if (norm(a.getAttribute("href")) === norm(location.hash || "#/")) { e.preventDefault(); window.scrollTo({ top: 0, behavior: smoothOK() ? "smooth" : "auto" }); closeMenu(); }
  });

  /* ---------- router ---------- */
  function route() {
    timers.forEach(clearInterval); timers = [];
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    let [page, ...rest] = h.split("/");
    let id = rest.join("/");
    const m = page.match(/^(latest|search|request)-(.+)$/);   /* artifact-safe form: #latest-n1 */
    if (m) { page = m[1]; id = m[2]; }
    document.title = "CHARIS | Center for Health Analytics, Research and Integrated Services";
    const navPage = page === "work" ? "services" : page;
    document.querySelectorAll(".main-nav a:not(.nav-cta)").forEach(a => {
      const on = a.getAttribute("href").replace("#/", "#") === "#" + navPage;
      a.classList.toggle("active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (page === "work") page = "services";                   /* old address keeps working */
    toTop();
    progress();
    topBtn.setAttribute("aria-label", t("totop"));
    let out;
    if (page === "latest" && id) out = views.article(decodeURIComponent(id));
    else if (page === "search") out = views.search(decodeURIComponent(id || ""));
    else if (page === "request") out = views.request(decodeURIComponent(id || ""));
    else if (page === "projects" && id) out = views.projects(null, decodeURIComponent(id));
    else if (page === "services" || page === "research" || page === "projects") out = views[page](pendingPillar);
    else out = (views[page] || views.home)();
    const focusing = pendingPillar && page === "services";
    pendingPillar = null;
    closeMenu();
    app.classList.remove("page-in"); void app.offsetWidth; app.classList.add("page-in");
    if (!focusing) { toTop(); Promise.resolve(out).then(() => { if (!focusing && window.scrollY > 0 && !app.dataset.keep) toTop(); }); }
    reveal();
    Promise.resolve(out).then(reveal);
  }

  /* ---------- motion: page progress bar, reveal on scroll, header state, back to top ---------- */
  const bar = document.createElement("div"); bar.className = "route-bar"; document.body.appendChild(bar);
  function progress() { bar.classList.remove("go"); void bar.offsetWidth; bar.classList.add("go"); }
  const io = "IntersectionObserver" in window && smoothOK() ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" }) : null;
  function reveal() {
    if (!io) return;
    app.querySelectorAll(".sec .wrap > *:not(.rv), .card:not(.rv), .ritem:not(.rv), .pj:not(.rv), .svc:not(.rv), .pillar:not(.rv), .member:not(.rv)").forEach((el, i) => {
      el.classList.add("rv");
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");   /* already on screen: show at once */
      else { el.style.transitionDelay = (i % 3) * 60 + "ms"; io.observe(el); }
    });
  }
  const header = document.querySelector(".site-header");
  const topBtn = document.createElement("button");
  topBtn.type = "button"; topBtn.className = "to-top"; topBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(topBtn);
  topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: smoothOK() ? "smooth" : "auto" }));
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { const y = window.scrollY; if (header) header.classList.toggle("scrolled", y > 8); topBtn.classList.toggle("show", y > 600); ticking = false; });
  }, { passive: true });

  /* ---------- chrome ---------- */
  const menuBtn = document.getElementById("menuBtn"), nav = document.getElementById("mainNav");
  function closeMenu() { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => { const o = nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", String(o)); });
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  document.getElementById("siteSearch").addEventListener("submit", e => {
    e.preventDefault();
    const v = document.getElementById("q").value.trim();
    if (v) location.hash = "#/search/" + encodeURIComponent(v);
  });

  const SOC = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>'
  };
  document.getElementById("social").innerHTML = Object.keys(SOC).filter(k => cfg.SOCIAL && cfg.SOCIAL[k]).map(k =>
    '<li><a href="' + esc(cfg.SOCIAL[k]) + '" target="_blank" rel="noopener" aria-label="' + k + '">' + svgI(SOC[k]) + "</a></li>").join("");
  document.getElementById("footerAddr").textContent = cfg.ADDRESS || "";
  document.getElementById("footerMail").textContent = cfg.CONTACT_EMAIL || "";
  document.getElementById("footerPhone").textContent = cfg.CONTACT_PHONE || "";
  document.getElementById("footerNib").textContent = cfg.NIB || "";
  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  setLang(lang);
})();
