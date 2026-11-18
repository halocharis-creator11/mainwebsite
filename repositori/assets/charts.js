/* CHARIS interactive figures for repository pages.
   Charts are drawn as SVG from data in the page, follow the page language (html[lang]),
   redraw on resize and on the "charis:lang" event, and print as static graphics. */
(function () {
  "use strict";
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const T = o => (o == null ? "" : typeof o === "string" || typeof o === "number" ? String(o) : (o[lang()] ?? o.id));
  const nf = (d) => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const fmt = (v, d) => nf(d).format(v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const INK = "#142826", MUTED = "#52615E", RULE = "#E1E8E6";

  /* ---------- shared tooltip ---------- */
  const tip = document.createElement("div"); tip.className = "ifig-tip"; tip.setAttribute("aria-hidden", "true");
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(tip));
  if (document.body) document.body.appendChild(tip);
  function showTip(e, html) {
    tip.innerHTML = html; tip.style.opacity = 1;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => { tip.style.opacity = 0; };

  /* ---------- mounting: redraw on resize and language change ---------- */
  const mounted = [];
  function mount(el, draw) {
    if (!el) return;
    const job = { el, draw };
    mounted.push(job);
    draw(el);
    return job;
  }
  let rz;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => mounted.forEach(j => j.draw(j.el)), 150); });
  document.addEventListener("charis:lang", () => mounted.forEach(j => j.draw(j.el)));
  const width = el => Math.max(300, el.clientWidth || el.parentNode.clientWidth || 640);
  const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
  function bind(svgEl, sel, html) {
    svgEl.querySelectorAll(sel).forEach((n, i) => {
      n.addEventListener("mousemove", e => showTip(e, html(i, n)));
      n.addEventListener("mouseleave", hideTip);
      n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); showTip({ clientX: r.right, clientY: r.top }, html(i, n)); });
      n.addEventListener("blur", hideTip);
    });
  }

  /* ---------- toggles (segmented buttons) ---------- */
  function toggles(host, opts, value, onChange) {
    host.innerHTML = opts.map(o => `<button type="button" data-v="${esc(o.v)}" aria-pressed="${String(o.v === value)}">${esc(T(o.label))}</button>`).join("");
    host.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      host.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      onChange(b.dataset.v);
    }));
  }

  /* ---------- line chart with optional bands ---------- */
  function line(el, cfg) {
    const W = width(el), H = cfg.height || 300, m = { l: 48, r: 14, t: 16, b: 30 };
    const all = cfg.series.flatMap(s => s.data.map(d => d[0]));
    const x0 = cfg.xDomain ? cfg.xDomain[0] : Math.min(...all), x1 = cfg.xDomain ? cfg.xDomain[1] : Math.max(...all);
    const ymax = cfg.yMax || Math.max(...cfg.series.flatMap(s => s.data.map(d => Math.max(d[1], s.band ? (d[3] ?? d[1]) : d[1])))) * 1.1;
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - v / ymax * (H - m.t - m.b);
    const step = niceStep(ymax / 4);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = 0; v <= ymax + 1e-9; v += step) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${RULE}"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${(cfg.yFmt || (v => fmt(v, step < 1 ? 1 : 0)))(v)}</text>`;
    for (let yr = Math.ceil(x0); yr <= Math.floor(x1); yr++) s += `<text x="${X(yr)}" y="${H - 9}" text-anchor="middle">${yr}</text>`;
    (cfg.vlines || []).forEach(v => { s += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${m.t}" y2="${H - m.b}" stroke="${INK}" stroke-dasharray="2 3" opacity=".5"/><text x="${X(v.x) + 4}" y="${m.t + 10}" class="lbl">${esc(T(v.label))}</text>`; });
    cfg.series.forEach(sr => {
      if (sr.band) s += `<path d="${sr.data.map((d, i) => (i ? "L" : "M") + X(d[0]) + "," + Y(d[3])).join("")}${sr.data.slice().reverse().map(d => "L" + X(d[0]) + "," + Y(d[2])).join("")}Z" fill="${sr.color}" opacity=".13"/>`;
      s += `<path d="${sr.data.map((d, i) => (i ? "L" : "M") + X(d[0]).toFixed(1) + "," + Y(d[1]).toFixed(1)).join("")}" fill="none" stroke="${sr.color}" stroke-width="${sr.width || 2.6}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ""} stroke-linejoin="round"/>`;
      if (cfg.dots) sr.data.forEach(d => { s += `<circle cx="${X(d[0])}" cy="${Y(d[1])}" r="3.2" fill="${sr.color}"/>`; });
    });
    const xs = cfg.series[0].data.map(d => d[0]);
    s += `<line class="hl" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="${INK}" opacity="0"/><rect class="ov" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/></svg>`;
    el.innerHTML = s;
    const svg = el.querySelector("svg"), hl = svg.querySelector(".hl");
    svg.querySelector(".ov").addEventListener("mousemove", e => {
      const r = svg.getBoundingClientRect(), xv = x0 + ((e.clientX - r.left) / r.width * W - m.l) / (W - m.l - m.r) * (x1 - x0);
      let i = 0; xs.forEach((x, k) => { if (Math.abs(x - xv) < Math.abs(xs[i] - xv)) i = k; });
      hl.setAttribute("x1", X(xs[i])); hl.setAttribute("x2", X(xs[i])); hl.setAttribute("opacity", ".3");
      showTip(e, `<b>${esc((cfg.xFmt || String)(xs[i]))}</b><br>` + cfg.series.map(sr => `<span style="color:${sr.color}">■</span> ${esc(T(sr.name))}: <b>${(cfg.tipFmt || (v => fmt(v, 2)))(sr.data[i][1])}</b>` +
        (sr.band && sr.data[i][2] != null ? ` <span class="rng">(${(cfg.tipFmt || (v => fmt(v, 2)))(sr.data[i][2])} ${lang() === "en" ? "to" : "sampai"} ${(cfg.tipFmt || (v => fmt(v, 2)))(sr.data[i][3])})</span>` : "")).join("<br>"));
    });
    svg.querySelector(".ov").addEventListener("mouseleave", () => { hideTip(); hl.setAttribute("opacity", "0"); });
  }

  /* ---------- horizontal bars ---------- */
  function hbar(el, cfg) {
    const W = width(el), rowH = cfg.rowH || 34, L = Math.min(cfg.labelW || 260, W * 0.46), R = 70;
    const items = cfg.items, H = items.length * rowH + 28;
    const max = (cfg.max || Math.max(...items.map(d => d.value))) * 1.04;
    const X = v => L + v / max * (W - L - R);
    const step = niceStep(max / (W < 520 ? 3 : 5));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = 0; v <= max; v += step) s += `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H - 22}" stroke="${RULE}"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle">${(cfg.axisFmt || (v => fmt(v)))(v)}</text>`;
    items.forEach((d, i) => {
      const y = i * rowH + 4, bh = rowH - 12;
      s += `<text x="${L - 8}" y="${y + bh / 2 + 4}" text-anchor="end" class="${d.bold ? "b" : ""}">${esc(T(d.label))}</text>`;
      s += `<rect class="bar" tabindex="0" x="${L}" y="${y}" width="${Math.max(1, X(d.value) - L)}" height="${bh}" rx="3" fill="${d.color}"/>`;
      s += `<text x="${X(d.value) + 6}" y="${y + bh / 2 + 4}" class="val">${esc((cfg.fmt || (v => fmt(v)))(d.value))}${d.after ? " " + esc(T(d.after)) : ""}</text>`;
    });
    el.innerHTML = s + "</svg>";
    bind(el.querySelector("svg"), ".bar", i => `<b>${esc(T(items[i].label))}</b><br>${T(items[i].tip) || esc((cfg.fmt || (v => fmt(v)))(items[i].value))}`);
  }

  /* ---------- vertical grouped bars ---------- */
  function vbar(el, cfg) {
    const W = width(el), H = cfg.height || 280, m = { l: 52, r: 10, t: 22, b: W < 520 ? 54 : 40 };
    const groups = cfg.groups, n = groups.length, max = Math.max(...groups.map(g => g.value)) * 1.15;
    const bw = (W - m.l - m.r) / n, Y = v => H - m.b - v / max * (H - m.t - m.b), step = niceStep(max / 4);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    for (let v = 0; v <= max; v += step) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${RULE}"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${(cfg.axisFmt || (v => fmt(v)))(v)}</text>`;
    groups.forEach((g, i) => {
      const x = m.l + i * bw + bw * 0.18, w = bw * 0.64;
      s += `<rect class="bar" tabindex="0" x="${x}" y="${Y(g.value)}" width="${w}" height="${H - m.b - Y(g.value)}" rx="3" fill="${g.color}"/>`;
      s += `<text x="${x + w / 2}" y="${Y(g.value) - 6}" text-anchor="middle" class="val">${esc(g.text != null ? T(g.text) : (cfg.fmt || (v => fmt(v)))(g.value))}</text>`;
      const words = T(g.label).split(" "), lines = [];
      words.forEach(wd => { const l = lines[lines.length - 1]; if (l && (l + " " + wd).length <= (W < 520 ? 11 : 18)) lines[lines.length - 1] = l + " " + wd; else lines.push(wd); });
      lines.slice(0, 3).forEach((ln, k) => { s += `<text x="${x + w / 2}" y="${H - m.b + 15 + k * 13}" text-anchor="middle">${esc(ln)}</text>`; });
    });
    el.innerHTML = s + "</svg>";
    bind(el.querySelector("svg"), ".bar", i => `<b>${esc(T(groups[i].label))}</b><br>${T(groups[i].tip) || esc((cfg.fmt || (v => fmt(v)))(groups[i].value))}`);
  }

  /* ---------- paired stacked 100% bars (two periods per row) ---------- */
  function stack2(el, cfg) {
    const W = width(el), narrow = W < 620, rowH = 32, L = 64, gap = 22;
    const bw = narrow ? W - L - 10 : (W - L - gap - 10) / 2, H = cfg.rows.length * rowH * (narrow ? 2 : 1) + 70;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    const cols = narrow ? [[L, 0]] : [[L, 0], [L + bw + gap, 1]];
    if (!narrow) cfg.periods.forEach((p, k) => { s += `<text x="${cols[k][0]}" y="14" class="b">${esc(T(p))}</text>`; });
    const top = narrow ? 8 : 26;
    cfg.rows.forEach((r, i) => {
      [0, 1].forEach(k => {
        const x0 = narrow ? L : cols[k][0], y = top + (narrow ? (i * 2 + k) * rowH : i * rowH);
        if (k === 0 || narrow || true) if (k === 0) s += `<text x="${L - 8}" y="${y + 16 + (narrow ? rowH / 2 : 0)}" text-anchor="end" class="b">${esc(r.name)}</text>`;
        if (narrow) s += `<text x="${x0}" y="${y + 6}" class="lbl">${esc(T(cfg.periods[k]))}</text>`;
        const vals = r.v[k], yb = y + (narrow ? 9 : 4), hb = narrow ? 18 : 22;
        if (!vals) { s += `<rect x="${x0}" y="${yb}" width="${bw}" height="${hb}" rx="3" fill="#F1F5F4" stroke="${RULE}" stroke-dasharray="4 3"/><text x="${x0 + bw / 2}" y="${yb + hb / 2 + 4}" text-anchor="middle" class="lbl">${esc(T(r.note))}</text>`; return; }
        const tot = vals.reduce((a, b) => a + b, 0); let x = x0;
        vals.forEach((v, j) => {
          const w = bw * v / tot; if (w <= 0) return;
          s += `<rect class="seg" tabindex="0" data-r="${i}" data-k="${k}" data-j="${j}" x="${x.toFixed(1)}" y="${yb}" width="${w.toFixed(1)}" height="${hb}" fill="${cfg.keys[j].color}"/>`;
          if (w > 28) s += `<text x="${(x + w / 2).toFixed(1)}" y="${yb + hb / 2 + 4}" text-anchor="middle" class="in" fill="${cfg.keys[j].text || "#fff"}">${fmt(v, v % 1 ? 1 : 0)}</text>`;
          x += w;
        });
      });
    });
    let lx = L, ly = H - 22;
    cfg.keys.forEach(k => { const t = T(k.label); s += `<rect x="${lx}" y="${ly}" width="12" height="12" rx="2" fill="${k.color}"/><text x="${lx + 17}" y="${ly + 10}">${esc(t)}</text>`; lx += 30 + t.length * 6.4; if (lx > W - 120) { lx = L; ly += 0; } });
    el.innerHTML = s + "</svg>";
    bind(el.querySelector("svg"), ".seg", (i, n) => { const r = cfg.rows[+n.dataset.r], k = +n.dataset.k, j = +n.dataset.j;
      return `<b>${esc(r.name)}, ${esc(T(cfg.periods[k]))}</b><br>${esc(T(cfg.keys[j].label))}: <b>${fmt(r.v[k][j], r.v[k][j] % 1 ? 1 : 0)}%</b>` + (r.tips && r.tips[k] ? `<br><span class="rng">${esc(T(r.tips[k]))}</span>` : ""); });
  }

  /* ---------- presence matrix (themes x units) ---------- */
  function matrix(el, cfg) {
    const W = width(el), narrow = W < 560, L = narrow ? 150 : 250, cw = Math.min(52, (W - L - 50) / cfg.cols.length), rh = 32;
    const H = 34 + cfg.rows.length * rh + 6;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    cfg.cols.forEach((c, j) => { s += `<text x="${L + j * cw + cw / 2}" y="20" text-anchor="middle" class="b">${esc(c)}</text>`; });
    s += `<text x="${L + cfg.cols.length * cw + 22}" y="20" text-anchor="middle" class="b">n</text>`;
    cfg.rows.forEach((r, i) => {
      const y = 32 + i * rh;
      s += `<rect class="row" data-i="${i}" x="0" y="${y}" width="${W}" height="${rh}" fill="${i % 2 ? "#fff" : "#F5F8F7"}"/>`;
      s += `<text x="${L - 12}" y="${y + rh / 2 + 4}" text-anchor="end">${esc(T(r.label))}</text>`;
      r.m.split("").forEach((ch, j) => {
        const cx = L + j * cw + cw / 2, cy = y + rh / 2;
        s += ch === "1" ? `<circle class="dot" tabindex="0" data-i="${i}" data-j="${j}" cx="${cx}" cy="${cy}" r="9" fill="#0E5A55"/>` : `<circle class="dot" tabindex="0" data-i="${i}" data-j="${j}" cx="${cx}" cy="${cy}" r="4.5" fill="#fff" stroke="#B7C9C6" stroke-width="1.5"/>`;
      });
      s += `<text x="${L + cfg.cols.length * cw + 22}" y="${y + rh / 2 + 4}" text-anchor="middle" class="b">${r.m.split("").filter(c => c === "1").length}</text>`;
    });
    el.innerHTML = s + "</svg>";
    bind(el.querySelector("svg"), ".dot", (k, n) => { const r = cfg.rows[+n.dataset.i], j = +n.dataset.j, yes = r.m[j] === "1";
      return `<b>${esc(cfg.cols[j])}</b><br>${esc(T(r.label))}: <b>${esc(T(yes ? cfg.yes : cfg.no))}</b>`; });
  }

  /* ---------- dumbbell (two values per row) ---------- */
  function dumbbell(el, cfg) {
    const W = width(el), narrow = W < 560, L = narrow ? 150 : 250, R = 24, rh = 40, H = 40 + cfg.rows.length * rh + 34;
    const X = v => L + v / cfg.max * (W - L - R);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(cfg.aria))}">`;
    s += `<circle cx="${L}" cy="14" r="6" fill="${cfg.colors[0]}"/><text x="${L + 11}" y="18">${esc(T(cfg.names[0]))}</text>`;
    s += `<circle cx="${narrow ? L : L + 240}" cy="${narrow ? 30 : 14}" r="6" fill="${cfg.colors[1]}"/><text x="${(narrow ? L : L + 240) + 11}" y="${narrow ? 34 : 18}">${esc(T(cfg.names[1]))}</text>`;
    const top = narrow ? 50 : 38;
    const st = cfg.step || 1, vf = cfg.fmt || (v => String(v));
    for (let v = 0; v <= cfg.max + 1e-9; v += st) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${top}" y2="${top + cfg.rows.length * rh - 8}" stroke="${RULE}"/><text x="${X(v)}" y="${top + cfg.rows.length * rh + 8}" text-anchor="middle">${esc(vf(v))}</text>`;
    s += `<text x="${(L + W - R) / 2}" y="${top + cfg.rows.length * rh + 26}" text-anchor="middle">${esc(T(cfg.axis))}</text>`;
    cfg.rows.forEach((r, i) => {
      const y = top + i * rh + 12;
      s += `<text x="${L - 12}" y="${y + 4}" text-anchor="end">${esc(T(r.label))}</text>`;
      s += `<line x1="${X(r.b)}" x2="${X(r.a)}" y1="${y}" y2="${y}" stroke="#C9D8D6" stroke-width="7" stroke-linecap="round"/>`;
      if (cfg.outside) s += `<g class="pair" tabindex="0" data-i="${i}"><circle cx="${X(r.a)}" cy="${y}" r="7" fill="${cfg.colors[0]}"/><circle cx="${X(r.b)}" cy="${y}" r="7" fill="${cfg.colors[1]}"/>` +
        `<text x="${X(r.a) + (r.a >= r.b ? 11 : -11)}" y="${y + 4}" text-anchor="${r.a >= r.b ? "start" : "end"}" class="val">${esc(vf(r.a))}</text><text x="${X(r.b) + (r.a >= r.b ? -11 : 11)}" y="${y + 4}" text-anchor="${r.a >= r.b ? "end" : "start"}">${esc(vf(r.b))}</text></g>`;
      else s += `<g class="pair" tabindex="0" data-i="${i}"><circle cx="${X(r.a)}" cy="${y}" r="10" fill="${cfg.colors[0]}"/><text x="${X(r.a)}" y="${y + 4}" text-anchor="middle" class="in" fill="#fff">${r.a}</text>` +
        `<circle cx="${X(r.b)}" cy="${y}" r="10" fill="${cfg.colors[1]}"/><text x="${X(r.b)}" y="${y + 4}" text-anchor="middle" class="in" fill="#fff">${r.b}</text></g>`;
    });
    el.innerHTML = s + "</svg>";
    bind(el.querySelector("svg"), ".pair", (k, n) => { const r = cfg.rows[+n.dataset.i];
      return `<b>${esc(T(r.label))}</b><br>${esc(T(cfg.names[0]))}: <b>${esc(vf(r.a))}</b><br>${esc(T(cfg.names[1]))}: <b>${esc(vf(r.b))}</b><br><span class="rng">${esc(T(cfg.gapText))}: ${esc(vf(+(r.a - r.b).toFixed(1)))}</span>`; });
  }

  window.CharisCharts = { mount, line, hbar, vbar, stack2, matrix, dumbbell, toggles, T, fmt, lang };
})();
