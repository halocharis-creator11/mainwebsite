/* Interactive figures for the HIPA framework report.
   Provincial IILK averages, typology and the efficiency histogram are read from the published figures and rounded;
   trend lines are read from the fitted lines; scenario and cost-effectiveness values are the published labels. */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const T = C.T;
  const nf = (v, d) => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const RULE = "#E1E8E6", INK = "#142826", TEAL = "#0E5A55", ORANGE = "#E8833A", BLUE = "#2D6A8E", RED = "#C0392B", GREEN = "#2F7D5B";
  const tipEl = () => document.querySelector(".ifig-tip");
  const tip = (e, html) => { const t = tipEl(); if (!t) return; t.innerHTML = html; t.style.opacity = 1; const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = x + "px"; t.style.top = y + "px"; };
  const untip = () => { const t = tipEl(); if (t) t.style.opacity = 0; };
  const bind = (el, sel, html) => el.querySelectorAll(sel).forEach((n, i) => {
    n.addEventListener("mousemove", e => tip(e, html(i, n))); n.addEventListener("mouseleave", untip);
    n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); tip({ clientX: r.right, clientY: r.top }, html(i, n)); }); n.addEventListener("blur", untip);
    n.addEventListener("click", e => tip(e, html(i, n)));
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

  /* ---------- data ---------- */
  const IILK = [["Kep. Bangka Belitung",0.666,"leading","ID-BB"],["DI Yogyakarta",0.654,"leading","ID-YO"],["Bali",0.637,"leading","ID-BA"],["DKI Jakarta",0.625,"leading","ID-JK"],["Kepulauan Bangka Belitung",0.62,"leading","ID-BB"],["Sulawesi Selatan",0.592,"leading","ID-SN"],["Jawa Tengah",0.587,"leading","ID-JT"],["Kalimantan Selatan",0.587,"leading","ID-KS"],["Kalimantan Timur",0.584,"leading","ID-KI"],["Kalimantan Utara",0.582,"leading","ID-KI"],["Aceh",0.578,"leading","ID-AC"],["Kepulauan Riau",0.575,"leading","ID-KR"],["Sumatera Barat",0.571,"leading","ID-SB"],
    ["Jawa Timur",0.567,"middle","ID-JI"],["Nusa Tenggara Barat",0.565,"middle","ID-NB"],["Gorontalo",0.563,"middle","ID-GO"],["Jambi",0.556,"middle","ID-JA"],["Bengkulu",0.551,"middle","ID-BE"],["Sumatera Selatan",0.546,"middle","ID-SS"],["Sulawesi Utara",0.541,"middle","ID-SA"],["Riau",0.539,"middle","ID-RI"],["Banten",0.539,"middle","ID-BT"],["Sulawesi Tengah",0.537,"middle","ID-ST"],["Lampung",0.529,"middle","ID-LA"],["Jawa Barat",0.527,"middle","ID-JB"],["Sumatera Utara",0.525,"middle","ID-SU"],
    ["Sulawesi Tenggara",0.517,"lagging","ID-SG"],["Sulawesi Barat",0.509,"lagging","ID-SR"],["Kalimantan Tengah",0.506,"lagging","ID-KT"],["Kalimantan Barat",0.504,"lagging","ID-KB"],["Maluku Utara",0.496,"lagging","ID-MU"],["Nusa Tenggara Timur",0.475,"lagging","ID-NT"],["Maluku",0.461,"lagging","ID-MA"],["Papua Barat",0.425,"lagging","ID-PB"],["Papua",0.346,"lagging","ID-PA"],["Papua Selatan",0.278,"lagging","ID-PA"],["Papua Barat Daya",0.263,"lagging","ID-PB"],["Papua Tengah",0.16,"lagging","ID-PA"],["Papua Pegunungan",0.098,"lagging","ID-PA"]];
  const TYPO = { "ID-AC": "HL", "ID-BA": "HH", "ID-BB": "HH", "ID-BE": "LH", "ID-BT": "HH", "ID-GO": "HL", "ID-JA": "HH", "ID-JB": "LH", "ID-JI": "HH", "ID-JT": "HH", "ID-KB": "LL", "ID-KI": "HH", "ID-KR": "HL", "ID-KS": "HL", "ID-KT": "LL", "ID-LA": "HH",
    "ID-MA": "LL", "ID-MU": "LL", "ID-NB": "HH", "ID-NT": "LL", "ID-PA": "LL", "ID-PB": "LL", "ID-RI": "HL", "ID-SA": "LH", "ID-SB": "HL", "ID-SG": "LL", "ID-SN": "HH", "ID-SR": "HL", "ID-SS": "HH", "ID-ST": "LL", "ID-SU": "LH" };
  const TYPO_SUB = { "Kalimantan Utara": "LH" };
  const QUAD = {
    HH: { c: "#1E7B3A", id: "Integrasi tinggi, kinerja tinggi", en: "High integration, high performance", pid: "Pertahankan dan jadikan acuan pembelajaran bagi provinsi lain.", pen: "Sustain and use as a learning benchmark for other provinces." },
    HL: { c: "#E8A33A", id: "Integrasi tinggi, kinerja rendah", en: "High integration, low performance", pid: "Tangani kendala struktural seperti kemiskinan dan akses, serta perbaiki efisiensi pemanfaatan sumber daya.", pen: "Address structural constraints such as poverty and access, and improve efficiency of resource use." },
    LH: { c: "#2D6A8E", id: "Integrasi rendah, kinerja tinggi", en: "Low integration, high performance", pid: "Perkuat rujukan dan koordinasi layanan agar capaian tetap berkelanjutan.", pen: "Strengthen referral and care coordination to sustain current gains." },
    LL: { c: "#C0392B", id: "Integrasi rendah, kinerja rendah", en: "Low integration, low performance", pid: "Pendekatan gabungan: perkuat integrasi layanan sekaligus dukungan struktural.", pen: "A combined approach: strengthen service integration together with structural support." }
  };
  const GRP = { leading: { c: "#1E7B3A", id: "Unggul", en: "Leading" }, middle: { c: "#9AA6A3", id: "Menengah", en: "Middle" }, lagging: { c: "#D2553A", id: "Tertinggal", en: "Lagging" } };
  const HIST = [[-0.556,-0.524,1],[-0.456,-0.424,1],[-0.424,-0.391,1],[-0.391,-0.359,1],[-0.359,-0.326,1],[-0.326,-0.293,3],[-0.293,-0.261,1],[-0.261,-0.228,5],[-0.228,-0.196,1],[-0.196,-0.163,8],[-0.163,-0.13,8],[-0.13,-0.098,12],[-0.098,-0.065,19],[-0.065,-0.033,23],[-0.033,0.0,38],[0.0,0.039,50],[0.039,0.074,45],[0.074,0.108,43],[0.108,0.143,13],[0.143,0.177,4],[0.211,0.244,1],[0.244,0.277,1]];

  /* ---------- 1. framework ---------- */
  const DOM = [
    { c: "#1F4E8C", id: ["Kapasitas sistem", "Masukan"], en: ["System capacity", "Inputs"], iid: ["Fasilitas layanan primer per kecamatan", "Rumah sakit per 100.000 penduduk", "Tempat tidur per 1.000 penduduk", "Dokter, perawat, dan bidan per penduduk", "Unit darah per penduduk"], ien: ["Primary care facilities per subdistrict", "Hospitals per 100,000 population", "Beds per 1,000 population", "Doctors, nurses and midwives per population", "Blood units per population"] },
    { c: "#2F7D5B", id: ["Kesiapan dan mutu", "Kesiapan"], en: ["Readiness and quality", "Preparedness"], iid: ["Persentase puskesmas terakreditasi", "Persentase rumah sakit terakreditasi", "Persentase puskesmas dengan tenaga lengkap"], ien: ["Share of accredited primary health centres", "Share of accredited hospitals", "Share of primary health centres with a full workforce"] },
    { c: "#E8833A", id: ["Penyediaan layanan", "Integrasi"], en: ["Service delivery", "Integration"], iid: ["Cakupan antenatal (K4)", "Persalinan di fasilitas kesehatan", "Cakupan imunisasi", "Cakupan pengobatan TBC", "Cakupan layanan neonatal"], ien: ["Antenatal care coverage (K4)", "Facility-based deliveries", "Immunisation coverage", "TB treatment coverage", "Neonatal care coverage"] },
    { c: "#C0392B", id: ["Luaran kesehatan", "Hasil"], en: ["Health outcomes", "Results"], iid: ["Persentase balita gizi baik", "Prevalensi stunting", "Insidens dan keberhasilan pengobatan TBC", "Prevalensi HIV", "Insidens demam berdarah"], ien: ["Share of well-nourished children", "Stunting prevalence", "TB incidence and treatment success", "HIV prevalence", "Dengue incidence"] },
    { c: "#7A4FA3", id: ["Konteks sosial-ekonomi", "Lingkungan"], en: ["Socio-economic context", "Environment"], iid: ["Akses air bersih dan sanitasi", "Tingkat kemiskinan dan indeks Gini", "Rata-rata lama sekolah", "Indeks pembangunan manusia", "Tingkat pengangguran"], ien: ["Safe water and sanitation access", "Poverty rate and Gini index", "Mean years of schooling", "Human development index", "Unemployment rate"] }
  ];
  document.querySelectorAll('[data-fig="fw"]').forEach(el => {
    let open = 2;
    const draw = () => {
      const L = lang();
      el.innerHTML = '<div class="fw"><ol class="fw-row">' + DOM.map((d, i) => '<li><button type="button" class="fw-d' + (i === open ? " on" : "") + '" data-i="' + i + '" aria-expanded="' + (i === open) + '" style="--c:' + d.c + '"><b>' + esc(d[L][0]) + "</b><span>" + esc(d[L][1]) + '</span><em>' + d["i" + L].length + " " + tr("indikator", "indicators") + "</em></button></li>").join("") + "</ol>" +
        '<div class="fw-detail" style="--c:' + DOM[open].c + '"><p class="fw-h">' + esc(DOM[open][L][0]) + '</p><ul>' + DOM[open]["i" + L].map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" +
        '<p class="fw-int"><b>' + esc(tr("Integrasi layanan", "Service integration")) + "</b> " + esc(tr("menghubungkan kapasitas dengan luaran kesehatan.", "links capacity to health outcomes.")) + "</p></div>";
      el.querySelectorAll(".fw-d").forEach(b => b.addEventListener("click", () => { open = Number(b.dataset.i); draw(); el.querySelector(".fw-d.on").focus(); }));
    };
    onLang(draw);
  });

  /* ---------- 2. drivers: fitted lines ---------- */
  function lines(el, cfg) {
    const w = W(el), H = 300, m = { l: 48, r: 16, t: 18, b: 44 };
    const X = v => m.l + (v - cfg.x0) / (cfg.x1 - cfg.x0) * (w - m.l - m.r), Y = v => H - m.b - (v - cfg.y0) / (cfg.y1 - cfg.y0) * (H - m.t - m.b);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(T(cfg.aria)) + '">';
    for (let v = cfg.y0; v <= cfg.y1 + 1e-9; v += 0.1) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + nf(v, 1) + "</text>";
    for (let v = cfg.x0; v <= cfg.x1 + 1e-9; v += cfg.xs) s += '<text x="' + X(v) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + nf(v, cfg.xd) + "</text>";
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(T(cfg.xl)) + "</text>";
    cfg.series.forEach((sr, k) => {
      s += '<line x1="' + X(sr.a) + '" y1="' + Y(sr.f(sr.a)) + '" x2="' + X(sr.b) + '" y2="' + Y(sr.f(sr.b)) + '" stroke="' + sr.c + '" stroke-width="3.2" stroke-linecap="round"/>';
      s += '<text x="' + (X(sr.b) - 4) + '" y="' + (Y(sr.f(sr.b)) - 10 - k * 0) + '" text-anchor="end" class="lbl" style="fill:' + sr.c + ';font-weight:700">' + esc(T(sr.name)) + "</text>";
    });
    s += '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + (w - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/><line class="hl" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + INK + '" opacity="0"/></svg>';
    el.innerHTML = s;
    const svg = el.querySelector("svg"), hl = svg.querySelector(".hl"), ov = svg.querySelector(".ov");
    const mv = e => { const r = svg.getBoundingClientRect(); const xv = Math.max(cfg.x0, Math.min(cfg.x1, cfg.x0 + ((e.clientX - r.left) / r.width * w - m.l) / (w - m.l - m.r) * (cfg.x1 - cfg.x0)));
      hl.setAttribute("x1", X(xv)); hl.setAttribute("x2", X(xv)); hl.setAttribute("opacity", ".3");
      tip(e, "<b>" + esc(T(cfg.xl)) + ": " + nf(xv, 2) + "</b><br>" + cfg.series.filter(sr => xv >= sr.a - 1e-9 && xv <= sr.b + 1e-9).map(sr => '<span style="color:' + sr.c + '">■</span> ' + esc(T(sr.name)) + ": <b>" + nf(sr.f(xv), 3) + "</b>").join("<br>") + '<br><span class="rng">' + esc(tr("Indeks luaran yang diprediksi", "Predicted output index")) + "</span>"); };
    ov.addEventListener("mousemove", mv); ov.addEventListener("click", mv); ov.addEventListener("mouseleave", () => { untip(); hl.setAttribute("opacity", "0"); });
  }
  setup("drivers", null, el => lines(el, { aria: { id: "Garis tren kapasitas dan integrasi terhadap luaran", en: "Fitted lines of capacity and integration against output" }, x0: 0, x1: 1, xs: 0.25, xd: 2, y0: 0.4, y1: 0.8, xl: { id: "Nilai indeks", en: "Index value" },
        series: [{ name: { id: "Integrasi layanan", en: "Service integration" }, c: TEAL, a: 0, b: 0.96, f: x => 0.44 + 0.30 * x }, { name: { id: "Kapasitas sistem", en: "System capacity" }, c: ORANGE, a: 0, b: 0.55, f: x => 0.625 + 0.036 * x }] }));
  setup("pov", null, el => lines(el, { aria: { id: "Garis tren kemiskinan terhadap luaran", en: "Fitted line of poverty against output" }, x0: 0, x1: 0.3, xs: 0.05, xd: 2, y0: 0.4, y1: 0.8, xl: { id: "Tingkat kemiskinan (proporsi)", en: "Poverty rate (proportion)" },
        series: [{ name: { id: "Kemiskinan", en: "Poverty" }, c: RED, a: 0, b: 0.3, f: x => 0.73 - 0.88 * x }] }));

  /* ---------- 3. efficiency histogram ---------- */
  setup("eff", null, el => {
    const w = W(el), H = 290, m = { l: 40, r: 12, t: 16, b: 44 }, x0 = -0.6, x1 = 0.3, ymax = 55;
    const X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r), Y = v => H - m.b - v / ymax * (H - m.t - m.b);
    const total = HIST.reduce((a, b) => a + b[2], 0), below = HIST.filter(b => b[1] <= 0).reduce((a, b) => a + b[2], 0);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(tr("Sebaran skor efisiensi", "Distribution of efficiency scores")) + '">';
    s += '<rect x="' + X(x0) + '" y="' + m.t + '" width="' + (X(0) - X(x0)) + '" height="' + (H - m.t - m.b) + '" fill="#FBECE8"/>';
    s += '<text x="' + (X(x0) + 8) + '" y="' + (m.t + 16) + '" class="lbl" style="fill:' + RED + ';font-weight:700">' + esc(tr("Di bawah harapan", "Below expectation")) + "</text>";
    for (let v = 0; v <= 50; v += 10) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "</text>";
    for (let v = -0.6; v <= 0.3 + 1e-9; v += 0.2) s += '<text x="' + X(v) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + nf(v, 1) + "</text>";
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(tr("Skor efisiensi (aktual dikurangi diharapkan)", "Efficiency score (actual minus expected)")) + "</text>";
    HIST.forEach((b, i) => { s += '<rect class="hb" tabindex="0" data-i="' + i + '" x="' + (X(b[0]) + 0.5) + '" y="' + Y(b[2]) + '" width="' + Math.max(1, X(b[1]) - X(b[0]) - 1) + '" height="' + (H - m.b - Y(b[2])) + '" fill="' + (b[1] <= 0 ? "#D2553A" : TEAL) + '"/>'; });
    s += '<line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + INK + '" stroke-dasharray="4 4"/>';
    el.innerHTML = s + "</svg>";
    bind(el, ".hb", (k, n) => { const b = HIST[+n.dataset.i]; return "<b>" + nf(b[0], 2) + " " + tr("sampai", "to") + " " + nf(b[1], 2) + "</b><br>" + b[2] + " " + tr("provinsi-tahun", "province-years") + '<br><span class="rng">' + tr("Total di bawah nol: ", "Total below zero: ") + below + " " + tr("dari", "of") + " " + total + "</span>"; });
  });

  /* ---------- 4. provinces: local vector map and ranking ---------- */
  const byId = {};
  IILK.forEach(r => { (byId[r[3]] = byId[r[3]] || []).push(r); });
  const iilkShade = v => v >= 0.6 ? "#0B4F3A" : v >= 0.57 ? "#1E7B3A" : v >= 0.54 ? "#6FAF7E" : v >= 0.5 ? "#F2C48D" : v >= 0.4 ? "#E8833A" : "#B23A26";
  const provVal = id => { const a = byId[id]; if (!a) return null; const main = a.find(r => !/Kalimantan Utara|Papua (Selatan|Tengah|Pegunungan|Barat Daya)|^Kep\. /.test(r[0])) || a[0]; return main[1]; };
  let geoP = null;
  const geo = () => geoP || (geoP = fetch("../../assets/data/idn-provinces.geojson").then(r => r.json()).catch(() => null));
  function provInfo(id, name) {
    const a = byId[id] || [], ty = TYPO[id], L = lang();
    return "<b>" + esc(name) + "</b>" + a.map(r => "<br>" + esc(r[0]) + ": IILK <b>" + nf(r[1], 3) + "</b> (" + esc(GRP[r[2]][L]) + ")").join("") +
      (ty ? '<br><span class="rng">' + esc(tr("Tipologi: ", "Typology: ") + QUAD[ty][L]) + (byId[id] && byId[id].some(r => TYPO_SUB[r[0]]) ? "; Kalimantan Utara: " + esc(QUAD.LH[L]) : "") + "</span>" : '<br><span class="rng">' + esc(tr("Tipologi tidak terbaca jelas pada peta sumber", "Typology not clearly legible in the source map")) + "</span>");
  }
  document.querySelectorAll('[data-fig="prov"]').forEach(el => {
    const fig = el.closest(".ifig"), ctl = fig.querySelector('[data-ctl="view"]');
    let view = "iilk", map = null, layer = null, sel = null;
    el.innerHTML = '<div class="pv"><div class="pv-map" role="region"></div><aside class="pv-side" aria-live="polite"></aside></div><div class="pv-rank" hidden></div><div class="pv-legend"></div>';
    const mapEl = el.querySelector(".pv-map"), side = el.querySelector(".pv-side"), rank = el.querySelector(".pv-rank"), legend = el.querySelector(".pv-legend");
    const color = id => view === "typo" ? (TYPO[id] ? QUAD[TYPO[id]].c : "#C9D3D0") : (provVal(id) != null ? iilkShade(provVal(id)) : "#C9D3D0");
    function drawLegend() {
      const L = lang();
      legend.innerHTML = view === "typo"
        ? Object.keys(QUAD).map(k => '<span><i style="background:' + QUAD[k].c + '"></i>' + esc(QUAD[k][L]) + "</span>").join("") + '<span><i style="background:#C9D3D0"></i>' + esc(tr("Tidak terbaca jelas", "Not clearly legible")) + "</span>"
        : [["≥ 0,60", "#0B4F3A"], ["0,57 sampai 0,60", "#1E7B3A"], ["0,54 sampai 0,57", "#6FAF7E"], ["0,50 sampai 0,54", "#F2C48D"], ["0,40 sampai 0,50", "#E8833A"], ["< 0,40", "#B23A26"]].map(([l, c]) => '<span><i style="background:' + c + '"></i>IILK ' + (lang() === "en" ? l.replace(/,/g, ".").replace("sampai", "to") : l) + "</span>").join("");
    }
    function showSide(id, name) {
      sel = id; const L = lang(), a = byId[id] || [], ty = TYPO[id];
      side.innerHTML = '<p class="pv-k">' + esc(tr("Provinsi terpilih", "Selected province")) + "</p><h4>" + esc(name) + "</h4>" +
        a.map(r => '<p class="pv-v"><span>' + esc(r[0]) + '</span><b>' + nf(r[1], 3) + '</b><em style="--c:' + GRP[r[2]].c + '">' + esc(GRP[r[2]][L]) + "</em></p>").join("") +
        (ty ? '<p class="pv-ty" style="--c:' + QUAD[ty].c + '"><b>' + esc(QUAD[ty][L]) + "</b>" + esc(L === "en" ? QUAD[ty].pen : QUAD[ty].pid) + "</p>" : '<p class="pv-ty muted">' + esc(tr("Tipologi provinsi ini tidak terbaca jelas pada peta sumber.", "This province's typology is not clearly legible in the source map.")) + "</p>");
      if (layer) layer.eachLayer(l => l.setStyle({ weight: l.feature.properties.id === id ? 2.4 : 0.7, color: l.feature.properties.id === id ? INK : "#fff" }));
    }
    function paint() {
      if (layer) layer.eachLayer(l => l.setStyle({ fillColor: color(l.feature.properties.id) }));
      drawLegend();
    }
    function drawRank() {
      const L = lang(), max = 0.7, rows = IILK.slice();
      rank.innerHTML = '<ol class="pv-bars">' + rows.map((r, i) => '<li><span class="pv-n">' + (i + 1) + ". " + esc(r[0]) + '</span><span class="pv-t"><i style="width:' + (r[1] / max * 100) + "%;background:" + (view === "typo" ? (TYPO_SUB[r[0]] ? QUAD[TYPO_SUB[r[0]]].c : TYPO[r[3]] && r[3] !== "ID-JK" && r[3] !== "ID-YO" ? QUAD[TYPO[r[3]]].c : "#C9D3D0") : GRP[r[2]].c) + '"></i><b>' + nf(r[1], 3) + "</b></span></li>").join("") + "</ol>";
    }
    async function init() {
      const g = await geo();
      if (!window.L || !g) { mapEl.innerHTML = '<p class="state">' + esc(tr("Peta tidak dapat dimuat.", "The map could not be loaded.")) + "</p>"; return; }
      map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, minZoom: 3, maxZoom: 8, zoomSnap: 0.25 });
      map.attributionControl.setPrefix(false); map.attributionControl.addAttribution(tr("Batas wilayah", "Boundaries") + ': <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>');
      layer = L.geoJSON(g, { style: ft => ({ fillColor: color(ft.properties.id), fillOpacity: 1, color: "#fff", weight: 0.7 }),
        onEachFeature: (ft, l) => { l.bindTooltip(() => provInfo(ft.properties.id, ft.properties.name), { sticky: true, className: "pv-tip" }); l.on("click", () => showSide(ft.properties.id, ft.properties.name)); } }).addTo(map);
      /* the map may start in a hidden or not-yet-sized container (other language, layout): fit once it has a size */
      let fitted = false;
      const fit = () => { if (!map._mapPane) return; map.invalidateSize(); if (!fitted && mapEl.clientWidth > 50 && mapEl.clientHeight > 50) { map.fitBounds([[-11, 95], [6, 141]], { padding: [6, 6], animate: false }); fitted = true; } };
      fit();
      if ("ResizeObserver" in window) new ResizeObserver(fit).observe(mapEl);
      document.addEventListener("charis:lang", () => setTimeout(fit, 30));
      paint();
      side.innerHTML = '<p class="pv-k">' + esc(tr("Klik provinsi di peta", "Click a province on the map")) + "</p><p>" + esc(tr("untuk melihat nilai IILK, kelompok kinerja, tipologi, dan arah kebijakan yang sesuai.", "to see its IILK value, performance group, typology and the matching policy direction.")) + "</p>";
    }
    const views = [{ v: "iilk", label: { id: "Peta IILK", en: "IILK map" } }, { v: "typo", label: { id: "Peta tipologi", en: "Typology map" } }, { v: "rank", label: { id: "Peringkat", en: "Ranking" } }];
    let shown = "iilk";
    const apply = v => {
      shown = v; if (v !== "rank") view = v;
      el.querySelector(".pv").hidden = v === "rank"; rank.hidden = v !== "rank";
      if (v === "rank") drawRank(); else { paint(); if (map) setTimeout(() => { map.invalidateSize(); }, 0); }
      drawLegend();
    };
    onLang(() => { C.toggles(ctl, views, shown, apply); drawLegend(); if (shown === "rank") drawRank(); if (sel && layer) layer.eachLayer(l => { if (l.feature.properties.id === sel) showSide(sel, l.feature.properties.name); }); });
    init();
  });

  /* ---------- 5. scenarios and 6. cost-effectiveness ---------- */
  function bars(el, cfg) {
    const w = W(el), H = 270, m = { l: 48, r: 14, t: 26, b: 40 }, n = cfg.rows.length;
    const Y = v => H - m.b - v / cfg.max * (H - m.t - m.b), gw = (w - m.l - m.r) / n, bw = Math.min(110, gw * 0.55);
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + esc(T(cfg.aria)) + '">';
    for (let v = 0; v <= cfg.max + 1e-9; v += cfg.step) s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + RULE + '"/><text x="' + (m.l - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + nf(v, 1) + "</text>";
    cfg.rows.forEach((r, i) => { const x = m.l + gw * i + (gw - bw) / 2;
      s += '<rect class="bb" tabindex="0" data-i="' + i + '" x="' + x + '" y="' + Y(r.v) + '" width="' + bw + '" height="' + (H - m.b - Y(r.v)) + '" rx="4" fill="' + r.c + '"/><text x="' + (x + bw / 2) + '" y="' + (Y(r.v) - 7) + '" text-anchor="middle" class="val">' + nf(r.v, 3) + "</text>" +
        '<text x="' + (x + bw / 2) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + esc(T(r.l)) + "</text>"; });
    el.innerHTML = s + "</svg>";
    bind(el, ".bb", (k, nd) => { const r = cfg.rows[+nd.dataset.i]; return "<b>" + esc(T(r.l)) + "</b><br>" + nf(r.v, 3) + (r.tip ? '<br><span class="rng">' + esc(T(r.tip)) + "</span>" : ""); });
  }
  setup("scen", null, el => bars(el, { aria: { id: "Indeks luaran menurut skenario integrasi", en: "Output index by integration scenario" }, max: 0.8, step: 0.2, rows: [
    { l: { id: "Baseline", en: "Baseline" }, v: 0.638, c: "#9AA6A3" },
    { l: { id: "Integrasi +10%", en: "Integration +10%" }, v: 0.658, c: "#4F9A8F", tip: { id: "+3,1% dibanding baseline", en: "+3.1% compared with baseline" } },
    { l: { id: "Integrasi +20%", en: "Integration +20%" }, v: 0.677, c: TEAL, tip: { id: "+6,1% dibanding baseline", en: "+6.1% compared with baseline" } }] }));
  setup("ce", null, el => bars(el, { aria: { id: "Dampak per unit biaya", en: "Impact per cost unit" }, max: 0.6, step: 0.2, rows: [
    { l: { id: "Kapasitas", en: "Capacity" }, v: 0.029, c: ORANGE, tip: { id: "Dampak per unit biaya investasi kapasitas", en: "Impact per cost unit of capacity investment" } },
    { l: { id: "Integrasi", en: "Integration" }, v: 0.553, c: TEAL, tip: { id: "Sekitar 19 kali investasi kapasitas", en: "About 19 times capacity investment" } }] }));
})();
