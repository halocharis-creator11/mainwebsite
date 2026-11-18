/* Interactive figures for the climate vulnerability and child morbidity report.
   Provincial prevalence, climate extreme counts, random effects, relative risks, curves and economic values are
   read from the published figures and rounded; excess cases, class prevalences, cost components and scenario
   totals follow the published labels. */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const T = C.T;
  const nf = (v, d) => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const RULE = "#E1E8E6", INK = "#142826", TEAL = "#0E5A55", ORANGE = "#E8833A", BLUE = "#2D6A8E", RED = "#C0392B", PURPLE = "#6B4E9B", GREY = "#9AA6A3";
  const tipEl = () => document.querySelector(".ifig-tip");
  const tip = (e, html) => { const t = tipEl(); if (!t) return; t.innerHTML = html; t.style.opacity = 1; const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = x + "px"; t.style.top = y + "px"; };
  const untip = () => { const t = tipEl(); if (t) t.style.opacity = 0; };
  const bind = (el, sel, html) => el.querySelectorAll(sel).forEach(n => {
    n.addEventListener("mousemove", e => tip(e, html(n))); n.addEventListener("mouseleave", untip);
    n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); tip({ clientX: r.right, clientY: r.top }, html(n)); }); n.addEventListener("blur", untip);
    n.addEventListener("click", e => tip(e, html(n)));
  });
  const W = el => Math.max(300, el.clientWidth || el.parentNode.clientWidth || 640);
  const onLang = fn => { fn(); document.addEventListener("charis:lang", fn); };
  const setup = (key, views, draw0) => document.querySelectorAll(`[data-fig="${key}"]`).forEach(el => {
    const fig = el.closest(".ifig"); let view = views ? views[0].v : null;
    const draw = e => draw0(e, view);
    C.mount(el, draw);
    const ctl = fig.querySelector('[data-ctl="view"]');
    if (ctl && views) onLang(() => C.toggles(ctl, views, view, v => { view = v; draw(el); }));
  });
  const narrow = () => innerWidth < 560;

  /* ---------- provincial data ----------
     [name, geo id, prevalence %, heat days, heavy rain days, longest dry spell (days), excess cases, random effect, lo, hi] */
  const P = [
    ["Aceh", "ID-AC", 4.9, 2, 4, 5, -313, -0.52, -0.69, -0.35], ["Sumatera Utara", "ID-SU", 7.5, 15, 1, 8, 70, 0.07, -0.13, 0.25],
    ["Sumatera Barat", "ID-SB", 9.8, 14, 6, 0, 295, 0.27, 0.11, 0.42], ["Riau", "ID-RI", 5.8, 0, 5, 5, -69, -0.21, -0.38, -0.04],
    ["Jambi", "ID-JA", 7.4, 0, 3, 0, 42, 0.04, -0.14, 0.21], ["Sumatera Selatan", "ID-SS", 7.1, 5, 3, 0, 68, 0.14, -0.10, 0.36],
    ["Bengkulu", "ID-BE", 10.0, 7, 5, 0, 129, 0.30, 0.12, 0.48], ["Lampung", "ID-LA", 5.1, 11, 1, 5, -195, -0.43, -0.63, -0.24],
    ["Kepulauan Bangka Belitung", "ID-BB", 3.7, 1, 7, 0, -108, -0.69, -0.93, -0.46], ["Kepulauan Riau", "ID-KR", 4.8, 0, 5, 5, -61, -0.38, -0.59, -0.18],
    ["DKI Jakarta", "ID-JK", 14.7, 7, 3, 0, 224, 0.71, 0.51, 0.89], ["Jawa Barat", "ID-JB", 15.3, 12, 12, 0, 1608, 0.72, 0.47, 0.95],
    ["Jawa Tengah", "ID-JT", 8.6, 6, 11, 0, 451, 0.14, -0.02, 0.29], ["DI Yogyakarta", "ID-YO", 9.0, 0, 14, 0, 102, 0.30, 0.11, 0.49],
    ["Jawa Timur", "ID-JI", 11.3, 59, 28, 0, 1003, 0.17, -0.29, 0.61], ["Banten", "ID-BT", 17.1, 41, 9, 0, 381, 0.72, 0.54, 0.88],
    ["Bali", "ID-BA", 9.5, 7, 3, 0, 260, 0.56, 0.34, 0.77], ["Nusa Tenggara Barat", "ID-NB", 8.4, 8, 0, 7, 89, 0.22, -0.01, 0.45],
    ["Nusa Tenggara Timur", "ID-NT", 7.4, 13, 2, 0, 101, 0.03, -0.13, 0.18], ["Kalimantan Barat", "ID-KB", 7.2, 26, 9, 9, 38, -0.08, -0.29, 0.11],
    ["Kalimantan Tengah", "ID-KT", 5.1, 24, 8, 0, -121, -0.45, -0.64, -0.26], ["Kalimantan Selatan", "ID-KS", 7.7, 6, 5, 0, 104, 0.12, -0.05, 0.29],
    ["Kalimantan Timur", "ID-KI", 7.4, 5, 3, 0, -17, -0.08, -0.27, 0.10], ["Kalimantan Utara", "ID-KI", 5.3, 2, 3, 0, -28, -0.27, -0.50, -0.03],
    ["Sulawesi Utara", "ID-SA", 4.4, 4, 9, 5, -177, -0.58, -0.83, -0.33], ["Sulawesi Tengah", "ID-ST", 5.9, 12, 4, 0, -29, -0.08, -0.27, 0.09],
    ["Sulawesi Selatan", "ID-SN", 5.8, 9, 16, 0, -187, -0.47, -0.81, -0.16], ["Sulawesi Tenggara", "ID-SG", 3.6, 33, 2, 7, -312, -0.67, -0.88, -0.47],
    ["Gorontalo", "ID-GO", 6.0, 1, 0, 5, -12, 0.03, -0.26, 0.30], ["Sulawesi Barat", "ID-SR", 5.3, 7, 0, 0, -44, -0.11, -0.47, 0.23],
    ["Maluku", "ID-MA", 4.4, 32, 5, 8, -59, -0.18, -0.37, 0.00], ["Maluku Utara", "ID-MU", 4.3, 3, 3, 5, -115, -0.46, -0.67, -0.26],
    ["Papua Barat", "ID-PB", 7.1, 29, 3, 0, 123, 0.46, 0.25, 0.66], ["Papua", "ID-PA", 11.9, 51, 16, 0, 166, 0.56, 0.19, 0.91]
  ];
  const RR = [["Jawa Barat", 6.54], ["Banten", 5.43], ["Papua", 5.42], ["DKI Jakarta", 4.83], ["Bali", 3.91], ["Jawa Timur", 3.76], ["Papua Barat", 3.45], ["Bengkulu", 3.06], ["Sumatera Barat", 3.05], ["Jawa Tengah", 2.86]];

  /* ---------- 1. provincial map: morbidity and climate extremes ---------- */
  const LAY = {
    prev: { i: 2, id: "Prevalensi morbiditas anak", en: "Child morbidity prevalence", u: "%", d: 1, br: [4, 6, 8, 10, 13], pal: ["#F3E8D2", "#F2C48D", "#E8A35E", "#D9733A", "#B8452A", "#7E1F17"] },
    heat: { i: 3, id: "Hari panas ekstrem", en: "Extreme heat days", u: { id: " hari", en: " days" }, d: 0, br: [1, 6, 12, 25, 40], pal: ["#F7EFE6", "#F8D3B4", "#F2A877", "#E57A45", "#C9502A", "#8E2A16"] },
    rain: { i: 4, id: "Hari hujan lebat", en: "Heavy rain days", u: { id: " hari", en: " days" }, d: 0, br: [1, 4, 8, 12, 18], pal: ["#EEF4F7", "#C8DEEA", "#93BED6", "#5A97BD", "#2D6A8E", "#173F5A"] },
    dry: { i: 5, id: "Periode kering terpanjang", en: "Longest dry spell", u: { id: " hari", en: " days" }, d: 0, br: [1, 5, 6, 8, 9], pal: ["#F4F1EC", "#E8DCC4", "#D7BE8F", "#C29A55", "#9C7330", "#6A4C1C"] },
    ex: { i: 6, id: "Kasus berlebih terkait iklim", en: "Climate-attributable excess cases", u: "", d: 0, br: [-150, 0, 100, 300, 800], pal: ["#2D6A8E", "#9CC1D6", "#F6E3CF", "#EDA36F", "#CF5A2E", "#8E1F12"] }
  };
  const shade = (k, v) => { const L = LAY[k]; let j = 0; while (j < L.br.length && v >= L.br[j]) j++; return L.pal[j]; };
  const unit = k => T(LAY[k].u);
  const fv = (k, v) => (k === "ex" && v > 0 ? "+" : "") + nf(v, LAY[k].d) + unit(k);
  const byId = {}; P.forEach(r => (byId[r[1]] = byId[r[1]] || []).push(r));
  const mainRow = id => (byId[id] || []).find(r => r[0] !== "Kalimantan Utara") || null;
  let geoP = null;
  const geo = () => geoP || (geoP = fetch("../../assets/data/idn-provinces.geojson").then(r => r.json()).catch(() => null));
  const rowHtml = r => "<b>" + esc(r[0]) + "</b><br>" + ["prev", "heat", "rain", "dry", "ex"].map(k => esc(T(LAY[k])) + ": <b>" + fv(k, r[LAY[k].i]) + "</b>").join("<br>");

  document.querySelectorAll('[data-fig="map"]').forEach(el => {
    const fig = el.closest(".ifig"), ctl = fig.querySelector('[data-ctl="view"]');
    let view = "prev", shown = "prev", map = null, layer = null, sel = null;
    el.innerHTML = '<div class="pv"><div class="pv-map" role="region"></div><aside class="pv-side" aria-live="polite"></aside></div><div class="pv-rank" hidden></div><div class="pv-legend"></div>';
    const mapEl = el.querySelector(".pv-map"), side = el.querySelector(".pv-side"), rank = el.querySelector(".pv-rank"), legend = el.querySelector(".pv-legend");
    const color = id => { const r = mainRow(id); return r ? shade(view, r[LAY[view].i]) : "#C9D3D0"; };
    function drawLegend() {
      const L = LAY[view], b = L.br, f = v => nf(v, 0);
      const labs = [tr("di bawah ", "below ") + f(b[0])].concat(b.slice(0, -1).map((v, i) => f(v) + tr(" sampai ", " to ") + f(b[i + 1]))).concat([f(b[b.length - 1]) + tr(" atau lebih", " or more")]);
      legend.innerHTML = '<span class="pv-lt">' + esc(T(L)) + (typeof L.u === "string" && L.u ? " (" + L.u + ")" : "") + "</span>" + labs.map((l, i) => '<span><i style="background:' + L.pal[i] + '"></i>' + esc(l) + "</span>").join("");
    }
    function showSide(id, name) {
      sel = id; const rows = byId[id] || [];
      side.innerHTML = '<p class="pv-k">' + esc(tr("Provinsi terpilih", "Selected province")) + "</p><h4>" + esc(name) + "</h4>" +
        rows.map(r => (rows.length > 1 ? '<p class="pv-sub">' + esc(r[0]) + "</p>" : "") + ["prev", "heat", "rain", "dry", "ex"].map(k => '<p class="pv-v' + (k === view ? " on" : "") + '"><span>' + esc(T(LAY[k])) + "</span><b>" + fv(k, r[LAY[k].i]) + "</b></p>").join("") +
          '<p class="pv-v"><span>' + esc(tr("Efek acak provinsi (log-odds)", "Provincial random effect (log-odds)")) + "</span><b>" + (r[7] > 0 ? "+" : "") + nf(r[7], 2) + "</b></p>").join("");
      if (layer) layer.eachLayer(l => l.setStyle({ weight: l.feature.properties.id === id ? 2.4 : 0.7, color: l.feature.properties.id === id ? INK : "#fff" }));
    }
    const paint = () => { if (layer) layer.eachLayer(l => l.setStyle({ fillColor: color(l.feature.properties.id) })); drawLegend(); };
    function drawRank() {
      const k = view, L = LAY[k], rows = P.slice().sort((a, b) => b[L.i] - a[L.i]);
      const mx = Math.max(...rows.map(r => Math.abs(r[L.i]))) || 1, neg = rows.some(r => r[L.i] < 0);
      rank.innerHTML = '<ol class="pv-bars' + (neg ? " neg" : "") + '">' + rows.map((r, i) => { const v = r[L.i], w = Math.abs(v) / mx * (neg ? 50 : 100);
        return '<li><span class="pv-n">' + (i + 1) + ". " + esc(r[0]) + '</span><span class="pv-t"><span class="pv-tr"><i style="' + (neg ? (v >= 0 ? "left:50%" : "left:" + (50 - w) + "%") : "left:0") + ";width:" + w + "%;background:" + shade(k, v) + '"></i></span><b>' + fv(k, v) + "</b></span></li>"; }).join("") + "</ol>";
    }
    async function init() {
      const g = await geo();
      if (!window.L || !g) { mapEl.innerHTML = '<p class="state">' + esc(tr("Peta tidak dapat dimuat.", "The map could not be loaded.")) + "</p>"; return; }
      map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, minZoom: 3, maxZoom: 8, zoomSnap: 0.25 });
      map.attributionControl.setPrefix(false); map.attributionControl.addAttribution(tr("Batas wilayah", "Boundaries") + ': <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>');
      layer = L.geoJSON(g, { style: ft => ({ fillColor: color(ft.properties.id), fillOpacity: 1, color: "#fff", weight: 0.7 }),
        onEachFeature: (ft, l) => { l.bindTooltip(() => (byId[ft.properties.id] || []).map(rowHtml).join("<hr>") || esc(ft.properties.name), { sticky: true, className: "pv-tip" }); l.on("click", () => showSide(ft.properties.id, ft.properties.name)); } }).addTo(map);
      let fitted = false;
      const fit = () => { if (!map._mapPane) return; map.invalidateSize(); if (!fitted && mapEl.clientWidth > 50 && mapEl.clientHeight > 50) { map.fitBounds([[-11, 95], [6, 141]], { padding: [6, 6], animate: false }); fitted = true; } };
      fit();
      if ("ResizeObserver" in window) new ResizeObserver(fit).observe(mapEl);
      document.addEventListener("charis:lang", () => setTimeout(fit, 30));
      paint();
      side.innerHTML = '<p class="pv-k">' + esc(tr("Klik provinsi di peta", "Click a province on the map")) + "</p><p>" + esc(tr("untuk melihat prevalensi morbiditas anak, tiga indikator iklim ekstrem, kasus berlebih terkait iklim, dan efek acak provinsi.", "to see child morbidity prevalence, three climate extreme indicators, climate-attributable excess cases and the provincial random effect.")) + "</p>";
    }
    const views = Object.keys(LAY).map(k => ({ v: k, label: { id: LAY[k].id, en: LAY[k].en } })).concat([{ v: "rank", label: { id: "Peringkat", en: "Ranking" } }]);
    const apply = v => {
      shown = v; if (v !== "rank") view = v;
      el.querySelector(".pv").hidden = v === "rank"; rank.hidden = v !== "rank";
      if (v === "rank") drawRank(); else { paint(); if (sel && layer) layer.eachLayer(l => { if (l.feature.properties.id === sel) showSide(sel, l.feature.properties.name); }); if (map) setTimeout(() => map.invalidateSize(), 0); }
      drawLegend();
    };
    onLang(() => { C.toggles(ctl, views, shown, apply); drawLegend(); if (shown === "rank") drawRank(); if (sel && layer) layer.eachLayer(l => { if (l.feature.properties.id === sel) showSide(sel, l.feature.properties.name); }); });
    init();
  });

  /* ---------- generic vertical bars with optional interval ---------- */
  function vbars(el, cfg) {
    const w = W(el), H = cfg.h || 280, m = { l: 52, r: 14, t: 30, b: 44 }, n = cfg.rows.length;
    const Y = v => H - m.b - (v - (cfg.min || 0)) / (cfg.max - (cfg.min || 0)) * (H - m.t - m.b), gw = (w - m.l - m.r) / n, bw = Math.min(cfg.bw || 120, gw * 0.6);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(T(cfg.aria)) + '">';
    for (let v = cfg.min || 0; v <= cfg.max + 1e-9; v += cfg.step) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + cfg.yf(v) + "</text>";
    cfg.rows.forEach((r, i) => { const x = m.l + gw * i + (gw - bw) / 2, cx = x + bw / 2;
      s += '<rect class="bb" tabindex="0" data-i="' + i + '" x="' + x + '" y="' + Y(r.v) + '" width="' + bw + '" height="' + (Y(cfg.min || 0) - Y(r.v)) + '" rx="4" fill="' + r.c + '"/>';
      if (r.lo != null) s += '<line x1="' + cx + '" x2="' + cx + '" y1="' + Y(r.lo) + '" y2="' + Y(r.hi) + '" stroke="' + INK + '" stroke-width="1.6"/><line x1="' + (cx - 8) + '" x2="' + (cx + 8) + '" y1="' + Y(r.hi) + '" y2="' + Y(r.hi) + '" stroke="' + INK + '" stroke-width="1.6"/><line x1="' + (cx - 8) + '" x2="' + (cx + 8) + '" y1="' + Y(r.lo) + '" y2="' + Y(r.lo) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<text x="' + (cx + (r.lo != null ? 14 : 0)) + '" y="' + (Y(r.hi != null ? r.hi : r.v) - 8) + '" text-anchor="' + (r.lo != null ? "start" : "middle") + '" class="val">' + cfg.vf(r.v) + "</text>";
      s += '<text x="' + cx + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + esc(T(r.l)) + "</text>"; });
    if (cfg.xl) s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(T(cfg.xl)) + "</text>";
    el.innerHTML = s + "</svg>";
    bind(el, ".bb", nd => { const r = cfg.rows[+nd.dataset.i]; return "<b>" + esc(T(r.l)) + "</b><br>" + cfg.vf(r.v) + (r.lo != null ? '<br><span class="rng">' + (cfg.ci ? T(cfg.ci) : "95% CI") + " " + cfg.vf(r.lo) + tr(" sampai ", " to ") + cfg.vf(r.hi) + "</span>" : "") + (r.tip ? '<br><span class="rng">' + esc(T(r.tip)) + "</span>" : ""); });
  }
  const pct = v => nf(v, 1) + "%";

  /* ---------- 2. social gradients ---------- */
  const DEC = [7.68, 7.57, 8.77, 9.22, 10.67, 11.85, 11.39, 10.28, 9.96, 10.28];
  setup("grad", [{ v: "ur", label: { id: "Perkotaan dan perdesaan", en: "Urban and rural" } }, { v: "dec", label: { id: "Desil kekayaan", en: "Wealth decile" } }], (el, v) => {
    if (v === "ur") return vbars(el, { aria: { id: "Prevalensi morbiditas menurut tempat tinggal", en: "Morbidity prevalence by residence" }, max: 12, step: 3, yf: v => nf(v, 0) + "%", vf: pct, xl: { id: "Tempat tinggal", en: "Residence" },
      rows: [{ l: { id: "Perkotaan", en: "Urban" }, v: 10.8, lo: 10.5, hi: 11.2, c: BLUE }, { l: { id: "Perdesaan", en: "Rural" }, v: 8.6, lo: 8.2, hi: 9.0, c: "#7FA9C4" }] });
    const w = W(el), H = 290, m = { l: 48, r: 18, t: 18, b: 46 }, y0 = 7, y1 = 12.5;
    const X = i => m.l + i / 9 * (w - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Prevalensi morbiditas menurut desil kekayaan", "Morbidity prevalence by wealth decile")) + '">';
    for (let v = 7; v <= 12 + 1e-9; v += 1) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "%</text>";
    DEC.forEach((d, i) => { s += '<text x="' + X(i) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + (i + 1) + "</text>"; });
    s += '<polyline fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round" points="' + DEC.map((d, i) => X(i) + "," + Y(d)).join(" ") + '"/>';
    DEC.forEach((d, i) => { s += '<circle class="pt" tabindex="0" data-i="' + i + '" cx="' + X(i) + '" cy="' + Y(d) + '" r="6" fill="' + (i < 2 ? RED : i > 7 ? TEAL : INK) + '" stroke="#fff" stroke-width="1.5"/>'; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Desil kekayaan rumah tangga (1 termiskin, 10 terkaya)", "Household wealth decile (1 poorest, 10 richest)")) + "</text>";
    el.innerHTML = s + "</svg>";
    bind(el, ".pt", nd => { const i = +nd.dataset.i; return "<b>" + tr("Desil ", "Decile ") + (i + 1) + "</b><br>" + pct(DEC[i]) + '<br><span class="rng">' + tr("Nilai dibaca dari grafik sumber", "Value read from the source figure") + "</span>"; });
  });

  /* ---------- 3. vulnerability classes ---------- */
  setup("lca", null, el => vbars(el, { aria: { id: "Prevalensi morbiditas menurut kelas kerentanan", en: "Morbidity prevalence by vulnerability class" }, max: 12, step: 3, yf: v => nf(v, 0) + "%", vf: pct, xl: { id: "Kelas kerentanan laten", en: "Latent vulnerability class" },
    rows: [{ l: { id: "Rendah", en: "Low" }, v: 7.0, lo: 6.6, hi: 7.5, c: "#8FB9A8" }, { l: { id: "Sedang", en: "Moderate" }, v: 8.5, lo: 8.1, hi: 9.0, c: "#5E8F7E" },
      { l: { id: "Tinggi", en: "High" }, v: 11.3, lo: 11.0, hi: 11.7, c: PURPLE, tip: { id: "Sekitar 1,6 kali kelas rendah", en: "About 1.6 times the low class" } }] }));

  /* ---------- 4. forest plots ---------- */
  function forest(el, rows, cfg) {
    const w = W(el), rh = cfg.rh || 17, nm = narrow() ? 132 : 190, m = { l: nm, r: 16, t: 14, b: 44 }, H = m.t + rows.length * rh + m.b;
    const X = v => m.l + (cfg.log ? (Math.log(v) - Math.log(cfg.x0)) / (Math.log(cfg.x1) - Math.log(cfg.x0)) : (v - cfg.x0) / (cfg.x1 - cfg.x0)) * (w - m.l - m.r);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(T(cfg.aria)) + '">';
    cfg.ticks.forEach(v => { s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + RULE + '"/><text x="' + X(v) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + nf(v, cfg.td) + "</text>"; });
    s += '<line x1="' + X(cfg.ref) + '" x2="' + X(cfg.ref) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + RED + '" stroke-dasharray="4 4"/>';
    rows.forEach((r, i) => { const y = m.t + i * rh + rh / 2, col = r.c || (r.lo > cfg.ref ? RED : r.hi < cfg.ref ? BLUE : GREY);
      s += '<g class="fr" tabindex="0" data-i="' + i + '"><rect x="0" y="' + (y - rh / 2) + '" width="' + w + '" height="' + rh + '" fill="transparent"/><text x="' + (m.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" style="fill:' + INK + '">' + esc(T(r.n)) + "</text>" +
        '<line x1="' + X(r.lo) + '" x2="' + X(r.hi) + '" y1="' + y + '" y2="' + y + '" stroke="' + col + '" stroke-width="2"/><circle cx="' + X(r.v) + '" cy="' + y + '" r="' + (cfg.r || 4.5) + '" fill="' + col + '"/></g>'; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(T(cfg.xl)) + "</text>";
    el.innerHTML = s + "</svg>";
    bind(el, ".fr", nd => { const r = rows[+nd.dataset.i]; return "<b>" + esc(T(r.n)) + "</b><br>" + esc(T(cfg.vl)) + ": <b>" + nf(r.v, 2) + "</b><br>" + tr("Interval kredibel 95%: ", "95% credible interval: ") + nf(r.lo, 2) + tr(" sampai ", " to ") + nf(r.hi, 2) + (r.tip ? '<br><span class="rng">' + esc(T(r.tip)) + "</span>" : ""); });
  }
  setup("re", [{ v: "re", label: { id: "Efek acak provinsi", en: "Provincial random effects" } }, { v: "rr", label: { id: "Risiko relatif tertinggi", en: "Highest relative risk" } }], (el, v) => {
    if (v === "re") {
      const rows = P.slice().sort((a, b) => b[7] - a[7]).map(r => ({ n: r[0], v: r[7], lo: r[8], hi: r[9], tip: r[8] > 0 ? { id: "Di atas rata-rata nasional", en: "Above the national average" } : r[9] < 0 ? { id: "Di bawah rata-rata nasional", en: "Below the national average" } : { id: "Tidak berbeda dari rata-rata nasional", en: "Not different from the national average" } }));
      return forest(el, rows, { aria: { id: "Efek acak provinsi", en: "Provincial random effects" }, x0: -1, x1: 1, ref: 0, ticks: [-1, -0.5, 0, 0.5, 1], td: 1, xl: { id: "Simpangan dari rata-rata nasional (log-odds)", en: "Deviation from the national average (log-odds)" }, vl: { id: "Efek acak", en: "Random effect" } });
    }
    const w = W(el), nm = narrow() ? 110 : 150, rh = 28, m = { l: nm, r: 50, t: 10, b: 40 }, H = m.t + RR.length * rh + m.b, X = v => m.l + v / 7 * (w - m.l - m.r);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Sepuluh provinsi dengan risiko relatif tertinggi", "Ten provinces with the highest relative risk")) + '">';
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(v => { s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + RULE + '"/><text x="' + X(v) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + v + "</text>"; });
    RR.forEach((r, i) => { const y = m.t + i * rh; s += '<text x="' + (m.l - 8) + '" y="' + (y + rh / 2 + 4) + '" text-anchor="end" style="fill:' + INK + '">' + esc(r[0]) + '</text><rect class="bb" tabindex="0" data-i="' + i + '" x="' + X(0) + '" y="' + (y + 4) + '" width="' + (X(r[1]) - X(0)) + '" height="' + (rh - 8) + '" rx="3" fill="#A33A2E"/><text x="' + (X(r[1]) + 5) + '" y="' + (y + rh / 2 + 4) + '" class="val">' + nf(r[1], 1) + "</text>"; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Risiko relatif posterior (BYM2)", "Posterior relative risk (BYM2)")) + "</text>";
    el.innerHTML = s + "</svg>";
    bind(el, ".bb", nd => { const r = RR[+nd.dataset.i]; return "<b>" + esc(r[0]) + "</b><br>RR " + nf(r[1], 2) + '<br><span class="rng">' + tr("Dibaca dari grafik sumber", "Read from the source figure") + "</span>"; });
  });

  /* ---------- 5. adjusted odds ratios and the predicted probability curve ---------- */
  setup("or", [{ v: "or", label: { id: "Rasio odds terkoreksi", en: "Adjusted odds ratios" } }, { v: "pp", label: { id: "Probabilitas menurut CVI", en: "Probability by CVI" } }], (el, v) => {
    if (v === "or") return forest(el, [
      { n: { id: "Indeks kekayaan", en: "Wealth index" }, v: 1.75, lo: 1.5, hi: 2.05, c: RED, tip: { id: "Satu-satunya prediktor yang jelas bermakna", en: "The only clearly significant predictor" } },
      { n: { id: "Indeks Kerentanan Iklim (CVI)", en: "Climate Vulnerability Index (CVI)" }, v: 1.6, lo: 0.95, hi: 3.0, c: ORANGE, tip: { id: "Interval sangat lebar dan melewati 1", en: "Very wide interval crossing 1" } },
      { n: { id: "Risiko kesehatan ibu (MHRI)", en: "Maternal Health Risk (MHRI)" }, v: 1.02, lo: 1.0, hi: 1.04, c: GREY },
      { n: { id: "Perkotaan (dibanding perdesaan)", en: "Urban (vs rural)" }, v: 1.0, lo: 0.97, hi: 1.03, c: GREY }],
      { aria: { id: "Rasio odds terkoreksi", en: "Adjusted odds ratios" }, rh: 46, r: 6, log: false, x0: 0.8, x1: 3.2, ref: 1, ticks: [1, 1.5, 2, 2.5, 3], td: 1, xl: { id: "Rasio odds terkoreksi (median posterior dan interval kredibel 95%)", en: "Adjusted odds ratio (posterior median and 95% credible interval)" }, vl: { id: "Rasio odds", en: "Odds ratio" } });
    const w = W(el), H = 290, m = { l: 48, r: 18, t: 18, b: 46 }, Y = p => H - m.b - (p - 4) / (14 - 4) * (H - m.t - m.b), X = c => m.l + c * (w - m.l - m.r);
    const f = c => 6.3 + 3.2 * c, lo = c => 6.3 + 3.2 * c - (0.3 + 2.3 * c * c), hi = c => 6.3 + 3.2 * c + (0.3 + 3.6 * c * c);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Probabilitas morbiditas menurut CVI", "Morbidity probability by CVI")) + '">';
    for (let p = 4; p <= 14; p += 2) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(p) + '" y2="' + Y(p) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + p + "%</text>";
    [0, 0.25, 0.5, 0.75, 1].forEach(c => { s += '<text x="' + X(c) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + nf(c, 2) + "</text>"; });
    const cs = []; for (let c = 0; c <= 1.0001; c += 0.05) cs.push(c);
    s += '<path d="M' + cs.map(c => X(c) + "," + Y(hi(c))).join("L") + "L" + cs.slice().reverse().map(c => X(c) + "," + Y(lo(c))).join("L") + 'Z" fill="' + BLUE + '" opacity=".16"/>';
    s += '<polyline fill="none" stroke="' + BLUE + '" stroke-width="3" points="' + cs.map(c => X(c) + "," + Y(f(c))).join(" ") + '"/>';
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Indeks Kerentanan Iklim (0 paling rendah, 1 paling tinggi)", "Climate Vulnerability Index (0 lowest, 1 highest)")) + "</text>";
    s += '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + (w - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/><line class="hl" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + INK + '" opacity="0"/>';
    el.innerHTML = s + "</svg>";
    const svg = el.querySelector("svg"), hl = svg.querySelector(".hl"), ov = svg.querySelector(".ov");
    const mv = e => { const r = svg.getBoundingClientRect(), c = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * w - m.l) / (w - m.l - m.r)));
      hl.setAttribute("x1", X(c)); hl.setAttribute("x2", X(c)); hl.setAttribute("opacity", ".3");
      tip(e, "<b>" + tr("CVI ", "CVI ") + nf(c, 2) + "</b><br>" + tr("Probabilitas morbiditas: ", "Morbidity probability: ") + "<b>" + pct(f(c)) + '</b><br><span class="rng">' + tr("Kisaran ", "Range ") + pct(lo(c)) + tr(" sampai ", " to ") + pct(hi(c)) + "</span>"); };
    ov.addEventListener("mousemove", mv); ov.addEventListener("click", mv); ov.addEventListener("mouseleave", () => { untip(); hl.setAttribute("opacity", "0"); });
  });

  /* ---------- 6. mediation ---------- */
  setup("med", null, el => vbars(el, { aria: { id: "Dekomposisi efek CVI", en: "Decomposition of the CVI effect" }, max: 0.012, step: 0.003, yf: v => nf(v, 3), vf: v => nf(v, 4), ci: { id: "Kisaran", en: "Range" }, xl: { id: "Komponen efek CVI terhadap morbiditas anak", en: "Component of the CVI effect on child morbidity" },
    rows: [{ l: { id: "Efek langsung", en: "Direct effect" }, v: 0.0095, lo: 0.0088, hi: 0.0102, c: TEAL, tip: { id: "Sekitar 90% efek total", en: "About 90% of the total effect" } },
      { l: { id: "Efek tidak langsung (HDI)", en: "Indirect effect (HDI)" }, v: 0.001, lo: 0.0008, hi: 0.0012, c: ORANGE, tip: { id: "Sekitar 10% efek total", en: "About 10% of the total effect" } },
      { l: { id: "Efek total", en: "Total effect" }, v: 0.0105, lo: 0.0098, hi: 0.0112, c: INK }] }));

  /* ---------- 7. effect modification by deprivation ---------- */
  setup("amp", null, el => {
    const w = W(el), H = 290, m = { l: 52, r: 18, t: 18, b: 46 }, x0 = -0.4, x1 = 5, y0 = 6.4, y1 = 9;
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    const S = [{ n: { id: "Deprivasi rendah", en: "Low deprivation" }, c: "#3BA7B0", a: 8.76, b: 8.52 }, { n: { id: "Deprivasi tinggi", en: "High deprivation" }, c: "#D9604C", a: 7.52, b: 6.51 }];
    const f = (sr, v) => sr.a + (sr.b - sr.a) * (v - x0) / (x1 - x0);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Efek marginal CVI menurut tingkat deprivasi", "Marginal effect of CVI by deprivation level")) + '">';
    for (let v = 6.5; v <= 9 + 1e-9; v += 0.5) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + nf(v, 1) + "%</text>";
    for (let v = 0; v <= 5; v++) s += '<text x="' + X(v) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + v + "</text>";
    S.forEach(sr => { s += '<line x1="' + X(x0) + '" y1="' + Y(sr.a) + '" x2="' + X(x1) + '" y2="' + Y(sr.b) + '" stroke="' + sr.c + '" stroke-width="3.2" stroke-linecap="round"/><text x="' + (X(x1) - 4) + '" y="' + (Y(sr.b) - 10) + '" text-anchor="end" class="lbl" style="fill:' + sr.c + ';font-weight:700">' + esc(T(sr.n)) + "</text>"; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Indeks Kerentanan Iklim (terstandar)", "Climate Vulnerability Index (standardised)")) + "</text>";
    s += '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + (w - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/><line class="hl" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + INK + '" opacity="0"/>';
    el.innerHTML = s + "</svg>";
    const svg = el.querySelector("svg"), hl = svg.querySelector(".hl"), ov = svg.querySelector(".ov");
    const mv = e => { const r = svg.getBoundingClientRect(), v = Math.max(x0, Math.min(x1, x0 + ((e.clientX - r.left) / r.width * w - m.l) / (w - m.l - m.r) * (x1 - x0)));
      hl.setAttribute("x1", X(v)); hl.setAttribute("x2", X(v)); hl.setAttribute("opacity", ".3");
      tip(e, "<b>" + tr("CVI terstandar ", "Standardised CVI ") + nf(v, 1) + "</b><br>" + S.map(sr => '<span style="color:' + sr.c + '">■</span> ' + esc(T(sr.n)) + ": <b>" + nf(f(sr, v), 2) + "%</b>").join("<br>") + '<br><span class="rng">' + tr("Selisih: ", "Gap: ") + nf(f(S[0], v) - f(S[1], v), 2) + tr(" poin persen", " percentage points") + "</span>"); };
    ov.addEventListener("mousemove", mv); ov.addEventListener("click", mv); ov.addEventListener("mouseleave", () => { untip(); hl.setAttribute("opacity", "0"); });
  });

  /* ---------- 8. excess cases by province ---------- */
  setup("excess", null, el => {
    const rows = P.slice().sort((a, b) => b[6] - a[6]), w = W(el), nm = narrow() ? 130 : 180, rh = 17, m = { l: nm, r: 46, t: 8, b: 40 }, H = m.t + rows.length * rh + m.b, x0 = -400, x1 = 1700;
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Kasus berlebih terkait iklim menurut provinsi", "Climate-attributable excess cases by province")) + '">';
    [-400, 0, 400, 800, 1200, 1600].forEach(v => { s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + (v ? RULE : INK) + '"/><text x="' + X(v) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + nf(v, 0) + "</text>"; });
    rows.forEach((r, i) => { const y = m.t + i * rh, v = r[6];
      s += '<g class="fr" tabindex="0" data-i="' + i + '"><rect x="0" y="' + y + '" width="' + w + '" height="' + rh + '" fill="transparent"/><text x="' + (m.l - 8) + '" y="' + (y + 12) + '" text-anchor="end" style="fill:' + INK + '">' + esc(r[0]) + '</text><rect x="' + Math.min(X(0), X(v)) + '" y="' + (y + 2) + '" width="' + Math.abs(X(v) - X(0)) + '" height="' + (rh - 4) + '" rx="2" fill="' + shade("ex", v) + '"/><text x="' + (v >= 0 ? X(v) + 4 : X(v) - 4) + '" y="' + (y + 12) + '" text-anchor="' + (v >= 0 ? "start" : "end") + '" class="val" style="font-size:11px">' + nf(v, 0) + "</text></g>"; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Kasus berlebih yang diatribusikan pada kerentanan iklim", "Excess cases attributable to climate vulnerability")) + "</text>";
    el.innerHTML = s + "</svg>";
    bind(el, ".fr", nd => { const r = rows[+nd.dataset.i]; return "<b>" + esc(r[0]) + "</b><br>" + fv("ex", r[6]) + " " + tr("kasus", "cases") + '<br><span class="rng">' + (r[6] < 0 ? tr("Nilai negatif: faktor non-iklim lebih dominan", "Negative value: non-climate factors dominate") : tr("Prevalensi teramati ", "Observed prevalence ") + pct(r[2])) + "</span>"; });
  });

  /* ---------- 9. economic burden ---------- */
  const RP = v => "Rp" + nf(v / 1e9, 2) + tr(" miliar", " billion");
  setup("econ", [{ v: "comp", label: { id: "Komposisi beban", en: "Burden composition" } }, { v: "scen", label: { id: "Skenario kebijakan", en: "Policy scenarios" } }], (el, v) => {
    if (v === "comp") return vbars(el, { aria: { id: "Komposisi beban ekonomi nasional", en: "Composition of the national economic burden" }, max: 5e9, step: 1e9, bw: 110, yf: v => nf(v / 1e9, 0), vf: RP, xl: { id: "Komponen biaya (Rp miliar)", en: "Cost component (Rp billion)" },
      rows: [{ l: { id: "Biaya medis langsung", en: "Direct medical cost" }, v: 3064147267, c: "#E06A5B", tip: { id: "Rp672.500 per kasus", en: "Rp672,500 per case" } }, { l: { id: "Kehilangan produktivitas", en: "Productivity loss" }, v: 1640289900, c: "#2BB3B1", tip: { id: "Rp360.000 per kasus", en: "Rp360,000 per case" } }, { l: { id: "Total", en: "Total" }, v: 4704437167, c: INK, tip: { id: "Sekitar 4.556 kasus berlebih", en: "About 4,556 excess cases" } }] });
    return vbars(el, { aria: { id: "Beban ekonomi tersisa menurut skenario", en: "Remaining economic burden by scenario" }, max: 5e9, step: 1e9, bw: 100, yf: v => nf(v / 1e9, 0), vf: RP, xl: { id: "Skenario (beban tersisa, Rp miliar)", en: "Scenario (remaining burden, Rp billion)" },
      rows: [{ l: { id: "Kondisi saat ini", en: "Current" }, v: 4704433957, c: GREY }, { l: { id: "Perlindungan sosial", en: "Social protection" }, v: 3998768664, c: PURPLE, tip: { id: "Turun sekitar 15%", en: "About 15% lower" } },
        { l: { id: "Adaptasi iklim", en: "Climate adaptation" }, v: 3763547166, c: "#E06A5B", tip: { id: "Turun sekitar 20%", en: "About 20% lower" } }, { l: { id: "Gabungan", en: "Combined" }, v: 3293103770, c: TEAL, tip: { id: "Turun sekitar 30%", en: "About 30% lower" } }] });
  });
})();
