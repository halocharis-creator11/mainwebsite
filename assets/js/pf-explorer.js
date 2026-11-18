/* CHARIS portfolio explorer: OpenStreetMap-based map (Leaflet) with a searchable, filterable project list.
   Selecting a project hatches the provinces or countries it covers; clicking a province filters the list.
   Boundaries: Natural Earth (public domain), simplified. Basemap: CARTO Positron, built on OpenStreetMap data. */
window.CharisPFExplorer = function (host, ctx) {
  "use strict";
  const { rows, t, f, esc, lang, serviceName, svcIcon, svcColor, years, roleLabel, coverBox, shareBox, absHash, repo, pcov, SV } = ctx;
  const T2 = (id, en) => (lang === "en" ? en : id);
  const L = window.L;
  const svgI = d => '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
  const IC = {
    client: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>', place: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    time: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>', partner: '<path d="M8 11l3 3 6-6"/><path d="M3 12l4-4 4 4M21 12l-4-4-4 4"/>'
  };

  /* ---------- free text to provinces / countries ---------- */
  const PROV = {
    "ID-AC": ["aceh", "nanggroe aceh"], "ID-SU": ["sumatera utara", "sumut", "medan"], "ID-SB": ["sumatera barat", "sumbar", "padang"], "ID-RI": ["riau", "pekanbaru"],
    "ID-KR": ["kepulauan riau", "kepri", "batam"], "ID-JA": ["jambi"], "ID-SS": ["sumatera selatan", "sumsel", "palembang"], "ID-BE": ["bengkulu"], "ID-LA": ["lampung"],
    "ID-BB": ["bangka belitung", "bangka-belitung", "babel", "bangka", "belitung"], "ID-JK": ["dki jakarta", "jakarta", "dki"], "ID-JB": ["jawa barat", "jabar", "bandung", "bogor", "bekasi", "depok"],
    "ID-JT": ["jawa tengah", "jateng", "semarang", "solo"], "ID-YO": ["di yogyakarta", "yogyakarta", "diy", "jogja"], "ID-JI": ["jawa timur", "jatim", "surabaya", "malang"], "ID-BT": ["banten", "tangerang", "serang"],
    "ID-BA": ["bali", "denpasar", "gianyar", "badung", "tabanan", "buleleng", "karangasem", "klungkung", "bangli", "jembrana"],
    "ID-NB": ["nusa tenggara barat", "ntb", "lombok", "sumbawa", "mataram"], "ID-NT": ["nusa tenggara timur", "ntt", "kupang", "flores", "sumba", "sumba barat daya", "alor", "rote"],
    "ID-KB": ["kalimantan barat", "kalbar", "pontianak"], "ID-KT": ["kalimantan tengah", "kalteng", "palangka raya"], "ID-KS": ["kalimantan selatan", "kalsel", "banjarmasin"],
    "ID-KI": ["kalimantan timur", "kaltim", "samarinda", "balikpapan", "kalimantan utara", "kaltara"], "ID-SA": ["sulawesi utara", "sulut", "manado"], "ID-GO": ["gorontalo"],
    "ID-ST": ["sulawesi tengah", "sulteng", "palu"], "ID-SR": ["sulawesi barat", "sulbar", "mamuju"], "ID-SN": ["sulawesi selatan", "sulsel", "makassar"],
    "ID-SG": ["sulawesi tenggara", "sultra", "kendari", "buton"], "ID-MU": ["maluku utara", "malut", "ternate"], "ID-MA": ["maluku", "ambon"],
    "ID-PB": ["papua barat daya", "papua barat", "sorong", "manokwari"], "ID-PA": ["papua selatan", "papua tengah", "papua pegunungan", "papua", "jayapura", "merauke"]
  };
  const GROUP = { "sumatera": ["ID-AC", "ID-SU", "ID-SB", "ID-RI", "ID-KR", "ID-JA", "ID-SS", "ID-BE", "ID-LA", "ID-BB"], "sumatra": null, "jawa": ["ID-JK", "ID-JB", "ID-JT", "ID-YO", "ID-JI", "ID-BT"], "java": null,
    "kalimantan": ["ID-KB", "ID-KT", "ID-KS", "ID-KI"], "sulawesi": ["ID-SA", "ID-GO", "ID-ST", "ID-SR", "ID-SN", "ID-SG"], "nusa tenggara": ["ID-NB", "ID-NT"], "tanah papua": ["ID-PA", "ID-PB"] };
  GROUP.sumatra = GROUP.sumatera; GROUP.java = GROUP.jawa;
  const ALIAS = []; Object.keys(PROV).forEach(id => PROV[id].forEach(a => ALIAS.push([a, [id]]))); Object.keys(GROUP).forEach(g => ALIAS.push([g, GROUP[g]]));
  ALIAS.sort((a, b) => b[0].length - a[0].length);
  let countryNames = [];   /* [lowercase name, ISO3] from the world file */
  function resolve(r) {
    const raw = (r.areas && String(r.areas).trim()) ? String(r.areas) : [r.region, r.location_detail].filter(Boolean).join(", ");
    let txt = " " + raw.toLowerCase().replace(/[()]/g, " ") + " ";
    const out = { national: false, prov: new Set(), ctry: new Set() };
    if (/\b(nasional|national|seluruh indonesia)\b/.test(txt)) { out.national = true; txt = txt.replace(/\b(nasional|national|seluruh indonesia)\b/g, " "); }
    const has = a => new RegExp("(^|[^a-z])" + a.replace(/[-]/g, "[- ]") + "([^a-z]|$)").test(txt);
    countryNames.forEach(([n, id]) => { if (id !== "IDN" && n.length > 3 && has(n)) { out.ctry.add(id); txt = txt.replace(new RegExp(n.replace(/[-]/g, "[- ]"), "g"), " "); } });
    if (/timor[- ]leste|east timor/.test(txt)) { out.ctry.add("TLS"); txt = txt.replace(/timor[- ]leste|east timor/g, " "); }
    ALIAS.forEach(([a, ids]) => { if (has(a)) { ids.forEach(i => out.prov.add(i)); txt = txt.replace(new RegExp(a.replace(/[-]/g, "[- ]"), "g"), " "); } });
    if (/\bindonesia\b/.test(txt) && !out.prov.size) out.national = true;
    return out;
  }

  /* ---------- layout ---------- */
  host.innerHTML =
    '<div class="pfx"><div class="pfx-side"><form class="pfx-search" role="search" onsubmit="return false"><label class="sr-only" for="pfxQ">' + esc(T2("Cari proyek", "Search projects")) + "</label>" + svgI(IC.search) +
    '<input id="pfxQ" type="search" autocomplete="off" placeholder="' + esc(T2("Cari judul, layanan, wilayah, atau mitra", "Search title, service, region, or partner")) + '"></form>' +
    '<div class="pfx-filters"><select id="pfxSvc" aria-label="' + esc(t("proj.f.service")) + '"></select><select id="pfxClient" aria-label="' + esc(t("proj.f.client")) + '"></select>' +
    '<select id="pfxReg" aria-label="' + esc(T2("Wilayah", "Region")) + '"></select><select id="pfxStatus" aria-label="Status"></select><select id="pfxPartner" aria-label="' + esc(T2("Mitra", "Partner")) + '" hidden></select></div>' +
    '<div class="pfx-bar"><p id="pfxCount" role="status"></p><button type="button" class="linkish" id="pfxReset">' + esc(T2("Atur ulang", "Reset")) + "</button></div>" +
    '<div class="pfx-panel"><ul class="pfx-list" id="pfxList"></ul><article class="pfx-detail" id="pfxDetail" hidden></article></div></div>' +
    '<div class="pfx-mapwrap"><div class="pfx-map" id="pfxMap" role="region" aria-label="' + esc(T2("Peta cakupan proyek", "Project coverage map")) + '"></div>' +
    '<div class="pfx-view" role="group" aria-label="' + esc(T2("Tampilan peta", "Map view")) + '"><button type="button" data-view="idn" aria-pressed="true">Indonesia</button><button type="button" data-view="world" aria-pressed="false">' + esc(T2("Dunia", "World")) + "</button></div>" +
    '<div class="pfx-legend"><p><strong>' + esc(T2("Jumlah proyek per wilayah", "Projects per area")) + '</strong></p><div class="pfx-scale"><i style="background:#D3E6E2"></i><i style="background:#8FC2BA"></i><i style="background:#3F8C83"></i><i style="background:#0E5A55"></i></div><p class="pfx-scale-l"><span>1</span><span id="pfxMax"></span></p>' +
    '<p class="pfx-hatch-l"><i></i>' + esc(T2("Cakupan proyek terpilih", "Coverage of the selected project")) + '</p></div><p class="pfx-mapnote">' + esc(T2("Klik wilayah di peta untuk menyaring proyek. Batas wilayah bersifat ilustratif.", "Click an area on the map to filter projects. Boundaries are illustrative.")) + "</p></div></div>";

  const $ = id => host.querySelector("#" + id);
  const st = { q: "", svc: ctx.focus || "", client: "", reg: "", status: "", partner: "", sel: null };
  let cover = new Map();   /* project id -> resolved coverage */
  const partnersOf = r => (r.disclosure === "A" || r.disclosure === "B") ? [r.client, r.funder].concat(String(r.partners || "").split(/[,;]/)).map(x => String(x || "").trim()).filter(Boolean) : [];

  /* ---------- map ---------- */
  let map = null, provLayer = null, ctryLayer = null, provFeat = {}, ctryFeat = {}, view = "idn";
  const IDN_BOUNDS = [[-11.2, 94.8], [6.3, 141.2]];
  const shade = n => !n ? "#F1F5F4" : n >= 4 ? "#0E5A55" : n === 3 ? "#3F8C83" : n === 2 ? "#8FC2BA" : "#D3E6E2";
  const provCount = id => rowsNow().filter(r => { const c = cover.get(r.id); return c && (c.prov.has(id) || c.national); }).length;
  const ctryCount = id => rowsNow().filter(r => { const c = cover.get(r.id); return c && c.ctry.has(id); }).length;
  function ensureHatch() {
    const svg = host.querySelector(".leaflet-overlay-pane svg"); if (!svg || svg.querySelector("#pfHatch")) return;
    const ns = "http://www.w3.org/2000/svg", defs = document.createElementNS(ns, "defs");
    defs.innerHTML = '<pattern id="pfHatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="7" height="7" fill="rgba(232,131,58,.28)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#E8833A" stroke-width="3"/></pattern>';
    svg.insertBefore(defs, svg.firstChild);
  }
  function paintMap() {
    if (!map) return;
    const sel = st.sel ? cover.get(st.sel) : null;
    let max = 1;
    const hatch = (layer, on) => { const p = layer._path; if (!p) return; if (on) p.setAttribute("fill", "url(#pfHatch)"); };
    if (provLayer) provLayer.eachLayer(l => {
      const id = l.feature.properties.id, n = provCount(id); max = Math.max(max, n);
      const on = sel && (sel.national || sel.prov.has(id));
      const regOn = st.reg === id;
      l.setStyle({ fillColor: shade(n), fillOpacity: sel && !on ? 0.35 : 0.9, color: on || regOn ? "#C4621D" : "#FFFFFF", weight: on || regOn ? 1.6 : 0.8 });
      hatch(l, on);
    });
    if (ctryLayer) ctryLayer.eachLayer(l => {
      const id = l.feature.properties.id, n = id === "IDN" ? 0 : ctryCount(id); max = Math.max(max, n);
      const on = sel && sel.ctry.has(id);
      l.setStyle({ fillColor: n ? shade(n) : "#FFFFFF", fillOpacity: n ? (sel && !on ? 0.35 : 0.9) : 0, color: on || st.reg === id ? "#C4621D" : (n ? "#FFFFFF" : "transparent"), weight: on ? 1.6 : 0.8 });
      hatch(l, on);
    });
    $("pfxMax").textContent = max >= 4 ? "4+" : String(max);
  }
  function focusSel() {
    if (!map) return;
    const c = st.sel && cover.get(st.sel);
    if (!c) { map.fitBounds(view === "world" ? [[-50, -150], [70, 170]] : IDN_BOUNDS, { padding: [10, 10] }); return; }
    let b = null;
    const add = lb => { b = b ? b.extend(lb) : L.latLngBounds(lb.getSouthWest(), lb.getNorthEast()); };
    if (c.national) add(L.latLngBounds(IDN_BOUNDS));
    c.prov.forEach(id => provFeat[id] && add(provFeat[id].getBounds()));
    c.ctry.forEach(id => ctryFeat[id] && add(ctryFeat[id].getBounds()));
    const small = window.innerWidth <= 600;
    if (b) map.flyToBounds(b, { paddingTopLeft: small ? [20, 50] : [40, 60], paddingBottomRight: small ? [20, 70] : [40, 90], maxZoom: 7, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.8 });
  }
  const nameOf = l => l.feature.properties.name || (lang === "en" ? l.feature.properties.name_en : l.feature.properties.name_id);
  async function initMap() {
    if (!L) { $("pfxMap").innerHTML = '<p class="state">' + esc(T2("Peta tidak dapat dimuat.", "The map could not be loaded.")) + "</p>"; return; }
    const [idn, world] = await Promise.all(["assets/data/idn-provinces.geojson", "assets/data/world-countries.geojson"].map(u => fetch(u).then(r => r.json()).catch(() => null)));
    if (world) countryNames = world.features.flatMap(ft => [[String(ft.properties.name_en).toLowerCase(), ft.properties.id], [String(ft.properties.name_id).toLowerCase(), ft.properties.id]]);
    rows.forEach(r => cover.set(r.id, resolve(r)));
    map = L.map($("pfxMap"), { zoomControl: true, scrollWheelZoom: false, worldCopyJump: true, minZoom: 2, maxZoom: 9, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>; batas: Natural Earth' }).addTo(map);
    const tip = (l, n) => l.bindTooltip(() => "<strong>" + esc(nameOf(l)) + "</strong><br>" + n() + " " + esc(t("proj.count")), { sticky: true, direction: "top", className: "pfx-tip" });
    if (world) ctryLayer = L.geoJSON(world, { filter: ft => ft.properties.id !== "IDN", style: { weight: 0.8, fillOpacity: 0, color: "transparent" },
      onEachFeature: (ft, l) => { ctryFeat[ft.properties.id] = l; tip(l, () => ctryCount(ft.properties.id)); l.on("click", () => { if (ctryCount(ft.properties.id)) setReg(ft.properties.id); }); } }).addTo(map);
    if (idn) provLayer = L.geoJSON(idn, { style: { weight: 0.8, color: "#fff", fillOpacity: 0.9 },
      onEachFeature: (ft, l) => { provFeat[ft.properties.id] = l; tip(l, () => provCount(ft.properties.id)); l.on("click", () => setReg(ft.properties.id)); } }).addTo(map);
    map.fitBounds(IDN_BOUNDS, { padding: [10, 10] });
    map.on("focus", () => map.scrollWheelZoom.enable()); map.on("blur", () => map.scrollWheelZoom.disable());
    ensureHatch(); fillFilters(); draw();
    host.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => { view = b.dataset.view; host.querySelectorAll("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); st.sel = null; showList(); draw(); focusSel(); }));
    new ResizeObserver(() => map.invalidateSize()).observe($("pfxMap"));
  }

  /* ---------- filters ---------- */
  const regLabel = id => provFeat[id] ? nameOf(provFeat[id]) : ctryFeat[id] ? nameOf(ctryFeat[id]) : id === "NAT" ? T2("Nasional", "National") : id;
  function fillFilters() {
    const opt = (v, l) => '<option value="' + esc(v) + '">' + esc(l) + "</option>";
    $("pfxSvc").innerHTML = opt("", T2("Semua layanan", "All services")) + SV.filter(s => rows.some(r => r.service === s.key)).map(s => opt(s.key, serviceName(s.key))).join("");
    $("pfxClient").innerHTML = opt("", T2("Semua jenis klien", "All client types")) + [...new Set(rows.map(r => r.client_type).filter(Boolean))].sort().map(c => opt(c, c)).join("");
    const regs = new Set(); let nat = false;
    cover.forEach(c => { c.prov.forEach(x => regs.add(x)); c.ctry.forEach(x => regs.add(x)); if (c.national) nat = true; });
    $("pfxReg").innerHTML = opt("", T2("Semua wilayah", "All regions")) + (nat ? opt("NAT", T2("Nasional", "National")) : "") + [...regs].sort((a, b) => regLabel(a).localeCompare(regLabel(b))).map(x => opt(x, regLabel(x))).join("");
    $("pfxStatus").innerHTML = opt("", T2("Semua status", "All statuses")) + ["berjalan", "selesai"].filter(s => rows.some(r => (r.status || "selesai") === s)).map(s => opt(s, t("proj.st." + s))).join("");
    const parts = [...new Set(rows.flatMap(partnersOf))].sort();
    $("pfxPartner").hidden = !parts.length;
    $("pfxPartner").innerHTML = opt("", T2("Semua mitra", "All partners")) + parts.map(p => opt(p, p)).join("");
    $("pfxSvc").value = st.svc;
  }
  function rowsNow() {
    const q = st.q.toLowerCase().trim();
    return rows.filter(r => {
      const c = cover.get(r.id) || { prov: new Set(), ctry: new Set() };
      if (st.svc && r.service !== st.svc) return false;
      if (st.client && r.client_type !== st.client) return false;
      if (st.status && (r.status || "selesai") !== st.status) return false;
      if (st.partner && !partnersOf(r).includes(st.partner)) return false;
      if (st.reg === "NAT" && !c.national) return false;
      if (st.reg && st.reg !== "NAT" && !(c.prov.has(st.reg) || c.ctry.has(st.reg) || (c.national && /^ID-/.test(st.reg)))) return false;
      if (q) {
        const hay = [r.title_id, r.title_en, serviceName(r.service), r.client_type, r.region, r.areas, r.keywords, r.component, partnersOf(r).join(" "),
          [...c.prov].map(regLabel).join(" "), [...c.ctry].map(regLabel).join(" ")].join(" ").toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
  }
  function setReg(id) { st.reg = st.reg === id ? "" : id; $("pfxReg").value = st.reg; st.sel = null; showList(); draw(); }

  /* ---------- list and detail ---------- */
  const chips = s => { const out = []; let cur = "", d = 0; for (const ch of String(s || "")) { if (ch === "(") d++; if (ch === ")") d = Math.max(0, d - 1); if ((ch === "," || ch === ";") && !d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
  const areaText = r => { const c = cover.get(r.id); if (!c) return r.region || ""; const parts = (c.national ? [T2("Nasional", "National")] : []).concat([...c.prov].map(regLabel), [...c.ctry].map(regLabel)); return parts.length ? parts.join(", ") : (r.region || ""); };
  const fact = (icon, val) => val ? "<li>" + svgI(icon) + "<span>" + esc(val) + "</span></li>" : "";
  function draw() {
    const list = rowsNow();
    $("pfxCount").textContent = list.length + " " + t("proj.count");
    $("pfxReset").hidden = !(st.q || st.svc || st.client || st.reg || st.status || st.partner);
    $("pfxList").innerHTML = list.length ? list.map(r =>
      '<li><button type="button" class="pfx-item' + (st.sel === r.id ? " on" : "") + '" data-pid="' + esc(r.id) + '" style="--svc:' + svcColor(r.service) + '">' +
      '<span class="pfx-item-tags"><span class="pf-svc">' + svcIcon(r.service, "ic-mini") + esc(serviceName(r.service)) + '</span><span class="pj-status st-' + esc(r.status || "") + '">' + esc(t("proj.st." + (r.status || "selesai"))) + "</span></span>" +
      '<strong>' + esc(f(r, "title")) + '</strong><span class="pfx-item-meta">' + svgI(IC.place) + esc(areaText(r)) + (years(r) ? "<em>" + esc(years(r)) + "</em>" : "") + "</span></button></li>").join("")
      : '<li class="state">' + esc(T2("Tidak ada proyek yang cocok. Ubah kata kunci atau filter.", "No matching projects. Change the keywords or filters.")) + "</li>";
    paintMap();
  }
  function showList() { $("pfxDetail").hidden = true; $("pfxList").hidden = false; }
  function select(id, scroll) {
    const r = rows.find(x => x.id === id); if (!r) return;
    st.sel = id;
    const named = r.disclosure === "A" || r.disclosure === "B";
    const pubs = String(r.related_publications || "").split(",").map(x => x.trim()).filter(Boolean).map(pid => repo.find(p => p.id === pid)).filter(Boolean);
    const cv = named && pcov[r.id];
    const outs = chips(f(r, "outputs"));
    const row = (label, val) => val ? "<div><dt>" + esc(label) + "</dt><dd>" + esc(val) + "</dd></div>" : "";
    const d = $("pfxDetail");
    d.style.setProperty("--svc", svcColor(r.service));
    d.innerHTML = '<button type="button" class="pfx-back">' + svgI(IC.back) + esc(T2("Kembali ke daftar", "Back to the list")) + "</button>" +
      (cv ? '<div class="pfx-cover">' + coverBox(cv.thumb, cv.cover, f(r, "title"), r.id) + "</div>" : "") +
      '<p class="pf-item-tags"><span class="pf-svc">' + svcIcon(r.service, "ic-mini") + esc(serviceName(r.service)) + '</span><span class="pj-status st-' + esc(r.status || "") + '">' + esc(t("proj.st." + (r.status || "selesai"))) + "</span>" +
      (/sebelum CHARIS/i.test(r.role || "") ? '<span class="pj-prior" title="' + esc(t("proj.prior.d")) + '">' + esc(t("proj.prior")) + "</span>" : "") + "</p>" +
      "<h3>" + esc(f(r, "title")) + "</h3>" +
      '<ul class="pf-facts">' + fact(IC.client, named && r.client ? r.client : r.client_type) + fact(IC.place, areaText(r)) + fact(IC.time, [years(r), r.duration_months ? r.duration_months + " " + t("proj.months") : ""].filter(Boolean).join(", ")) + "</ul>" +
      "<p>" + esc(f(r, "summary")) + "</p>" +
      (outs.length ? '<p class="pf-out"><span>' + esc(t("proj.outputs")) + "</span>" + outs.map(o => "<em>" + esc(o) + "</em>").join("") + "</p>" : "") +
      '<dl class="pj-facts">' + row(t("proj.role"), roleLabel(r.role)) + row(t("proj.methods"), f(r, "methods")) + row(t("proj.capacity"), f(r, "capacity")) +
      (named ? row(t("proj.funder"), r.funder) + row(t("proj.partners"), r.partners) : "") + row("SDG", r.sdg) + "</dl>" +
      (named && f(r, "testimonial") ? '<blockquote class="pj-quote"><p>' + esc(f(r, "testimonial")) + "</p>" + (r.testimonial_by ? "<cite>" + esc(r.testimonial_by) + "</cite>" : "") + "</blockquote>" : "") +
      '<div class="pf-item-foot">' + pubs.map(p => '<a class="btn btn-sm" href="' + esc(p.url) + '">' + esc(t("pf.readPub")) + "</a>").join("") + shareBox(r.id, absHash("#/projects/" + encodeURIComponent(r.id)), f(r, "title")) + "</div>";
    $("pfxList").hidden = true; d.hidden = false; d.scrollTop = 0;
    d.querySelector(".pfx-back").addEventListener("click", () => { st.sel = null; showList(); draw(); focusSel(); const b = host.querySelector('[data-pid="' + CSS.escape(id) + '"]'); if (b) b.focus(); });
    draw(); focusSel();
    if (scroll || window.innerWidth <= 900) host.scrollIntoView({ block: "start", behavior: scroll ? "auto" : (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") });
    if (window.CharisShare) window.CharisShare.track(r.id, "read");
  }

  /* ---------- events ---------- */
  let qT = 0;
  $("pfxQ").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(() => { st.q = e.target.value; st.sel = null; showList(); draw(); }, 120); });
  [["pfxSvc", "svc"], ["pfxClient", "client"], ["pfxReg", "reg"], ["pfxStatus", "status"], ["pfxPartner", "partner"]].forEach(([id, k]) => $(id).addEventListener("change", e => { st[k] = e.target.value; st.sel = null; showList(); draw(); }));
  $("pfxReset").addEventListener("click", () => { Object.assign(st, { q: "", svc: "", client: "", reg: "", status: "", partner: "", sel: null }); $("pfxQ").value = ""; host.querySelectorAll(".pfx-filters select").forEach(s => { s.value = ""; }); showList(); draw(); focusSel(); });
  $("pfxList").addEventListener("click", e => { const b = e.target.closest("[data-pid]"); if (b) select(b.dataset.pid); });
  $("pfxList").addEventListener("mouseover", e => { const b = e.target.closest("[data-pid]"); if (!b || st.sel || !map) return; const c = cover.get(b.dataset.pid); if (!c) return;
    provLayer && provLayer.eachLayer(l => { const on = c.national || c.prov.has(l.feature.properties.id); if (on) l.setStyle({ color: "#C4621D", weight: 1.6 }); }); });
  $("pfxList").addEventListener("mouseleave", () => { if (!st.sel) paintMap(); });

  const ready = initMap();
  return {
    ready,
    filterService(k) { st.svc = st.svc === k ? "" : k; $("pfxSvc").value = st.svc; st.sel = null; showList(); draw(); },
    select(id, scroll) { ready.then(() => select(id, scroll)); }
  };
};
