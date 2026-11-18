/* Laboratorium skenario: menjalankan model kompartemen deterministik (model.js) langsung di peramban.
   Setiap perubahan pengaturan menghitung ulang empat skenario dalam hitungan milidetik. */
(function () {
  "use strict";
  const root = document.getElementById("lab");
  const M = window.CharisHIVModel;
  if (!root || !M) return;

  const NF0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
  const NF1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const NF2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = v => NF0.format(Math.round(v * 100)) + "%";
  const sgn = v => (v > 0.5 ? "+" : v < -0.5 ? "−" : "") + NF0.format(Math.abs(Math.round(v)));
  const YRS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const CITYNAME = { JKT: "Jakarta", BALI: "Bali", ALL: "Jakarta dan Bali" };

  const DEF = { city: "JKT", safetyNet: 1, r3plan: 0.55, lenCap: 300, strat: "kML", Tplan: 0.70, absorption: 1, shock: 0, pop: "" };
  const PRESETS = {
    plan: { label: "Rencana sesuai desain", set: {} },
    nonet: { label: "Tanpa jaring pengaman", set: { safetyNet: 0 } },
    lowret: { label: "Retensi tetap 41%", set: { r3plan: 0.41 } },
    nolen: { label: "Tanpa lenacapavir", set: { lenCap: 0 } },
    hard: { label: "Transisi berat", set: { absorption: 0.5, shock: 0.3 } }
  };
  const S = Object.assign({}, DEF);

  /* ---------- controls ---------- */
  const $ = id => document.getElementById(id);
  const ranges = [
    ["lab_net", "safetyNet", v => pct(v)], ["lab_r3", "r3plan", v => pct(v)], ["lab_len", "lenCap", v => v > 0 ? NF0.format(v) : "tidak ada"],
    ["lab_T", "Tplan", v => pct(v)], ["lab_abs", "absorption", v => pct(v)], ["lab_shock", "shock", v => pct(v)]
  ];
  function syncControls() {
    ranges.forEach(([id, k, f]) => { const el = $(id); el.value = S[k]; $(id + "_o").textContent = f(+S[k]); });
    root.querySelectorAll("[data-city]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.city === S.city)));
    root.querySelectorAll("[data-strat]").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.strat === S.strat)); b.disabled = !(S.lenCap > 0); });
    const active = Object.keys(PRESETS).find(k => Object.keys(DEF).every(key => key === "city" || key === "pop" || String(Object.assign({}, DEF, PRESETS[k].set)[key]) === String(S[key])));
    root.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.preset === active)));
  }
  let timer;
  const later = () => { clearTimeout(timer); timer = setTimeout(update, 60); };
  ranges.forEach(([id, k, f]) => { const el = $(id); el.addEventListener("input", () => { S[k] = +el.value; $(id + "_o").textContent = f(+el.value); later(); syncControls(); }); });
  root.querySelectorAll("[data-city]").forEach(b => b.addEventListener("click", () => { S.city = b.dataset.city; syncControls(); update(); }));
  root.querySelectorAll("[data-strat]").forEach(b => b.addEventListener("click", () => { S.strat = b.dataset.strat; syncControls(); update(); }));
  root.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    const keep = { city: S.city, pop: S.pop }; Object.assign(S, DEF, PRESETS[b.dataset.preset].set, keep); syncControls(); update();
  }));
  $("lab_pop").addEventListener("input", e => { S.pop = e.target.value; later(); });

  /* ---------- model runs ---------- */
  const cache = new Map();
  function planParams(city, over) {
    const c = M.CITY[city], b = M.defaults(city);
    return Object.assign(b, {
      plan: true, safetyNet: 1, unablePay: c.unablePayIBBS, condomDrop: 0.3, lenScaleYear: 2028, switchToLEN: c.lenPref,
      lenCap: 300, lenShare: c.lenPref, lenRetInj: 0.8, k: c.kML, reachTarget: 6.7, r3plan: 0.55, dLong: 0.03,
      Tplan: 0.70, snsPlan: 0.40, snsYield: 2.9, caseload: 300, caseQ: 0.10, absorption: 1, absorbYear: 2030, shock: 0, shockYear: 2027
    }, over);
  }
  function runCached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
  const cum = r => [2027, 2028, 2029, 2030, 2031, 2032].reduce((s, y) => s + r.years[y].newInf, 0);
  const inc = r => YRS.map(y => [y, r.years[y].incidence]);

  /* ---------- chart ---------- */
  function lineChart(el, series, opt) {
    const W = el.clientWidth || 560, H = opt.h || 250, m = { l: 44, r: 12, t: 10, b: 28 };
    const xs = series[0].data.map(d => d[0]), x0 = xs[0], x1 = xs[xs.length - 1];
    const ymax = opt.yMax || Math.max(...series.flatMap(s => s.data.map(d => d[1]))) * 1.1 || 1;
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - v / ymax * (H - m.t - m.b);
    const step = niceStep(ymax / 4), ticks = []; for (let v = 0; v <= ymax + 1e-9; v += step) ticks.push(v);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opt.aria}"><g class="grid">`;
    ticks.forEach(v => { s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${opt.yFmt(v)}</text>`; });
    for (let yr = Math.ceil(x0); yr <= Math.floor(x1); yr++) s += `<text x="${X(yr)}" y="${H - 8}" text-anchor="middle">${yr}</text>`;
    s += "</g>";
    (opt.vlines || []).forEach(v => { s += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${m.t}" y2="${H - m.b}" stroke="#1E2D2F" stroke-dasharray="2 3" opacity=".55"/><text x="${X(v.x) + 4}" y="${m.t + 11}" style="font-size:11px">${v.label}</text>`; });
    series.forEach(sr => {
      const d = sr.data.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
      s += `<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.w || 2.2}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ""} stroke-linejoin="round"/>`;
    });
    s += `<line class="hl" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="#1E2D2F" opacity="0"/><rect class="ov" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/></svg>`;
    el.innerHTML = s;
    const svg = el.querySelector("svg"), hl = svg.querySelector(".hl"), tip = el.parentNode.querySelector(".sim-tip");
    const move = e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      const xv = x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0);
      const i = Math.max(0, Math.min(xs.length - 1, Math.round((xv - x0) / ((x1 - x0) / (xs.length - 1)))));
      hl.setAttribute("x1", X(xs[i])); hl.setAttribute("x2", X(xs[i])); hl.setAttribute("opacity", ".35");
      tip.innerHTML = `<b>${opt.xFmt(xs[i])}</b><br>` + series.map(sr => `<span style="color:${sr.tipColor || sr.color}">■</span> ${sr.name}: <b>${opt.tipFmt(sr.data[i][1])}</b>`).join("<br>");
      const host = el.parentNode.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - host.left + 14, host.width - tip.offsetWidth - 4) + "px"; tip.style.top = (e.clientY - host.top + 14) + "px"; tip.style.opacity = 1;
    };
    svg.addEventListener("mousemove", move);
    svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; hl.setAttribute("opacity", "0"); });
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* ---------- update ---------- */
  function update() {
    const city = S.city, base = M.defaults(city);
    const cur = runCached("cur" + city, () => M.run(M.scenario("current", base)));
    const cut = runCached("cut" + city, () => M.run(M.scenario("cut", base)));
    const design = runCached("plan" + city, () => M.runPlan(planParams(city, {})));
    const over = { safetyNet: S.safetyNet, r3plan: S.r3plan, lenCap: S.lenCap, lenOn: S.lenCap > 0, k: M.CITY[city][S.strat], Tplan: S.Tplan, absorption: S.absorption, shock: S.shock };
    const you = runCached(JSON.stringify([city, over]), () => M.runPlan(planParams(city, over)));

    const C = getComputedStyle(root);
    const col = n => C.getPropertyValue(n).trim();
    lineChart($("lab_c1"), [
      { name: "Dukungan saat ini berlanjut", color: col("--s-cur"), data: inc(cur) },
      { name: "Pemotongan tanpa redesain", color: col("--s-cut"), data: inc(cut) },
      { name: "Rencana sesuai desain", color: col("--s-plan"), dash: "5 4", data: inc(design) },
      { name: "Skenario Anda", color: col("--s-you"), w: 3.4, data: inc(you) }
    ], { aria: "Insidens HIV per 100 orang-tahun, 2026 sampai 2032", yFmt: v => NF1.format(v), tipFmt: v => NF2.format(v), xFmt: v => String(v), vlines: [{ x: 2029, label: "Tebing biaya 2029" }] });
    const monthly = (arr) => arr.map((v, i) => [2026 + i / 12, v]);
    lineChart($("lab_c2"), [
      { name: "PrEP oral", color: col("--s-oral"), data: monthly(you.oral) },
      { name: "Lenacapavir", color: col("--s-len"), data: monthly(you.len) }
    ], { aria: "Pengguna PrEP per 10.000 dalam skenario Anda", h: 200, yFmt: v => NF0.format(v), tipFmt: v => NF0.format(v), xFmt: v => { const y = Math.floor(v + 1e-6), mo = Math.round((v - y) * 12) % 12; return MON[mo] + " " + y; }, vlines: [{ x: 2029, label: "Jan 2029" }] });

    const cY = cum(you), cC = cum(cut), cD = cum(design), cCur = cum(cur);
    const averted = cC - cY, vsPlan = cY - cD, gains = cC - cD;
    const lost = gains > 0 ? Math.max(0, vsPlan) / gains : 0;
    const users = you.oral[47] + you.len[47];
    const pop = parseFloat(String(S.pop).replace(/[^0-9]/g, ""));
    const abs = v => pop > 0 ? `sekitar ${NF0.format(Math.round(v * pop / 10000))} orang di ${CITYNAME[city]}` : "";
    $("lab_kpi").innerHTML = [
      [NF0.format(cY), "infeksi baru 2027 sampai 2032 per 10.000, skenario Anda", abs(cY)],
      [NF0.format(averted), "infeksi dicegah dibanding pemotongan tanpa redesain", abs(averted)],
      [sgn(vsPlan), "selisih dibanding rencana sesuai desain", vsPlan > 0.5 ? pct(lost) + " manfaat rencana hilang" : ""],
      [NF0.format(users), "pengguna PrEP per 10.000, Desember 2029", "oral " + NF0.format(you.oral[47]) + ", lenacapavir " + NF0.format(you.len[47])]
    ].map(k => `<div><b>${k[0]}</b><span>${k[1]}</span>${k[2] ? `<em>${k[2]}</em>` : ""}</div>`).join("");

    const parts = [];
    parts.push(`Di ${CITYNAME[city]}, skenario Anda menghasilkan sekitar <b>${NF0.format(cY)}</b> infeksi baru per 10.000 LSL dan transpuan selama 2027 sampai 2032, dibanding ${NF0.format(cC)} bila anggaran dipotong tanpa redesain dan ${NF0.format(cCur)} bila dukungan saat ini sekadar berlanjut.`);
    if (vsPlan > 5) parts.push(`Pengaturan Anda kehilangan sekitar <b>${pct(lost)}</b> dari infeksi yang dapat dicegah rencana sesuai desain.`);
    else if (vsPlan < -5) parts.push(`Pengaturan Anda mencegah <b>${NF0.format(-vsPlan)}</b> infeksi lebih banyak daripada rencana sesuai desain.`);
    else parts.push("Hasilnya setara dengan rencana sesuai desain.");
    if (S.safetyNet < 0.5) parts.push("Jaring pengaman yang tipis membuat sebagian pengguna PrEP berhenti pada Januari 2029, terlihat sebagai penurunan tajam pada grafik pengguna PrEP.");
    if (S.shock >= 0.3) parts.push("Guncangan lingkungan hukum memutus layanan penjangkauan daring tepat pada tahun perluasan program.");
    $("lab_narr").innerHTML = parts.join(" ");
  }

  syncControls(); update();
  let rw; window.addEventListener("resize", () => { clearTimeout(rw); rw = setTimeout(update, 150); });
})();
