/* Two interactive tools for the lenacapavir investment case.
   1. Investment case calculator: static annual cohort model.
      averted = baseline infections x share of infections reached x effectiveness
      share reached = coverage (random allocation) or coverage ^ k (risk targeting), with k set so the top 10% hold the chosen share of infections
      programme cost = population at risk x coverage x cost per person; net benefit = averted x lifetime ART cost - programme cost
   2. Out-of-pocket financing explorer: willingness-to-pay segments, price tiers and three financing policies. */
(function () {
  "use strict";
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const nf = d => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const f0 = v => nf(0).format(Math.round(v)), f1 = v => nf(1).format(v), f2 = v => nf(2).format(v);
  const usd = v => "USD " + f0(v), usdM = v => "USD " + f1(v / 1e6) + tr(" juta", " million");
  const sgnM = v => (v >= 0 ? "+" : "−") + "USD " + f1(Math.abs(v) / 1e6) + tr(" juta", " million");
  const $ = id => document.getElementById(id);
  const tipEl = () => document.querySelector(".ifig-tip");
  const tip = (e, html) => { const t = tipEl(); if (!t) return; t.innerHTML = html; t.style.opacity = 1; const w = t.offsetWidth; t.style.left = Math.min(e.clientX + 14, innerWidth - w - 8) + "px"; t.style.top = (e.clientY + 14) + "px"; };
  const untip = () => { const t = tipEl(); if (t) t.style.opacity = 0; };

  /* ===================== 1. investment case calculator ===================== */
  const calc = $("lencalc");
  if (calc) {
    const DEF = { inf0: 26500, pop: 1e6, oralCov: 0.20, oralEff: 0.55, lenCov: 0.10, lenEff: 0.92, share10: 0.35, target: "risk", pLen: 50, pOral: 100, art: 3000 };
    const S = Object.assign({}, DEF);
    const R = [
      ["lc_inf0", "inf0", v => f0(v)], ["lc_oralCov", "oralCov", v => f0(v * 100) + "%"], ["lc_oralEff", "oralEff", v => f0(v * 100) + "%"],
      ["lc_lenCov", "lenCov", v => f0(v * 100) + "%"], ["lc_lenEff", "lenEff", v => f0(v * 100) + "%"], ["lc_share10", "share10", v => f0(v * 100) + "%"],
      ["lc_pLen", "pLen", v => usd(v)], ["lc_pOral", "pOral", v => usd(v)], ["lc_art", "art", v => usd(v)]
    ];
    const reach = (c, P) => P.target === "risk" ? Math.min(1, Math.pow(c, Math.log(P.share10) / Math.log(0.1))) : c;
    const model = P => {
      const aO = P.inf0 * P.oralCov * P.oralEff, aL = P.inf0 * reach(P.lenCov, P) * P.lenEff;
      const cO = P.pop * P.oralCov * P.pOral, cL = P.pop * P.lenCov * P.pLen;
      return { aO, aL, cO, cL, iO: P.inf0 - aO, iL: P.inf0 - aL, cpiO: cO / Math.max(1, aO), cpiL: cL / Math.max(1, aL), nbO: aO * P.art - cO, nbL: aL * P.art - cL };
    };
    function sync() {
      R.forEach(([id, k, f]) => { $(id).value = S[k]; $(id + "_o").textContent = f(+S[k]); });
      calc.querySelectorAll("[data-target]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.target === S.target)));
      $("lc_share10").disabled = S.target !== "risk";
    }
    R.forEach(([id, k, f]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; $(id + "_o").textContent = f(S[k]); draw(); }));
    calc.querySelectorAll("[data-target]").forEach(b => b.addEventListener("click", () => { S.target = b.dataset.target; sync(); draw(); }));
    $("lc_reset").addEventListener("click", () => { Object.assign(S, DEF); sync(); draw(); });

    function bars(el, m) {
      const W = Math.max(300, el.clientWidth), H = 250, mg = { l: 54, r: 10, t: 24, b: 44 };
      const G = [[tr("Status quo", "Status quo"), S.inf0, "#7D8A87", 0, 0], [tr("Perluasan PrEP oral", "Oral PrEP scale-up"), m.iO, "#1F4E8C", m.aO, m.cO], [tr("LEN terarah", "Targeted LEN"), m.iL, "#2F7D5B", m.aL, m.cL]];
      const max = S.inf0 * 1.15, Y = v => H - mg.b - v / max * (H - mg.t - mg.b), bw = (W - mg.l - mg.r) / 3;
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("Infeksi baru per tahun menurut skenario", "New infections per year by scenario")}">`;
      for (let v = 0; v <= max; v += 10000) s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E1E8E6"/><text x="${mg.l - 7}" y="${Y(v) + 4}" text-anchor="end">${f0(v)}</text>`;
      s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(S.inf0)}" y2="${Y(S.inf0)}" stroke="#142826" stroke-dasharray="3 3" opacity=".5"/>`;
      G.forEach((g, i) => {
        const x = mg.l + i * bw + bw * 0.2, w = bw * 0.6;
        s += `<rect class="bar" data-i="${i}" x="${x}" y="${Y(g[1])}" width="${w}" height="${H - mg.b - Y(g[1])}" rx="3" fill="${g[2]}"/>`;
        if (i) s += `<rect x="${x}" y="${Y(S.inf0)}" width="${w}" height="${Y(g[1]) - Y(S.inf0)}" fill="${g[2]}" opacity=".18"/><text x="${x + w / 2}" y="${(Y(S.inf0) + Y(g[1])) / 2 + 4}" text-anchor="middle" class="b">−${f0(g[3])}</text>`;
        s += `<text x="${x + w / 2}" y="${Y(i ? S.inf0 : g[1]) - 7}" text-anchor="middle" class="b">${f0(g[1])}</text><text x="${x + w / 2}" y="${H - mg.b + 16}" text-anchor="middle">${g[0]}</text>`;
      });
      el.innerHTML = s + "</svg>";
      el.querySelectorAll(".bar").forEach(b => { const g = G[+b.dataset.i];
        b.addEventListener("mousemove", e => tip(e, `<b>${g[0]}</b><br>${tr("Infeksi baru per tahun", "New infections per year")}: <b>${f0(g[1])}</b>` + (+b.dataset.i ? `<br>${tr("Dicegah", "Averted")}: ${f0(g[3])}<br>${tr("Biaya program", "Programme cost")}: ${usdM(g[4])}<br>${tr("Biaya per infeksi dicegah", "Cost per infection averted")}: ${usd(g[4] / Math.max(1, g[3]))}` : "")));
        b.addEventListener("mouseleave", untip); });
    }
    function tornado(el) {
      const base = model(S).nbL;
      const P = [
        [tr("Harga LEN per orang per tahun", "LEN price per person per year"), "pLen", S.pLen * 0.8, S.pLen * 1.2, v => usd(v)],
        [tr("Efektivitas LEN", "LEN effectiveness"), "lenEff", Math.max(0.5, S.lenEff - 0.07), Math.min(0.99, S.lenEff + 0.03), v => f0(v * 100) + "%"],
        [tr("Cakupan LEN", "LEN coverage"), "lenCov", S.lenCov * 0.5, S.lenCov * 1.5, v => f1(v * 100) + "%"],
        [tr("Biaya ART seumur hidup", "Lifetime ART cost"), "art", S.art * 2 / 3, S.art * 4 / 3, v => usd(v)],
        [tr("Porsi infeksi pada 10% berisiko tertinggi", "Share of infections in the highest-risk 10%"), "share10", Math.max(0.11, S.share10 - 0.1), Math.min(0.9, S.share10 + 0.1), v => f0(v * 100) + "%"],
        [tr("Infeksi baru dasar per tahun", "Baseline new infections per year"), "inf0", S.inf0 * 0.8, S.inf0 * 1.2, v => f0(v)]
      ].map(p => { const lo = model(Object.assign({}, S, { [p[1]]: p[2] })).nbL, hi = model(Object.assign({}, S, { [p[1]]: p[3] })).nbL; return { p, lo, hi, span: Math.abs(hi - lo) }; })
        .filter(x => !(x.p[1] === "share10" && S.target !== "risk")).sort((a, b) => b.span - a.span);
      const W = Math.max(300, el.clientWidth), L = Math.min(250, W * 0.42), rowH = 30, H = P.length * rowH + 34;
      const vals = P.flatMap(x => [x.lo, x.hi]).concat([base, 0]), mn = Math.min(...vals), mx = Math.max(...vals), pad = (mx - mn) * 0.08 || 1;
      const X = v => L + (v - mn + pad) / (mx - mn + 2 * pad) * (W - L - 12);
      let s = `<svg class="tornado" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("Analisis sensitivitas satu arah untuk manfaat bersih LEN", "One-way sensitivity analysis of the LEN net benefit")}">`;
      s += `<line x1="${X(base)}" x2="${X(base)}" y1="0" y2="${H - 26}" stroke="#142826"/>`;
      if (mn < 0) s += `<line x1="${X(0)}" x2="${X(0)}" y1="0" y2="${H - 26}" stroke="#B4364A" stroke-dasharray="3 3"/>`;
      P.forEach((x, i) => {
        const y = i * rowH + 4, a = Math.min(x.lo, x.hi), b = Math.max(x.lo, x.hi);
        s += `<text x="${L - 8}" y="${y + 15}" text-anchor="end">${x.p[0]}</text>`;
        s += `<rect class="tb" data-i="${i}" x="${X(a)}" y="${y + 3}" width="${Math.max(2, X(b) - X(a))}" height="${rowH - 10}" rx="3" fill="#6E9C99"/>`;
      });
      s += `<text x="${X(base)}" y="${H - 8}" text-anchor="middle" class="b">${usdM(base)}</text></svg>`;
      el.innerHTML = s;
      el.querySelectorAll(".tb").forEach(r => { const x = P[+r.dataset.i];
        r.addEventListener("mousemove", e => tip(e, `<b>${x.p[0]}</b><br>${x.p[4](x.p[2])}: ${usdM(x.lo)}<br>${x.p[4](x.p[3])}: ${usdM(x.hi)}`)); r.addEventListener("mouseleave", untip); });
    }
    function draw() {
      const m = model(S);
      bars($("lc_bars"), m); tornado($("lc_tornado"));
      const ratio = m.cpiO / Math.max(1, m.cpiL), times = m.aL / Math.max(1, m.aO);
      $("lc_kpi").innerHTML = [
        [f0(m.aL), tr("infeksi dicegah per tahun dengan LEN terarah", "infections averted per year with targeted LEN"), tr(`${f1(times)} kali perluasan PrEP oral (${f0(m.aO)})`, `${f1(times)} times oral PrEP scale-up (${f0(m.aO)})`)],
        [usd(m.cpiL), tr("biaya per infeksi dicegah, LEN", "cost per infection averted, LEN"), tr(`PrEP oral ${usd(m.cpiO)}; LEN ${f1(ratio)} kali lebih efisien`, `oral PrEP ${usd(m.cpiO)}; LEN ${f1(ratio)} times more efficient`)],
        [usdM(m.cL), tr("biaya program LEN per tahun", "LEN programme cost per year"), tr(`PrEP oral ${usdM(m.cO)}`, `oral PrEP ${usdM(m.cO)}`)],
        [sgnM(m.nbL), tr("manfaat bersih LEN dibanding status quo", "LEN net benefit compared with status quo"), tr(`PrEP oral ${sgnM(m.nbO)}`, `oral PrEP ${sgnM(m.nbO)}`)]
      ].map(k => `<div><b>${k[0]}</b><span>${k[1]}</span>${k[2] ? `<em>${k[2]}</em>` : ""}</div>`).join("");
      const parts = [tr(`Dengan cakupan ${f0(S.lenCov * 100)}% ${S.target === "risk" ? "yang diarahkan ke orang berisiko tertinggi" : "yang dialokasikan secara acak"}, LEN mencegah sekitar <b>${f0(m.aL)}</b> infeksi per tahun, dibanding <b>${f0(m.aO)}</b> dengan perluasan PrEP oral ${f0(S.oralCov * 100)}%.`,
        `With ${f0(S.lenCov * 100)}% coverage ${S.target === "risk" ? "directed to the people at highest risk" : "allocated at random"}, LEN averts about <b>${f0(m.aL)}</b> infections a year, compared with <b>${f0(m.aO)}</b> from a ${f0(S.oralCov * 100)}% oral PrEP scale-up.`)];
      parts.push(m.nbL >= 0 ? tr(`Biaya ART seumur hidup yang terhindar melebihi biaya program LEN, sehingga manfaat bersihnya sekitar ${usdM(m.nbL)} per kohort tahunan.`, `Lifetime ART costs avoided exceed the LEN programme cost, giving a net benefit of about ${usdM(m.nbL)} per annual cohort.`)
        : tr(`Pada pengaturan ini biaya program LEN melebihi biaya ART yang terhindar sebesar ${usdM(-m.nbL)}.`, `At these settings the LEN programme cost exceeds the ART costs avoided by ${usdM(-m.nbL)}.`));
      if (S.target !== "risk") parts.push(tr("Tanpa penargetan risiko, keunggulan LEN atas PrEP oral sebagian besar hilang: manfaatnya bergantung pada siapa yang menerima dosis terbatas.", "Without risk targeting, most of LEN's advantage over oral PrEP disappears: the benefit depends on who receives the limited doses."));
      $("lc_narr").innerHTML = parts.join(" ");
    }
    sync(); draw();
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 150); });
    document.addEventListener("charis:lang", () => { sync(); draw(); });
  }

  /* ===================== 2. out-of-pocket financing explorer ===================== */
  const oop = $("oopcalc");
  if (oop) {
    const RATE = 15000;
    const DEF = { users: 100000, low: 0.50, mid: 0.15, pLow: 100000, pMid: 250000, cost: 50, averted: 8500, policy: "blend" };
    const S = Object.assign({}, DEF);
    const R = [["op_low", "low", v => f0(v * 100) + "%"], ["op_mid", "mid", v => f0(v * 100) + "%"], ["op_pLow", "pLow", v => "IDR " + f0(v)], ["op_pMid", "pMid", v => "IDR " + f0(v)], ["op_cost", "cost", v => usd(v)]];
    const POLN = { full: ["OOP penuh", "Full OOP"], blend: ["Model campuran", "Blended model"], sub: ["Subsidi penuh", "Full subsidy"] };
    const pol = k => POLN[k][lang() === "en" ? 1 : 0];
    const run = (pol, P) => {
      const nLow = P.users * P.low, nMid = P.users * P.mid, nNo = Math.max(0, P.users - nLow - nMid);
      const rev = pol === "sub" ? 0 : nLow * P.pLow / RATE + nMid * P.pMid / RATE;
      const covered = pol === "full" ? nLow + nMid : P.users;
      const cost = covered * P.cost, pub = Math.max(0, cost - rev);
      return { covered, rev, cost, pub, av: P.averted * covered / P.users, nNo };
    };
    function sync() {
      if (S.low + S.mid > 1) S.mid = +(1 - S.low).toFixed(2);
      R.forEach(([id, k, f]) => { $(id).value = S[k]; $(id + "_o").textContent = f(+S[k]); });
      $("op_no_o").textContent = f0((1 - S.low - S.mid) * 100) + "%";
      oop.querySelectorAll("[data-pol]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pol === S.policy)));
    }
    R.forEach(([id, k, f]) => $(id).addEventListener("input", e => { S[k] = +e.target.value; sync(); draw(); }));
    oop.querySelectorAll("[data-pol]").forEach(b => b.addEventListener("click", () => { S.policy = b.dataset.pol; sync(); draw(); }));
    $("op_reset").addEventListener("click", () => { Object.assign(S, DEF); sync(); draw(); });
    function chart(el) {
      const W = Math.max(300, el.clientWidth), H = 260, mg = { l: 52, r: 10, t: 22, b: 48 };
      const keys = ["full", "blend", "sub"], res = keys.map(k => run(k, S)), max = Math.max(...res.map(r => r.cost)) * 1.18 || 1;
      const Y = v => H - mg.b - v / max * (H - mg.t - mg.b), bw = (W - mg.l - mg.r) / 3;
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("Pembiayaan LEN menurut kebijakan", "LEN financing by policy")}">`;
      const st = max > 4e6 ? 1e6 : 5e5;
      for (let v = 0; v <= max; v += st) s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E1E8E6"/><text x="${mg.l - 7}" y="${Y(v) + 4}" text-anchor="end">${f1(v / 1e6)}</text>`;
      res.forEach((r, i) => {
        const x = mg.l + i * bw + bw * 0.2, w = bw * 0.6, sel = keys[i] === S.policy;
        const revShown = Math.min(r.rev, r.cost);
        s += `<g class="pb" data-i="${i}"><rect x="${x}" y="${Y(r.cost)}" width="${w}" height="${Y(revShown) - Y(r.cost)}" fill="#0E5A55" opacity="${sel ? 1 : .55}"/>`;
        s += `<rect x="${x}" y="${Y(revShown)}" width="${w}" height="${H - mg.b - Y(revShown)}" fill="#E8833A" opacity="${sel ? 1 : .55}"/>`;
        if (sel) s += `<rect x="${x - 3}" y="${Y(r.cost) - 3}" width="${w + 6}" height="${H - mg.b - Y(r.cost) + 3}" fill="none" stroke="#142826" stroke-width="2"/>`;
        s += `</g><text x="${x + w / 2}" y="${Y(r.cost) - 8}" text-anchor="middle" class="b">${f0(r.av)} ${tr("dicegah", "averted")}</text>`;
        s += `<text x="${x + w / 2}" y="${H - mg.b + 16}" text-anchor="middle" class="b">${pol(keys[i])}</text><text x="${x + w / 2}" y="${H - mg.b + 30}" text-anchor="middle">${f0(r.covered)} ${tr("pengguna", "users")}</text>`;
      });
      el.innerHTML = s + "</svg>";
      el.querySelectorAll(".pb").forEach(g => { const r = res[+g.dataset.i], k = keys[+g.dataset.i];
        g.addEventListener("mousemove", e => tip(e, `<b>${pol(k)}</b><br>${tr("Pengguna terlayani", "Users covered")}: ${f0(r.covered)}<br>${tr("Biaya komoditas", "Commodity cost")}: ${usdM(r.cost)}<br>${tr("Pembayaran pengguna (OOP)", "User payments (OOP)")}: ${usdM(r.rev)}<br>${tr("Kebutuhan dana publik atau donor", "Public or donor funding need")}: ${usdM(r.pub)}<br>${tr("Infeksi dicegah per tahun", "Infections averted per year")}: ${f0(r.av)}`));
        g.addEventListener("mouseleave", untip); });
    }
    function draw() {
      chart($("op_chart"));
      const r = run(S.policy, S);
      $("op_kpi").innerHTML = [
        [f0(r.covered), tr("pengguna LEN terlayani", "LEN users covered"), tr(`dari ${f0(S.users)} sasaran`, `of ${f0(S.users)} targeted`)],
        [usdM(r.rev), tr("pembayaran pengguna per tahun", "user payments per year"), tr(`${f0(r.rev / Math.max(1, r.cost) * 100)}% dari biaya komoditas`, `${f0(r.rev / Math.max(1, r.cost) * 100)}% of commodity cost`)],
        [usdM(r.pub), tr("kebutuhan dana publik atau donor", "public or donor funding need"), ""],
        [f0(r.av), tr("infeksi dicegah per tahun", "infections averted per year"), r.covered < S.users ? tr("batas atas: yang tidak terlayani sering berisiko tertinggi", "upper bound: those left out are often at highest risk") : ""]
      ].map(k => `<div><b>${k[0]}</b><span>${k[1]}</span>${k[2] ? `<em>${k[2]}</em>` : ""}</div>`).join("");
      const full = run("full", S);
      $("op_narr").innerHTML = tr(`Pada harga IDR ${f0(S.pLow)} dan IDR ${f0(S.pMid)}, pembayaran pengguna hanya menutup sekitar <b>${f0(full.rev / Math.max(1, full.cost) * 100)}%</b> biaya komoditas bahkan dalam skema OOP penuh, sementara ${f0((1 - S.low - S.mid) * 100)}% sasaran tidak terlayani. OOP berfungsi sebagai pelengkap dan alat membentuk pasar, bukan pengganti pendanaan.`,
        `At prices of IDR ${f0(S.pLow)} and IDR ${f0(S.pMid)}, user payments cover only about <b>${f0(full.rev / Math.max(1, full.cost) * 100)}%</b> of commodity cost even under full OOP, while ${f0((1 - S.low - S.mid) * 100)}% of the target group is left out. OOP works as a complement and a market-shaping tool, not a replacement for funding.`);
    }
    sync(); draw();
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 150); });
    document.addEventListener("charis:lang", () => { sync(); draw(); });
  }
})();
