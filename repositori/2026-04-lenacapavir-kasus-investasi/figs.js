/* Interactive figures for the lenacapavir investment case. */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const tr = (id, en) => C.lang() === "en" ? en : id;
  const pct = v => C.fmt(v, v % 1 ? 1 : 0) + "%";
  const onLang = f => { f(); document.addEventListener("charis:lang", f); };

  /* cascade */
  const CAS = [[{ id: "Mengetahui status", en: "Know their status" }, 64, "#1F4E8C"], [{ id: "Dalam pengobatan ARV", en: "On ART" }, 70, "#1F4E8C"], [{ id: "Dites viral load", en: "Viral load tested" }, 59, "#1F4E8C"],
    [{ id: "Tersupresi (dari yang dites)", en: "Suppressed (of those tested)" }, 95, "#1F4E8C"], [{ id: "Tersupresi, seluruh ODHIV (estimasi)", en: "Suppressed, all PLHIV (estimated)" }, 25, "#B4364A"]];
  document.querySelectorAll('[data-fig="cascade"]').forEach(el => C.mount(el, e => C.vbar(e, { aria: { id: "Kaskade HIV 2025", en: "HIV cascade 2025" }, fmt: pct, axisFmt: v => C.fmt(v) + "%",
    groups: CAS.map((c, i) => ({ label: c[0], value: c[1], color: c[2], tip: i === 4 ? tr("Perkalian setiap langkah kaskade: sekitar seperempat ODHIV tersupresi", "Product of each cascade step: about a quarter of PLHIV are suppressed") : pct(c[1]) })) })));

  /* PrEP continuation and users by population */
  const CONT = [[1, 13.3, 6027], [3, 8.9, 4023], [6, 3.3, 1486], [9, 1.5, 694], [12, 1.1, 515]];
  const POP = [[{ id: "LSL", en: "MSM" }, 29893, 66.0], [{ id: "Pekerja seks perempuan", en: "Female sex workers" }, 11094, 24.5], [{ id: "Transgender", en: "Transgender people" }, 1629, 3.6],
    [{ id: "Pasangan berisiko tinggi", en: "High-risk partners" }, 1081, 2.4], [{ id: "Pasangan serodiskordan", en: "Serodiscordant couples" }, 946, 2.1], [{ id: "Penasun", en: "People who inject drugs" }, 646, 1.4]];
  document.querySelectorAll('[data-fig="prep"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "cont";
    const draw = e => view === "cont"
      ? C.vbar(e, { aria: { id: "Penggunaan PrEP per bulan", en: "PrEP use by month" }, fmt: pct, axisFmt: v => C.fmt(v) + "%",
          groups: CONT.map(c => ({ label: tr("Bulan ", "Month ") + c[0], value: c[1], color: c[0] === 12 ? "#B4364A" : "#1F4E8C", tip: tr(`${C.fmt(c[2])} orang masih memakai PrEP, ${pct(c[1])} dari 45.289 yang memulai`, `${C.fmt(c[2])} people still using PrEP, ${pct(c[1])} of the 45,289 who started`) })) })
      : C.hbar(e, { aria: { id: "Pengguna PrEP baru menurut populasi", en: "PrEP initiations by population" }, labelW: 230,
          items: POP.map((p, i) => ({ label: p[0], value: p[1], color: i ? "#6E9C99" : "#0E5A55", after: "(" + pct(p[2]) + ")", tip: C.fmt(p[1]) + tr(" orang memulai PrEP pada 2025", " people started PrEP in 2025") })) });
    C.mount(el, draw);
    onLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "cont", label: { id: "Keberlanjutan", en: "Continuation" } }, { v: "pop", label: { id: "Menurut populasi", en: "By population" } }], view, v => { view = v; draw(el); }));
  });

  /* epidemic shift */
  const SHARE = [[{ id: "LSL", en: "MSM" }, 31, "#1F4E8C"], [{ id: "Heteroseksual non-populasi kunci", en: "Heterosexual, not key population" }, 20, "#2F7D5B"],
    [{ id: "Penasun", en: "People who inject drugs" }, 17, "#6B4E9B"], [{ id: "Pekerja seks perempuan", en: "Female sex workers" }, 14, "#E8833A"], [{ id: "Lainnya atau tidak diketahui", en: "Other or unknown" }, 18, "#7D8A87"]];
  const PREV = [[{ id: "Penasun", en: "People who inject drugs" }, 45.3, 29.1], [{ id: "Transpuan", en: "Transgender women" }, 28.9, 11.9], [{ id: "LSL", en: "MSM" }, 24.4, 17.8], [{ id: "Pekerja seks perempuan", en: "Female sex workers" }, 2.0, 1.6]];
  document.querySelectorAll('[data-fig="shift"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "share";
    const draw = e => view === "share"
      ? C.hbar(e, { aria: { id: "Porsi infeksi baru menurut populasi, 2024", en: "Share of new infections by population, 2024" }, labelW: 260, fmt: pct, axisFmt: v => C.fmt(v) + "%",
          items: SHARE.map(s => ({ label: s[0], value: s[1], color: s[2], tip: tr("Porsi infeksi baru 2024: ", "Share of new infections in 2024: ") + "<b>" + pct(s[1]) + "</b>" })) })
      : C.dumbbell(e, { aria: { id: "Prevalensi HIV 2017 dan 2024", en: "HIV prevalence 2017 and 2024" }, max: 50, step: 10, outside: true, fmt: pct, colors: ["#B4364A", "#9FB8B5"],
          names: [{ id: "Prevalensi 2024", en: "Prevalence 2024" }, { id: "Prevalensi 2017", en: "Prevalence 2017" }], axis: { id: "prevalensi HIV (%)", en: "HIV prevalence (%)" }, gapText: { id: "Kenaikan (poin persen)", en: "Increase (percentage points)" },
          rows: PREV.map(p => ({ label: p[0], a: p[1], b: p[2] })) });
    C.mount(el, draw);
    onLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "share", label: { id: "Porsi infeksi baru", en: "Share of new infections" } }, { v: "prev", label: { id: "Prevalensi", en: "Prevalence" } }], view, v => { view = v; draw(el); }));
  });

  /* scenarios */
  const SC = [[{ id: "Status quo", en: "Status quo" }, 26500, 0, null, "#7D8A87"], [{ id: "Perluasan PrEP oral (cakupan 20%)", en: "Oral PrEP scale-up (20% coverage)" }, 23600, 2900, 6897, "#1F4E8C"], [{ id: "LEN terarah (cakupan 10%)", en: "Targeted LEN (10% coverage)" }, 18000, 8500, 588, "#2F7D5B"]];
  document.querySelectorAll('[data-fig="scen"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "inf";
    const draw = e => { const rows = view === "cpi" ? SC.slice(1) : SC;
      C.vbar(e, { aria: { id: "Hasil skenario", en: "Scenario results" }, fmt: view === "cpi" ? (v => "USD " + C.fmt(v)) : (v => C.fmt(v)), axisFmt: v => C.fmt(v),
        groups: rows.map(s => ({ label: s[0], value: view === "inf" ? s[1] : view === "av" ? s[2] : s[3], color: s[4],
          tip: tr("Infeksi baru per tahun: ", "New infections per year: ") + C.fmt(s[1]) + "<br>" + tr("Dicegah: ", "Averted: ") + C.fmt(s[2]) + (s[3] ? "<br>" + tr("Biaya per infeksi dicegah: ", "Cost per infection averted: ") + "USD " + C.fmt(s[3]) : "") })) }); };
    C.mount(el, draw);
    onLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "inf", label: { id: "Infeksi baru", en: "New infections" } }, { v: "av", label: { id: "Infeksi dicegah", en: "Infections averted" } }, { v: "cpi", label: { id: "Biaya per infeksi dicegah", en: "Cost per infection averted" } }], view, v => { view = v; draw(el); }));
  });

  /* willingness to pay */
  const WTP = {
    all: [[{ id: "Mengetahui LEN", en: "Aware of LEN" }, 28.4, 33], [{ id: "Bersedia memakai LEN", en: "Willing to use LEN" }, 50.9, 59], [{ id: "Lebih memilih LEN daripada PrEP oral", en: "Prefer LEN over oral PrEP" }, 45.7, 53],
      [{ id: "Bersedia membayar sampai IDR 100.000", en: "Willing to pay up to IDR 100,000" }, 50.9, 59], [{ id: "Bersedia membayar sekitar IDR 250.000", en: "Willing to pay about IDR 250,000" }, 1.7, 2], [{ id: "Tidak bersedia membayar", en: "Not willing to pay" }, 47.4, 55]],
    aware: [[{ id: "Bersedia memakai LEN", en: "Willing to use LEN" }, 66.7, 22], [{ id: "Lebih memilih LEN daripada PrEP oral", en: "Prefer LEN over oral PrEP" }, 57.6, 19],
      [{ id: "Bersedia membayar sampai IDR 100.000", en: "Willing to pay up to IDR 100,000" }, 51.5, 17], [{ id: "Bersedia membayar sekitar IDR 250.000", en: "Willing to pay about IDR 250,000" }, 6.1, 2], [{ id: "Tidak bersedia membayar", en: "Not willing to pay" }, 42.4, 14]]
  };
  document.querySelectorAll('[data-fig="wtp"]').forEach(el => {
    const box = el.closest(".ifig"); let view = "all";
    const draw = e => C.hbar(e, { aria: { id: "Kaskade keputusan LEN", en: "LEN decision cascade" }, labelW: 290, max: 100, fmt: pct, axisFmt: v => C.fmt(v) + "%",
      items: WTP[view].map((w, i) => ({ label: w[0], value: w[1], color: /Tidak|Not/.test(w[0].id) ? "#B4364A" : /membayar/.test(w[0].id) ? "#E8833A" : "#1F4E8C",
        tip: "n = " + w[2] + tr(view === "all" ? " dari 116 responden" : " dari 33 responden yang mengetahui LEN", view === "all" ? " of 116 respondents" : " of 33 respondents aware of LEN") })) });
    C.mount(el, draw);
    onLang(() => C.toggles(box.querySelector('[data-ctl="view"]'), [{ v: "all", label: { id: "Semua responden (n = 116)", en: "All respondents (n = 116)" } }, { v: "aware", label: { id: "Yang mengetahui LEN (n = 33)", en: "Aware of LEN (n = 33)" } }], view, v => { view = v; draw(el); }));
  });
})();
