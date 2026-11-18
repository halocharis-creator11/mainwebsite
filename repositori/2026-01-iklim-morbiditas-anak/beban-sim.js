/* Economic burden calculator for climate-attributable child morbidity.
   Cost-of-illness framework as reported: direct cost per case = (1 - inpatient share) x outpatient cost + inpatient share x hospitalisation cost
   (defaults 85% x Rp350,000 + 15% x Rp2,500,000 = Rp672,500); indirect cost = caregiver wage x days lost (Rp120,000 x 3 = Rp360,000).
   The default of 4,556 excess cases reproduces the reported national totals (Rp3.06 billion direct, Rp1.64 billion indirect).
   Scenario reductions are applied multiplicatively: remaining = total x (1 - adaptation) x (1 - social protection). */
(function () {
  "use strict";
  const box = document.getElementById("bebansim"); if (!box) return;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const nf = (v, d) => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const $ = id => document.getElementById(id);
  const rp = v => "Rp" + nf(v, 0);
  const rpb = v => v >= 1e9 ? "Rp" + nf(v / 1e9, 2) + tr(" miliar", " billion") : "Rp" + nf(v / 1e6, 1) + tr(" juta", " million");
  const DEF = { cases: 4556, op: 350000, ip: 2500000, sh: 15, wage: 120000, days: 3, ad: 20, sp: 15 };
  const S = Object.assign({}, DEF);
  const R = [["bs_cases", "cases", v => nf(v, 0)], ["bs_op", "op", rp], ["bs_ip", "ip", rp], ["bs_sh", "sh", v => nf(v, 0) + "%"], ["bs_wage", "wage", rp], ["bs_days", "days", v => nf(v, 0) + tr(" hari", " days")], ["bs_ad", "ad", v => nf(v, 0) + "%"], ["bs_sp", "sp", v => nf(v, 0) + "%"]];
  const PRE = { nat: 4556, jb: 1608, ji: 1003, pa: 166 };
  const COL = { d: "#E06A5B", i: "#2BB3B1" };
  function sync() { R.forEach(([id, k, fm]) => { $(id).value = S[k]; $(id + "_o").textContent = fm(+S[k]); }); }
  function draw() {
    const dpc = (1 - S.sh / 100) * S.op + S.sh / 100 * S.ip, ipc = S.wage * S.days, D = S.cases * dpc, I = S.cases * ipc, TOT = D + I;
    const keep = (1 - S.ad / 100) * (1 - S.sp / 100), D2 = D * keep, I2 = I * keep, AV = TOT - D2 - I2;
    const el = $("bs_chart"), w = Math.max(300, el.clientWidth || 600), lab = w < 480 ? 92 : 132, H = 150, m = { l: lab, r: 16, t: 10, b: 34 }, mx = Math.max(TOT, 1) * 1.08, X = v => m.l + v / mx * (w - m.l - m.r);
    const rows = [[tr("Tanpa intervensi", "No intervention"), D, I], [tr("Dengan intervensi", "With intervention"), D2, I2]];
    let s = '<svg viewBox="0 0 ' + w + " " + H + '" role="img" aria-label="' + tr("Beban ekonomi sebelum dan sesudah intervensi", "Economic burden before and after intervention") + '">';
    const step = mx > 4e9 ? 1e9 : mx > 1e9 ? 5e8 : mx > 2e8 ? 1e8 : 2e7;
    for (let v = 0; v <= mx; v += step) s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="#E1E8E6"/><text x="' + X(v) + '" y="' + (H - m.b + 15) + '" text-anchor="middle">' + (step >= 1e9 || mx > 1e9 ? nf(v / 1e9, 1) : nf(v / 1e6, 0)) + "</text>";
    rows.forEach((r, i) => { const y = m.t + i * 50 + 6;
      s += '<text x="' + (m.l - 8) + '" y="' + (y + 22) + '" text-anchor="end" style="fill:#142826">' + r[0] + "</text>";
      s += '<rect x="' + X(0) + '" y="' + y + '" width="' + Math.max(0, X(r[1]) - X(0)) + '" height="34" fill="' + COL.d + '"><title>' + tr("Biaya medis langsung", "Direct medical cost") + ": " + rpb(r[1]) + "</title></rect>";
      s += '<rect x="' + X(r[1]) + '" y="' + y + '" width="' + Math.max(0, X(r[1] + r[2]) - X(r[1])) + '" height="34" fill="' + COL.i + '"><title>' + tr("Kehilangan produktivitas", "Productivity loss") + ": " + rpb(r[2]) + "</title></rect>"; });
    s += '<text x="' + ((m.l + w - m.r) / 2) + '" y="' + (H - 3) + '" text-anchor="middle">' + (mx > 1e9 ? tr("Rp miliar", "Rp billion") : tr("Rp juta", "Rp million")) + "</text>";
    el.innerHTML = s + "</svg>";
    $("bs_legend").innerHTML = '<span><i style="background:' + COL.d + '"></i>' + tr("Biaya medis langsung", "Direct medical cost") + '</span><span><i style="background:' + COL.i + '"></i>' + tr("Kehilangan produktivitas pengasuh", "Caregiver productivity loss") + "</span>";
    $("bs_kpi").innerHTML =
      "<div><b>" + rp(dpc + ipc) + "</b><span>" + tr("biaya ekonomi per kasus", "economic cost per case") + "</span><em>" + tr("langsung ", "direct ") + rp(dpc) + "</em></div>" +
      "<div><b>" + rpb(TOT) + "</b><span>" + tr("beban ekonomi tanpa intervensi", "burden without intervention") + "</span><em>" + nf(S.cases, 0) + tr(" kasus berlebih", " excess cases") + "</em></div>" +
      "<div><b>" + rpb(AV) + "</b><span>" + tr("kerugian yang dapat dihindari", "avoidable loss") + "</span><em>" + nf((1 - keep) * 100, 0) + tr("% dari beban", "% of the burden") + "</em></div>";
    $("bs_narr").innerHTML = tr(
      "Dengan <b>" + nf(S.cases, 0) + "</b> kasus berlebih dan biaya <b>" + rp(dpc + ipc) + "</b> per kasus, beban ekonomi mencapai <b>" + rpb(TOT) + "</b>, terdiri atas biaya medis " + rpb(D) + " dan kehilangan produktivitas " + rpb(I) + ". Adaptasi iklim yang menekan kasus " + nf(S.ad, 0) + "% dan perlindungan sosial yang menekan kerugian " + nf(S.sp, 0) + "% menghindarkan sekitar <b>" + rpb(AV) + "</b>.",
      "With <b>" + nf(S.cases, 0) + "</b> excess cases at <b>" + rp(dpc + ipc) + "</b> per case, the economic burden reaches <b>" + rpb(TOT) + "</b>, made up of " + rpb(D) + " in medical costs and " + rpb(I) + " in lost productivity. Climate adaptation that cuts cases by " + nf(S.ad, 0) + "% and social protection that cuts losses by " + nf(S.sp, 0) + "% avoid about <b>" + rpb(AV) + "</b>.");
  }
  R.forEach(([id, k]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; box.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", "false")); sync(); draw(); }));
  box.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    S.cases = PRE[b.dataset.preset]; sync(); draw();
    box.querySelectorAll("[data-preset]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  }));
  $("bs_reset").addEventListener("click", () => { Object.assign(S, DEF); box.querySelectorAll("[data-preset]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.preset === "nat"))); sync(); draw(); });
  sync(); draw();
  box.querySelector('[data-preset="nat"]').setAttribute("aria-pressed", "true");
  document.addEventListener("charis:lang", () => { sync(); draw(); });
  window.addEventListener("resize", draw);
})();
