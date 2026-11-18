/* Kalkulator realokasi anggaran.
   Data dasar: biaya dan kasus terdeteksi (proksi positivitas notifikasi pasangan) per intervensi, Januari sampai Desember 2025,
   dari presentasi Harjana (2026), DOI 10.5281/zenodo.19967181.
   Rumus: kasus_i = kasus_dasar_i x ((1 + produktivitas) x anggaran_i / biaya_dasar_i) ^ e
   e = 1 berarti hubungan linear seperti asumsi tertulis presentasi; e = 0,5 mereproduksi angka skenario presentasi dengan selisih sekitar 5%. */
(function () {
  "use strict";
  const root = document.getElementById("calc");
  if (!root) return;
  const $ = id => document.getElementById(id);
  let LANG = document.documentElement.lang === "en" ? "en" : "id";
  let NF0, NF2;
  const setFmt = () => { const loc = LANG === "en" ? "en-GB" : "id-ID"; NF0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }); NF2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  setFmt();
  const tr = (id, en) => LANG === "en" ? en : id;
  const usd = v => "USD " + NF0.format(Math.round(v));
  const usdM = v => "USD " + NF2.format(v / 1e6) + tr(" juta", " million");
  const sgn = v => (v > 0.5 ? "+" : v < -0.5 ? "−" : "") + NF0.format(Math.abs(Math.round(v)));

  const IV = [
    { k: "pn", n: ["Notifikasi pasangan", "Partner notification"], s: ["Notifikasi pasangan", "Partner notification"], cost: 1.21e6, cases: 24521, color: "#2F7D5B" },
    { k: "out", n: ["Penjangkauan", "Outreach"], s: ["Penjangkauan", "Outreach"], cost: 4.58e6, cases: 4302, color: "#1F4E8C" },
    { k: "test", n: ["Tes di fasilitas dan komunitas", "Facility and community testing"], s: ["Tes", "Testing"], cost: 3.02e6, cases: 2158, color: "#6B4E9B" },
    { k: "link", n: ["Rujukan dan retensi (termasuk mulai ARV)", "Linkage and retention (including ART start)"], s: ["Rujukan dan retensi", "Linkage and retention"], cost: 1.32e6, cases: 1126, color: "#2A8C8C" },
    { k: "psy", n: ["Dukungan psikososial", "Psychosocial support"], s: ["Psikososial", "Psychosocial"], cost: 0.56e6, cases: 432, color: "#D98A2B" }
  ];
  const ivName = iv => iv.n[LANG === "en" ? 1 : 0], ivShort = iv => iv.s[LANG === "en" ? 1 : 0];
  const BASE_POS = 0.181;
  /* scenarios as published in the presentation (slide 10): shares of budget, total budget, cases detected */
  const SCEN = [
    { id: "base", n: ["Kasus dasar", "Base case"], sh: [11, 43, 28, 12, 6], b: 10.69e6, pub: 32539 },
    { id: "eff", n: ["Fokus efisiensi", "Efficiency focus"], sh: [17, 45, 20, 12, 6], b: 10.69e6, pub: 36214 },
    { id: "high", n: ["Dampak tinggi", "High impact"], sh: [20, 42, 18, 13, 7], b: 10.69e6, pub: 39547 },
    { id: "reach", n: ["Perluasan jangkauan", "Reach expansion"], sh: [12, 50, 22, 11, 5], b: 10.69e6, pub: 34912 },
    { id: "cons", n: ["Anggaran terbatas", "Cost-constrained"], sh: [10, 38, 26, 11, 5], b: 9.63e6, pub: 31008 }
  ];
  const scName = s => s.n[LANG === "en" ? 1 : 0];
  const S = { sh: SCEN[0].sh.slice(), budget: 10.69e6, e: 0.5, pos: BASE_POS, prod: 0, preset: "base" };

  function model(sh, budget, e, pos, prod) {
    const tot = sh.reduce((a, b) => a + b, 0) || 1;
    return IV.map((iv, i) => {
      const money = budget * sh[i] / tot;
      let c = iv.cases * Math.pow(Math.max(0, (1 + prod) * money / iv.cost), e);
      if (iv.k === "pn") c *= pos / BASE_POS;
      return { money, cases: c };
    });
  }
  const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);

  /* ---------- controls ---------- */
  const shareBox = $("calc_shares");
  const drawShares = () => { shareBox.innerHTML = IV.map((iv, i) => `<div class="ctl share"><label for="sh_${i}"><span><i class="sw" style="background:${iv.color}"></i>${ivName(iv)}</span><output id="sh_${i}_o"></output></label><input type="range" id="sh_${i}" min="0" max="70" step="1"></div>`).join("");
    IV.forEach((_, i) => $("sh_" + i).addEventListener("input", e => { setShare(i, +e.target.value); S.preset = null; sync(); draw(); })); };
  function setShare(i, v) {
    v = Math.max(0, Math.min(100, v));
    const others = S.sh.reduce((a, b, j) => j === i ? a : a + b, 0), rest = 100 - v;
    S.sh = S.sh.map((x, j) => j === i ? v : (others > 0 ? x * rest / others : rest / (IV.length - 1)));
  }
  drawShares();
  $("calc_budget").addEventListener("input", e => { S.budget = +e.target.value * 1e6; S.preset = null; sync(); draw(); });
  $("calc_pos").addEventListener("input", e => { S.pos = +e.target.value / 100; sync(); draw(); });
  $("calc_prod").addEventListener("input", e => { S.prod = +e.target.value / 100; sync(); draw(); });
  root.querySelectorAll("[data-e]").forEach(b => b.addEventListener("click", () => { S.e = +b.dataset.e; sync(); draw(); }));
  const drawPresets = () => { $("calc_presets").innerHTML = SCEN.map(s => `<button type="button" data-scen="${s.id}">${scName(s)}</button>`).join("");
    root.querySelectorAll("[data-scen]").forEach(b => b.addEventListener("click", () => {
      const s = SCEN.find(x => x.id === b.dataset.scen); S.sh = s.sh.slice(); S.budget = s.b; S.preset = s.id; sync(); draw();
    })); };
  drawPresets();
  $("calc_reset").addEventListener("click", () => { Object.assign(S, { sh: SCEN[0].sh.slice(), budget: 10.69e6, e: 0.5, pos: BASE_POS, prod: 0, preset: "base" }); sync(); draw(); });
  function sync() {
    IV.forEach((_, i) => { $("sh_" + i).value = Math.round(S.sh[i]); $("sh_" + i + "_o").textContent = Math.round(S.sh[i]) + "%"; });
    $("calc_budget").value = (S.budget / 1e6).toFixed(2); $("calc_budget_o").textContent = usdM(S.budget);
    $("calc_pos").value = Math.round(S.pos * 1000) / 10; $("calc_pos_o").textContent = NF2.format(S.pos * 100).replace(/[.,]?0+$/, "") + "%";
    $("calc_prod").value = Math.round(S.prod * 100); $("calc_prod_o").textContent = (S.prod > 0 ? "+" : S.prod < 0 ? "−" : "") + Math.abs(Math.round(S.prod * 100)) + "%";
    root.querySelectorAll("[data-e]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.e === S.e)));
    root.querySelectorAll("[data-scen]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.scen === S.preset)));
  }

  /* ---------- animated flow: budget (left) to cases detected (right) ---------- */
  const flowEl = $("calc_flow");
  let cur = null, anim = 0;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function flowGeom(res) {
    const W = Math.max(320, flowEl.clientWidth), H = 300, bw = 16, padL = W < 520 ? 112 : 150, padR = W < 520 ? 92 : 128, gap = 7;
    const totM = sum(res, "money"), totC = sum(res, "cases"), avail = H - gap * (IV.length - 1) - 8;
    let yl = 4, yr = 4;
    const g = res.map((r, i) => { const hl = Math.max(1.5, avail * r.money / totM), hr = Math.max(1.5, avail * r.cases / totC); const o = { yl, hl, yr, hr }; yl += hl + gap; yr += hr + gap; return o; });
    return { W, H, bw, padL, padR, g };
  }
  function renderFlow(geo, res) {
    const { W, H, bw, padL, padR, g } = geo, x0 = padL, x1 = W - padR;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("Aliran anggaran ke kasus terdeteksi per intervensi", "Budget flowing into cases detected by intervention")}">`;
    g.forEach((o, i) => {
      const c = IV[i].color, mx = (x0 + bw + x1) / 2;
      s += `<path d="M${x0 + bw},${o.yl} C${mx},${o.yl} ${mx},${o.yr} ${x1},${o.yr} L${x1},${o.yr + o.hr} C${mx},${o.yr + o.hr} ${mx},${o.yl + o.hl} ${x0 + bw},${o.yl + o.hl} Z" fill="${c}" opacity=".24"/>`;
      s += `<rect x="${x0}" y="${o.yl}" width="${bw}" height="${o.hl}" fill="${c}" rx="2"/><rect x="${x1}" y="${o.yr}" width="${bw}" height="${o.hr}" fill="${c}" rx="2"/>`;
      if (o.hl > 11) s += `<text x="${x0 - 8}" y="${o.yl + o.hl / 2 + 4}" text-anchor="end">${ivShort(IV[i])} ${Math.round(res[i].money / sum(res, "money") * 100)}%</text>`;
      if (o.hr > 11) s += `<text x="${x1 + bw + 8}" y="${o.yr + o.hr / 2 + 4}">${NF0.format(res[i].cases)}</text>`;
    });
    s += `<rect class="hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
    flowEl.innerHTML = s;
    const tip = flowEl.parentNode.querySelector(".sim-tip"), svg = flowEl.querySelector("svg");
    svg.addEventListener("mousemove", e => {
      const r = svg.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H, x = (e.clientX - r.left) / r.width * W;
      const side = x < W / 2 ? "l" : "r";
      const i = g.findIndex(o => side === "l" ? y >= o.yl - 3 && y <= o.yl + o.hl + 3 : y >= o.yr - 3 && y <= o.yr + o.hr + 3);
      if (i < 0) { tip.style.opacity = 0; return; }
      const rr = res[i];
      tip.innerHTML = `<b>${ivName(IV[i])}</b><br>${tr("Anggaran", "Budget")}: ${usd(rr.money)}<br>${tr("Kasus terdeteksi", "Cases detected")}: ${NF0.format(rr.cases)}<br>${tr("Biaya per kasus", "Cost per case")}: ${usd(rr.money / Math.max(1, rr.cases))}`;
      const host = flowEl.parentNode.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - host.left + 14, host.width - tip.offsetWidth - 4) + "px"; tip.style.top = (e.clientY - host.top + 14) + "px"; tip.style.opacity = 1;
    });
    svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; });
  }
  function tweenFlow(target, res) {
    cancelAnimationFrame(anim);
    if (!cur || reduce) { cur = target; renderFlow(cur, res); return; }
    const from = cur, t0 = performance.now(), D = 450;
    const lerp = (a, b, t) => a + (b - a) * t;
    const step = now => {
      const t = Math.min(1, (now - t0) / D), k = 1 - Math.pow(1 - t, 3);
      const g = target.g.map((o, i) => ({ yl: lerp(from.g[i].yl, o.yl, k), hl: lerp(from.g[i].hl, o.hl, k), yr: lerp(from.g[i].yr, o.yr, k), hr: lerp(from.g[i].hr, o.hr, k) }));
      renderFlow(Object.assign({}, target, { g }), res);
      if (t < 1) anim = requestAnimationFrame(step); else cur = target;
    };
    anim = requestAnimationFrame(step);
  }

  /* ---------- comparison with published scenarios ---------- */
  function renderCompare(mine) {
    const el = $("calc_cmp"), W = Math.max(320, el.clientWidth), rowH = 30, H = (SCEN.length + 1) * rowH + 26, L = W < 520 ? 120 : 170, R = 16;
    const rows = SCEN.map(s => ({ name: scName(s), pub: s.pub, calc: sum(model(s.sh, s.b, S.e, BASE_POS, 0), "cases") })).concat([{ name: tr("Skenario Anda", "Your scenario"), pub: null, calc: mine, you: true }]);
    const max = Math.max(...rows.map(r => Math.max(r.pub || 0, r.calc))) * 1.12;
    const X = v => L + v / max * (W - L - R);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("Kasus terdeteksi menurut skenario", "Cases detected by scenario")}">`;
    [0, 10000, 20000, 30000, 40000, 50000, 60000].filter(v => v <= max).forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H - 22}" stroke="#E3E8E6"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle">${NF0.format(v)}</text>`; });
    rows.forEach((r, i) => {
      const y = i * rowH + 4;
      s += `<text x="${L - 8}" y="${y + 17}" text-anchor="end" style="${r.you ? "font-weight:700;fill:#142826" : ""}">${r.name}</text>`;
      s += `<rect x="${L}" y="${y + 5}" width="${X(r.calc) - L}" height="16" rx="3" fill="${r.you ? "#0E5A55" : "#9FB8B5"}"/>`;
      if (r.pub) s += `<line x1="${X(r.pub)}" x2="${X(r.pub)}" y1="${y + 1}" y2="${y + 25}" stroke="#142826" stroke-width="2.4"/>`;
      s += `<text x="${X(Math.max(r.calc, r.pub || 0)) + 6}" y="${y + 17}" style="fill:#142826;font-weight:${r.you ? 700 : 500}">${NF0.format(r.calc)}</text>`;
    });
    el.innerHTML = s + "</svg>";
  }

  /* ---------- update ---------- */
  function draw() {
    const res = model(S.sh, S.budget, S.e, S.pos, S.prod), cases = sum(res, "cases");
    const base = sum(model(SCEN[0].sh, 10.69e6, S.e, BASE_POS, 0), "cases");
    tweenFlow(flowGeom(res), res);
    renderCompare(cases);
    const cpc = S.budget / Math.max(1, cases), cpcBase = 10.69e6 / base, d = cases - base;
    $("calc_kpi").innerHTML = [
      [NF0.format(cases), tr("kasus terdeteksi per tahun (proksi notifikasi pasangan)", "cases detected per year (partner notification proxy)")],
      [sgn(d), tr("dibanding alokasi 2025", "compared with the 2025 allocation"), Math.abs(d / base) < 0.005 ? "" : (d > 0 ? "+" : "\u2212") + NF0.format(Math.abs(d / base * 100)) + "%"],
      [usd(cpc), tr("biaya per kasus terdeteksi", "cost per case detected"), tr("alokasi 2025: ", "2025 allocation: ") + usd(cpcBase)],
      [NF2.format(cases / S.budget * 1000), tr("kasus per USD 1.000", "cases per USD 1,000")]
    ].map(k => `<div><b>${k[0]}</b><span>${k[1]}</span>${k[2] ? `<em>${k[2]}</em>` : ""}</div>`).join("");
    const pn = res[0], top = res.map((r, i) => [i, r.cases]).sort((a, b) => b[1] - a[1])[0][0];
    const same = Math.abs(d) < 0.005 * base, pnc = usd(pn.money / Math.max(1, pn.cases));
    const parts = [tr(`Dengan anggaran ${usdM(S.budget)}, campuran intervensi Anda menemukan sekitar <b>${NF0.format(cases)}</b> kasus per tahun dengan biaya per kasus ${usd(cpc)}, `,
        `With a budget of ${usdM(S.budget)}, your intervention mix finds about <b>${NF0.format(cases)}</b> cases a year at a cost per case of ${usd(cpc)}, `) +
      (same ? tr("setara dengan alokasi 2025.", "the same as the 2025 allocation.") : tr(`${d > 0 ? "bertambah" : "berkurang"} <b>${NF0.format(Math.abs(d))}</b> dibanding alokasi 2025.`, `${d > 0 ? "up" : "down"} <b>${NF0.format(Math.abs(d))}</b> on the 2025 allocation.`))];
    parts.push(top === 0 ? tr(`Notifikasi pasangan menyumbang kasus terbanyak, dengan satu kasus setiap ${pnc}.`, `Partner notification contributes the most cases, at one case for every ${pnc}.`)
      : tr(`${ivName(IV[top])} menyumbang kasus terbanyak; notifikasi pasangan menghasilkan satu kasus setiap ${pnc}.`, `${ivName(IV[top])} contributes the most cases; partner notification yields one case for every ${pnc}.`));
    if (S.e === 1) parts.push(tr("Pada asumsi linear, setiap tambahan dana memberi hasil yang sama besar, sehingga angka ini menjadi batas atas.", "Under the linear assumption every additional dollar yields the same return, so this figure is an upper bound."));
    else parts.push(tr("Hasil dihitung dengan asumsi hasil yang makin menurun ketika dana suatu intervensi ditambah.", "Results assume diminishing returns as funding for an intervention increases."));
    if (S.sh[0] > 30) parts.push(tr("Porsi notifikasi pasangan di atas 30% perlu diuji: jumlah pasangan yang dapat dihubungi dibatasi oleh jumlah kasus indeks.", "A partner notification share above 30% needs testing: the number of partners who can be contacted is limited by the number of index cases."));
    $("calc_narr").innerHTML = parts.join(" ");
  }

  sync(); draw();
  document.addEventListener("charis:lang", e => { LANG = e.detail === "en" ? "en" : "id"; setFmt(); drawShares(); drawPresets(); cur = null; sync(); draw(); });
  let rw; window.addEventListener("resize", () => { clearTimeout(rw); rw = setTimeout(() => { cur = null; draw(); }, 150); });
})();
