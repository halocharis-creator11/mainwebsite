/* Model kompartemen deterministik dari presentasi "When the Donor Steps Back"
   (Harjana, 2026, DOI 10.5281/zenodo.23140900, CC BY 4.0). Disalin tanpa perubahan logika;
   hanya dibungkus agar bisa dipakai oleh laboratorium skenario di halaman ini. */
(function (root) {
"use strict";
const CITY = {
  JKT: { name: 'Jakarta', lenPref: 0.384, lenWilling: 0.587, wtpNone: 0.533, sideConcern: 0.489, stigmaConcern: 0.185,
         acceptLimited: 0.793, online: 0.63, condom: 0.597, tgShare: 0.165, unablePayIBBS: 0.406,
         kRandom: 1, kCriteria: 0.739, kML: 0.661, kNetwork: 0.678, capCriteria: 0.304, capML: 0.345, capNetwork: 0.336,
         surveyPrEPNow: 0.575 },
  BALI: { name: 'Bali', lenPref: 0.541, lenWilling: 0.509, wtpNone: 0.474, sideConcern: 0.595, stigmaConcern: 0.190,
          acceptLimited: 0.793, online: 0.624, condom: 0.731, tgShare: 0.086, unablePayIBBS: 0.389,
          kRandom: 1, kCriteria: 0.866, kML: 0.938, kNetwork: 0.698, capCriteria: 0.248, capML: 0.221, capNetwork: 0.325,
          surveyPrEPNow: 0.425 },
  ALL: { name: 'Jakarta & Bali combined', lenPref: 0.467, lenWilling: 0.543, wtpNone: 0.500, sideConcern: 0.548, stigmaConcern: 0.188,
         acceptLimited: 0.793, online: 0.627, condom: 0.669, tgShare: 0.122, unablePayIBBS: 0.397,
         kRandom: 1, kCriteria: 0.900, kML: 0.861, kNetwork: 0.700, capCriteria: 0.235, capML: 0.250, capNetwork: 0.324,
         surveyPrEPNow: 0.492 }
};

const START = 2026, END = 2032, MONTHS = (END - START + 1) * 12;

function defaults(cityKey) {
  const c = CITY[cityKey];
  return {
    city: cityKey,
    // epidemiology (global assumptions)
    inc0: 3.5,          // HIV incidence per 100 PY among HIV-negative MSM/TGW in 2026 (assumption; cohort reference 7.24)
    prev0: 0.244,       // HIV prevalence 2026 (IBBS 2023 MSM national)
    diag0: 0.67,        // share of PLHIV diagnosed (Spectrum/AEM: 372k of 556k)
    supp0: 0.40,        // share of PLHIV virally suppressed (ART 48% x ~0.83)
    wD: 0.8,            // infectiousness of diagnosed-not-suppressed relative to undiagnosed
    mu: 1 / (15 * 12),  // exit from the sexually active population (15-year span)
    hivMort: 0.002,     // extra monthly mortality, unsuppressed PLHIV
    condEff: 0.7,       // reduction in transmission with condom use at the population level
    condom0: c.condom,  // condom use at last sex (survey)
    // PrEP
    cov0: 0.03,         // share of HIV-negative on oral PrEP in 2026 (assumption; survey value is programme-biased)
    effO: 0.80,         // protection among persisting oral PrEP users
    effL: 0.96,         // protection with lenacapavir
    r3base: 0.41,       // 3-month oral PrEP retention, MSM (programme data)
    r3plan: 0.55,       // plan aspiration with decentralised refill and peer support (assumption)
    dLong: 0.03,        // monthly discontinuation after month 3
    lenRetInj: 0.80,    // retention at each 6-monthly LEN injection (assumption)
    reachTarget: 6.7,   // PrEP reach 2029 vs 2025 (303,963 / 45,289)
    k: c.kRandom,       // targeting curvature for lenacapavir allocation (1 = random)
    // LEN
    lenOn: true, lenPilotYear: 2027, lenScaleYear: 2028, lenPilotCap: 50, lenCap: 10000, lenShare: c.lenPref,
    lenOOPYear: 0,      // year LEN becomes out-of-pocket (0 = never within horizon)
    // out-of-pocket cliff
    oopOn: true, oopYear: 2029, unablePay: c.unablePayIBBS, safetyNet: 1.0, condomDrop: 0.3, switchToLEN: c.lenPref,
    // testing and treatment
    T0: 0.44, Tplan: 0.70, relU: 0.35, Tfac: 0.25, sns0: 0.20, snsPlan: 0.40, snsYield: 2.9,
    art0: 0.030, artPlan: 0.080, vLoss: 0.012,
    caseload0: 258, caseload: 300, caseQ: 0.10,
    // stress tests
    absorption: 1.0, absorbYear: 2030, shock: 0, shockYear: 2027, online: c.online,
    cut: 1.0,           // 1 = no cut; 0.56 = 44% cut applied to programme-dependent activities from 2027
    plan: true          // true = 2027–2029 plan schedule; false = 2026 levels continue
  };
}

const ramp = (y, a, b, y0, y1) => y <= y0 ? a : (y >= y1 ? b : a + (b - a) * (y - y0) / (y1 - y0));

function run(P, opt = {}) {
  const N = 10000, cap = x => Math.pow(Math.max(0, Math.min(1, x)), P.k);
  // initial state at steady state of baseline PrEP
  const plhiv = P.prev0 * N, neg = N - plhiv;
  const effMonths = 3 + P.r3base / P.dLong;
  const Ssum0 = neg, S0 = neg * (1 - P.cov0);
  const In0 = P.cov0 * Ssum0 / effMonths;           // monthly initiations at baseline
  const e0 = In0 / S0;
  let s = { S: S0, On: In0 * 3, Ol: In0 * P.r3base / P.dLong, L: 0,
            U: plhiv * (1 - P.diag0), V: plhiv * P.supp0, D: plhiv * (P.diag0 - P.supp0) };
  const P0 = P.effO * P.cov0;
  const lamRaw = P.inc0 / 100 / 12 / (1 - P0);
  const I0 = (s.U + P.wD * s.D) / N, Cf0 = 1 - P.condom0 * P.condEff;
  const reach2025 = (s.On + s.Ol) + 12 * In0;
  const em = opt.enrolMult || 1;
  const out = { month: [], inc: [], newInf: [], oral: [], len: [], diag: [], supp: [], prev: [], reach: {}, years: {} };
  let condom = P.condom0, cliffDone = false;
  for (let m = 0; m < MONTHS; m++) {
    const t = START + m / 12, y = Math.floor(t);
    const post = y >= P.absorbYear ? P.absorption : 1;           // domestic absorption of programme increments
    const shockM = (P.shock > 0 && y >= P.shockYear) ? (1 - P.shock * P.online) : 1;
    const cutM = y >= 2027 ? P.cut : 1;
    const caseL = P.plan ? ramp(t, P.caseload0, P.caseload, 2026, 2027) : P.caseload0;
    const reachM = Math.pow(caseL / P.caseload0, 0.7), qual = 1 - P.caseQ * Math.max(0, caseL - 250) / 100;
    // schedules
    let eM;
    if (P.plan) eM = (e0 + (e0 * ramp(t, 1, em, 2026, 2029) - e0) * cutM * post * reachM) * shockM;
    else eM = e0 * Math.min(1, cutM * shockM);
    let r3 = P.plan ? P.r3base + (ramp(t, P.r3base, P.r3plan, 2026, 2028) - P.r3base) * post : P.r3base;
    if (!P.plan && P.cut < 1 && y >= 2027) r3 = P.r3base * (0.85 + 0.15 * P.cut);     // less retention support after cuts
    r3 *= qual * (1 - 0.5 * (P.shock > 0 && y >= P.shockYear ? P.shock * P.online : 0));
    const lenQual = qual;
    const T = P.plan ? P.Tfac + (ramp(t, P.T0, P.Tplan, 2026, 2029) - P.Tfac) * cutM * post * shockM * Math.min(reachM, 1.4)
                     : P.Tfac + (P.T0 - P.Tfac) * Math.min(1, cutM * shockM);
    const sns = P.plan ? P.sns0 + (ramp(t, P.sns0, P.snsPlan, 2026, 2029) - P.sns0) * post : P.sns0 * (y >= 2027 ? P.cut : 1);
    const E = 1 + sns * (P.snsYield - 1);
    const hDiag = -Math.log(1 - Math.min(0.95, T * E * P.relU)) / 12;
    const art = P.plan ? ramp(t, P.art0, P.artPlan, 2026, 2029) : P.art0;
    // LEN availability
    let lenAvail = 0;
    if (P.plan && P.lenOn) {
      if (t >= P.lenScaleYear) lenAvail = 2; else if (t >= P.lenPilotYear) lenAvail = 1;
    }
    const lenCapNow = lenAvail === 2 ? P.lenCap : (lenAvail === 1 ? P.lenPilotCap : 0);
    // out-of-pocket cliff (one-time at oopYear Jan)
    const oopActive = P.oopOn && P.plan && t >= P.oopYear;
    const sNet = P.safetyNet * post;
    const losePay = oopActive ? P.unablePay * (1 - sNet) : 0;
    if (oopActive && !cliffDone) {
      const drop = (s.On + s.Ol) * P.unablePay * (1 - sNet);
      let sw = lenAvail ? drop * P.switchToLEN : 0;
      sw = Math.max(0, Math.min(sw, lenCapNow - s.L));
      const fO = (s.On + s.Ol) > 0 ? s.On / (s.On + s.Ol) : 0;
      s.On -= drop * fO; s.Ol -= drop * (1 - fO); s.L += sw; s.S += drop - sw;
      condom = P.condom0 * (1 - P.unablePay * (1 - sNet) * P.condomDrop);
      cliffDone = true;
    }
    if (!P.plan && P.oopOn && P.cut < 1 && t >= P.oopYear && !cliffDone) {   // cut scenario: cliff without safety net or LEN
      const drop = (s.On + s.Ol) * P.unablePay; const fO = s.On / Math.max(1e-9, s.On + s.Ol);
      s.On -= drop * fO; s.Ol -= drop * (1 - fO); s.S += drop;
      condom = P.condom0 * (1 - P.unablePay * P.condomDrop); cliffDone = true;
    }
    // LEN out-of-pocket (optional)
    let lenWTP = 1;
    if (P.lenOOPYear && y >= P.lenOOPYear) lenWTP = 1 - CITY[P.city].wtpNone * (1 - sNet);
    // force of infection
    const Ntot = s.S + s.On + s.Ol + s.L + s.U + s.D + s.V;
    const Ssum = s.S + s.On + s.Ol + s.L;
    const cL = s.L / Ssum, cO = (s.On + s.Ol) / Ssum;
    const I = (s.U + P.wD * s.D) / Ntot, Cf = 1 - condom * P.condEff;
    const lam = lamRaw * (I / I0) * (Cf / Cf0);
    const capL = cap(cL), oShare = cL < 1 ? cO / (1 - cL) : 0;   // LEN allocated by strategy; oral users random among the rest
    const infL = lam * Ssum * capL * (1 - P.effL);
    const infO = lam * Ssum * (1 - capL) * oShare * (1 - P.effO);
    const infS = lam * Ssum * (1 - capL) * (1 - oShare);
    const fOn = (s.On + s.Ol) > 0 ? s.On / (s.On + s.Ol) : 0;
    // initiations
    let ini = eM * s.S;
    let iniL = 0;
    if (lenAvail) {
      iniL = ini * P.lenShare * lenWTP * (lenAvail === 1 ? 0.3 : 1);
      iniL = Math.max(0, Math.min(iniL, lenCapNow - s.L));
    }
    let iniO = (ini - iniL) * (1 - losePay);
    if (lenAvail === 2 && P.lenOnlyAfterOOP && oopActive) iniO = 0;
    // flows
    const onOut = s.On / 3;
    const hL = (1 - Math.pow(P.lenRetInj * lenQual * lenWTP, 1 / 6));
    const d = {
      S: P.mu * Ntot - P.mu * s.S - infS - iniO - iniL + onOut * (1 - r3) + s.Ol * P.dLong + s.L * hL,
      On: iniO - onOut - infO * fOn - P.mu * s.On,
      Ol: onOut * r3 - s.Ol * P.dLong - infO * (1 - fOn) - P.mu * s.Ol,
      L: iniL - s.L * hL - infL - P.mu * s.L,
      U: infS + infO + infL - s.U * hDiag - (P.mu + P.hivMort) * s.U,
      D: s.U * hDiag - s.D * art + s.V * P.vLoss - (P.mu + P.hivMort) * s.D,
      V: s.D * art - s.V * P.vLoss - P.mu * s.V
    };
    // add back deaths to S to keep N constant
    d.S += P.hivMort * (s.U + s.D);
    for (const k in d) s[k] = Math.max(0, s[k] + d[k]);
    const newInf = infS + infO + infL;
    const yr = out.years[y] = out.years[y] || { newInf: 0, pySus: 0, oralPY: 0, lenPY: 0, ini: 0, startUsers: null, end: null };
    if (yr.startUsers === null) yr.startUsers = s.On + s.Ol + s.L;
    yr.newInf += newInf; yr.pySus += Ssum / 12; yr.oralPY += (s.On + s.Ol) / 12; yr.lenPY += s.L / 12; yr.ini += iniO + iniL;
    const pl = s.U + s.D + s.V;
    yr.end = { diag: (s.D + s.V) / pl, supp: s.V / pl, prev: pl / Ntot, oral: s.On + s.Ol, len: s.L, onPrEP: (s.On + s.Ol + s.L), safetyNeed: (s.On + s.Ol) * P.unablePay };
    out.month.push(t); out.newInf.push(newInf); out.oral.push(s.On + s.Ol); out.len.push(s.L);
    out.diag.push((s.D + s.V) / pl); out.supp.push(s.V / pl); out.prev.push(pl / Ntot);
  }
  out.yearList = Object.keys(out.years).map(Number);
  out.yearList.forEach(y => { const r = out.years[y]; r.incidence = 100 * r.newInf / r.pySus; r.reach = r.startUsers + r.ini; r.reachRatio = r.reach / reach2025; });
  out.cum = (a, b) => out.yearList.filter(y => y >= a && y <= b).reduce((t, y) => t + out.years[y].newInf, 0);
  out.reach2025 = reach2025;
  return out;
}

/* solve the enrolment multiplier that achieves the PrEP reach target in 2029 */
function solveEnrol(P) {
  if (!P.plan) return 1;
  const f = m => run(P, { enrolMult: m }).years[2029].reachRatio;
  let lo = 1, hi = 40;
  if (f(hi) < P.reachTarget) return hi;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (f(mid) < P.reachTarget) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function runPlan(P, opt = {}) {
  const m = opt.enrolMult ?? solveEnrol(P);
  const r = run(P, { enrolMult: m }); r.enrolMult = m; r.reachMet = m < 39.9; return r;
}

/* scenario builders */
function scenario(name, base) {
  const P = Object.assign({}, base);
  if (name === 'current') { P.plan = false; P.cut = 1; P.oopOn = false; P.lenOn = false; }
  if (name === 'cut') { P.plan = false; P.cut = 0.56; P.oopOn = true; P.lenOn = false; }
  if (name === 'plan') { P.plan = true; }
  return P;
}
root.CharisHIVModel = { CITY, defaults, run, runPlan, solveEnrol, scenario, START, END, MONTHS };
})(window);
