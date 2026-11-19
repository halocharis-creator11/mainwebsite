/* Interactive figures for "Beyond Volunteering: What Drives Health Cadre Sustainability?".
   Values come from the original presentation (Harjana and Ulandari, 2025, doi:10.5281/zenodo.18287957). */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const T = o => (typeof o === "string" ? o : o[C.lang()] || o.id);
  const tr = (id, en) => (C.lang() === "en" ? en : id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = el => Math.max(300, el.clientWidth || 640);
  const INK = "#142826", MUTED = "#52615E", RULE = "#E1E8E6";
  const GAIN = "#2F7D5B", LOSS = "#C0392B";
  const tipEl = () => document.querySelector(".ifig-tip");
  const tip = (e, html) => { const t = tipEl(); if (!t) return; t.innerHTML = html; t.style.opacity = 1; const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; t.style.left = x + "px"; t.style.top = y + "px"; };
  const untip = () => { const t = tipEl(); if (t) t.style.opacity = 0; };
  const hook = (el, sel, html) => el.querySelectorAll(sel).forEach((n, i) => {
    n.addEventListener("mousemove", e => tip(e, html(i, n))); n.addEventListener("mouseleave", untip);
    n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); tip({ clientX: r.right, clientY: r.top }, html(i, n)); }); n.addEventListener("blur", untip);
  });
  const UMK = 3298116;

  /* shared scenario data. burden = % of UMK (negative = net gain); sust = SEM-predicted latent score;
     dS and dC = change in sustainability and incremental monthly cost against the status quo, as plotted in the original slides */
  const SC = [
    { k: "opp", n: { id: "Honorarium setara biaya peluang", en: "Honorarium equal to opportunity cost" }, burden: 0.9, sust: -0.008, dC: -153266, dS: -0.045, c: "#C0392B" },
    { k: "sq", n: { id: "Status quo", en: "Status quo" }, burden: -3.7, sust: 0.037, dC: 0, dS: 0, c: "#7D8A87" },
    { k: "dcs", n: { id: "Subsidi biaya langsung", en: "Direct cost subsidy" }, burden: -4.6, sust: 0.046, dC: -29667, dS: 0.009, c: "#B7791F" },
    { k: "int", n: { id: "Paket insentif terpadu", en: "Integrated incentive package" }, burden: -23.7, sust: 0.24, dC: 600000, dS: 0.20, c: "#2D6A8E" },
    { k: "h30", n: { id: "Honorarium 30% UMK", en: "Honorarium at 30% of UMK" }, burden: -27.8, sust: 0.28, dC: 793935, dS: 0.243, c: "#0E5A55" }
  ];
  window.KaderScenarios = SC;
  const pct = v => (v > 0 ? "+" : v < 0 ? "−" : "") + C.fmt(Math.abs(v), 1) + "%";
  const rp = v => (v < 0 ? "−" : "") + "Rp" + C.fmt(Math.abs(Math.round(v)));

  /* ---------- Figure 1: SEM path summary ---------- */
  function sem(el) {
    const w = W(el), narrow = w < 560, H = narrow ? 480 : 360;
    const N = narrow
      ? { exp: [w * .27, 50], mot: [w * .27, 170], sup: [w * .73, 170], sat: [w * .5, 300], sus: [w * .5, 420] }
      : { exp: [95, 70], mot: [w * .41, 70], sup: [w * .41, 270], sat: [w * .6, 170], sus: [w - 95, 170] };
    const L = { exp: { id: "Pengalaman", en: "Experience" }, mot: { id: "Motivasi", en: "Motivation" }, sup: { id: "Dukungan organisasi", en: "Organisational support" }, sat: { id: "Kepuasan", en: "Satisfaction" }, sus: { id: "Keberlanjutan", en: "Sustainability" } };
    const P = [["exp", "mot", 0.53, "p = 0,086", false], ["mot", "sat", 0.50, "p < 0,001", true], ["sup", "sat", 0.21, "p = 0,031", true], ["sat", "sus", 0.69, "p < 0,001", true], ["sup", "sus", null, tr("tidak bermakna", "not significant"), false]];
    const rx = narrow ? 70 : 82, ry = 30;
    const edge = (a, b) => { const [x1, y1] = N[a], [x2, y2] = N[b], dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const k = v => 1 / Math.sqrt((ux * ux) / (rx * rx) + (uy * uy) / (ry * ry)); const o = k();
      return [x1 + ux * o, y1 + uy * o, x2 - ux * (o + 6), y2 - uy * (o + 6)]; };
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(tr("Diagram jalur SEM keberlanjutan kader", "SEM path diagram of cadre sustainability"))}"><defs>
      <marker id="semA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0E5A55"/></marker>
      <marker id="semB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9AA7A4"/></marker></defs>`;
    P.forEach(([a, b, beta, p, sig], i) => {
      const [x1, y1, x2, y2] = edge(a, b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const sw = sig ? 2 + beta * 7 : 2;
      if (beta == null) {
        const [ax, ay] = N[a], [bx, by] = N[b], qx = narrow ? w * .93 : (ax + bx) / 2 + 40, qy = narrow ? (ay + by) / 2 + 40 : Math.max(ay, by) + 95;
        const sx = narrow ? ax + rx * .6 : ax + rx, sy = narrow ? ay + ry : ay, ex = narrow ? bx + rx * .8 : bx, ey = narrow ? by - ry * .6 : by + ry + 4;
        const d = `M${sx} ${sy} Q${qx} ${qy} ${ex} ${ey}`;
        s += `<g class="pth" tabindex="0"><path d="${d}" fill="none" stroke="transparent" stroke-width="18"/><path d="${d}" fill="none" stroke="#9AA7A4" stroke-width="2" stroke-dasharray="7 6" marker-end="url(#semB)"/></g>`;
        return;
      }
      s += `<g class="pth" tabindex="0"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="18"/>` +
           `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${sig ? "#0E5A55" : "#9AA7A4"}" stroke-width="${sw}" ${sig ? "" : 'stroke-dasharray="7 6"'} marker-end="url(#${sig ? "semA" : "semB"})"/>` +
           (beta != null ? `<rect x="${mx - 24}" y="${my - 13}" width="48" height="24" rx="12" fill="#fff" stroke="${sig ? "#0E5A55" : "#9AA7A4"}"/><text x="${mx}" y="${my + 4}" text-anchor="middle" class="val" style="fill:${sig ? "#0E5A55" : MUTED}">${C.fmt(beta, 2)}</text>` : "") + "</g>";
    });
    Object.entries(N).forEach(([k, [x, y]]) => {
      const main = k === "sus" || k === "sat";
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${k === "sus" ? "#0E5A55" : k === "sat" ? "#E8833A" : "#fff"}" stroke="${main ? "none" : "#0E5A55"}" stroke-width="2"/>` +
           `<text x="${x}" y="${y + 4}" text-anchor="middle" class="b" style="fill:${main ? "#fff" : INK};font-size:${narrow ? 12 : 13}px">${esc(T(L[k]))}</text>`;
    });
    el.innerHTML = s + "</svg>";
    hook(el, ".pth", i => { const p = P[i]; return `<b>${esc(T(L[p[0]]))} ${tr("ke", "to")} ${esc(T(L[p[1]]))}</b><br>` + (p[2] != null ? "β = " + C.fmt(p[2], 2) + ", " : "") + esc(C.lang() === "en" ? p[3].replace(",", ".") : p[3]) +
      "<br>" + (p[4] ? tr("Jalur bermakna", "Significant path") : tr("Jalur tidak bermakna", "Non-significant path")); });
  }

  /* ---------- Figure 2: net burden, diverging bars ---------- */
  function burden(el, unit) {
    const w = W(el), narrow = w < 560, rowH = 42, Lw = narrow ? 150 : 250, H = SC.length * rowH + 36;
    const val = d => unit === "rp" ? d.burden / 100 * UMK : d.burden;
    const min = Math.min(...SC.map(val)) * 1.12, max = Math.max(...SC.map(val)) * 4 + (unit === "rp" ? 40000 : 1.2);
    const X = v => Lw + (v - min) / (max - min) * (w - Lw - 16);
    const fmtA = v => unit === "rp" ? (v < 0 ? "−" : "") + C.fmt(Math.abs(v) / 1000) + (C.lang() === "en" ? "k" : " rb") : (v < 0 ? "−" : "") + C.fmt(Math.abs(v)) + "%";
    const step = unit === "rp" ? 200000 : 5;
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(tr("Beban ekonomi bersih menurut skenario", "Net economic burden by scenario"))}">`;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) s += `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H - 26}" stroke="${v === 0 ? INK : RULE}" ${v === 0 ? 'stroke-width="1.5"' : ""}/><text x="${X(v)}" y="${H - 8}" text-anchor="middle">${fmtA(v)}</text>`;
    SC.forEach((d, i) => {
      const y = i * rowH + 6, bh = rowH - 16, v = val(d), x0 = X(Math.min(0, v)), x1 = X(Math.max(0, v));
      const words = T(d.n).split(" "), lines = [""]; words.forEach(wd => { const l = lines[lines.length - 1]; if ((l + " " + wd).trim().length > (narrow ? 18 : 30) && l) lines.push(wd); else lines[lines.length - 1] = (l + " " + wd).trim(); });
      lines.slice(0, 2).forEach((ln, k) => { s += `<text x="${Lw - 10}" y="${y + bh / 2 + 4 + (lines.length > 1 ? (k - .5) * 13 : 0)}" text-anchor="end">${esc(ln)}</text>`; });
      s += `<rect class="bar" tabindex="0" x="${x0}" y="${y}" width="${Math.max(2, x1 - x0)}" height="${bh}" rx="3" fill="${v > 0 ? LOSS : GAIN}"/>`;
      s += `<text x="${v < 0 ? x0 - 6 : x1 + 6}" y="${y + bh / 2 + 4}" text-anchor="${v < 0 ? "end" : "start"}" class="val">${unit === "rp" ? rp(v) : pct(v)}</text>`;
    });
    el.innerHTML = s + "</svg>";
    hook(el, ".bar", i => { const d = SC[i]; return `<b>${esc(T(d.n))}</b><br>${tr("Beban bersih", "Net burden")}: ${pct(d.burden)} UMK (${rp(d.burden / 100 * UMK)} ${tr("per bulan", "per month")})<br>` + (d.burden > 0 ? tr("Kader masih merugi", "The cadre still loses money") : tr("Kader memperoleh keuntungan bersih", "The cadre makes a net gain")); });
  }

  /* ---------- scatter used by Figures 3 and 4 and by the simulator ---------- */
  function scatter(el, cfg) {
    const w = W(el), narrow = w < 560, H = cfg.height || 330, m = { l: 54, r: 18, t: 18, b: 46 };
    const X = v => m.l + (v - cfg.x[0]) / (cfg.x[1] - cfg.x[0]) * (w - m.l - m.r), Y = v => H - m.b - (v - cfg.y[0]) / (cfg.y[1] - cfg.y[0]) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(cfg.aria)}">`;
    for (let v = cfg.y[0]; v <= cfg.y[1] + 1e-9; v += cfg.ys) s += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${Math.abs(v) < 1e-9 ? "#9AA7A4" : RULE}" ${Math.abs(v) < 1e-9 ? 'stroke-dasharray="5 4"' : ""}/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${C.fmt(v, 2)}</text>`;
    for (let v = cfg.x[0]; v <= cfg.x[1] + 1e-9; v += cfg.xs) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H - m.b}" stroke="${Math.abs(v) < 1e-9 ? "#9AA7A4" : RULE}" ${Math.abs(v) < 1e-9 ? 'stroke-dasharray="5 4"' : ""}/>` +
      (narrow && Math.round(v / cfg.xs) % 2 ? "" : `<text x="${X(v)}" y="${H - m.b + 16}" text-anchor="middle">${cfg.xf(v)}</text>`);
    s += `<text x="${(m.l + w - m.r) / 2}" y="${H - 6}" text-anchor="middle" class="lbl">${esc(cfg.xl)}</text><text transform="translate(13 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle" class="lbl">${esc(cfg.yl)}</text>`;
    if (cfg.line) s += `<line x1="${X(cfg.line[0][0])}" y1="${Y(cfg.line[0][1])}" x2="${X(cfg.line[1][0])}" y2="${Y(cfg.line[1][1])}" stroke="#2D6A8E" stroke-width="2" stroke-dasharray="6 5"/>`;
    cfg.pts.forEach((p, i) => {
      const x = X(p.x), y = Y(p.y), right = x > w * .62;
      s += `<g class="pt" tabindex="0"><circle cx="${x}" cy="${y}" r="${p.you ? 11 : 8}" fill="${p.c}" stroke="#fff" stroke-width="2.5"/>${p.you ? `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="${p.c}" stroke-width="2" opacity=".5"/>` : ""}` +
           (p.hide || (narrow && !p.you && !p.lab) ? "" : `<text x="${right ? x - 14 : x + 14}" y="${y + (p.dy || -10)}" text-anchor="${right ? "end" : "start"}" class="${p.you ? "val" : ""}" style="font-size:12px;fill:${p.you ? p.c : INK}">${esc(p.label)}</text>`) + "</g>";
    });
    el.innerHTML = s + "</svg>";
    hook(el, ".pt", i => cfg.tip(cfg.pts[i]));
  }
  window.KaderScatter = scatter;
  const DY = { opp: 18, sq: 18, dcs: -12, int: -12, h30: 18 };

  function link(el) {
    scatter(el, { aria: tr("Beban bersih dan keberlanjutan prediksi", "Net burden and predicted sustainability"), x: [-30, 5], xs: 5, y: [-0.05, 0.3], ys: 0.05,
      xf: v => C.fmt(v) + "%", xl: tr("Beban ekonomi bersih (% UMK)", "Net economic burden (% of UMK)"), yl: tr("Keberlanjutan prediksi (skor laten)", "Predicted sustainability (latent score)"),
      line: [[-27.8, 0.28], [0.9, -0.008]],
      pts: SC.map(d => ({ x: d.burden, y: d.sust, c: d.c, label: T(d.n), dy: DY[d.k], lab: d.k === "h30" || d.k === "opp" })),
      tip: p => `<b>${esc(p.label)}</b><br>${tr("Beban bersih", "Net burden")}: ${pct(p.x)} UMK<br>${tr("Keberlanjutan prediksi", "Predicted sustainability")}: ${C.fmt(p.y, 3)}` });
  }
  function ce(el) {
    scatter(el, { aria: tr("Bidang efektivitas biaya", "Cost-effectiveness plane"), x: [-200000, 900000], xs: 100000, y: [-0.06, 0.26], ys: 0.04,
      xf: v => (v < 0 ? "−" : "") + C.fmt(Math.abs(v) / 1000) + (C.lang() === "en" ? "k" : " rb"), xl: tr("Biaya bulanan inkremental per kader (Rp)", "Incremental monthly cost per cadre (IDR)"), yl: tr("Perubahan keberlanjutan (skor laten)", "Change in sustainability (latent score)"),
      pts: SC.map(d => ({ x: d.dC, y: d.dS, c: d.c, label: T(d.n), dy: { opp: -14, sq: 20, dcs: -12, int: -12, h30: 18 }[d.k], lab: d.k !== "dcs" })),
      tip: p => `<b>${esc(p.label)}</b><br>${tr("Biaya inkremental", "Incremental cost")}: ${rp(p.x)} ${tr("per kader per bulan", "per cadre per month")}<br>${tr("Perubahan keberlanjutan", "Change in sustainability")}: ${(p.y >= 0 ? "+" : "−") + C.fmt(Math.abs(p.y), 3)}` +
        (p.x > 0 && p.y > 0 ? "<br>" + tr("Biaya per kenaikan 0,1 skor: ", "Cost per 0.1 score gain: ") + rp(p.x / p.y * 0.1) : "") });
  }

  document.querySelectorAll('[data-fig="sem"]').forEach(el => C.mount(el, sem));
  document.querySelectorAll('[data-fig="link"]').forEach(el => C.mount(el, link));
  document.querySelectorAll('[data-fig="ce"]').forEach(el => C.mount(el, ce));
  document.querySelectorAll('[data-fig="burden"]').forEach(el => {
    const box = el.closest(".ifig"); let unit = "pct";
    C.mount(el, e => burden(e, unit));
    const ctl = () => C.toggles(box.querySelector('[data-ctl="unit"]'), [{ v: "pct", label: { id: "% UMK", en: "% of UMK" } }, { v: "rp", label: { id: "Rupiah", en: "Rupiah" } }], unit, v => { unit = v; burden(el, unit); });
    ctl(); document.addEventListener("charis:lang", ctl);
  });
})();
