/* Cadre incentive package simulator.
   net burden (IDR) = direct cost x (1 - subsidy) + opportunity cost - honorarium;  burden % = net burden / UMK x 100
   predicted sustainability ~ -0.0100 x burden %  (straight line through the five scenarios of Figure 3)
   incremental programme cost per cadre per month = honorarium + direct cost x subsidy - current honorarium */
(function () {
  "use strict";
  const box = document.getElementById("kadersim"); if (!box) return;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const nf = d => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const f0 = v => nf(0).format(Math.round(v)), f1 = v => nf(1).format(v), f3 = v => nf(3).format(v);
  const rp = v => (v < 0 ? "−" : "") + "Rp" + f0(Math.abs(v));
  const rpM = v => { const a = Math.abs(v), s = v < 0 ? "−" : ""; return a >= 1e9 ? s + "Rp" + nf(2).format(a / 1e9) + tr(" miliar", " billion") : s + "Rp" + f1(a / 1e6) + tr(" juta", " million"); };
  const pctS = v => (v > 0 ? "+" : v < 0 ? "−" : "") + f1(Math.abs(v)) + "%";
  const $ = id => document.getElementById(id);
  const UMK = 3298116, DIRECT = 29667, OPP = 42234, HON0 = 195500, SLOPE = -0.01003, ICPT = 0.0;
  const sust = b => ICPT + SLOPE * b;
  const S0 = { hon: HON0, sub: 0, n: 500 };
  const PRESETS = [
    { k: "sq", hon: HON0, sub: 0, l: { id: "Status quo", en: "Status quo" } },
    { k: "dcs", hon: HON0, sub: 1, l: { id: "Subsidi biaya langsung", en: "Direct cost subsidy" } },
    { k: "opp", hon: OPP, sub: 0, l: { id: "Honorarium = biaya peluang", en: "Honorarium = opportunity cost" } },
    { k: "int", hon: 840000, sub: 0.5, l: { id: "Paket terpadu (perkiraan)", en: "Integrated package (approx.)" } },
    { k: "h30", hon: Math.round(UMK * 0.3 / 5000) * 5000, sub: 0, l: { id: "Honorarium 30% UMK", en: "Honorarium 30% of UMK" } }
  ];
  const S = Object.assign({}, S0);
  const model = P => {
    const burdenRp = DIRECT * (1 - P.sub) + OPP - P.hon, burden = burdenRp / UMK * 100;
    const s = sust(burden), dS = s - sust((DIRECT + OPP - HON0) / UMK * 100);
    const dC = P.hon + DIRECT * P.sub - HON0;
    return { burdenRp, burden, s, dS, dC, year: (P.hon + DIRECT * P.sub) * 12 * P.n, dYear: dC * 12 * P.n };
  };
  function presets() {
    $("ks_presets").innerHTML = PRESETS.map(p => `<button type="button" data-p="${p.k}">${p.l[lang()]}</button>`).join("");
    $("ks_presets").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const p = PRESETS.find(x => x.k === b.dataset.p); S.hon = p.hon; S.sub = p.sub; sync(); draw(); }));
  }
  function sync() {
    $("ks_hon").value = S.hon; $("ks_sub").value = S.sub; $("ks_n").value = S.n;
    $("ks_hon_o").textContent = rp(S.hon); $("ks_hon_h").textContent = f1(S.hon / UMK * 100) + tr("% dari UMK Denpasar 2025", "% of the 2025 Denpasar UMK");
    $("ks_sub_o").textContent = f0(S.sub * 100) + "%"; $("ks_n_o").textContent = f0(S.n);
    $("ks_presets").querySelectorAll("button").forEach(b => { const p = PRESETS.find(x => x.k === b.dataset.p); b.setAttribute("aria-pressed", String(p.hon === S.hon && p.sub === S.sub)); });
  }
  function draw() {
    const m = model(S), SC = window.KaderScenarios || [];
    if (window.KaderScatter) window.KaderScatter($("ks_plot"), {
      aria: tr("Paket Anda dibanding lima skenario", "Your package compared with the five scenarios"), height: 300,
      x: [-40, 5], xs: 5, y: [-0.05, 0.4], ys: 0.05, xf: v => nf(0).format(v) + "%",
      xl: tr("Beban ekonomi bersih (% UMK)", "Net economic burden (% of UMK)"), yl: tr("Keberlanjutan prediksi", "Predicted sustainability"),
      line: [[-40, sust(-40)], [5, sust(5)]],
      pts: SC.map(d => ({ x: d.burden, y: d.sust, c: "#AEB8B4", label: d.n[lang()], dy: 18, hide: true }))
        .concat([{ x: Math.max(-40, Math.min(5, m.burden)), y: Math.max(-0.05, Math.min(0.4, m.s)), c: "#E8833A", label: tr("Paket Anda", "Your package"), you: true, dy: -14 }]),
      tip: p => `<b>${p.label}</b><br>${tr("Beban bersih", "Net burden")}: ${pctS(p.x)} UMK<br>${tr("Keberlanjutan prediksi", "Predicted sustainability")}: ${f3(p.y)}`
    });
    const cpg = m.dC > 0 && m.dS > 0 ? rp(m.dC / m.dS * 0.1) : "";
    $("ks_kpi").innerHTML =
      `<div><b>${pctS(m.burden)}</b><span>${tr("Beban bersih kader per bulan, % UMK", "Cadre net burden per month, % of UMK")}</span><em>${rp(m.burdenRp)}</em></div>` +
      `<div><b>${f3(m.s)}</b><span>${tr("Keberlanjutan prediksi (skor laten)", "Predicted sustainability (latent score)")}</span><em>${(m.dS >= 0 ? "+" : "−") + f3(Math.abs(m.dS))} ${tr("dibanding status quo", "against the status quo")}</em></div>` +
      `<div><b>${rp(m.dC)}</b><span>${tr("Biaya tambahan per kader per bulan", "Extra cost per cadre per month")}</span><em>${cpg ? tr("Rp per kenaikan 0,1 skor: ", "IDR per 0.1 score gain: ") + cpg : "&nbsp;"}</em></div>` +
      `<div><b>${rpM(m.year)}</b><span>${tr("Total insentif per tahun untuk ", "Total incentives per year for ")}${f0(S.n)} ${tr("kader", "cadres")}</span><em>${(m.dYear >= 0 ? "+" : "−") + rpM(Math.abs(m.dYear)).replace("−", "")} ${tr("dibanding status quo", "against the status quo")}</em></div>`;
    let msg;
    if (m.burden > 0) msg = tr("Dengan paket ini kader masih merugi setiap bulan. Seperti skenario honorarium setara biaya peluang, keberlanjutan diperkirakan turun di bawah status quo.",
      "With this package cadres still lose money every month. As with the honorarium equal to opportunity cost, sustainability is expected to fall below the status quo.");
    else if (m.burden > -10) msg = tr("Kader memperoleh keuntungan bersih kecil. Hasilnya mirip status quo atau subsidi biaya langsung: biaya rendah, tetapi kenaikan keberlanjutan terbatas.",
      "Cadres make a small net gain. The result resembles the status quo or the direct cost subsidy: low cost, but limited gains in sustainability.");
    else if (m.burden >= -30) msg = tr("Paket ini memberi keuntungan bersih yang jelas, sebanding dengan paket terpadu atau honorarium 30% UMK, yaitu kelompok skenario dengan keberlanjutan prediksi tertinggi dalam studi.",
      "This package gives a clear net gain, comparable to the integrated package or the 30% of UMK honorarium, the scenarios with the highest predicted sustainability in the study.");
    else msg = tr("Keuntungan bersih paket ini melampaui skenario yang diteliti (di atas 28% UMK). Perkiraan keberlanjutan di luar rentang studi perlu ditafsirkan dengan sangat hati-hati.",
      "The net gain of this package goes beyond the scenarios studied (above 28% of UMK). Sustainability estimates outside the study range should be read with great caution.");
    $("ks_narr").textContent = msg;
  }
  [["ks_hon", "hon"], ["ks_sub", "sub"], ["ks_n", "n"]].forEach(([id, k]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; sync(); draw(); }));
  $("ks_reset").addEventListener("click", () => { Object.assign(S, S0); sync(); draw(); });
  const init = () => { presets(); sync(); draw(); };
  init();
  document.addEventListener("charis:lang", init);
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 150); });
})();
