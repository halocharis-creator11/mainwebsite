/* Dua dunia: animasi agen yang disederhanakan.
   Dua populasi sintetis memakai jaringan dan peristiwa acak yang sama sehingga identik sampai Desember 2028.
   Pada Januari 2029 PrEP oral menjadi berbayar: dunia kiri memiliki jaring pengaman penuh, dunia kanan tidak.
   Aturan dan peluang disederhanakan untuk visualisasi; angka resmi ada pada model utama. */
(function () {
  "use strict";
  const root = document.getElementById("worlds");
  if (!root) return;
  const $ = id => document.getElementById(id);
  const NF = new Intl.NumberFormat("id-ID");
  const MON = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const CITY = {
    JKT: { prev: 0.244, condom: 0.597, unable: 0.406, pMain: 0.285 },
    BALI: { prev: 0.244, condom: 0.731, unable: 0.389, pMain: 0.237 }
  };
  const COL = { S: "#AEB8B4", O: "#2D6A8E", L: "#6B4E9B", U: "#B4364A", D: "#B7791A", V: "#2F7D5B" };
  const N = 220, MONTHS = 84, CLIFF = 36;
  const opt = { city: "JKT", r3: 0.55, len: true, speed: 1, seed: 7 };

  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ramp = (t, a, b, y0, y1) => t <= y0 ? a : t >= y1 ? b : a + (b - a) * (t - y0) / (y1 - y0);

  /* ---------- one world ---------- */
  function makeWorld(seed, net) {
    const R = rng(seed), c = CITY[opt.city];
    const nrm = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
    const A = [], cols = 20, rows = 11;
    for (let i = 0; i < N; i++) {
      const gx = i % cols, gy = Math.floor(i / cols);
      const z = nrm();
      A.push({ x: (gx + 0.5 + (R() - 0.5) * 0.7) / cols, y: (gy + 0.5 + (R() - 0.5) * 0.7) / rows, ph: R() * 6.28,
        z, w: Math.exp(0.5 * z), hiv: 0, prep: 0, prepM: -99, lenNext: 0, canPay: 1, covered: 1,
        cond: Math.min(0.95, Math.max(0.05, c.condom + 0.2 * nrm() - 0.08 * z)), wantMain: R() < c.pMain, main: -1, cas: 0, pulse: 0, nb: [] });
    }
    A.forEach((a, i) => { a.nb = A.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 * 3]).filter(p => p[0] !== i).sort((p, q) => p[1] - q[1]).slice(0, 9).map(p => p[0]); });
    const wsum = A.reduce((s, a) => s + Math.exp(0.6 * a.z), 0);
    A.forEach(a => { if (R() < Math.min(0.9, c.prev * N * Math.exp(0.6 * a.z) / wsum)) { const u = R(); a.hiv = u < 0.4 ? 3 : u < 0.67 ? 2 : 1; } });
    A.map((a, i) => [R() + (a.z < -0.3 ? 0.4 : 0), i]).sort((p, q) => q[0] - p[0]).slice(0, Math.round(c.unable * N)).forEach(([, i]) => A[i].canPay = 0);
    A.forEach(a => { if (!a.hiv && R() < 0.04 * a.w) { a.prep = 1; a.prepM = -6; } });
    return { A, R, net, seed, main: [], cas: [], one: [], m: 0, newInf: 0, infPost: 0, lost: 0, done: false };
  }

  /* keyed random numbers: the same event (agent, month, purpose) draws the same number in both worlds,
     so the networks and chance events are identical and only the safety net differs */
  function U(seed, a, b, c) {
    let h = Math.imul(seed ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(a + 1, 0xC2B2AE35) ^ Math.imul(b + 7, 0x27D4EB2F) ^ Math.imul(c + 13, 0x165667B1);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function step(W) {
    const { A } = W, m = W.m, t = 2026 + m / 12, sd = W.seed;
    const u = (i, k) => U(sd, i, m, k), up = (i, j, k) => U(sd, Math.min(i, j) * 1000 + Math.max(i, j), m, k);
    // partnerships (independent of HIV status, so identical in both worlds)
    W.main = W.main.filter(p => { if (up(p[0], p[1], 20) < 1 / 18) { A[p[0]].main = -1; A[p[1]].main = -1; return false; } return true; });
    W.cas = W.cas.filter(p => { if (up(p[0], p[1], 21) < 1 / 4) { A[p[0]].cas--; A[p[1]].cas--; return false; } return true; });
    A.forEach((a, i) => {
      if (a.wantMain && a.main < 0) { const j = a.nb[Math.floor(u(i, 2) * a.nb.length)], b = A[j]; if (b.wantMain && b.main < 0) { W.main.push([i, j]); a.main = j; b.main = i; } }
      if (a.cas < 2 && u(i, 3) < 0.07 * a.w) { const j = a.nb[Math.floor(u(i, 4) * a.nb.length)]; if (A[j].cas < 2) { W.cas.push([i, j]); a.cas++; A[j].cas++; } }
    });
    W.one = [];
    A.forEach((a, i) => { if (u(i, 5) < 0.06 * a.w) W.one.push([i, a.nb[Math.floor(u(i, 6) * a.nb.length)]]); });
    // cliff in January 2029
    if (m === CLIFF) A.forEach((a, i) => { if (!a.canPay) { a.covered = W.net ? 1 : 0; if (!a.covered) { if (a.prep === 1) { a.prep = 0; W.lost++; } if (u(i, 40) < 0.3) a.cond *= 0.3; } } });
    // transmission
    const infl = a => a.hiv === 1 ? 1 : a.hiv === 2 ? 0.8 : 0;
    const prot = a => a.prep === 1 ? 0.8 : a.prep === 2 ? 0.96 : 0;
    const hit = new Set();
    const pair = (i, j, base, k) => {
      const a = A[i], b = A[j]; let s, d;
      if (a.hiv && !b.hiv) { s = a; d = b; } else if (b.hiv && !a.hiv) { s = b; d = a; } else return;
      const p = base * infl(s) * (1 - (s.cond + d.cond) / 2 * 0.7) * (1 - prot(d));
      if (up(i, j, k) < p) hit.add(d === a ? i : j);
    };
    W.main.forEach(p => pair(p[0], p[1], 0.10, 30)); W.cas.forEach(p => pair(p[0], p[1], 0.05, 31)); W.one.forEach(p => pair(p[0], p[1], 0.03, 32));
    hit.forEach(i => { const a = A[i]; a.hiv = 1; a.prep = 0; a.pulse = 1; W.newInf++; if (m >= CLIFF) W.infPost++; });
    // cascade and PrEP
    const start = ramp(t, 0.006, 0.045, 2027, 2029), test = ramp(t, 0.03, 0.05, 2027, 2029), lenOn = opt.len && t >= 2028;
    A.forEach((a, i) => {
      if (a.hiv === 1) { if (u(i, 7) < test) a.hiv = 2; return; }
      if (a.hiv === 2) { if (u(i, 8) < 0.05) a.hiv = 3; return; }
      if (a.hiv === 3) return;
      if (a.prep === 1) { const d = m - a.prepM; if ((d === 3 && u(i, 9) > opt.r3) || (d > 3 && u(i, 9) < 0.025)) a.prep = 0; }
      else if (a.prep === 2) { if (m >= a.lenNext) { if (u(i, 12) < 0.8) a.lenNext = m + 6; else a.prep = 0; } }
      else if (u(i, 10) < start * a.w) {
        const blocked = m >= CLIFF && !a.canPay && !a.covered;
        if (lenOn && u(i, 11) < 0.3) { a.prep = 2; a.prepM = m; a.lenNext = m + 6; }
        else if (!blocked) { a.prep = 1; a.prepM = m; }
      }
    });
    W.m++; if (W.m >= MONTHS) W.done = true;
  }

  /* ---------- drawing ---------- */
  const views = [...root.querySelectorAll("canvas")].map(cv => ({ cv, ctx: cv.getContext("2d") }));
  function size() { views.forEach(v => { const r = v.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; v.cv.width = Math.round(r.width * d); v.cv.height = Math.round(r.height * d); v.d = d; v.w = r.width; v.h = r.height; }); }
  function draw(W, v, time) {
    const { ctx, w, h, d } = v; if (!w) return;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    const px = a => 14 + a.x * (w - 28) + Math.sin(time / 1300 + a.ph) * 1.6, py = a => 12 + a.y * (h - 24) + Math.cos(time / 1500 + a.ph) * 1.6;
    const line = (p, color, lw, dash) => { const a = W.A[p[0]], b = W.A[p[1]]; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke(); };
    W.one.forEach(p => line(p, "rgba(217,164,65,.75)", 1, [3, 3]));
    W.cas.forEach(p => line(p, "rgba(110,156,153,.7)", 1.2));
    W.main.forEach(p => line(p, "rgba(14,90,85,.85)", 2.2));
    ctx.setLineDash([]);
    W.A.forEach(a => {
      const st = a.hiv ? "XUDV"[a.hiv] : "SOL"[a.prep], x = px(a), y = py(a), r = a.hiv === 1 || a.prep === 2 ? 4.6 : 4;
      if (a.pulse > 0) { ctx.strokeStyle = `rgba(180,54,74,${a.pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + (1 - a.pulse) * 16, 0, 6.283); ctx.stroke(); }
      ctx.fillStyle = COL[st]; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      if (!a.canPay && W.m > CLIFF && !a.covered && !a.hiv) { ctx.strokeStyle = "#1E2D2F"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.283); ctx.stroke(); }
    });
  }

  /* ---------- loop ---------- */
  let worlds, playing = false, acc = 0, last = 0, raf = 0;
  function reset() {
    worlds = [makeWorld(opt.seed, true), makeWorld(opt.seed, false)];
    acc = 0; render(performance.now()); stats();
  }
  function stats() {
    const [a, b] = worlds, m = a.m;
    const mo = Math.min(m, MONTHS - 1), yr = 2026 + Math.floor(mo / 12);
    $("w_now").textContent = MON[mo % 12] + " " + yr;
    $("w_fill").style.width = (m / MONTHS * 100) + "%";
    worlds.forEach((W, k) => {
      const onPrEP = W.A.filter(x => !x.hiv && x.prep).length;
      $("w" + k + "_tot").textContent = NF.format(W.newInf);
      $("w" + k + "_post").textContent = NF.format(W.infPost);
      $("w" + k + "_prep").textContent = NF.format(onPrEP);
    });
    $("w_phase").textContent = m < 12 ? "Dukungan 2026 berlanjut" : m < CLIFF ? "Rencana 2027 sampai 2029 berjalan: PrEP diperluas" + (opt.len && m >= 24 ? ", lenacapavir tersedia" : "") : "PrEP oral kini berbayar";
    if (a.done) {
      const d = b.infPost - a.infPost, exp = opt.city === "JKT" ? 126 : 72;
      $("w_sum").innerHTML = `Selesai. Pada Januari 2029, <b>${NF.format(b.lost)}</b> orang di dunia kanan kehilangan PrEP oral karena tidak mampu membayar. Sejak saat itu terjadi <b>${NF.format(a.infPost)}</b> infeksi baru di dunia dengan jaring pengaman dan <b>${NF.format(b.infPost)}</b> di dunia tanpa jaring pengaman` +
        (d > 0 ? `, selisih ${NF.format(d)} infeksi.` : ". Kali ini tidak ada selisih, karena tidak seorang pun dari mereka yang kehilangan PrEP bertemu pasangan yang menularkan.") +
        ` Kedua dunia memakai jaringan dan peristiwa acak yang sama, sehingga selisih berasal dari jaring pengaman. Pada model utama, selisih rata-rata di ${opt.city === "JKT" ? "Jakarta" : "Bali"} sekitar ${NF.format(exp)} infeksi per 10.000 orang, atau sekitar ${NF.format(Math.round(exp * N / 1000) / 10)} per ${N} orang, sehingga satu jalan kecil seperti ini wajar menunjukkan selisih nol sampai beberapa infeksi.`;
      setPlaying(false);
    } else $("w_sum").textContent = "";
  }
  function render(time) { worlds.forEach((W, k) => draw(W, views[k], time)); }
  function frame(time) {
    const dt = Math.min(100, time - (last || time)); last = time;
    if (playing) {
      acc += dt * opt.speed;
      while (acc >= 420 && !worlds[0].done) { acc -= 420; worlds.forEach(step); stats(); }
    }
    worlds.forEach(W => W.A.forEach(a => { if (a.pulse > 0) a.pulse = Math.max(0, a.pulse - dt / 1400); }));
    render(time);
    raf = requestAnimationFrame(frame);
  }
  function setPlaying(p) { playing = p; $("w_play").textContent = p ? "Jeda" : (worlds[0].done ? "Putar ulang" : "Putar"); $("w_play").setAttribute("aria-pressed", String(p)); }

  $("w_play").addEventListener("click", () => { if (worlds[0].done) reset(); setPlaying(!playing); });
  $("w_new").addEventListener("click", () => { opt.seed = Math.floor(Math.random() * 1e6); reset(); setPlaying(true); });
  root.querySelectorAll("[data-wcity]").forEach(b => b.addEventListener("click", () => { opt.city = b.dataset.wcity; root.querySelectorAll("[data-wcity]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); reset(); }));
  root.querySelectorAll("[data-speed]").forEach(b => b.addEventListener("click", () => { opt.speed = +b.dataset.speed; root.querySelectorAll("[data-speed]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));
  $("w_r3").addEventListener("input", e => { opt.r3 = +e.target.value; $("w_r3_o").textContent = Math.round(opt.r3 * 100) + "%"; });
  $("w_len").addEventListener("change", e => { opt.len = e.target.checked; });

  size(); reset();
  window.addEventListener("resize", () => { size(); render(performance.now()); });
  raf = requestAnimationFrame(frame);
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !worlds[0].m) { setPlaying(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(root);
  }
})();
