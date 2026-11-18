/* HIPA policy simulator.
   Linear approximations of the reported results:
   integration: +10% gives +0.020 and +20% gives +0.039 on the output index (baseline 0.638), about 0.00195 per 1%;
   capacity: about one tenth of the integration effect per 1%;
   poverty: beta -0.826 on the poverty proportion, so a 1 percentage point fall adds about 0.0083;
   budget: impact per cost unit 0.553 for integration and 0.029 for capacity. */
(function () {
  "use strict";
  const box = document.getElementById("hipasim"); if (!box) return;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const nf = (v, d) => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const $ = id => document.getElementById(id);
  const BASE = 0.638, B_INT = 0.00195, B_CAP = 0.000195, B_POV = 0.826 / 100, CE_INT = 0.553, CE_CAP = 0.029;
  const DEF = { int: 10, cap: 0, pov: 0, share: 50 };
  const S = Object.assign({}, DEF);
  const R = [["hs_int", "int", v => "+" + nf(v, 0) + "%"], ["hs_cap", "cap", v => "+" + nf(v, 0) + "%"], ["hs_pov", "pov", v => (v ? "−" : "") + nf(v, 1) + tr(" poin persen", " percentage points")], ["hs_share", "share", v => nf(v, 0) + "%"]];
  const COL = { base: "#9AA6A3", int: "#0E5A55", cap: "#E8833A", pov: "#7A4FA3" };
  function sync() {
    R.forEach(([id, k, fm]) => { $(id).value = S[k]; $(id + "_o").textContent = fm(+S[k]); });
    box.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", "false"));
  }
  function draw() {
    const dI = B_INT * S.int, dC = B_CAP * S.cap, dP = B_POV * S.pov, out = BASE + dI + dC + dP;
    /* stacked bar: baseline plus each contribution */
    const el = $("hs_chart"), w = Math.max(300, el.clientWidth || 600), H = 150, m = { l: 12, r: 12, t: 30, b: 34 };
    const x0 = 0.5, x1 = Math.max(0.8, out + 0.02), X = v => m.l + (v - x0) / (x1 - x0) * (w - m.l - m.r);
    const segs = [["base", tr("Baseline", "Baseline"), x0, BASE], ["int", tr("Integrasi", "Integration"), BASE, BASE + dI], ["cap", tr("Kapasitas", "Capacity"), BASE + dI, BASE + dI + dC], ["pov", tr("Kemiskinan turun", "Lower poverty"), BASE + dI + dC, out]];
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + tr("Dekomposisi indeks luaran", "Output index decomposition") + '">';
    for (let v = 0.5; v <= x1 + 1e-9; v += 0.05) s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + (m.t - 6) + '" y2="' + (H - m.b) + '" stroke="#E1E8E6"/><text x="' + X(v) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + nf(v, 2) + "</text>";
    segs.forEach(([k, l, a, b]) => { if (b - a > 1e-6) s += '<rect x="' + X(a) + '" y="' + m.t + '" width="' + Math.max(1, X(b) - X(a)) + '" height="' + (H - m.t - m.b - 8) + '" fill="' + COL[k] + '"><title>' + l + ": " + (k === "base" ? nf(BASE, 3) : "+" + nf(b - a, 3)) + "</title></rect>"; });
    s += '<line x1="' + X(out) + '" x2="' + X(out) + '" y1="' + (m.t - 10) + '" y2="' + (H - m.b - 8) + '" stroke="#142826" stroke-width="2"/><text x="' + Math.min(X(out), w - 40) + '" y="' + (m.t - 14) + '" text-anchor="middle" class="val">' + nf(out, 3) + "</text>";
    s += '<text x="' + (w / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + tr("Indeks luaran nasional yang diprediksi", "Predicted national output index") + "</text>";
    el.innerHTML = s + "</svg>";
    $("hs_legend").innerHTML = segs.map(([k, l]) => '<span><i style="background:' + COL[k] + '"></i>' + l + "</span>").join("");
    const pct = (out / BASE - 1) * 100;
    const ceMix = S.share / 100 * CE_INT + (1 - S.share / 100) * CE_CAP;
    $("hs_kpi").innerHTML =
      "<div><b>" + nf(out, 3) + "</b><span>" + tr("indeks luaran yang diprediksi", "predicted output index") + "</span><em>" + tr("baseline ", "baseline ") + nf(BASE, 3) + "</em></div>" +
      "<div><b>" + (pct >= 0 ? "+" : "−") + nf(Math.abs(pct), 1) + "%</b><span>" + tr("perubahan kinerja", "change in performance") + "</span><em>" + tr("dibanding baseline", "compared with baseline") + "</em></div>" +
      "<div><b>" + nf(ceMix / CE_CAP, 1) + "×</b><span>" + tr("dampak per unit biaya", "impact per cost unit") + "</span><em>" + tr("dibanding seluruhnya untuk kapasitas", "compared with all to capacity") + "</em></div>";
    const shareTxt = nf(S.share, 0) + "%";
    $("hs_narr").innerHTML = tr(
      "Dengan kenaikan integrasi layanan <b>" + nf(S.int, 0) + "%</b>" + (S.cap ? ", kapasitas " + nf(S.cap, 0) + "%" : "") + (S.pov ? ", dan penurunan kemiskinan " + nf(S.pov, 1) + " poin persen" : "") +
        ", indeks luaran nasional diperkirakan naik dari " + nf(BASE, 3) + " menjadi <b>" + nf(out, 3) + "</b>. Integrasi menyumbang " + nf(dI, 3) + " poin" + (S.cap ? ", sedangkan kapasitas hanya " + nf(dC, 3) : "") + (S.pov ? " dan kemiskinan " + nf(dP, 3) : "") +
        ". Jika " + shareTxt + " anggaran tambahan dialihkan ke penguatan integrasi, dampak per unit biaya menjadi sekitar " + nf(ceMix / CE_CAP, 1) + " kali dibanding bila seluruhnya untuk menambah kapasitas.",
      "With a <b>" + nf(S.int, 0) + "%</b> increase in service integration" + (S.cap ? ", " + nf(S.cap, 0) + "% more capacity" : "") + (S.pov ? ", and poverty " + nf(S.pov, 1) + " percentage points lower" : "") +
        ", the national output index is expected to rise from " + nf(BASE, 3) + " to <b>" + nf(out, 3) + "</b>. Integration contributes " + nf(dI, 3) + " points" + (S.cap ? ", capacity only " + nf(dC, 3) : "") + (S.pov ? " and poverty " + nf(dP, 3) : "") +
        ". If " + shareTxt + " of additional budget goes to strengthening integration, impact per cost unit is about " + nf(ceMix / CE_CAP, 1) + " times that of spending it all on capacity.");
  }
  R.forEach(([id, k]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; sync(); draw(); }));
  box.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    const p = b.dataset.preset; Object.assign(S, DEF);
    if (p === "int20") S.int = 20;
    if (p === "cap20") { S.int = 0; S.cap = 20; S.share = 0; }
    if (p === "both") { S.int = 20; S.pov = 2; S.share = 80; }
    sync(); draw(); b.setAttribute("aria-pressed", "true");
  }));
  $("hs_reset").addEventListener("click", () => { Object.assign(S, DEF); sync(); draw(); });
  sync(); draw();
  document.addEventListener("charis:lang", () => { sync(); draw(); });
  window.addEventListener("resize", draw);
})();
