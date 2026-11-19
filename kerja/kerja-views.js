/* CHARIS Ruang Kerja: the five project views (board, list, timeline, calendar, workload). */
(function () {
  "use strict";
  const K = window.K; if (!K) return;
  const { esc, ic, STATUS, STATUS_L, PRIO_L } = K;
  const touch = matchMedia("(hover: none)").matches;
  const statusColor = s => "var(--s-" + s + ")";

  /* ---------- board ---------- */
  K.views.papan = (el, ctx) => {
    const { p, tasks } = ctx, canAdd = K.canCreate(p);
    const card = t => {
      const cl = t.checklist.length ? t.checklist.filter(c => c.d).length + "/" + t.checklist.length : "", cc = K.S.ccount[t.id] || 0, m = t.milestone_id && K.ms(t.milestone_id);
      return '<button class="card' + (t.status === "selesai" ? " done" : "") + '" type="button" data-task="' + t.id + '"' + (!touch && K.canEditTask(t) ? ' draggable="true"' : "") + ">" +
        '<span class="t"><span class="pr pr-' + t.priority + '" title="Prioritas ' + PRIO_L[t.priority] + '"></span><span>' + esc(t.title) + "</span></span>" +
        (m ? '<span class="ms-n">' + esc(m.name) + "</span>" : "") +
        (t.labels.length ? '<span class="labs">' + t.labels.map(l => '<span class="chip lab">' + esc(l) + "</span>").join("") + "</span>" : "") +
        '<span class="f"><span class="ic">' + K.avatar(t.assignee_uid, "sm") + (cl ? "<span>" + ic("check") + cl + "</span>" : "") + (cc ? "<span>" + ic("chat") + cc + "</span>" : "") + (t.attachments.length ? "<span>" + ic("clip") + t.attachments.length + "</span>" : "") + "</span>" +
        K.dueBadge(t.due, t.status === "selesai") + "</span></button>";
    };
    el.innerHTML = '<div class="board">' + STATUS.map(([k, l]) => {
      const list = tasks.filter(t => t.status === k).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.order - b.order);
      return '<section class="col" data-col="' + k + '" aria-label="' + l + '"><div class="col-h"><b style="--c:' + statusColor(k) + '">' + l + '</b><span class="n">' + list.length + "</span></div>" +
        list.map(card).join("") + (canAdd ? '<button class="add-card" type="button" data-add="' + k + '">+ Tugas</button>' : "") + "</section>";
    }).join("") + "</div>" + (touch ? '<p class="small muted" style="margin-top:8px">Geser ke samping untuk melihat kolom lain. Ketuk kartu untuk mengubah status.</p>' : '<p class="small muted" style="margin-top:8px">Seret kartu ke kolom lain untuk mengubah status.</p>');
    K.bindRows(el);
    el.querySelectorAll("[data-add]").forEach(b => (b.onclick = () => K.openTask(null, { project_id: p.id, status: b.dataset.add })));
    if (touch) return;
    let dragId = null;
    el.querySelectorAll(".card[draggable]").forEach(c => {
      c.addEventListener("dragstart", e => { dragId = c.dataset.task; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", dragId); } catch (x) {} });
      c.addEventListener("dragend", () => { c.classList.remove("dragging"); el.querySelectorAll(".col").forEach(x => x.classList.remove("over")); });
    });
    el.querySelectorAll(".col").forEach(col => {
      col.addEventListener("dragover", e => { if (!dragId) return; e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", e => { if (!col.contains(e.relatedTarget)) col.classList.remove("over"); });
      col.addEventListener("drop", e => { e.preventDefault(); col.classList.remove("over"); const t = K.S.tasks.find(x => x.id === dragId); dragId = null; if (t) K.setStatus(t, col.dataset.col); });
    });
  };

  /* ---------- list (grouped by milestone) ---------- */
  K.views.daftar = (el, ctx) => {
    const { tasks, milestones } = ctx;
    const groups = milestones.map(m => [m, tasks.filter(t => t.milestone_id === m.id)]).concat([[null, tasks.filter(t => !t.milestone_id || !milestones.find(m => m.id === t.milestone_id))]]).filter(g => g[1].length);
    const row = t => '<div class="lrow' + (t.status === "selesai" ? " done" : "") + '" data-task="' + t.id + '" role="button" tabindex="0">' +
      '<input type="checkbox" aria-label="Tandai selesai" data-done="' + t.id + '"' + (t.status === "selesai" ? " checked" : "") + (K.canEditTask(t) ? "" : " disabled") + ">" +
      '<span class="t"><span class="pr pr-' + t.priority + '" title="Prioritas ' + PRIO_L[t.priority] + '"></span><span>' + esc(t.title) + "</span></span>" +
      '<span class="who">' + K.avatar(t.assignee_uid, "sm") + "<span>" + esc(K.uName(t.assignee_uid)) + "</span></span>" +
      "<span>" + (K.dueBadge(t.due, t.status === "selesai") || '<span class="small muted">Tanpa tenggat</span>') + "</span>" +
      '<span><span class="chip st st-' + t.status + '">' + STATUS_L[t.status] + "</span></span>" +
      '<span class="small muted num">' + (t.est_hours ? t.est_hours + " jam" : "") + "</span></div>";
    el.innerHTML = tasks.length ? '<div class="panel tlist"><div class="lhead"><span></span><span>Tugas</span><span>Penanggung jawab</span><span>Tenggat</span><span>Status</span><span>Perkiraan</span></div>' +
      groups.map(([m, list]) => { const st = m ? K.msStats(m) : null;
        return '<div class="lgroup"><span>' + (m ? esc(m.name) + (m.deliverable ? ' <span class="chip" style="background:#FDE9D9;color:#8A4513">Deliverable</span>' : "") : "Tanpa milestone") + "</span>" +
          (st ? '<span style="display:flex;gap:8px;align-items:center" class="small muted">' + st.done + "/" + st.total + ' <span class="bar thin"><i style="width:' + Math.round(st.pct * 100) + '%"></i></span></span>' : "") + "</div>" + list.sort((a, b) => (a.status === "selesai") - (b.status === "selesai") || (a.due || "9999").localeCompare(b.due || "9999")).map(row).join(""); }).join("") + "</div>"
      : '<div class="panel empty"><strong>Belum ada tugas</strong>Tambahkan tugas atau ubah filter.</div>';
    el.querySelectorAll("[data-done]").forEach(c => c.addEventListener("change", () => { const t = K.S.tasks.find(x => x.id === c.dataset.done); K.setStatus(t, c.checked ? "selesai" : "dikerjakan"); }));
    el.querySelectorAll(".lrow").forEach(r => r.addEventListener("keydown", e => { if (e.key === "Enter" && e.target === r) K.openTask(r.dataset.task); }));
    K.bindRows(el);
  };

  /* ---------- timeline (Gantt) ---------- */
  let zoom = "hari";
  K.views.linimasa = (el, ctx) => {
    const { p, tasks, milestones } = ctx;
    const dated = tasks.filter(t => t.due || t.start);
    const S = K.S;
    if (!dated.length && !milestones.some(m => m.due)) { el.innerHTML = '<div class="panel empty"><strong>Belum ada tanggal</strong>Isi tanggal mulai dan tenggat pada tugas agar muncul di linimasa.</div>'; return; }
    const allDates = dated.flatMap(t => [t.start, t.due]).concat(milestones.map(m => m.due), [p.start, p.end, S.today]).filter(Boolean).sort();
    let from = K.addDays(allDates[0], -3), to = K.addDays(allDates[allDates.length - 1], 7);
    const dow = s => new Date(K.dnum(s) * 86400000).getUTCDay();
    while (dow(from) !== 1) from = K.addDays(from, -1);
    const days = Math.min(400, Math.round(K.dnum(to) - K.dnum(from)) + 1);
    const W = zoom === "hari" ? 30 : 11, gname = innerWidth < 600 ? 128 : 230, X = s => (K.dnum(s) - K.dnum(from)) * W;
    const dayCells = [];
    for (let i = 0; i < days; i++) { const s = K.addDays(from, i), d = dow(s); dayCells.push('<div class="g-day' + (d === 0 || d === 6 ? " we" : "") + (d === 1 ? " mon" : "") + (s === S.today ? " td" : "") + '" style="width:' + W + 'px">' + (zoom === "hari" ? Number(s.slice(8)) : "") + "</div>"); }
    const months = []; for (let i = 0; i < days; i++) { const s = K.addDays(from, i); if (i === 0 || s.slice(8) === "01") months.push('<span class="g-month" style="left:' + (i * W + 4) + 'px">' + K.MONTHS_L[Number(s.slice(5, 7)) - 1] + " " + s.slice(0, 4) + "</span>"); }
    const bar = t => {
      const a = t.start || (t.due ? K.addDays(t.due, -1) : t.start), b = t.due || t.start, x = X(a), w = Math.max(W, (K.dnum(b) - K.dnum(a) + 1) * W);
      return '<div class="g-bar' + (K.isLate(t) ? " late" : "") + '" data-task="' + t.id + '" style="left:' + x + "px;width:" + w + "px;--c:" + statusColor(t.status) + '" title="' + esc(t.title + ": " + (t.start ? K.fmtDate(t.start) + " sampai " : "") + K.fmtDate(t.due || t.start) + ", " + STATUS_L[t.status]) + '">' + esc(t.title) + "</div>";
    };
    const rows = [];
    const groups = milestones.map(m => [m, dated.filter(t => t.milestone_id === m.id)]).concat([[null, dated.filter(t => !t.milestone_id || !milestones.find(m => m.id === t.milestone_id))]]);
    groups.forEach(([m, list]) => {
      if (!m && !list.length) return;
      rows.push('<div class="g-row ms-row"><div class="g-name">' + (m ? esc(m.name) : "Tanpa milestone") + '</div><div class="g-track">' + (m && m.due ? '<span class="g-dia" style="left:' + (X(m.due) + W / 2 - 7) + 'px" title="' + esc(m.name + ": target " + K.fmtDate(m.due)) + '"></span>' : "") + "</div></div>");
      list.sort((a, b) => (a.start || a.due).localeCompare(b.start || b.due)).forEach(t => rows.push('<div class="g-row"><div class="g-name" data-task="' + t.id + '">' + K.avatar(t.assignee_uid, "sm") + "<span>" + esc(t.title) + '</span></div><div class="g-track">' + bar(t) + "</div></div>"));
    });
    el.innerHTML = '<div class="toolbar" style="justify-content:space-between"><div class="seg" role="group" aria-label="Skala"><button type="button" data-z="hari" aria-pressed="' + (zoom === "hari") + '">Hari</button><button type="button" data-z="minggu" aria-pressed="' + (zoom === "minggu") + '">Minggu</button></div>' +
      '<div class="legend" style="margin:0">' + STATUS.map(([k, l]) => '<span><i style="background:' + statusColor(k) + '"></i>' + l + "</span>").join("") + '<span><i style="background:var(--accent);transform:rotate(45deg);width:9px;height:9px"></i>Target milestone</span></div></div>' +
      '<div class="panel gantt"><div class="g-scroll" id="gScroll"><div class="g-grid" style="--gname:' + gname + "px;width:" + (gname + days * W) + 'px">' +
      '<div class="g-row head"><div class="g-name" style="cursor:default;font-weight:700">' + (zoom === "hari" ? "Tugas" : "Tugas") + '</div><div class="g-track" style="position:relative"><div style="position:absolute;inset:0 0 auto 0;height:18px">' + months.join("") + '</div><div class="g-days" style="padding-top:18px">' + dayCells.join("") + "</div></div></div>" +
      rows.join("") + '<span class="g-today" style="left:' + (gname + X(S.today) + W / 2) + 'px" title="Hari ini"></span></div></div></div>';
    el.querySelectorAll("[data-z]").forEach(b => (b.onclick = () => { zoom = b.dataset.z; K.views.linimasa(el, ctx); }));
    K.bindRows(el);
    const sc = el.querySelector("#gScroll"); sc.scrollLeft = Math.max(0, X(S.today) - sc.clientWidth / 3);
  };

  /* ---------- calendar (month grid; agenda list on phones) ---------- */
  let calMonth = null;
  K.views.kalender = (el, ctx) => {
    const { tasks, milestones } = ctx, S = K.S;
    if (!calMonth) calMonth = S.today.slice(0, 7);
    const [y, m] = calMonth.split("-").map(Number), first = calMonth + "-01";
    const dow = s => (new Date(K.dnum(s) * 86400000).getUTCDay() + 6) % 7;
    const start = K.addDays(first, -dow(first)), daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const evs = s => tasks.filter(t => t.due === s).map(t => ({ t })).concat(milestones.filter(x => x.due === s).map(x => ({ m: x })));
    const evHtml = e => e.t ? '<button class="ev" type="button" data-task="' + e.t.id + '" style="--c:' + statusColor(e.t.status) + '" title="' + esc(e.t.title + " (" + K.uName(e.t.assignee_uid) + ")") + '">' + esc(e.t.title) + "</button>"
      : '<span class="ev msd" title="Target milestone">' + esc(e.m.name) + "</span>";
    let grid = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => '<div class="dn">' + d + "</div>").join("");
    const cells = Math.ceil((dow(first) + daysIn) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const s = K.addDays(start, i);
      const e = evs(s), shown = e.slice(0, 3);
      grid += '<div class="d' + (s.slice(0, 7) !== calMonth ? " out" : "") + (s === S.today ? " td" : "") + '"><span class="dd">' + Number(s.slice(8)) + "</span>" + shown.map(evHtml).join("") + (e.length > 3 ? '<span class="more">+' + (e.length - 3) + " lagi</span>" : "") + "</div>";
    }
    let agenda = "";
    for (let i = 1; i <= daysIn; i++) {
      const s = calMonth + "-" + String(i).padStart(2, "0"), e = evs(s); if (!e.length) continue;
      agenda += '<div class="ag-day' + (s === S.today ? " td" : "") + '"><h4><span>' + ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][dow(s)] + ", " + K.fmtDate(s) + "</span><span>" + e.length + "</span></h4>" +
        e.map(x => x.t ? K.trow(x.t) : '<div class="trow" style="cursor:default"><span class="g-dia" style="position:static;transform:rotate(45deg)"></span><span class="t">' + esc(x.m.name) + '</span><span class="due soon">Target</span></div>').join("") + "</div>";
    }
    el.innerHTML = '<div class="cal-h"><button class="icon-btn" type="button" id="cPrev" aria-label="Bulan sebelumnya">' + ic("back") + "</button><b>" + K.MONTHS_L[m - 1] + " " + y + '</b><span style="display:flex;gap:6px"><button class="btn ghost small" type="button" id="cToday">Hari ini</button><button class="icon-btn" type="button" id="cNext" aria-label="Bulan berikutnya" style="transform:scaleX(-1)">' + ic("back") + "</button></span></div>" +
      '<div class="cal">' + grid + '</div><div class="agenda">' + (agenda || '<div class="panel empty">Tidak ada tenggat di bulan ini.</div>') + "</div>";
    const shift = n => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); calMonth = d.toISOString().slice(0, 7); K.views.kalender(el, ctx); };
    el.querySelector("#cPrev").onclick = () => shift(-1); el.querySelector("#cNext").onclick = () => shift(1);
    el.querySelector("#cToday").onclick = () => { calMonth = S.today.slice(0, 7); K.views.kalender(el, ctx); };
    K.bindRows(el);
  };

  /* ---------- workload per person ---------- */
  K.views.beban = (el, ctx) => {
    const { tasks, team, setWho } = ctx;
    const people = [...new Set(team.concat(tasks.map(t => t.assignee_uid).filter(Boolean)))];
    const data = people.map(uid => {
      const mine = tasks.filter(t => t.assignee_uid === uid), open = mine.filter(t => t.status !== "selesai");
      return { uid, mine, open, late: open.filter(K.isLate).length, week: open.filter(t => t.due && K.diffDays(t.due) >= 0 && K.diffDays(t.due) <= 7).length,
        hours: open.reduce((a, t) => a + (t.est_hours || 0), 0), by: STATUS.map(([k]) => mine.filter(t => t.status === k).length) };
    }).sort((a, b) => b.hours - a.hours || b.open.length - a.open.length);
    const unassigned = tasks.filter(t => !t.assignee_uid && t.status !== "selesai").length;
    el.innerHTML = (data.length ? '<div class="wl">' + data.map(d => {
      const total = d.mine.length || 1, u = K.user(d.uid);
      return '<button class="wcard" type="button" data-who="' + d.uid + '"><span class="who">' + K.avatar(d.uid, "") + "<span><b>" + esc(K.uName(d.uid)) + "</b><span>" + esc(u ? K.ROLE[u.role] : "") + "</span></span></span>" +
        '<span class="wstats"><span><b>' + d.open.length + "</b><small>terbuka</small></span><span><b>" + d.hours + '</b><small>jam tersisa</small></span><span class="' + (d.late ? "late" : "") + '"><b>' + d.late + "</b><small>terlambat</small></span></span>" +
        '<span class="stack" title="Komposisi status">' + d.by.map((n, i) => n ? '<i style="width:' + (n / total * 100) + "%;background:" + statusColor(STATUS[i][0]) + '"></i>' : "").join("") + "</span>" +
        '<span class="small muted">' + d.week + " tenggat dalam 7 hari, " + d.mine.filter(t => t.status === "selesai").length + " selesai</span></button>";
    }).join("") + "</div>" : '<div class="panel empty">Belum ada anggota tim.</div>') +
      '<div class="legend">' + STATUS.map(([k, l]) => '<span><i style="background:' + statusColor(k) + '"></i>' + l + "</span>").join("") + "</div>" +
      (unassigned ? '<p class="note" style="margin-top:12px">' + unassigned + " tugas terbuka belum memiliki penanggung jawab.</p>" : "");
    el.querySelectorAll("[data-who]").forEach(b => (b.onclick = () => setWho(b.dataset.who)));
  };
})();
