/* Interactive figures: costed analysis of community-based HIV programmes, January to December 2025. */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const tr = (id, en) => C.lang() === "en" ? en : id;
  const usd = v => "USD " + C.fmt(v);
  const usdM = v => "USD " + C.fmt(v / 1e6, 2) + tr(" juta", " million");
  const axM = v => C.fmt(v / 1e6, (v / 1e6) % 1 ? 1 : 0);
  const ctlOnLang = f => { f(); document.addEventListener("charis:lang", f); };

  /* Figure 1: cost structure */
  const CAT = [[{ id: "Sumber daya manusia", en: "Human resources" }, 10.15e6, "#0E5A55", 95.0], [{ id: "Operasional di luar SDM", en: "Operational, excluding staff" }, 0.44e6, "#4E8782", 4.1], [{ id: "Modal dan peralatan", en: "Capital and equipment" }, 0.10e6, "#A9C6C3", 0.9]];
  const HR = [[{ id: "Petugas lapangan dan pendidik sebaya", en: "Outreach workers and peer educators" }, 46.2], [{ id: "Manajer dan supervisor program", en: "Programme managers and supervisors" }, 18.7],
    [{ id: "Konselor dan manajer kasus", en: "Counsellors and case managers" }, 14.3], [{ id: "Staf data, monitoring, dan evaluasi", en: "Data, monitoring and evaluation staff" }, 8.6],
    [{ id: "Fungsi pendukung", en: "Support functions" }, 7.2], [{ id: "SDM lainnya", en: "Other staff" }, 5.0]];
  const Q = [[{ id: "Jan sampai Mar", en: "Jan to Mar" }, 2.32e6], [{ id: "Apr sampai Jun", en: "Apr to Jun" }, 2.54e6], [{ id: "Jul sampai Sep", en: "Jul to Sep" }, 2.73e6], [{ id: "Okt sampai Des", en: "Oct to Dec" }, 3.10e6]];
  document.querySelectorAll('[data-fig="cost"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "cat";
    const draw = e => {
      if (view === "cat") C.hbar(e, { aria: { id: "Biaya menurut kategori", en: "Cost by category" }, labelW: 240, fmt: usdM, axisFmt: axM,
        items: CAT.map(c => ({ label: c[0], value: c[1], color: c[2], tip: usdM(c[1]) + "<br>" + C.fmt(c[3], 1) + tr("% dari biaya total", "% of total cost") })) });
      else if (view === "hr") C.hbar(e, { aria: { id: "Rincian biaya SDM", en: "Staff cost breakdown" }, labelW: 290, fmt: v => C.fmt(v, 1) + "%", axisFmt: v => C.fmt(v) + "%",
        items: HR.map((h, i) => ({ label: h[0], value: h[1], color: i === 0 ? "#0E5A55" : "#6E9C99", tip: C.fmt(h[1], 1) + tr("% dari biaya total program", "% of total programme cost") + "<br>" + tr("sekitar ", "about ") + usdM(h[1] / 100 * 10.69e6) })) });
      else C.vbar(e, { aria: { id: "Biaya per triwulan", en: "Cost by quarter" }, fmt: v => C.fmt(v / 1e6, 2), axisFmt: axM,
        groups: Q.map((q, i) => ({ label: q[0], value: q[1], color: i === 3 ? "#0E5A55" : "#6E9C99", tip: usdM(q[1]) })) });
    };
    C.mount(el, draw);
    ctlOnLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "cat", label: { id: "Kategori biaya", en: "Cost category" } }, { v: "hr", label: { id: "Rincian SDM", en: "Staff breakdown" } }, { v: "q", label: { id: "Per triwulan", en: "By quarter" } }], view, v => { view = v; draw(el); }));
  });

  /* Figure 2: cost per case by population (range) */
  const POP = [[{ id: "LSL", en: "MSM" }, 38, 50, 3629968, 435089, 21.6, 94000, "#1F4E8C"], [{ id: "Transgender", en: "Transgender people" }, 120, 150, 545309, 23199, 18, 4200, "#2A8C8C"], [{ id: "Penasun", en: "People who inject drugs" }, 80, 120, 211500, 17751, 15, 2600, "#2F7D5B"]];
  document.querySelectorAll('[data-fig="pop"]').forEach(el => C.mount(el, e => C.vbar(e, { aria: { id: "Biaya per kasus menurut populasi", en: "Cost per case by population" },
    fmt: v => usd(v), axisFmt: v => C.fmt(v),
    groups: POP.map(p => ({ label: p[0], value: (p[1] + p[2]) / 2, color: p[7], text: "USD " + p[1] + tr(" sampai ", " to ") + p[2],
      tip: tr("Biaya per kasus: ", "Cost per case: ") + "<b>USD " + p[1] + tr(" sampai ", " to ") + p[2] + "</b><br>" + tr("Biaya: ", "Cost: ") + usd(p[3]) + "<br>" + tr("Dites: ", "Tested: ") + C.fmt(p[4]) + "<br>" + tr("Positivitas: ", "Positivity: ") + C.fmt(p[5], p[5] % 1 ? 1 : 0) + "%<br>" + tr("Estimasi kasus: ", "Estimated cases: ") + C.fmt(p[6]) })) })));

  /* Figure 3: cost per case by intervention */
  const IV = [[{ id: "Notifikasi pasangan", en: "Partner notification" }, 49, 1.21e6, 24521, "#2F7D5B"], [{ id: "Penjangkauan", en: "Outreach" }, 1063, 4.58e6, 4302, "#1F4E8C"],
    [{ id: "Rujukan dan retensi", en: "Linkage and retention" }, 1173, 1.32e6, 1126, "#2A8C8C"], [{ id: "Dukungan psikososial", en: "Psychosocial support" }, 1296, 0.56e6, 432, "#D98A2B"],
    [{ id: "Tes di fasilitas dan komunitas", en: "Facility and community testing" }, 1401, 3.02e6, 2158, "#6B4E9B"]];
  document.querySelectorAll('[data-fig="iv"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "cpc";
    const draw = e => C.hbar(e, { aria: { id: "Efektivitas biaya intervensi", en: "Cost-effectiveness of interventions" }, labelW: 260,
      fmt: view === "cpc" ? usd : view === "cases" ? (v => C.fmt(v)) : usdM, axisFmt: view === "cost" ? axM : (v => C.fmt(v)),
      items: IV.map(i => ({ label: i[0], value: view === "cpc" ? i[1] : view === "cases" ? i[3] : i[2], color: i[4],
        tip: tr("Biaya: ", "Cost: ") + usdM(i[2]) + "<br>" + tr("Kasus terdeteksi: ", "Cases detected: ") + C.fmt(i[3]) + "<br>" + tr("Biaya per kasus: ", "Cost per case: ") + "<b>" + usd(i[1]) + "</b>" })) });
    C.mount(el, draw);
    ctlOnLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "cpc", label: { id: "Biaya per kasus", en: "Cost per case" } }, { v: "cases", label: { id: "Kasus terdeteksi", en: "Cases detected" } }, { v: "cost", label: { id: "Biaya", en: "Cost" } }], view, v => { view = v; draw(el); }));
  });

  /* Figure 4: Grant Cycle 8 reallocation scenarios */
  const SC = [[{ id: "Kasus dasar", en: "Base case" }, 38000, 114000, 282, "#7D8A87"], [{ id: "Perluasan LSL", en: "MSM scale-up" }, 41500, 124500, 258, "#1F4E8C"],
    [{ id: "Fokus hasil tinggi", en: "High-yield focus" }, 45200, 135600, 236, "#2A8C8C"], [{ id: "Efisiensi dan penajaman sasaran", en: "Efficiency and targeting" }, 48500, 145500, 220, "#2F7D5B"]];
  document.querySelectorAll('[data-fig="gc8"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "yr";
    const draw = e => C.vbar(e, { aria: { id: "Skenario realokasi Siklus 8", en: "Grant Cycle 8 reallocation scenarios" },
      fmt: view === "cpc" ? usd : (v => C.fmt(v)), axisFmt: v => C.fmt(v),
      groups: SC.map((s, i) => { const v = view === "yr" ? s[1] : view === "tot" ? s[2] : s[3];
        return { label: s[0], value: v, color: s[4], tip: tr("Kasus per tahun: ", "Cases per year: ") + C.fmt(s[1]) + "<br>" + tr("Total 2027 sampai 2029: ", "Total 2027 to 2029: ") + C.fmt(s[2]) + "<br>" + tr("Biaya per kasus: ", "Cost per case: ") + usd(s[3]) +
          (i ? "<br><b>" + tr("Tambahan: ", "Additional: ") + "+" + C.fmt(s[2] - SC[0][2]) + " (" + C.fmt((s[1] / SC[0][1] - 1) * 100) + "%)</b>" : "") }; }) });
    C.mount(el, draw);
    ctlOnLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "yr", label: { id: "Kasus per tahun", en: "Cases per year" } }, { v: "tot", label: { id: "Total 2027 sampai 2029", en: "Total 2027 to 2029" } }, { v: "cpc", label: { id: "Biaya per kasus", en: "Cost per case" } }], view, v => { view = v; draw(el); }));
  });
})();
