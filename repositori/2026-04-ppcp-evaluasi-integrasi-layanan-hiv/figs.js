/* Interactive figures for the PPCP evaluation. Values are district/city averages reported in the evaluation;
   trend and boxplot values are rounded. */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const tr = (id, en) => C.lang() === "en" ? en : id;
  const T = C.T, f = C.fmt;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const onLang = fn => { fn(); document.addEventListener("charis:lang", fn); };
  const RULE = "#E1E8E6", INK = "#142826", PP = "#1F4E8C", NP = "#7FA7D9", GRN = "#2F7D5B";
  const tipEl = () => document.querySelector(".ifig-tip");
  const tip = (e, html) => { const t = tipEl(); if (!t) return; t.innerHTML = html; t.style.opacity = 1; const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = x + "px"; t.style.top = y + "px"; };
  const untip = () => { const t = tipEl(); if (t) t.style.opacity = 0; };
  const bind = (el, sel, html) => el.querySelectorAll(sel).forEach((n, i) => {
    n.addEventListener("mousemove", e => tip(e, html(i, n))); n.addEventListener("mouseleave", untip);
    n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); tip({ clientX: r.right, clientY: r.top }, html(i, n)); }); n.addEventListener("blur", untip); });
  const W = el => Math.max(300, el.clientWidth || el.parentNode.clientWidth || 640);
  const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), q = raw / p; return (q <= 1 ? 1 : q <= 2 ? 2 : q <= 2.5 ? 2.5 : q <= 5 ? 5 : 10) * p; };
  const NAMES = [{ id: "Kabupaten/kota PPCP", en: "PPCP districts/cities" }, { id: "Kabupaten/kota pembanding", en: "Comparison districts/cities" }];

  /* grouped bars: rows of [label, a, b] with two series */
  function grouped(el, cfg) {
    const w = W(el), H = cfg.height || 290, m = { l: 54, r: 10, t: 24, b: w < 520 ? 58 : 44 };
    const max = (cfg.max || Math.max(...cfg.rows.flatMap(r => [r.a, r.b]))) * 1.15, step = niceStep(max / 4);
    const gw = (w - m.l - m.r) / cfg.rows.length, Y = v => H - m.b - v / max * (H - m.t - m.b), vf = cfg.fmt || (v => f(v));
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = 0; v <= max; v += step) s += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${RULE}"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${esc((cfg.axisFmt || vf)(v))}</text>`;
    cfg.rows.forEach((r, i) => {
      const x0 = m.l + i * gw + gw * 0.14, bw = gw * 0.34;
      [[r.a, cfg.colors[0]], [r.b, cfg.colors[1]]].forEach(([v, c], k) => {
        const x = x0 + k * (bw + gw * 0.04);
        s += `<rect class="bar" data-i="${i}" tabindex="0" x="${x}" y="${Y(v)}" width="${bw}" height="${H - m.b - Y(v)}" rx="3" fill="${c}"/><text x="${x + bw / 2}" y="${Y(v) - 6}" text-anchor="middle" class="val">${esc(vf(v))}</text>`;
      });
      if (r.note) s += `<text x="${x0 + bw + gw * 0.02}" y="${m.t - 8}" text-anchor="middle" class="lbl" fill="${GRN}" style="fill:${GRN};font-weight:700">${esc(T(r.note))}</text>`;
      const words = T(r.label).split(" "), lines = [];
      words.forEach(wd => { const l = lines[lines.length - 1]; if (l && (l + " " + wd).length <= (w < 520 ? 12 : 22)) lines[lines.length - 1] = l + " " + wd; else lines.push(wd); });
      lines.slice(0, 3).forEach((ln, k) => { s += `<text x="${x0 + bw + gw * 0.02}" y="${H - m.b + 16 + k * 13}" text-anchor="middle">${esc(ln)}</text>`; });
    });
    el.innerHTML = s + "</svg>";
    bind(el, ".bar", (k, n) => { const r = cfg.rows[+n.dataset.i];
      return `<b>${esc(T(r.label))}</b><br><span style="color:${cfg.colors[0]}">■</span> ${esc(T(cfg.names[0]))}: <b>${esc(vf(r.a))}</b><br><span style="color:${cfg.colors[1]}">■</span> ${esc(T(cfg.names[1]))}: <b>${esc(vf(r.b))}</b>` + (r.tip ? `<br><span class="rng">${esc(T(r.tip))}</span>` : ""); });
  }

  /* forest plot: rows of {label, est, lo, hi, p, color} */
  function forest(el, cfg) {
    const w = W(el), narrow = w < 560, L = narrow ? 130 : 230, R = narrow ? 64 : 120, rh = 44, top = 14, H = top + cfg.rows.length * rh + 40;
    const lo = cfg.min, hi = cfg.max, X = v => L + (v - lo) / (hi - lo) * (w - L - R);
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = lo; v <= hi + 1e-9; v += cfg.step) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${top}" y2="${top + cfg.rows.length * rh}" stroke="${v === 0 ? INK : RULE}" ${v === 0 ? 'stroke-dasharray="3 3" opacity=".6"' : ""}/><text x="${X(v)}" y="${top + cfg.rows.length * rh + 16}" text-anchor="middle">${esc(f(v))}</text>`;
    s += `<text x="${(L + w - R) / 2}" y="${H - 4}" text-anchor="middle">${esc(T(cfg.axis))}</text>`;
    cfg.rows.forEach((r, i) => {
      const y = top + i * rh + rh / 2, lab = T(r.label), words = lab.split(" "), lines = [];
      words.forEach(wd => { const l = lines[lines.length - 1]; if (l && (l + " " + wd).length <= (narrow ? 18 : 32)) lines[lines.length - 1] = l + " " + wd; else lines.push(wd); });
      lines.forEach((ln, k) => { s += `<text x="${L - 12}" y="${y + 4 + (k - (lines.length - 1) / 2) * 13}" text-anchor="end" class="${r.bold ? "b" : ""}">${esc(ln)}</text>`; });
      s += `<g class="pt" tabindex="0" data-i="${i}"><line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}" stroke="${r.color}" stroke-width="2.4"/><line x1="${X(r.lo)}" x2="${X(r.lo)}" y1="${y - 6}" y2="${y + 6}" stroke="${r.color}" stroke-width="2"/><line x1="${X(r.hi)}" x2="${X(r.hi)}" y1="${y - 6}" y2="${y + 6}" stroke="${r.color}" stroke-width="2"/>` +
        `<rect x="${X(r.est) - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="${r.color}"/><rect x="${X(r.lo) - 4}" y="${y - 14}" width="${X(r.hi) - X(r.lo) + 8}" height="28" fill="transparent"/></g>`;
      s += `<text x="${w - R + 10}" y="${y + 4}" class="val">${(r.est > 0 ? "+" : "") + esc(f(r.est, 1))}</text>`;
    });
    el.innerHTML = s + "</svg>";
    bind(el, ".pt", (k, n) => { const r = cfg.rows[+n.dataset.i];
      return `<b>${esc(T(r.label))}</b><br>${esc(T(cfg.estName))}: <b>${(r.est > 0 ? "+" : "") + esc(f(r.est, 1))}</b><br><span class="rng">${r.lo !== r.hi ? tr("IK 95%", "95% CI") + ": " + esc(f(r.lo, 1)) + " " + tr("sampai", "to") + " " + esc(f(r.hi, 1)) + "; " : ""}${r.p ? "p < " + f(0.001, 3) : ""}</span>`; });
  }

  /* boxplot: rows of {label, n, min, q1, med, q3, max, mean, color} */
  function box(el, cfg) {
    const w = W(el), H = 300, m = { l: 48, r: 14, t: 16, b: 46 }, max = cfg.max, Y = v => H - m.b - v / max * (H - m.t - m.b);
    const gw = (w - m.l - m.r) / cfg.rows.length;
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = 0; v <= max + 1e-9; v += 0.5) s += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${RULE}"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${esc(f(v, 1))}</text>`;
    s += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(1)}" y2="${Y(1)}" stroke="${INK}" stroke-dasharray="4 4" opacity=".55"/><text x="${w - m.r}" y="${Y(1) - 6}" text-anchor="end" class="lbl">${esc(tr("1,0 = sesuai harapan", "1.0 = as expected"))}</text>`;
    cfg.rows.forEach((r, i) => {
      const cx = m.l + gw * (i + 0.5), bw = Math.min(120, gw * 0.42);
      s += `<g class="bx" tabindex="0" data-i="${i}"><line x1="${cx}" x2="${cx}" y1="${Y(r.max)}" y2="${Y(r.q3)}" stroke="${INK}"/><line x1="${cx}" x2="${cx}" y1="${Y(r.q1)}" y2="${Y(r.min)}" stroke="${INK}"/>` +
        `<line x1="${cx - bw / 4}" x2="${cx + bw / 4}" y1="${Y(r.max)}" y2="${Y(r.max)}" stroke="${INK}"/><line x1="${cx - bw / 4}" x2="${cx + bw / 4}" y1="${Y(r.min)}" y2="${Y(r.min)}" stroke="${INK}"/>` +
        `<rect x="${cx - bw / 2}" y="${Y(r.q3)}" width="${bw}" height="${Y(r.q1) - Y(r.q3)}" rx="3" fill="${r.color}" stroke="${INK}" stroke-width=".8"/><line x1="${cx - bw / 2}" x2="${cx + bw / 2}" y1="${Y(r.med)}" y2="${Y(r.med)}" stroke="#fff" stroke-width="2.4"/>` +
        `<path d="M${cx} ${Y(r.mean) - 7}L${cx + 7} ${Y(r.mean)}L${cx} ${Y(r.mean) + 7}L${cx - 7} ${Y(r.mean)}Z" fill="#E8833A" stroke="#fff"/></g>`;
      s += `<text x="${cx}" y="${H - m.b + 18}" text-anchor="middle" class="b">${esc(T(r.label))}</text><text x="${cx}" y="${H - m.b + 33}" text-anchor="middle">n = ${r.n}</text>`;
    });
    el.innerHTML = s + "</svg>";
    bind(el, ".bx", (k, n) => { const r = cfg.rows[+n.dataset.i];
      return `<b>${esc(T(r.label))}</b> (n = ${r.n})<br>${tr("Rerata", "Mean")}: <b>${f(r.mean, 2)}</b><br>${tr("Median", "Median")}: ${f(r.med, 2)}<br>${tr("Kuartil 1 sampai 3", "Quartiles 1 to 3")}: ${f(r.q1, 2)} ${tr("sampai", "to")} ${f(r.q3, 2)}<br><span class="rng">${tr("Rentang", "Range")}: ${f(r.min, 1)} ${tr("sampai", "to")} ${f(r.max, 1)}</span>`; });
  }

  const setup = (key, views, draw0) => document.querySelectorAll(`[data-fig="${key}"]`).forEach(el => {
    const fig = el.closest(".ifig"); let view = views[0].v;
    const draw = e => draw0(e, view);
    C.mount(el, draw);
    const ctl = fig.querySelector('[data-ctl="view"]');
    if (ctl) onLang(() => C.toggles(ctl, views, view, v => { view = v; draw(el); }));
  });

  /* 1. service trend */
  const TR = [[2022, 1710, 1410], [2023, 2120, 1720], [2024, 2550, 1990], [2025, 3750, 2290], [2026, 4490, 2670]];
  const mean = (a, b, k) => TR.slice(a, b).reduce((s, r) => s + r[k], 0) / (b - a);
  const PRE = [mean(0, 3, 1), mean(0, 3, 2)], POST = [mean(3, 5, 1), mean(3, 5, 2)];
  setup("trend", [{ v: "line", label: { id: "Tren tahunan", en: "Annual trend" } }, { v: "prepost", label: { id: "Sebelum dan sesudah", en: "Before and after" } }], (e, view) => view === "line"
    ? C.line(e, { aria: { id: "Tren jumlah layanan HIV", en: "Trend in number of HIV services" }, xDomain: [2022, 2026], yMax: 5000, dots: true, xFmt: String, tipFmt: v => f(v), yFmt: v => f(v),
        vlines: [{ x: 2024.5, label: { id: "Mulai PPCP", en: "PPCP starts" } }],
        series: [{ name: NAMES[0], color: PP, data: TR.map(r => [r[0], r[1]]) }, { name: NAMES[1], color: NP, dash: "6 5", data: TR.map(r => [r[0], r[2]]) }] })
    : grouped(e, { aria: { id: "Rata-rata layanan sebelum dan sesudah PPCP", en: "Mean services before and after PPCP" }, colors: [PP, NP], names: NAMES, fmt: v => f(Math.round(v / 10) * 10),
        rows: [{ label: { id: "Sebelum, 2022 sampai 2024", en: "Before, 2022 to 2024" }, a: PRE[0], b: PRE[1] },
          { label: { id: "Sesudah, 2025 sampai 2026", en: "After, 2025 to 2026" }, a: POST[0], b: POST[1],
            tip: { id: `Kenaikan PPCP ${f(Math.round((POST[0] - PRE[0]) / 10) * 10)} dikurangi kenaikan pembanding ${f(Math.round((POST[1] - PRE[1]) / 10) * 10)} memberi selisih sekitar ${f(Math.round((POST[0] - PRE[0] - POST[1] + PRE[1]) / 10) * 10)} layanan`,
                   en: `PPCP increase of ${f(Math.round((POST[0] - PRE[0]) / 10) * 10, 0)} minus comparison increase of ${f(Math.round((POST[1] - PRE[1]) / 10) * 10, 0)} gives a difference of about ${f(Math.round((POST[0] - PRE[0] - POST[1] + PRE[1]) / 10) * 10, 0)} services` } }] }));

  /* 2. cascade */
  const CAS = [[{ id: "ODHIV yang mengetahui status", en: "PLHIV who know their status" }, 7.8, 5.0, 10.6, 16.1, 8.3], [{ id: "ODHIV dalam pengobatan ARV", en: "PLHIV on ART" }, 5.4, 3.1, 7.7, 11.6, 6.2], [{ id: "ODHIV dengan viral load tersupresi", en: "PLHIV with viral suppression" }, 5.3, 2.7, 7.9, 10.2, 4.9]];
  setup("cascade", [{ v: "forest", label: { id: "Efek DiD dan IK 95%", en: "DiD effect and 95% CI" } }, { v: "change", label: { id: "Perubahan per kelompok", en: "Change by group" } }], (e, view) => view === "forest"
    ? forest(e, { aria: { id: "Efek PPCP pada kaskade HIV", en: "PPCP effect on the HIV cascade" }, min: -2, max: 12, step: 2, axis: { id: "efek (poin persen)", en: "effect (percentage points)" }, estName: { id: "Efek DiD (poin persen)", en: "DiD effect (percentage points)" },
        rows: CAS.map(c => ({ label: c[0], est: c[1], lo: c[2], hi: c[3], p: true, color: PP })).concat([{ label: { id: "Rata-rata tiga indikator", en: "Average of three indicators" }, est: 6.2, lo: 6.2, hi: 6.2, p: true, color: GRN, bold: true }]) })
    : grouped(e, { aria: { id: "Perubahan indikator kaskade", en: "Change in cascade indicators" }, colors: [PP, NP], names: NAMES, fmt: v => f(v, 1), axisFmt: v => f(v),
        rows: CAS.map(c => ({ label: c[0], a: c[4], b: c[5], note: "+" + f(c[1], 1) + tr(" poin", " pp"), tip: { id: "Perubahan dalam poin persen, sebelum ke sesudah", en: "Change in percentage points, before to after" } })) }));

  /* 3. mediation */
  const MED = [[{ id: "Efek total (c)", en: "Total effect (c)" }, 8.9, 6.5, 11.3, INK], [{ id: "Efek tidak langsung melalui layanan (a kali b)", en: "Indirect effect via services (a times b)" }, 5.5, 3.8, 7.2, PP], [{ id: "Efek langsung melalui integrasi sistem (c aksen)", en: "Direct effect via system integration (c prime)" }, 3.4, 2.0, 4.9, GRN]];
  setup("med", [{ v: "forest", label: { id: "Komponen efek", en: "Effect components" } }, { v: "share", label: { id: "Porsi jalur", en: "Share by pathway" } }], (e, view) => view === "forest"
    ? forest(e, { aria: { id: "Hasil analisis mediasi", en: "Mediation analysis results" }, min: 0, max: 12, step: 2, axis: { id: "efek rata-rata pada kaskade (poin persen)", en: "average effect on the cascade (percentage points)" }, estName: { id: "Efek (poin persen)", en: "Effect (percentage points)" },
        rows: MED.map(r => ({ label: r[0], est: r[1], lo: r[2], hi: r[3], p: true, color: r[4], bold: r[4] === INK })) })
    : C.hbar(e, { aria: { id: "Porsi efek menurut jalur", en: "Share of effect by pathway" }, labelW: 300, max: 100, fmt: v => f(v) + "%", axisFmt: v => f(v) + "%",
        items: [{ label: MED[1][0], value: 62, color: PP, after: { id: "(IK 95% 52% sampai 72%)", en: "(95% CI 52% to 72%)" }, tip: tr("5,5 dari 8,9 poin persen efek total", "5.5 of the 8.9 percentage point total effect") },
          { label: MED[2][0], value: 38, color: GRN, tip: tr("3,4 dari 8,9 poin persen efek total", "3.4 of the 8.9 percentage point total effect") }] }));

  /* 4. efficiency */
  const BOX = [{ label: { id: "PPCP", en: "PPCP" }, n: 238, min: 0.2, q1: 1.06, med: 1.43, q3: 1.8, max: 2.86, mean: 1.28, color: PP }, { label: { id: "Pembanding", en: "Comparison" }, n: 167, min: 0.1, q1: 0.79, med: 1.06, q3: 1.38, max: 2.4, mean: 0.98, color: NP }];
  setup("eff", [{ v: "box", label: { id: "Sebaran skor", en: "Score distribution" } }, { v: "mean", label: { id: "Skor rata-rata", en: "Mean score" } }], (e, view) => view === "box"
    ? box(e, { aria: { id: "Sebaran skor efisiensi", en: "Distribution of efficiency scores" }, max: 3, rows: BOX })
    : C.vbar(e, { aria: { id: "Skor efisiensi rata-rata", en: "Mean efficiency score" }, fmt: v => f(v, 2), axisFmt: v => f(v, 1), height: 260,
        groups: BOX.map(b => ({ label: { id: b.label.id === "PPCP" ? "Kabupaten/kota PPCP" : "Kabupaten/kota pembanding", en: b.label.en === "PPCP" ? "PPCP districts/cities" : "Comparison districts/cities" }, value: b.mean, color: b.color,
          tip: b.mean > 1 ? tr("Hasil 28% di atas yang diharapkan dari jumlah layanannya", "Outcomes 28% above what its number of services predicts") : tr("Hasil 2% di bawah yang diharapkan dari jumlah layanannya", "Outcomes 2% below what its number of services predicts") })) }));

  /* 5. cost per outcome and outcomes per USD 1 million */
  const COST = [[{ id: "Tambahan ODHIV dalam ARV", en: "Additional people on ART" }, 278, 421], [{ id: "Tambahan ODHIV tersupresi", en: "Additional people virally suppressed" }, 521, 842]];
  setup("cost", [{ v: "cost", label: { id: "Biaya per hasil", en: "Cost per outcome" } }, { v: "roi", label: { id: "Hasil per USD 1 juta", en: "Outcomes per USD 1 million" } }], (e, view) => view === "cost"
    ? grouped(e, { aria: { id: "Biaya per tambahan hasil", en: "Cost per additional outcome" }, colors: [PP, NP], names: NAMES, fmt: v => "USD " + f(v), axisFmt: v => f(v),
        rows: COST.map(c => ({ label: c[0], a: c[1], b: c[2], note: "−" + f(Math.round((1 - c[1] / c[2]) * 100)) + "%", tip: { id: "Biaya per orang, rata-rata per kabupaten/kota, 2024 sampai 2026", en: "Cost per person, average per district/city, 2024 to 2026" } })) })
    : grouped(e, { aria: { id: "Tambahan hasil per USD 1 juta", en: "Additional outcomes per USD 1 million" }, colors: [PP, NP], names: NAMES, fmt: v => f(Math.round(v)), axisFmt: v => f(v),
        rows: COST.map(c => ({ label: c[0], a: 1e6 / c[1], b: 1e6 / c[2], note: "+" + f(Math.round((c[2] / c[1] - 1) * 100)) + "%", tip: { id: "Dihitung sebagai USD 1 juta dibagi biaya per hasil", en: "Calculated as USD 1 million divided by the cost per outcome" } })) }));
})();
