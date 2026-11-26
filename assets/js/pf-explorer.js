/* CHARIS portfolio explorer.
   Vector maps drawn from local boundary files with Leaflet (Natural Earth, public domain). No tile server, API or key.
   Layout: search and filters with a result summary, project list beside a coverage map, and a full-width project profile
   (short narrative, project matrix, deliverables matrix, coverage mini map, SDGs and sharing). */
window.CharisPFExplorer = function (host, ctx) {
  "use strict";
  const { rows, t, f, esc, lang, serviceName, svcIcon, svcColor, years, roleLabel, coverBox, shareBox, absHash, repo, pcov, SV, profileHost } = ctx;
  const img = (u, w) => (ctx.img ? ctx.img(u, w) : u);
  const T2 = (id, en) => (lang === "en" ? en : id);
  const L = window.L;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svgI = (d, s) => '<svg viewBox="0 0 24 24" width="' + (s || 16) + '" height="' + (s || 16) + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
  const IC = {
    client: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>', place: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    time: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>', filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    up: '<path d="M6 15l6-6 6 6"/>'
  };
  const SDGC = { 1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D", 17: "#19486A" };

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
  const GROUP = { "sumatera": ["ID-AC", "ID-SU", "ID-SB", "ID-RI", "ID-KR", "ID-JA", "ID-SS", "ID-BE", "ID-LA", "ID-BB"], "jawa": ["ID-JK", "ID-JB", "ID-JT", "ID-YO", "ID-JI", "ID-BT"],
    "kalimantan": ["ID-KB", "ID-KT", "ID-KS", "ID-KI"], "sulawesi": ["ID-SA", "ID-GO", "ID-ST", "ID-SR", "ID-SN", "ID-SG"], "nusa tenggara": ["ID-NB", "ID-NT"], "tanah papua": ["ID-PA", "ID-PB"] };
  GROUP.sumatra = GROUP.sumatera; GROUP.java = GROUP.jawa;
  const ALIAS = []; Object.keys(PROV).forEach(id => PROV[id].forEach(a => ALIAS.push([a, [id]]))); Object.keys(GROUP).forEach(g => ALIAS.push([g, GROUP[g]]));
  ALIAS.sort((a, b) => b[0].length - a[0].length);
  let countryNames = [];
  const rx = a => a.replace(/[-]/g, "[- ]");
  function resolve(r) {
    const raw = (r.areas && String(r.areas).trim()) ? String(r.areas) : [r.region, r.location_detail].filter(Boolean).join(", ");
    let txt = " " + raw.toLowerCase().replace(/[()]/g, " ") + " ";
    const out = { national: false, prov: new Set(), ctry: new Set() };
    if (/\b(nasional|national|seluruh indonesia)\b/.test(txt)) { out.national = true; txt = txt.replace(/\b(nasional|national|seluruh indonesia)\b/g, " "); }
    const has = a => new RegExp("(^|[^a-z])" + rx(a) + "([^a-z]|$)").test(txt);
    if (/timor[- ]leste|east timor/.test(txt)) { out.ctry.add("TLS"); txt = txt.replace(/timor[- ]leste|east timor/g, " "); }
    countryNames.forEach(([n, id]) => { if (id !== "IDN" && n.length > 3 && has(n)) { out.ctry.add(id); txt = txt.replace(new RegExp(rx(n), "g"), " "); } });
    ALIAS.forEach(([a, ids]) => { if (has(a)) { ids.forEach(i => out.prov.add(i)); txt = txt.replace(new RegExp(rx(a), "g"), " "); } });
    if (/\bindonesia\b/.test(txt) && !out.prov.size) out.national = true;
    return out;
  }

  /* ---------- shared map data and map factory ---------- */
  const IDN_BOUNDS = [[-11.2, 94.8], [6.3, 141.2]];
  const shade = n => !n ? "#DCE6E3" : n >= 4 ? "#0E5A55" : n === 3 ? "#3F8C83" : n === 2 ? "#7DB8AE" : "#B5D6CF";
  let geo = null;
  const loadGeo = () => geo || (geo = Promise.all(["assets/data/idn-provinces.geojson", "assets/data/world-countries.geojson"].map(u => fetch(u).then(r => r.json()).catch(() => null))));
  const nameOf = ft => ft.properties.name || (lang === "en" ? ft.properties.name_en : ft.properties.name_id);
  function makeMap(el, interactive) {
    const m = L.map(el, { zoomControl: interactive, scrollWheelZoom: false, dragging: interactive || !L.Browser.mobile, touchZoom: interactive, doubleClickZoom: interactive,
      boxZoom: false, keyboard: interactive, worldCopyJump: true, minZoom: 2, maxZoom: 9, attributionControl: interactive, zoomSnap: 0.25 });
    if (interactive) { m.attributionControl.setPrefix(false); m.attributionControl.addAttribution(T2("Batas wilayah", "Boundaries") + ': <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>'); }
    const o = { map: m, prov: {}, ctry: {}, provLayer: null, ctryLayer: null };
    const [idn, world] = geoData;
    if (world) o.ctryLayer = L.geoJSON(world, { filter: ft => ft.properties.id !== "IDN", style: { weight: 0.6, fillColor: "#EDF1F0", fillOpacity: 1, color: "#FFFFFF" }, interactive,
      onEachFeature: (ft, l) => { o.ctry[ft.properties.id] = l; } }).addTo(m);
    if (idn) o.provLayer = L.geoJSON(idn, { style: { weight: 0.8, color: "#fff", fillColor: "#DCE6E3", fillOpacity: 1 }, interactive,
      onEachFeature: (ft, l) => { o.prov[ft.properties.id] = l; } }).addTo(m);
    m.fitBounds(IDN_BOUNDS, { padding: [10, 10], animate: false });
    const svg = el.querySelector(".leaflet-overlay-pane svg");
    if (svg && !svg.querySelector("pattern")) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = '<pattern id="pfHatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="7" height="7" fill="rgba(232,131,58,.28)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#E8833A" stroke-width="3"/></pattern>';
      svg.insertBefore(defs, svg.firstChild);
    }
    if ("ResizeObserver" in window) { o.ro = new ResizeObserver(() => { if (m._mapPane) m.invalidateSize(); }); o.ro.observe(el); }
    return o;
  }
  const hatch = (layer, on) => { if (on && layer._path) layer._path.setAttribute("fill", "url(#pfHatch)"); };
  function boundsOf(o, c) {
    let b = null; const add = lb => { b = b ? b.extend(lb) : L.latLngBounds(lb.getSouthWest(), lb.getNorthEast()); };
    if (c.national) add(L.latLngBounds(IDN_BOUNDS));
    c.prov.forEach(id => o.prov[id] && add(o.prov[id].getBounds()));
    c.ctry.forEach(id => o.ctry[id] && add(o.ctry[id].getBounds()));
    return b;
  }

  /* ---------- layout ---------- */
  host.innerHTML =
    '<div class="pfx2">' +
    '<div class="pfx-tools"><div class="pfx-tools-row"><form class="pfx-search" role="search" onsubmit="return false"><label class="sr-only" for="pfxQ">' + esc(T2("Cari proyek", "Search projects")) + "</label>" + svgI(IC.search) +
    '<input id="pfxQ" type="search" autocomplete="off" placeholder="' + esc(T2("Cari judul, layanan, wilayah, atau mitra", "Search title, service, region, or partner")) + '"></form>' +
    '<button type="button" class="pfx-ftoggle" id="pfxFt" aria-expanded="false" aria-controls="pfxFilters">' + svgI(IC.filter) + "<span>" + esc(T2("Filter", "Filters")) + '</span><b id="pfxFn" hidden></b></button></div>' +
    '<div class="pfx-filters" id="pfxFilters">' +
    '<label><span>' + esc(t("proj.f.service")) + '</span><select id="pfxSvc"></select></label><label><span>' + esc(t("proj.f.client")) + '</span><select id="pfxClient"></select></label>' +
    '<label><span>' + esc(T2("Wilayah", "Region")) + '</span><select id="pfxReg"></select></label><label><span>Status</span><select id="pfxStatus"></select></label>' +
    '<label id="pfxPartnerL" hidden><span>' + esc(T2("Mitra", "Partner")) + '</span><select id="pfxPartner"></select></label></div>' +
    '<div class="pfx-summary"><p id="pfxCount" role="status"></p><div class="pfx-chips" id="pfxChips"></div></div></div>' +
    '<div class="pfx-main"><div class="pfx-listwrap"><ul class="pfx-list" id="pfxList"></ul></div>' +
    '<div class="pfx-mapwrap"><div class="pfx-map" id="pfxMap" role="region" aria-label="' + esc(T2("Peta cakupan proyek", "Project coverage map")) + '"></div>' +
    '<div class="pfx-view" role="group" aria-label="' + esc(T2("Tampilan peta", "Map view")) + '"><button type="button" data-view="idn" aria-pressed="true">Indonesia</button><button type="button" data-view="world" aria-pressed="false">' + esc(T2("Dunia", "World")) + "</button></div>" +
    '<div class="pfx-legend"><p class="pfx-legend-t">' + esc(T2("Proyek per wilayah", "Projects per area")) + '</p><div class="pfx-scale"><i style="background:#B5D6CF"></i><i style="background:#7DB8AE"></i><i style="background:#3F8C83"></i><i style="background:#0E5A55"></i></div><p class="pfx-scale-l"><span>1</span><span id="pfxMax"></span></p>' +
    '<p class="pfx-hatch-l"><i></i>' + esc(T2("Proyek terpilih", "Selected project")) + "</p></div></div></div>" +
    '<p class="pfx-hint">' + esc(T2("Pilih proyek di daftar untuk membuka profilnya, atau klik wilayah di peta untuk menyaring.", "Select a project in the list to open its profile, or click an area on the map to filter.")) + "</p></div>";

  const $ = id => document.getElementById(id);
  const st = { q: "", svc: ctx.focus || "", client: "", reg: "", status: "", partner: "", sel: null };
  const cover = new Map();
  const named = r => r.disclosure === "A" || r.disclosure === "B";
  const partnersOf = r => named(r) ? [r.client, r.funder].concat(String(r.partners || "").split(/[,;]/)).map(x => String(x || "").trim()).filter(Boolean) : [];
  let main = null, mini = null, geoData = [null, null], view = "idn";
  const regLabel = id => main && main.prov[id] ? nameOf(main.prov[id].feature) : main && main.ctry[id] ? nameOf(main.ctry[id].feature) : id === "NAT" ? T2("Nasional", "National") : id;
  const provCount = id => rowsNow().filter(r => { const c = cover.get(r.id); return c && (c.prov.has(id) || c.national); }).length;
  const ctryCount = id => rowsNow().filter(r => { const c = cover.get(r.id); return c && c.ctry.has(id); }).length;

  function paintMain() {
    if (!main) return;
    const sel = st.sel ? cover.get(st.sel) : null;
    let max = 1;
    main.provLayer && main.provLayer.eachLayer(l => {
      const id = l.feature.properties.id, n = provCount(id); max = Math.max(max, n);
      const on = sel && (sel.national || sel.prov.has(id)), rg = st.reg === id;
      l.setStyle({ fillColor: shade(n), fillOpacity: sel && !on ? 0.45 : 1, color: on || rg ? "#C4621D" : "#FFFFFF", weight: on || rg ? 1.6 : 0.8 }); hatch(l, on);
    });
    main.ctryLayer && main.ctryLayer.eachLayer(l => {
      const id = l.feature.properties.id, n = ctryCount(id); max = Math.max(max, n);
      const on = sel && sel.ctry.has(id);
      l.setStyle({ fillColor: n ? shade(n) : "#EDF1F0", fillOpacity: 1, color: on || st.reg === id ? "#C4621D" : "#FFFFFF", weight: on ? 1.6 : 0.6 }); hatch(l, on);
    });
    $("pfxMax").textContent = max >= 4 ? "4+" : String(max);
  }
  function fitMain() {
    if (!main) return;
    const c = st.sel && cover.get(st.sel), b = c && boundsOf(main, c);
    main.map.stop();
    if (b) main.map.flyToBounds(b, { paddingTopLeft: [30, 50], paddingBottomRight: [30, 80], maxZoom: 7, duration: reduce ? 0 : 0.8 });
    else main.map.fitBounds(view === "world" ? [[-50, -150], [70, 170]] : IDN_BOUNDS, { padding: [10, 10] });
  }

  /* ---------- filters and summary ---------- */
  function fillFilters() {
    const opt = (v, l) => '<option value="' + esc(v) + '">' + esc(l) + "</option>";
    $("pfxSvc").innerHTML = opt("", T2("Semua", "All")) + SV.filter(s => rows.some(r => r.service === s.key)).map(s => opt(s.key, serviceName(s.key))).join("");
    $("pfxClient").innerHTML = opt("", T2("Semua", "All")) + [...new Set(rows.map(r => r.client_type).filter(Boolean))].sort().map(c => opt(c, c)).join("");
    const regs = new Set(); let nat = false;
    cover.forEach(c => { c.prov.forEach(x => regs.add(x)); c.ctry.forEach(x => regs.add(x)); if (c.national) nat = true; });
    $("pfxReg").innerHTML = opt("", T2("Semua", "All")) + (nat ? opt("NAT", T2("Nasional", "National")) : "") + [...regs].sort((a, b) => regLabel(a).localeCompare(regLabel(b))).map(x => opt(x, regLabel(x))).join("");
    $("pfxStatus").innerHTML = opt("", T2("Semua", "All")) + ["berjalan", "selesai"].filter(s => rows.some(r => (r.status || "selesai") === s)).map(s => opt(s, t("proj.st." + s))).join("");
    const parts = [...new Set(rows.flatMap(partnersOf))].sort();
    $("pfxPartnerL").hidden = !parts.length;
    $("pfxPartner").innerHTML = opt("", T2("Semua", "All")) + parts.map(p => opt(p, p)).join("");
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
        const hay = [r.title_id, r.title_en, serviceName(r.service), r.client_type, r.region, r.areas, r.keywords, partnersOf(r).join(" "), [...c.prov].map(regLabel).join(" "), [...c.ctry].map(regLabel).join(" ")].join(" ").toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
  }
  const FIELDS = [["svc", "pfxSvc", v => serviceName(v)], ["client", "pfxClient", v => v], ["reg", "pfxReg", v => regLabel(v)], ["status", "pfxStatus", v => t("proj.st." + v)], ["partner", "pfxPartner", v => v]];
  function summary(list) {
    $("pfxCount").innerHTML = T2("Menampilkan <b>" + list.length + "</b> dari " + rows.length + " proyek", "Showing <b>" + list.length + "</b> of " + rows.length + " projects");
    const chips = (st.q ? ['<button type="button" data-clear="q">&ldquo;' + esc(st.q) + '&rdquo;' + svgI(IC.close, 12) + "</button>"] : [])
      .concat(FIELDS.filter(([k]) => st[k]).map(([k, , lab]) => '<button type="button" data-clear="' + k + '">' + esc(lab(st[k])) + svgI(IC.close, 12) + "</button>"));
    $("pfxChips").innerHTML = chips.length ? chips.join("") + '<button type="button" class="pfx-clear" data-clear="all">' + esc(T2("Hapus semua", "Clear all")) + "</button>" : "";
    const n = FIELDS.filter(([k]) => st[k]).length;
    $("pfxFn").hidden = !n; $("pfxFn").textContent = n;
  }

  /* ---------- list ---------- */
  const areaText = r => { const c = cover.get(r.id); if (!c) return r.region || ""; const p = (c.national ? [T2("Nasional", "National")] : []).concat([...c.prov].map(regLabel), [...c.ctry].map(regLabel)); return p.length ? p.join(", ") : (r.region || ""); };
  function draw() {
    const list = rowsNow();
    summary(list);
    $("pfxList").innerHTML = list.length ? list.map(r =>
      '<li><button type="button" class="pfx-item' + (st.sel === r.id ? " on" : "") + (r.image_url ? " has-thumb" : "") + '" data-pid="' + esc(r.id) + '" aria-pressed="' + (st.sel === r.id) + '" style="--svc:' + svcColor(r.service) + '">' +
      (r.image_url ? '<span class="pfx-thumb"><img src="' + esc(img(r.image_url, 240)) + '" alt="" loading="lazy" decoding="async"></span>' : "") +
      '<span class="pfx-item-tags"><span class="pf-svc">' + svcIcon(r.service, "ic-mini") + esc(serviceName(r.service)) + '</span><span class="pj-status st-' + esc(r.status || "") + '">' + esc(t("proj.st." + (r.status || "selesai"))) + "</span></span>" +
      "<strong>" + esc(f(r, "title")) + '</strong><span class="pfx-item-meta"><span>' + svgI(IC.place, 14) + esc(areaText(r)) + "</span>" + (years(r) ? "<span>" + svgI(IC.time, 14) + esc(years(r)) + "</span>" : "") + (outLinks(r).length ? '<span class="pfx-links"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>' + outLinks(r).length + " " + esc(T2("luaran", "outputs")) + "</span>" : "") + "</span></button></li>").join("")
      : '<li class="state">' + esc(T2("Tidak ada proyek yang cocok. Ubah kata kunci atau filter.", "No matching projects. Change the keywords or filters.")) + "</li>";
    paintMain();
  }

  /* ---------- project profile ---------- */
  const chips = s => { const out = []; let cur = "", d = 0; for (const ch of String(s || "")) { if (ch === "(") d++; if (ch === ")") d = Math.max(0, d - 1); if ((ch === "," || ch === ";") && !d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
  const CAT = [
    [/laporan|report|policy brief|kertas|profil|profile|rangkuman|summary|naskah|draf|draft|ringkasan|baseline|midline|endline/i, T2("Laporan dan dokumen", "Reports and documents"), "#2D6A8E"],
    [/dashboard|dasbor|aplikasi|app|perangkat|excel|tool|sistem|system|database|basis data/i, T2("Alat dan sistem digital", "Digital tools and systems"), "#0E5A55"],
    [/modul|module|pelatihan|training|kurikulum|curriculum|lokakarya|workshop|pendampingan|coaching/i, T2("Pelatihan dan lokakarya", "Training and workshops"), "#E8833A"],
    [/instrumen|instrument|kuesioner|questionnaire|panduan|guide|skoring|scoring|protokol|protocol|sop/i, T2("Instrumen dan panduan", "Instruments and guides"), "#5E8C4A"]
  ];
  const catOf = s => { const c = CAT.find(([re]) => re.test(s)); return c ? c : [null, T2("Keluaran lain", "Other output"), "#8C6BB1"]; };
  /* SDG goals with their targets, one entry per goal ("SDG 3.1, 3.2" gives goal 3 with targets 3.1 and 3.2) */
  const sdgList = r => { const by = {}; String(r.sdg || "").split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(x => { const m = /(\d{1,2})(?:\.(\w+))?/.exec(x); if (!m) return; const g = Number(m[1]); by[g] = by[g] || []; if (m[2]) by[g].push(m[1] + "." + m[2]); });
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(g => ({ g, tgt: by[g].join(", ") })); };
  /* output links: an icon per kind, a card per link */
  const LK = {
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>', pub: '<path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z"/><path d="M9 9h6M9 13h6"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>', dash: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-3M11 16V9M15 16v-5M19 16v-7"/>',
    data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>', slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M8 11l3-3 2 2 3-3"/>',
    code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13 6l-2 12"/>', repo: '<rect x="4" y="3" width="6" height="18" rx="1.5"/><rect x="12" y="6" width="8" height="15" rx="1.5"/><path d="M7 7v2M16 10v2"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 16h3"/>', web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'
  };
  const outLinks = r => (window.CHARIS_MEDIA && window.CHARIS_MEDIA.links) ? window.CHARIS_MEDIA.links(r.output_links, T2("id", "en")) : [];
  const linksHtml = L => !L.length ? "" : '<section class="pfp-sec pfp-links-sec"><h3>' + esc(T2("Link luaran", "Output links")) + '</h3><ul class="pfp-links">' + L.map(x => {
      const ext = !/charisforhealth\.org/.test(x.host);
      return '<li><a class="pfl k-' + x.kind + '" href="' + esc(x.url) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + '><span class="pfl-ic" aria-hidden="true"><svg viewBox="0 0 24 24">' + LK[x.kind] + "</svg></span>" +
        '<span class="pfl-t"><small>' + esc(x.kindLabel) + "</small><b>" + esc(x.label) + "</b><em>" + esc(x.host) + "</em></span>" +
        '<span class="pfl-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 16L16 8M10 8h6v6"/></svg></span>' + (ext ? '<span class="sr-only">' + esc(T2("(membuka tab baru)", "(opens a new tab)")) + "</span>" : "") + "</a></li>";
    }).join("") + "</ul></section>";
  function profile(r) {
    const nm = named(r), oL = outLinks(r);
    const pubs = String(r.related_publications || "").split(",").map(x => x.trim()).filter(Boolean).map(pid => repo.find(p => p.id === pid)).filter(Boolean);
    const outs = chips(f(r, "outputs"));
    const cv = nm && pcov[r.id];
    const tr = (label, val, html) => (val ? '<tr><th scope="row">' + esc(label) + "</th><td>" + (html ? val : esc(val)) + "</td></tr>" : "");
    const grp = (label, body) => body ? '<tbody><tr class="grp"><th colspan="2" scope="rowgroup">' + esc(label) + "</th></tr>" + body + "</tbody>" : "";
    const sdgs = sdgList(r);
    const sdgHtml = sdgs.length ? sdgs.map(s => '<span class="pfp-sdg" style="--c:' + (SDGC[s.g] || "#52615E") + '"><b>' + s.g + "</b>" + esc(t("sdg." + s.g) !== "sdg." + s.g ? t("sdg." + s.g) : "SDG " + s.g) + (s.tgt ? " <small>" + esc(T2("Target ", "Targets ") + s.tgt) + "</small>" : "") + "</span>").join("") : "";
    const comp = r.component ? t("comp." + r.component) : "";
    const matrix = '<table class="pf-matrix">' +
      grp(T2("Profil proyek", "Project profile"),
        tr(T2("Judul resmi", "Official title"), nm ? r.official_title : "") + tr(T2("Klien", "Client"), nm && r.client ? r.client + (r.client_type ? " (" + r.client_type + ")" : "") : r.client_type) +
        tr(T2("Pendanaan", "Funding"), nm ? r.funder : "") + tr(T2("Lokasi dan cakupan", "Location and coverage"), [nm ? r.location_detail : "", areaText(r)].filter(Boolean).join(", ")) +
        tr(T2("Periode", "Period"), [years(r), r.duration_months ? r.duration_months + " " + t("proj.months") : ""].filter(Boolean).join(", ")) +
        tr("Status", t("proj.st." + (r.status || "selesai"))) + tr(t("proj.role"), roleLabel(r.role))) +
      grp(T2("Lingkup teknis", "Technical scope"),
        tr(t("proj.f.service"), serviceName(r.service)) + tr(T2("Komponen sistem kesehatan", "Health system building block"), comp !== "comp." + r.component ? comp : "") +
        tr(t("proj.methods"), f(r, "methods")) + tr(t("proj.capacity"), f(r, "capacity"))) +
      grp(T2("Kemitraan dan hasil", "Partnerships and results"),
        tr(t("proj.partners"), nm ? r.partners : "") + tr(T2("Kontribusi SDG", "SDG contribution"), sdgs.map(s => "SDG " + s.g + (s.tgt ? " (" + s.tgt + ")" : "")).join(", ")) +
        tr(t("proj.pubs"), pubs.map(p => '<a href="' + esc(p.url) + '">' + esc(f(p, "title")) + "</a>").join("<br>"), true) +
        tr(T2("Kata kunci", "Keywords"), r.keywords)) + "</table>";
    const deliv = outs.length ? '<table class="pf-deliv"><thead><tr><th scope="col">No.</th><th scope="col">' + esc(T2("Keluaran", "Deliverable")) + '</th><th scope="col">' + esc(T2("Kategori", "Category")) + "</th></tr></thead><tbody>" +
      outs.map((o, i) => { const c = catOf(o); return "<tr><td>" + (i + 1) + "</td><td>" + esc(o.charAt(0).toUpperCase() + o.slice(1)) + '</td><td><span class="pf-cat" style="--c:' + c[2] + '">' + esc(c[1]) + "</span></td></tr>"; }).join("") + "</tbody></table>" : "";
    const catSum = {}; outs.forEach(o => { const c = catOf(o); catSum[c[1]] = catSum[c[1]] || [0, c[2]]; catSum[c[1]][0]++; });
    profileHost.hidden = false;
    profileHost.style.setProperty("--svc", svcColor(r.service));
    profileHost.innerHTML =
      '<article class="pfp" aria-labelledby="pfpTitle"><header class="pfp-head' + (r.image_url ? " has-photo" : "") + '">' +
      (r.image_url ? '<button type="button" class="pfp-photo" data-zoom="' + esc(img(r.image_url, 2000)) + '" data-alt="' + esc(f(r, "title")) + '" aria-label="' + esc(T2("Perbesar foto kegiatan", "Enlarge the activity photo")) + '"><img src="' + esc(img(r.image_url, 1200)) + '" alt="' + esc(T2("Foto kegiatan: ", "Activity photo: ") + f(r, "title")) + '" decoding="async"></button>' : "") +
      '<div class="pfp-head-in">' +
      '<p class="pfp-kicker">' + esc(T2("Profil proyek", "Project profile")) + '<span class="pfp-id">' + esc(r.id) + "</span></p>" +
      '<p class="pf-item-tags"><span class="pf-svc">' + svcIcon(r.service, "ic-mini") + esc(serviceName(r.service)) + '</span><span class="pj-status st-' + esc(r.status || "") + '">' + esc(t("proj.st." + (r.status || "selesai"))) + "</span>" +
      (/sebelum CHARIS/i.test(r.role || "") ? '<span class="pj-prior" title="' + esc(t("proj.prior.d")) + '">' + esc(t("proj.prior")) + "</span>" : "") + "</p>" +
      '<h2 id="pfpTitle">' + esc(f(r, "title")) + "</h2>" +
      '<ul class="pfp-facts"><li>' + svgI(IC.client) + "<span><small>" + esc(T2("Klien", "Client")) + "</small>" + esc(nm && r.client ? r.client : r.client_type || "") + "</span></li>" +
      "<li>" + svgI(IC.place) + "<span><small>" + esc(T2("Cakupan", "Coverage")) + "</small>" + esc(areaText(r)) + "</span></li>" +
      "<li>" + svgI(IC.time) + "<span><small>" + esc(T2("Periode", "Period")) + "</small>" + esc([years(r), r.duration_months ? r.duration_months + " " + t("proj.months") : ""].filter(Boolean).join(", ")) + "</span></li></ul>" +
      '<div class="pfp-actions">' + (oL.length ? '<a class="btn btn-sm" href="#" data-golinks>' + esc(T2("Link luaran", "Output links")) + " (" + oL.length + ")</a>" : "") + pubs.map(p => '<a class="btn btn-sm" href="' + esc(p.url) + '">' + esc(t("pf.readPub")) + "</a>").join("") +
      '<button type="button" class="btn btn-sm btn-ghost pfp-tomap">' + svgI(IC.map) + esc(T2("Lihat di peta utama", "View on the main map")) + "</button>" +
      shareBox(r.id, absHash("#/projects/" + encodeURIComponent(r.id)), f(r, "title")) +
      '<button type="button" class="pfp-close" aria-label="' + esc(T2("Tutup profil", "Close profile")) + '">' + svgI(IC.close, 18) + "</button></div></div></header>" +
      '<div class="pfp-body"><div class="pfp-main">' +
      '<section class="pfp-sec"><h3>' + esc(T2("Narasi singkat", "Brief narrative")) + '</h3><p class="pfp-lead">' + esc(f(r, "summary")) + "</p>" +
      (nm && f(r, "testimonial") ? '<blockquote class="pj-quote"><p>' + esc(f(r, "testimonial")) + "</p>" + (r.testimonial_by ? "<cite>" + esc(r.testimonial_by) + "</cite>" : "") + "</blockquote>" : "") + "</section>" + linksHtml(oL) +
      '<section class="pfp-sec"><h3>' + esc(T2("Matriks proyek", "Project matrix")) + "</h3>" + matrix + "</section>" +
      (deliv ? '<section class="pfp-sec"><h3>' + esc(T2("Matriks keluaran", "Deliverables matrix")) + '</h3><p class="pfp-catsum">' + Object.entries(catSum).map(([k, v]) => '<span style="--c:' + v[1] + '"><b>' + v[0] + "</b>" + esc(k) + "</span>").join("") + "</p>" + deliv + "</section>" : "") +
      (r.disclosure === "C" ? '<p class="pfp-note">' + esc(T2("Nama klien, mitra, dan lokasi rinci tidak ditampilkan sesuai perjanjian kerahasiaan.", "Client, partner and detailed location names are withheld under a confidentiality agreement.")) + "</p>" : "") +
      '</div><aside class="pfp-side">' +
      '<div class="pfp-card"><h3>' + esc(T2("Cakupan wilayah", "Coverage")) + '</h3><div class="pfp-mini" id="pfpMini"></div><p class="pfp-area">' + esc(areaText(r)) + "</p></div>" +
      (cv ? '<div class="pfp-card pfp-cover"><h3>' + esc(T2("Dokumen", "Document")) + "</h3>" + coverBox(cv.thumb, cv.cover, f(r, "title"), r.id) + "</div>" : "") +
      (sdgHtml ? '<div class="pfp-card"><h3>' + esc(T2("Kontribusi SDG", "SDG contribution")) + '</h3><div class="pfp-sdgs">' + sdgHtml + "</div></div>" : "") +
      "</aside></div></article>";
    /* mini coverage map */
    const el = $("pfpMini");
    if (mini) { try { if (mini.ro) mini.ro.disconnect(); mini.map.stop(); mini.map.off(); mini.map.remove(); } catch (e) { /* already gone */ } mini = null; }
    if (L && geoData[0]) {
      mini = makeMap(el, false);
      const c = cover.get(r.id);
      mini.provLayer && mini.provLayer.eachLayer(l => { const on = c.national || c.prov.has(l.feature.properties.id); l.setStyle({ fillColor: on ? "#F6D2B5" : "#DCE6E3", color: on ? "#C4621D" : "#fff", weight: on ? 1.2 : 0.6 }); hatch(l, on); });
      mini.ctryLayer && mini.ctryLayer.eachLayer(l => { const on = c.ctry.has(l.feature.properties.id); l.setStyle({ fillColor: on ? "#F6D2B5" : "#EDF1F0", color: on ? "#C4621D" : "#fff", weight: on ? 1.2 : 0.5 }); hatch(l, on); });
      const b = boundsOf(mini, c);
      if (b) mini.map.fitBounds(b, { padding: [16, 16], maxZoom: 6, animate: false });
    }
    profileHost.querySelector(".pfp-close").addEventListener("click", () => clearSel(true));
    const gl = profileHost.querySelector("[data-golinks]"); if (gl) gl.addEventListener("click", e => { e.preventDefault(); profileHost.querySelector(".pfp-links-sec").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); });
    profileHost.querySelector(".pfp-tomap").addEventListener("click", () => host.querySelector(".pfx-main").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }));
  }
  function select(id, how) {
    const r = rows.find(x => x.id === id); if (!r) return;
    st.sel = id; draw(); fitMain(); profile(r);
    if (how !== "quiet") profileHost.scrollIntoView({ block: "start", behavior: how === "jump" || reduce ? "auto" : "smooth" });
    if (window.CharisShare) window.CharisShare.track(r.id, "read");
  }
  function clearSel(scroll) {
    const was = st.sel; st.sel = null; profileHost.hidden = true; profileHost.innerHTML = ""; if (mini) { try { if (mini.ro) mini.ro.disconnect(); mini.map.stop(); mini.map.off(); mini.map.remove(); } catch (e) { /* already gone */ } mini = null; }
    draw(); fitMain();
    if (scroll) { host.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); const b = host.querySelector('[data-pid="' + CSS.escape(was || "") + '"]'); if (b) b.focus({ preventScroll: true }); }
  }
  const refresh = () => { if (st.sel && !rowsNow().some(r => r.id === st.sel)) clearSel(false); draw(); };

  /* ---------- events ---------- */
  let qT = 0;
  $("pfxQ").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(() => { st.q = e.target.value; refresh(); }, 120); });
  FIELDS.forEach(([k, id]) => $(id).addEventListener("change", e => { st[k] = e.target.value; refresh(); }));
  $("pfxChips").addEventListener("click", e => {
    const b = e.target.closest("[data-clear]"); if (!b) return; const k = b.dataset.clear;
    if (k === "all" || k === "q") { st.q = ""; $("pfxQ").value = ""; }
    FIELDS.forEach(([fk, id]) => { if (k === "all" || k === fk) { st[fk] = ""; $(id).value = ""; } });
    refresh(); fitMain();
  });
  $("pfxFt").addEventListener("click", () => { const o = host.querySelector(".pfx-tools").classList.toggle("open"); $("pfxFt").setAttribute("aria-expanded", String(o)); });
  $("pfxList").addEventListener("click", e => { const b = e.target.closest("[data-pid]"); if (b) { if (st.sel === b.dataset.pid) clearSel(false); else select(b.dataset.pid); } });

  const ready = (async () => {
    if (!L) { $("pfxMap").innerHTML = '<p class="state">' + esc(T2("Peta tidak dapat dimuat.", "The map could not be loaded.")) + "</p>"; rows.forEach(r => cover.set(r.id, resolve(r))); fillFilters(); draw(); return; }
    geoData = await loadGeo();
    if (geoData[1]) countryNames = geoData[1].features.flatMap(ft => [[String(ft.properties.name_en).toLowerCase(), ft.properties.id], [String(ft.properties.name_id).toLowerCase(), ft.properties.id]]);
    rows.forEach(r => cover.set(r.id, resolve(r)));
    main = makeMap($("pfxMap"), true);
    const tip = (l, n) => l.bindTooltip(() => "<strong>" + esc(nameOf(l.feature)) + "</strong><br>" + n() + " " + esc(t("proj.count")), { sticky: true, direction: "top", className: "pfx-tip" });
    main.provLayer && main.provLayer.eachLayer(l => { tip(l, () => provCount(l.feature.properties.id)); l.on("click", () => { st.reg = st.reg === l.feature.properties.id ? "" : l.feature.properties.id; $("pfxReg").value = st.reg; refresh(); }); });
    main.ctryLayer && main.ctryLayer.eachLayer(l => { tip(l, () => ctryCount(l.feature.properties.id)); l.on("click", () => { if (!ctryCount(l.feature.properties.id)) return; st.reg = st.reg === l.feature.properties.id ? "" : l.feature.properties.id; $("pfxReg").value = st.reg; refresh(); }); });
    main.map.on("focus", () => main.map.scrollWheelZoom.enable()); main.map.on("blur", () => main.map.scrollWheelZoom.disable());
    host.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => { view = b.dataset.view; host.querySelectorAll("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); main.map.fitBounds(view === "world" ? [[-50, -150], [70, 170]] : IDN_BOUNDS, { padding: [10, 10] }); }));
    fillFilters(); draw();
  })();

  return {
    ready,
    filterService(k) { ready.then(() => { st.svc = st.svc === k ? "" : k; $("pfxSvc").value = st.svc; refresh(); }); },
    select(id, how) { ready.then(() => select(id, how)); }
  };
};
