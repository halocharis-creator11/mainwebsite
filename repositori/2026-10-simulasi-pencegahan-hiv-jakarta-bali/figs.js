/* Interactive figures: results of the agent-based model (5,000 agents per run; medians and 5th to 95th percentiles). */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const D = {"JKT":{"cur":[[2026,3.397,3.051,3.817],[2027,2.978,2.583,3.475],[2028,3.13,2.349,3.29],[2029,2.712,2.438,2.983],[2030,2.944,2.609,3.16],[2031,3.002,2.283,3.111],[2032,2.887,2.489,3.129]],"cut":[[2026,3.397,3.051,3.817],[2027,3.072,2.815,3.393],[2028,3.077,2.589,3.216],[2029,3.989,2.958,4.162],[2030,2.967,2.481,3.628],[2031,3.361,2.911,3.525],[2032,3.19,2.534,3.596]],"plan":[[2026,3.517,2.812,3.884],[2027,2.971,2.292,3.262],[2028,2.124,1.709,2.506],[2029,1.721,1.471,2.183],[2030,1.447,0.945,1.561],[2031,1.507,1.135,1.812],[2032,1.276,0.943,1.408]],"syn":[1438,1026,846,848,910,812,728,814,840],"prep":{"oral":[208,210,216,210,220,240,244,260,276,278,288,304,328,350,364,368,394,408,436,462,488,508,534,564,570,582,626,656,694,718,732,764,788,812,860,890,910,928,950,974,950,970,992,1030,1040,1070,1084,1092,1110,1136,1134,1118,1134,1150,1132,1166,1170,1190,1188,1208,1182,1184,1206,1214,1228,1238,1252,1260,1274,1256,1254,1280,1272,1272,1290,1298,1316,1306,1310,1320,1328,1340,1328,1330],"len":[0,0,0,0,0,0,0,0,0,0,0,0,6,12,20,28,36,44,48,50,48,48,50,50,82,120,156,196,238,278,292,292,294,288,288,290,288,290,288,292,286,288,286,288,290,290,292,290,284,284,288,284,290,286,290,290,288,290,288,290,290,288,290,288,280,292,292,288,292,288,294,286,286,286,288,290,290,290,288,288,288,288,286,290]}},"BALI":{"cur":[[2026,3.911,3.465,4.116],[2027,3.234,3.01,3.555],[2028,3.155,2.959,3.891],[2029,3.316,2.817,3.707],[2030,3.281,2.685,3.572],[2031,2.96,2.7,3.964],[2032,3.238,2.797,3.574]],"cut":[[2026,3.911,3.465,4.116],[2027,3.231,2.972,3.38],[2028,3.474,2.905,3.61],[2029,3.853,3.154,3.94],[2030,3.869,3.492,4.519],[2031,3.851,3,4.286],[2032,3.569,3.037,3.85]],"plan":[[2026,3.892,3.396,4.277],[2027,2.992,2.239,3.153],[2028,2.524,1.817,2.798],[2029,1.884,1.545,2.39],[2030,1.728,1.482,1.877],[2031,1.639,1.392,2.003],[2032,1.653,1.302,1.792]],"syn":[1538,1144,996,948,1038,992,922,1000,1010],"prep":{"oral":[200,208,214,222,226,232,252,266,294,288,298,310,334,334,356,368,394,398,436,462,476,482,512,556,588,598,622,652,674,682,708,728,742,768,798,824,858,868,880,894,912,918,930,962,986,984,984,996,1018,1048,1068,1076,1082,1068,1090,1118,1142,1154,1148,1152,1138,1148,1152,1184,1186,1206,1226,1230,1214,1218,1240,1232,1220,1232,1236,1260,1258,1250,1250,1258,1248,1242,1256,1252],"len":[0,0,0,0,0,0,0,0,0,0,0,0,8,18,28,38,48,50,48,48,48,48,46,50,100,152,204,258,296,298,282,288,290,284,284,298,286,286,282,284,286,296,292,286,284,284,286,296,292,288,282,284,286,292,292,294,290,284,282,290,292,288,292,288,284,290,292,288,290,286,282,290,290,292,288,290,286,290,288,288,288,288,284,284]}}};
  const CITY = [{ v: "JKT", label: "Jakarta" }, { v: "BALI", label: "Bali" }];
  const S = { city: "JKT", band: "on", city2: "JKT", city3: "JKT" };
  const SER = [["cur", { id: "Dukungan saat ini berlanjut", en: "Current support continues" }, "#7D8A87"],
               ["cut", { id: "Pemotongan tanpa redesain", en: "Cut without redesign" }, "#B4364A"],
               ["plan", { id: "Rencana 2027 sampai 2029 sesuai desain", en: "2027 to 2029 plan as designed" }, "#2F7D5B"]];
  const tr = (id, en) => C.lang() === "en" ? en : id;
  document.querySelectorAll('[data-fig="inc"]').forEach(el => {
    const box = el.closest(".ifig");
    const draw = e => C.line(e, { aria: { id: "Insidens HIV per 100 orang-tahun menurut skenario", en: "HIV incidence per 100 person-years by scenario" },
      series: SER.map(s => ({ name: s[1], color: s[2], data: D[S.city][s[0]], band: S.band === "on" && s[0] !== "cur" })), xDomain: [2026, 2032], dots: true,
      tipFmt: v => C.fmt(v, 2), yFmt: v => C.fmt(v, 0),
      vlines: [{ x: 2027, label: { id: "Rencana dimulai", en: "Plan starts" } }, { x: 2029, label: { id: "Tebing biaya", en: "Cost cliff" } }] });
    const job = C.mount(el, draw);
    const ctl = () => {
      C.toggles(box.querySelector('[data-ctl="city"]'), CITY, S.city, v => { S.city = v; draw(el); });
      C.toggles(box.querySelector('[data-ctl="band"]'), [{ v: "on", label: { id: "Dengan rentang", en: "With range" } }, { v: "off", label: { id: "Median saja", en: "Median only" } }], S.band, v => { S.band = v; draw(el); });
    };
    ctl(); document.addEventListener("charis:lang", ctl);
  });
  const LEV = [{ id: "Pemotongan tanpa redesain", en: "Cut without redesign" }, { id: "Ditambah tes, tes jaringan, dan pengobatan", en: "Plus testing, network testing and treatment" },
    { id: "Ditambah perluasan jangkauan PrEP (6,7 kali)", en: "Plus PrEP reach scale-up (6.7 times)" }, { id: "Ditambah perbaikan retensi", en: "Plus retention improvements" },
    { id: "Ditambah lenacapavir (alokasi acak)", en: "Plus lenacapavir (random allocation)" }, { id: "Ditambah alokasi lenacapavir terarah", en: "Plus targeted lenacapavir allocation" },
    { id: "Ditambah jaring pengaman: rencana penuh", en: "Plus safety net: full plan" }, { id: "Rencana dengan serapan anggaran 50% sejak 2030", en: "Plan with 50% budget absorption from 2030" },
    { id: "Rencana dengan guncangan hukum 30% sejak 2027", en: "Plan with a 30% legal shock from 2027" }];
  const LCOL = ["#B4364A", "#7D8A87", "#2D6A8E", "#2D6A8E", "#6B4E9B", "#6B4E9B", "#2F7D5B", "#D98A96", "#D98A96"];
  document.querySelectorAll('[data-fig="levers"]').forEach(el => {
    const box = el.closest(".ifig");
    const draw = e => { const v = D[S.city2].syn;
      C.hbar(e, { aria: { id: "Infeksi baru 2027 sampai 2032 per 10.000 menurut pengungkit", en: "New infections 2027 to 2032 per 10,000 by lever" }, labelW: 330,
        items: v.map((x, i) => { const d = i === 0 ? null : (i <= 6 ? x - v[i - 1] : x - v[6]);
          return { label: LEV[i], value: x, color: LCOL[i], bold: i === 6, after: d == null ? "" : "(" + (d > 0 ? "+" : "\u2212") + C.fmt(Math.abs(d)) + ")",
            tip: (d == null ? "" : (i <= 6 ? tr("Perubahan dibanding batang sebelumnya: ", "Change from the previous bar: ") : tr("Dibanding rencana penuh: ", "Compared with the full plan: ")) + "<b>" + (d > 0 ? "+" : "\u2212") + C.fmt(Math.abs(d)) + "</b><br>") + tr("Infeksi baru per 10.000: ", "New infections per 10,000: ") + C.fmt(x) }; }) }); };
    C.mount(el, draw);
    const ctl = () => C.toggles(box.querySelector('[data-ctl="city"]'), CITY, S.city2, v => { S.city2 = v; draw(el); });
    ctl(); document.addEventListener("charis:lang", ctl);
  });
  document.querySelectorAll('[data-fig="prep"]').forEach(el => {
    const box = el.closest(".ifig");
    const mon = a => a.map((v, i) => [2026 + i / 12, v]);
    const MON = { id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
    const draw = e => C.line(e, { aria: { id: "Pengguna PrEP per 10.000 dalam rencana", en: "PrEP users per 10,000 under the plan" }, height: 250,
      series: [{ name: { id: "PrEP oral", en: "Oral PrEP" }, color: "#2D6A8E", data: mon(D[S.city3].prep.oral) }, { name: "Lenacapavir", color: "#6B4E9B", data: mon(D[S.city3].prep.len) }],
      xDomain: [2026, 2033], tipFmt: v => C.fmt(v), yFmt: v => C.fmt(v),
      xFmt: x => { const y = Math.floor(x + 1e-6), m = Math.round((x - y) * 12) % 12; return MON[C.lang()][m] + " " + y; },
      vlines: [{ x: 2029, label: { id: "Januari 2029", en: "January 2029" } }] });
    C.mount(el, draw);
    const ctl = () => C.toggles(box.querySelector('[data-ctl="city"]'), CITY, S.city3, v => { S.city3 = v; draw(el); });
    ctl(); document.addEventListener("charis:lang", ctl);
  });
})();
