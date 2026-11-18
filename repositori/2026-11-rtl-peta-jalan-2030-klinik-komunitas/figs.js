/* Interactive figures for the CBC working paper. Data: clinic presentations (anonymised). */
(function () {
  "use strict";
  const C = window.CharisCharts; if (!C) return;
  const KEYS = [
    { label: { id: "Donor", en: "Donor" }, color: "#E8833A" },
    { label: { id: "JKN", en: "JKN" }, color: "#0E5A55" },
    { label: { id: "APBD/kontrak daerah", en: "Local budget or contract" }, color: "#4E8782" },
    { label: { id: "Layanan, filantropi, lainnya", en: "Fees, philanthropy, other" }, color: "#A9C6C3", text: "#142826" }
  ];
  const MIX = [
    { name: "CBC A", v: [[48, 0.3, 0, 52.7], [0, 10, 10, 80]] },
    { name: "CBC B", v: [[99, 0, 0, 0], [5, 30, 40, 25]], tips: [{ id: "kini sekitar 99% donor", en: "now about 99% donor" }, { id: "titik tengah rentang target", en: "midpoint of target range" }] },
    { name: "CBC C", v: [[40, 0, 10, 50], [0, 0, 10, 90]] },
    { name: "CBC D", v: [[50, 0, 0, 50], [0, 0, 0, 100]] },
    { name: "CBC E", v: [[80, 0, 0, 20], [20, 60, 10, 10]] },
    { name: "CBC F", v: [[30, 0, 0, 70], [15, 0, 15, 70]] },
    { name: "CBC G", v: [null, null], note: { id: "data tidak lengkap", en: "incomplete data" } }
  ];
  const THEMES = [
    [{ id: "Izin klinik atau perpanjangan", en: "Clinic licence or renewal" }, "1101101"], [{ id: "Akreditasi", en: "Accreditation" }, "0101101"],
    [{ id: "Kerja sama atau peningkatan JKN", en: "JKN contract or increase" }, "1100111"], [{ id: "Swakelola atau dana daerah", en: "Social contracting or local funds" }, "1110111"],
    [{ id: "Tarif, prabayar, subsidi silang", en: "Fees, prepayment, cross-subsidy" }, "1011101"], [{ id: "Layanan baru", en: "New services" }, "1011111"],
    [{ id: "CSR atau filantropi", en: "CSR or philanthropy" }, "0010111"], [{ id: "Pemetaan biaya dan rencana bisnis", en: "Costing and business plan" }, "1110011"],
    [{ id: "Penguatan SDM dan pendamping", en: "Staff and peer support" }, "1001011"]
  ];
  const GAP = [
    [{ id: "Kerja sama atau kredensialing JKN", en: "JKN contract or credentialing" }, 5, 0], [{ id: "Swakelola atau dana daerah", en: "Social contracting or local funds" }, 6, 2],
    [{ id: "Izin dan akreditasi", en: "Licence and accreditation" }, 5, 3], [{ id: "Pemetaan biaya dan tarif", en: "Costing and fees" }, 5, 3],
    [{ id: "Layanan baru", en: "New services" }, 6, 1], [{ id: "CSR atau filantropi", en: "CSR or philanthropy" }, 4, 1], [{ id: "SDM dan pendamping", en: "Staff and peer support" }, 4, 1]
  ];
  document.querySelectorAll('[data-fig="mix"]').forEach(el => C.mount(el, e => C.stack2(e, {
    aria: { id: "Komposisi sumber dana saat ini dan target 2030 per klinik", en: "Current funding mix and 2030 target by clinic" },
    periods: [{ id: "Saat ini (2026)", en: "Current (2026)" }, { id: "Target akhir 2030", en: "Target, end of 2030" }], keys: KEYS, rows: MIX })));
  document.querySelectorAll('[data-fig="themes"]').forEach(el => C.mount(el, e => C.matrix(e, {
    aria: { id: "Tema peta jalan 2027 sampai 2030 per klinik", en: "Roadmap themes 2027 to 2030 by clinic" },
    cols: ["A", "B", "C", "D", "E", "F", "G"].map(c => "CBC " + c).map(c => c.replace("CBC ", "")),
    rows: THEMES.map(t => ({ label: t[0], m: t[1] })), yes: { id: "disebut", en: "named" }, no: { id: "tidak disebut", en: "not named" } })));
  document.querySelectorAll('[data-fig="gap"]').forEach(el => C.mount(el, e => C.dumbbell(e, {
    aria: { id: "Jumlah klinik yang menyebut tema dalam peta jalan dan dalam RTL", en: "Clinics naming each theme in the roadmap and in the action plan" },
    max: 7, colors: ["#0E5A55", "#E8833A"],
    names: [{ id: "Disebut dalam peta jalan 2027 sampai 2030", en: "Named in the 2027 to 2030 roadmap" }, { id: "Ada kegiatan di RTL Desember 2026 sampai Februari 2027", en: "Activity in the December 2026 to February 2027 action plan" }],
    axis: { id: "jumlah klinik (dari 7)", en: "number of clinics (of 7)" }, gapText: { id: "Selisih", en: "Gap" },
    rows: GAP.map(g => ({ label: g[0], a: g[1], b: g[2] })) })));
})();
