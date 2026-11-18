/* Two interactive tools for the PPCP evaluation.
   1. Difference-in-differences explorer: mean services before and after in PPCP and comparison districts,
      with an optional assumption that PPCP districts would have kept growing faster without the intervention.
      DiD = (post PPCP - pre PPCP) - (post comparison - pre comparison) - extra trend x years between period midpoints.
   2. Investment value calculator: a budget split between PPCP and conventional delivery, using average cost per
      additional person on ART and per additional person virally suppressed. Linear, constant average cost. */
(function () {
  "use strict";
  const C = window.CharisCharts;
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const nf = d => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const f0 = v => nf(0).format(Math.round(v)), f1 = v => nf(1).format(v);
  const sg = v => (v >= 0 ? "+" : "−") + f0(Math.abs(v));
  const $ = id => document.getElementById(id);
  const MID_GAP = 2.5;   /* years between the midpoints of 2022 to 2024 and 2025 to 2026 */

  /* ===================== 1. DiD explorer ===================== */
  const did = $("didlab");
  if (did && C) {
    const DEF = { preP: 2130, postP: 4120, preC: 1710, postC: 2480, extra: 0 };
    const S = Object.assign({}, DEF);
    const R = [["dd_preP", "preP"], ["dd_postP", "postP"], ["dd_preC", "preC"], ["dd_postC", "postC"], ["dd_extra", "extra"]];
    const est = P => {
      const dP = P.postP - P.preP, dC = P.postC - P.preC, cf = P.preP + dC + P.extra * MID_GAP;
      return { dP, dC, cf, did: P.postP - cf, pctP: dP / P.preP * 100, pctC: dC / P.preC * 100 };
    };
    function sync() {
      R.forEach(([id, k]) => { $(id).value = S[k]; $(id + "_o").textContent = k === "extra" ? (S[k] ? "+" : "") + f0(S[k]) + tr(" per tahun", " a year") : f0(S[k]); });
      did.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", "false"));
    }
    function draw() {
      const r = est(S);
      C.line($("dd_chart"), { aria: { id: "Penjelajah selisih dalam selisih", en: "Difference-in-differences explorer" }, xDomain: [2022, 2026.5], yMax: 5500, dots: true, height: 280,
        xFmt: x => x === 2023 ? tr("Sebelum (2022 sampai 2024)", "Before (2022 to 2024)") : tr("Sesudah (2025 sampai 2026)", "After (2025 to 2026)"), tipFmt: v => f0(v), yFmt: v => f0(v),
        vlines: [{ x: 2024.5, label: { id: "Mulai PPCP", en: "PPCP starts" } }],
        series: [{ name: { id: "PPCP, teramati", en: "PPCP, observed" }, color: "#1F4E8C", data: [[2023, S.preP], [2025.5, S.postP]] },
          { name: { id: "PPCP tanpa intervensi (kontrafaktual)", en: "PPCP without the intervention (counterfactual)" }, color: "#1F4E8C", dash: "4 5", width: 1.8, data: [[2023, S.preP], [2025.5, r.cf]] },
          { name: { id: "Pembanding, teramati", en: "Comparison, observed" }, color: "#7FA7D9", dash: "8 5", data: [[2023, S.preC], [2025.5, S.postC]] }] });
      $("dd_kpi").innerHTML =
        `<div><b>${sg(r.dP)}</b><span>${tr("perubahan layanan di kabupaten/kota PPCP", "change in services in PPCP districts/cities")}</span><em>${sg(r.pctP)}%</em></div>` +
        `<div><b>${sg(r.dC)}</b><span>${tr("perubahan layanan di kabupaten/kota pembanding", "change in services in comparison districts/cities")}</span><em>${sg(r.pctC)}%</em></div>` +
        `<div><b>${sg(r.did)}</b><span>${tr("estimasi efek PPCP (selisih dalam selisih)", "estimated PPCP effect (difference-in-differences)")}</span><em>${tr("laporan evaluasi: +1.238", "evaluation report: +1,238")}</em></div>`;
      const share = r.dP > 0 ? r.did / r.dP * 100 : 0;
      $("dd_narr").innerHTML = S.extra
        ? tr(`Bila tanpa PPCP pun kabupaten/kota PPCP tetap tumbuh <b>${f0(S.extra)}</b> layanan per tahun lebih cepat daripada pembanding, efek yang dapat dikaitkan dengan PPCP turun menjadi sekitar <b>${f0(r.did)}</b> layanan. Hasil ini menunjukkan seberapa jauh kesimpulan bergantung pada asumsi tren paralel.`,
             `If PPCP districts/cities would have grown <b>${f0(S.extra)}</b> services a year faster than the comparison group even without PPCP, the effect attributable to PPCP falls to about <b>${f0(r.did)}</b> services. This shows how far the conclusion depends on the parallel trends assumption.`)
        : tr(`Kabupaten/kota PPCP bertambah ${f0(r.dP)} layanan, sedangkan pembanding bertambah ${f0(r.dC)}. Dengan asumsi tren paralel, garis putus-putus menunjukkan jumlah layanan PPCP seandainya ia tumbuh seperti pembanding, dan jarak ke nilai teramati (<b>${f0(r.did)}</b> layanan, sekitar ${f0(share)}% dari kenaikannya) adalah efek PPCP.`,
             `PPCP districts/cities gained ${f0(r.dP)} services, while comparison districts/cities gained ${f0(r.dC)}. Under parallel trends, the dashed line shows PPCP services had they grown like the comparison group, and the gap to the observed value (<b>${f0(r.did)}</b> services, about ${f0(share)}% of their increase) is the PPCP effect.`);
    }
    R.forEach(([id, k]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; sync(); draw(); }));
    did.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
      const p = b.dataset.preset;
      Object.assign(S, DEF);
      if (p === "null") S.postP = S.preP + (S.postC - S.preC);
      if (p === "pretrend") S.extra = 130;
      sync(); draw(); b.setAttribute("aria-pressed", "true");
    }));
    const markData = () => { const b = did.querySelector('[data-preset="data"]'); if (b) b.setAttribute("aria-pressed", "true"); };
    $("dd_reset").addEventListener("click", () => { Object.assign(S, DEF); sync(); draw(); markData(); });
    sync(); draw(); markData();
    document.addEventListener("charis:lang", () => { sync(); draw(); });
    window.addEventListener("resize", () => draw());
  }

  /* ===================== 2. investment value calculator ===================== */
  const calc = $("ppcpcalc");
  if (calc && C) {
    const DEF = { budget: 10, share: 50, artP: 278, artC: 421, vsP: 521, vsC: 842, out: "art" };
    const S = Object.assign({}, DEF);
    const R = [["pc_budget", "budget", v => "USD " + f0(v) + tr(" juta", " million")], ["pc_share", "share", v => f0(v) + "%"],
      ["pc_artP", "artP", v => "USD " + f0(v)], ["pc_artC", "artC", v => "USD " + f0(v)], ["pc_vsP", "vsP", v => "USD " + f0(v)], ["pc_vsC", "vsC", v => "USD " + f0(v)]];
    const outs = (P, share) => { const b = P.budget * 1e6, sP = share / 100;
      return { art: b * sP / P.artP + b * (1 - sP) / P.artC, vs: b * sP / P.vsP + b * (1 - sP) / P.vsC }; };
    function sync() {
      R.forEach(([id, k, fm]) => { $(id).value = S[k]; $(id + "_o").textContent = fm(+S[k]); });
      calc.querySelectorAll("[data-out]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.out === S.out)));
    }
    function draw() {
      const conv = outs(S, 0), mix = outs(S, S.share), full = outs(S, 100), k = S.out;
      const name = k === "art" ? tr("tambahan ODHIV dalam ARV", "additional people on ART") : tr("tambahan ODHIV tersupresi", "additional people virally suppressed");
      C.hbar($("pc_chart"), { aria: { id: "Hasil menurut alokasi anggaran", en: "Outcomes by budget allocation" }, labelW: 250, fmt: v => f0(v),
        items: [{ label: { id: "Seluruhnya layanan konvensional", en: "All conventional delivery" }, value: conv[k], color: "#7FA7D9", tip: name },
          { label: { id: `Alokasi Anda (${f0(S.share)}% PPCP)`, en: `Your allocation (${f0(S.share)}% PPCP)` }, value: mix[k], color: "#2F7D5B", tip: name },
          { label: { id: "Seluruhnya melalui PPCP", en: "All through PPCP" }, value: full[k], color: "#1F4E8C", tip: name }] });
      const gain = mix[k] - conv[k], cpo = S.budget * 1e6 / mix[k];
      $("pc_kpi").innerHTML =
        `<div><b>${f0(mix[k])}</b><span>${name}</span><em>${tr("dengan alokasi Anda", "with your allocation")}</em></div>` +
        `<div><b>${sg(gain)}</b><span>${tr("dibanding seluruhnya konvensional", "compared with all conventional")}</span><em>${gain > 0 ? "+" + f0(gain / conv[k] * 100) + "%" : "0%"}</em></div>` +
        `<div><b>USD ${f0(cpo)}</b><span>${tr("biaya rata-rata per hasil", "average cost per outcome")}</span><em>${tr("gabungan kedua model", "both models combined")}</em></div>`;
      const other = k === "art" ? "vs" : "art", oName = other === "art" ? tr("dalam ARV", "on ART") : tr("tersupresi", "virally suppressed");
      $("pc_narr").innerHTML = tr(
        `Dengan anggaran USD ${f0(S.budget)} juta dan ${f0(S.share)}% disalurkan melalui model PPCP, program memperoleh sekitar <b>${f0(mix[k])}</b> ${name}, atau <b>${f0(Math.max(0, gain))}</b> lebih banyak daripada bila seluruhnya disalurkan secara konvensional. Pada saat yang sama, tambahan ODHIV ${oName} naik dari ${f0(conv[other])} menjadi ${f0(mix[other])}.`,
        `With a budget of USD ${f0(S.budget)} million and ${f0(S.share)}% channelled through the PPCP model, the programme gains about <b>${f0(mix[k])}</b> ${name}, or <b>${f0(Math.max(0, gain))}</b> more than if all funds went through conventional delivery. At the same time, additional people ${oName} rise from ${f0(conv[other])} to ${f0(mix[other])}.`);
    }
    R.forEach(([id, k]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; sync(); draw(); }));
    calc.querySelectorAll("[data-out]").forEach(b => b.addEventListener("click", () => { S.out = b.dataset.out; sync(); draw(); }));
    $("pc_reset").addEventListener("click", () => { Object.assign(S, DEF); sync(); draw(); });
    sync(); draw();
    document.addEventListener("charis:lang", () => { sync(); draw(); });
    window.addEventListener("resize", () => draw());
  }
})();
