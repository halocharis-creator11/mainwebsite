/* CHARIS Ruang Kerja: core (session, data, layout, dashboard, projects, task drawer, notifications, users). */
(function () {
  "use strict";
  const cfg = window.CHARIS_CONFIG || {};
  const API = cfg.API_URL || "";
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TOKEN_KEY = "charis_ktoken";
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}

  /* ---------- labels ---------- */
  const ROLE = { superadmin: "Superadmin", direktur: "Direktur", admin: "Admin", bendahara: "Bendahara", peneliti: "Peneliti", konsultan: "Konsultan lepas" };
  const STATUS = [["belum", "Belum mulai"], ["dikerjakan", "Dikerjakan"], ["ditinjau", "Ditinjau"], ["selesai", "Selesai"]];
  const STATUS_L = Object.fromEntries(STATUS);
  const PRIO = [["rendah", "Rendah"], ["sedang", "Sedang"], ["tinggi", "Tinggi"], ["mendesak", "Mendesak"]];
  const PRIO_L = Object.fromEntries(PRIO);
  const PSTATUS = [["perencanaan", "Perencanaan"], ["berjalan", "Berjalan"], ["ditunda", "Ditunda"], ["selesai", "Selesai"]];
  const PSTATUS_L = Object.fromEntries(PSTATUS);
  const SEE_ALL = ["superadmin", "direktur", "admin"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const MONTHS_L = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  /* ---------- icons ---------- */
  const P = {
    dash: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z",
    proj: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    task: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
    bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
    web: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20",
    flow: "M4 6h16M4 12h10M4 18h6",
    doc: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5",
    money: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    back: "M15 18l-6-6 6-6",
    close: "M18 6L6 18M6 6l12 12",
    plus: "M12 5v14M5 12h14",
    out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    board: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    gantt: "M3 5h10M7 10h12M5 15h8M10 20h10",
    cal: "M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 2v4M8 2v4M3 10h18",
    load: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    clip: "M21.4 11.1l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5",
    check: "M9 11l3 3 8-8",
    link: "M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7",
    trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
    edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
    alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
    down: "M12 3v12M7 10l5 5 5-5M5 21h14",
    flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"
  };
  const ic = (n, cls) => '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + P[n] + '"/></svg>';

  /* ---------- state ---------- */
  const S = { me: null, today: "", users: [], projects: [], milestones: [], tasks: [], ccount: {}, notifications: [], portfolio: [], repo: [], konten: [], hours: {}, summary: {} };
  const EXPECTED = "2026-11-19-f6";
  const K = window.K = { S, esc, ic, ROLE, STATUS, STATUS_L, PRIO, PRIO_L, PSTATUS_L, MONTHS, MONTHS_L, views: {} };

  /* ---------- api ---------- */
  async function api(op, payload) {
    if (!API) throw new Error("API belum terhubung. Isi API_URL di assets/js/config.js.");
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action: "w", op, ktoken: token }, payload || {})) });
    let j; try { j = await res.json(); } catch (e) { throw new Error("Server tidak menjawab dengan benar. Coba lagi."); }
    if (!j.ok) {
      if (j.error === "AUTH") { signOutLocal(); showGate("login", "Sesi Anda berakhir. Silakan masuk lagi."); throw new Error("Sesi berakhir."); }
      if (j.error === "MUST_CHANGE") { showGate("change"); throw new Error("Ganti password dulu."); }
      throw new Error(j.error || "Terjadi kesalahan.");
    }
    return j;
  }
  K.api = api;

  /* ---------- helpers ---------- */
  const user = uid => S.users.find(u => u.id === uid);
  const uName = uid => (user(uid) || {}).name || "Belum ditentukan";
  const initials = n => String(n || "?").replace(/[^A-Za-zÀ-ɏ ]/g, " ").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (uid, size) => { const u = user(uid); if (!u) return '<span class="avatar none ' + (size || "") + '" title="Belum ditentukan">?</span>';
    return '<span class="avatar ' + (size || "") + '" style="background:hsl(' + hue(u.id) + ' 32% 42%)" title="' + esc(u.name) + '">' + esc(initials(u.name)) + "</span>"; };
  const dnum = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
  const diffDays = s => Math.round(dnum(s) - dnum(S.today));
  const fmtDate = s => { if (!s) return ""; const [y, m, d] = s.slice(0, 10).split("-").map(Number); return d + " " + MONTHS[m - 1] + " " + y; };
  const fmtShort = s => { if (!s) return ""; const [, m, d] = s.slice(0, 10).split("-").map(Number); return d + " " + MONTHS[m - 1]; };
  const fmtTime = iso => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return iso;
    const t = d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); return t.replace(/\./g, ":"); };
  const addDays = (s, n) => new Date((dnum(s) + n) * 86400000).toISOString().slice(0, 10);
  /* countdown: H-n, Hari ini, Terlambat n hari */
  function dueInfo(due, done) {
    if (!due) return { cls: "", txt: "Tanpa tenggat" };
    if (done) return { cls: "done", txt: fmtShort(due) };
    const d = diffDays(due);
    if (d < 0) return { cls: "late", txt: "Terlambat " + (-d) + " hari" };
    if (d === 0) return { cls: "today", txt: "Hari ini" };
    if (d <= 3) return { cls: "soon", txt: "H-" + d };
    return { cls: "ok", txt: "H-" + d };
  }
  const dueBadge = (due, done) => { if (!due) return ""; const i = dueInfo(due, done); return '<span class="due ' + i.cls + '" title="Tenggat ' + esc(fmtDate(due)) + '">' + esc(i.txt) + "</span>"; };
  const isLate = t => t.due && t.status !== "selesai" && diffDays(t.due) < 0;
  Object.assign(K, { user, uName, avatar, initials, fmtDate, fmtShort, fmtTime, diffDays, dnum, addDays, dueInfo, dueBadge, isLate });

  /* ---------- permissions (mirror of the server rules; the server has the final say) ---------- */
  const seesAll = () => S.me && SEE_ALL.includes(S.me.role);
  const inProject = p => p.lead_uid === S.me.id || (p.members || []).includes(S.me.id);
  const canManage = p => seesAll() || (p && p.lead_uid === S.me.id);
  const canCreate = p => canManage(p) || (S.me.role !== "konsultan" && inProject(p));
  const canEditTask = t => { const p = proj(t.project_id); return canCreate(p) || t.assignee_uid === S.me.id; };
  const canDeleteTask = t => canManage(proj(t.project_id)) || t.created_by === S.me.id;
  Object.assign(K, { seesAll, canManage, canCreate, canEditTask });

  /* ---------- derived data ---------- */
  const proj = id => S.projects.find(p => p.id === id);
  const ms = id => S.milestones.find(m => m.id === id);
  const tasksOf = pid => S.tasks.filter(t => t.project_id === pid);
  const msOf = pid => S.milestones.filter(m => m.project_id === pid).sort((a, b) => (a.order - b.order) || String(a.due).localeCompare(String(b.due)));
  function msStats(m) {
    const ts = S.tasks.filter(t => t.milestone_id === m.id), done = ts.filter(t => t.status === "selesai").length;
    return { total: ts.length, done, pct: ts.length ? done / ts.length : 0 };
  }
  /* weighted progress: sum of milestone weight x share of its tasks done; plain task share when no weights */
  function projStats(p) {
    const ts = tasksOf(p.id), done = ts.filter(t => t.status === "selesai").length, late = ts.filter(isLate).length;
    const mss = msOf(p.id), W = mss.reduce((a, m) => a + (m.weight || 0), 0);
    let pct = ts.length ? done / ts.length : 0, weighted = false;
    if (W > 0) { pct = mss.reduce((a, m) => a + (m.weight || 0) * msStats(m).pct, 0) / W; weighted = true; }
    if (p.status === "selesai" && !ts.length) pct = 1;
    return { pct: Math.round(pct * 100), total: ts.length, done, late, W, weighted, open: ts.length - done };
  }
  Object.assign(K, { proj, ms, tasksOf, msOf, msStats, projStats });

  /* ---------- feedback ---------- */
  let toastT = 0;
  function toast(msg, bad) { const t = $("toast"); t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), bad ? 5200 : 2600); }
  K.toast = toast;
  const sync = txt => { $("syncState").textContent = txt || ""; };
  async function run(btn, fn) {
    if (btn) btn.disabled = true;
    try { return await fn(); } catch (e) { toast(e.message, true); throw e; } finally { if (btn) btn.disabled = false; }
  }
  K.run = run;

  /* ============================================================
     GATE: sign in, first-time password, forgot password
     ============================================================ */
  function signOutLocal() { token = null; try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(SNAP_KEY); sessionStorage.removeItem("charis_token"); } catch (e) {} clearInterval(pollT); }
  function showGate(mode, msg) {
    $("app").hidden = true; $("gate").hidden = false; closeDrawer(true); closeModal();
    const b = $("gateBody"), note = msg ? '<p class="note warn">' + esc(msg) + "</p>" : "";
    if (!API) { b.innerHTML = '<h1>Ruang Kerja</h1><p class="note warn">API belum terhubung. Isi <code>API_URL</code> di <code>assets/js/config.js</code> dengan URL Web App Apps Script.</p>'; return; }
    if (mode === "change") {
      b.innerHTML = '<h1>Buat password baru</h1><p class="muted">Untuk keamanan, ganti password sementara Anda sebelum mulai bekerja.</p>' + note +
        '<form id="gForm" novalidate><label class="field"><span>Password sementara</span><input class="in" id="gCur" type="password" autocomplete="current-password" required></label>' +
        '<label class="field"><span>Password baru</span><input class="in" id="gPw" type="password" autocomplete="new-password" required><small class="muted">Minimal 10 karakter, berisi huruf dan angka.</small></label>' +
        '<label class="field"><span>Ulangi password baru</span><input class="in" id="gPw2" type="password" autocomplete="new-password" required></label><p class="err" id="gErr" role="alert"></p>' +
        '<button class="btn" type="submit">Simpan dan masuk</button></form><button class="link-btn" id="gOut" type="button">Keluar</button>';
      $("gOut").onclick = () => { api("logout").catch(() => {}); signOutLocal(); showGate("login"); };
      $("gForm").onsubmit = async e => {
        e.preventDefault();
        if ($("gPw").value !== $("gPw2").value) { $("gErr").textContent = "Kedua password baru belum sama."; return; }
        try { await api("changePassword", { current: $("gCur").value, password: $("gPw").value }); start(); }
        catch (err) { $("gErr").textContent = err.message; }
      };
      return;
    }
    if (mode === "forgot") {
      b.innerHTML = '<h1>Atur ulang password</h1><p class="muted">Masukkan email akun Anda. Kami kirim kode 6 angka ke email tersebut.</p>' +
        '<form id="gForm" novalidate><label class="field"><span>Email</span><input class="in" id="gEm" type="email" autocomplete="username" required></label>' +
        '<div id="gStep2" hidden><div style="display:grid;gap:14px"><label class="field"><span>Kode dari email</span><input class="in" id="gCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>' +
        '<label class="field"><span>Password baru</span><input class="in" id="gPw" type="password" autocomplete="new-password"><small class="muted">Minimal 10 karakter, berisi huruf dan angka.</small></label></div></div>' +
        '<p class="err" id="gErr" role="alert"></p><button class="btn" type="submit" id="gBtn">Kirim kode</button></form><button class="link-btn" id="gBack" type="button">Kembali ke halaman masuk</button>';
      $("gBack").onclick = () => showGate("login");
      let step = 1;
      $("gForm").onsubmit = async e => {
        e.preventDefault(); $("gErr").textContent = "";
        const em = $("gEm").value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { $("gErr").textContent = "Email belum benar."; return; }
        try {
          if (step === 1) { await api("forgot", { email: em }); step = 2; $("gStep2").hidden = false; $("gBtn").textContent = "Simpan password baru"; $("gErr").innerHTML = '<span style="color:var(--ok)">Jika email terdaftar, kode sudah dikirim. Periksa juga folder spam.</span>'; $("gCode").focus(); }
          else { await api("reset", { email: em, code: $("gCode").value, password: $("gPw").value }); showGate("login", "Password sudah diganti. Silakan masuk."); }
        } catch (err) { $("gErr").textContent = err.message; }
      };
      return;
    }
    b.innerHTML = '<h1>Ruang Kerja CHARIS</h1><p class="muted">Proyek, tugas, administrasi, dan keuangan tim dalam satu tempat.</p>' + note +
      '<form id="gForm" novalidate><label class="field"><span>Email</span><input class="in" id="gEm" type="email" autocomplete="username" required></label>' +
      '<label class="field"><span>Password</span><input class="in" id="gPw" type="password" autocomplete="current-password" required></label><p class="err" id="gErr" role="alert"></p>' +
      '<button class="btn" type="submit" id="gBtn">Masuk</button></form><button class="link-btn" id="gForgot" type="button">Lupa password?</button>';
    $("gForgot").onclick = () => showGate("forgot");
    $("gForm").onsubmit = async e => {
      e.preventDefault(); $("gErr").textContent = "";
      const btn = $("gBtn"); btn.disabled = true;
      try {
        const j = await api("login", { email: $("gEm").value, password: $("gPw").value });
        token = j.ktoken; try { localStorage.setItem(TOKEN_KEY, token); } catch (err) {}
        if (j.me.must_change) showGate("change"); else start();
      } catch (err) { $("gErr").textContent = err.message; } finally { btn.disabled = false; }
    };
    setTimeout(() => $("gEm") && $("gEm").focus(), 50);
  }

  /* ============================================================
     DATA LOAD AND POLLING
     ============================================================ */
  /* The last data set is kept on this device so the app opens instantly; the server is then asked
     every 20 seconds (cheap) whether anything changed, and only then is everything reloaded. */
  const SNAP_KEY = "charis_ksnap", POLL_MS = 20000;
  let pollT = 0, loadedOnce = false, checking = false;
  const stamp = () => sync("Tersinkron " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":"));
  function readSnap() { try { const s = JSON.parse(localStorage.getItem(SNAP_KEY) || "null"); return s && s.t === (token || "").slice(0, 12) ? s.j : null; } catch (e) { return null; } }
  function saveSnap(j) { try { localStorage.setItem(SNAP_KEY, JSON.stringify({ t: (token || "").slice(0, 12), j })); } catch (e) { /* storage full: skip */ } }
  async function load(quiet) {
    if (!quiet) sync("Memuat data");
    const j = await api("load");
    apply(j); saveSnap(j); stamp();
    loadedOnce = true;
  }
  function apply(j) {
    S.rev = j.rev || "";
    Object.assign(S, { me: j.me, today: j.today, users: j.users, projects: j.projects, milestones: j.milestones, tasks: j.tasks, ccount: j.comment_counts || {}, notifications: j.notifications, portfolio: j.portfolio || [],
      konten: j.konten || [], hours: j.hours_by_task || {}, summary: j.summary || {} });
    S.stale = j.version !== EXPECTED;
  }
  /* ask the server whether anything changed since our copy; reload only if so */
  let lastCheck = 0;
  async function check(force, nav) {
    if (checking || !token || !S.me) return;
    if (nav && Date.now() - lastCheck < 4000) return;          /* page switches: at most one check every few seconds */
    lastCheck = Date.now();
    if (!force && (document.hidden || !$("drawer").hidden || !$("modal").hidden)) return;
    checking = true;
    try {
      const j = await api("sync", { rev: S.rev || "" });
      if (j.changed) { await load(true); if ($("drawer").hidden && $("modal").hidden) { buildNav(); route(true); } }
      else stamp();
    } catch (e) { sync("Offline, mencoba lagi"); } finally { checking = false; }
  }
  async function start() {
    $("gate").hidden = true;
    const snap = readSnap();
    if (snap) {
      /* show the last known data right away, then refresh in the background */
      apply(snap); $("app").hidden = false; buildNav(); route(); sync("Memperbarui");
      const before = S.rev;
      try { await load(true); if (S.rev !== before || S.stale) { buildNav(); route(true); } }
      catch (e) { if (!token) return; sync("Offline, menampilkan data terakhir"); }
    } else {
      try { await load(); } catch (e) { if (!token) return; toast(e.message, true); return; }
      $("app").hidden = false;
      buildNav();
      route();
    }
    fetch("../repositori/index.json").then(r => r.json()).then(j => { S.repo = (j.items || []).map(i => ({ id: i.id, title: i.title_id, url: "../" + i.url })); }).catch(() => {});
    clearInterval(pollT);
    pollT = setInterval(() => check(false), POLL_MS);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(false); });
  addEventListener("online", () => check(false));
  addEventListener("focus", () => check(false));
  K.reload = async () => { await load(true); buildNav(); route(true); };

  /* ============================================================
     LAYOUT
     ============================================================ */
  const unread = () => S.notifications.filter(n => !n.read).length;
  function buildNav() {
    const r = S.me.role, cnt = unread();
    const items = [
      ["dasbor", "Dasbor", "dash"], ["proyek", "Proyek", "proj"], ["tugas", "Tugas saya", "task", S.tasks.filter(t => t.assignee_uid === S.me.id && t.status !== "selesai").length],
      ["notifikasi", "Notifikasi", "bell", cnt]
    ];
    const more = [["administrasi", "Administrasi", "doc", r === "direktur" || r === "superadmin" ? S.summary.leave_pending : 0]];
    if (canSeeKonten()) more.unshift(["konten", "Alur konten", "flow", S.konten.filter(k => k.stage !== "diseminasi" && whoNow(k) === S.me.id).length]);
    more.push(["keuangan", "Keuangan", "money", finCount()]);
    items.splice(3, 0, ...more);
    const soon = [];
    const extra = [];
    if (r === "superadmin" || r === "direktur") extra.push(["pengguna", "Pengguna", "users"]);
    const a = (h, l, i, n) => '<a class="nav-a" href="#/' + h + '" data-r="' + h + '">' + ic(i) + "<span>" + l + "</span>" + (n ? '<span class="cnt">' + n + "</span>" : "") + "</a>";
    $("railNav").innerHTML = items.map(x => a(...x)).join("") + soon.map(x => '<span class="nav-a soon">' + ic(x[1]) + "<span>" + x[0] + "</span><small>segera</small></span>").join("") + extra.map(x => a(...x)).join("");
    $("railFoot").innerHTML = (SEE_ALL.includes(r) ? '<a class="nav-a" href="../admin/">' + ic("web") + "<span>Konten website</span></a>" : "") +
      '<a class="nav-a" href="#/profil" data-r="profil">' + avatar(S.me.id, "sm") + "<span>" + esc(S.me.name) + "</span></a>";
    const moreCnt = finCount() + (canSeeKonten() ? S.konten.filter(k => k.stage !== "diseminasi" && whoNow(k) === S.me.id).length : 0) + ((r === "direktur" || r === "superadmin") ? (S.summary.leave_pending || 0) : 0);
    $("tabbar").innerHTML = [["dasbor", "Dasbor", "dash"], ["proyek", "Proyek", "proj"], ["tugas", "Tugas", "task"], ["notifikasi", "Notifikasi", "bell", cnt], ["menu", "Menu", "list", moreCnt]]
      .map(([h, l, i, n]) => '<a href="#/' + h + '" data-r="' + h + '">' + ic(i) + "<span>" + l + "</span>" + (n ? '<span class="cnt">' + n + "</span>" : "") + "</a>").join("");
    $("bellBtn").innerHTML = ic("bell") + '<span class="dot" id="bellCount"' + (cnt ? "" : " hidden") + ">" + cnt + "</span>";
    $("meBtn").outerHTML = '<a class="avatar me-av" id="meBtn" href="#/profil" aria-label="Profil" style="background:hsl(' + hue(S.me.id) + ' 32% 42%)">' + esc(initials(S.me.name)) + "</a>";
  }
  /* finance items waiting for this person: requests to check, approve or pay, invoices due */
  const finCount = () => { const s = S.summary || {}; return (s.req_check || 0) + (s.req_approve || 0) + (s.req_pay || 0) + (s.invoice_due || 0); };
  const FIN_FULL = ["superadmin", "direktur", "bendahara"];
  K.finFull = () => FIN_FULL.includes(S.me.role); K.finCount = finCount;
  const canSeeKonten = () => seesAll() || S.me.role === "peneliti" || S.konten.length > 0;
  const whoNow = k => (k.assignees || {})[k.stage] || k.owner_uid;
  Object.assign(K, { canSeeKonten, whoNow });
  /* phone: every section in one list (the bottom bar holds only five) */
  function viewMenu(v) {
    setTop("Menu");
    const r = S.me.role, konten = canSeeKonten() ? S.konten.filter(k => k.stage !== "diseminasi" && whoNow(k) === S.me.id).length : 0;
    const row = (href, i, l, sub, n) => '<a class="trow" href="' + href + '" style="text-decoration:none;color:inherit"><span class="nic">' + ic(i) + '</span><span style="min-width:0"><span class="t">' + l + '</span><span class="p">' + sub + "</span></span>" + (n ? '<span class="due today">' + n + "</span>" : "") + "</a>";
    v.innerHTML = '<a class="panel pad" href="#/profil" style="display:flex;gap:14px;align-items:center;margin-bottom:16px;text-decoration:none;color:inherit">' + avatar(S.me.id, "lg") + '<span style="flex:1;min-width:0"><b>' + esc(S.me.name) + '</b><br><span class="small muted">' + ROLE[r] + ", akun dan password</span></span></a>" +
      '<div class="panel">' + (canSeeKonten() ? row("#/konten", "flow", "Alur konten", "Repositori, berita, dan portofolio", konten) : "") +
      row("#/administrasi", "doc", "Administrasi", r === "konsultan" ? "Timesheet" : (SEE_ALL.includes(r) || r === "bendahara") ? "Surat, kontrak, rapat, cuti, timesheet, aset" : "Rapat, cuti, dan timesheet", (r === "direktur" || r === "superadmin") ? S.summary.leave_pending : 0) +
      row("#/keuangan", "money", "Keuangan", FIN_FULL.includes(r) ? "Pengajuan dana, kas, anggaran, invoice, honorarium, laporan" : "Pengajuan dana dan honorarium Anda", finCount()) +
      (r === "superadmin" || r === "direktur" ? row("#/pengguna", "users", "Pengguna", "Akun dan peran tim") : "") +
      (SEE_ALL.includes(r) ? row("../admin/", "web", "Konten website", "Berita, portofolio, mitra, permintaan laporan") : "") + "</div>";
  }
  function setActive(r) {
    if (["konten", "administrasi", "keuangan", "pengguna", "profil"].includes(r) && matchMedia("(max-width: 860px)").matches) r = "menu";
    document.querySelectorAll("[data-r]").forEach(a => { if (a.dataset.r === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  function setTop(title, back) {
    $("topTitle").textContent = title; document.title = title + " | Ruang Kerja CHARIS";
    const b = $("backBtn"); b.hidden = !back; b.innerHTML = ic("back"); b.onclick = () => { location.hash = back; };
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  let lastHash = "";
  function route(refresh) {
    if (!S.me) return;
    const h = location.hash.replace(/^#\/?/, "") || "dasbor";
    const [path, qs] = h.split("?"), parts = path.split("/"), q = new URLSearchParams(qs || "");
    const v = $("view"), same = refresh && h === lastHash, keepY = same ? scrollY : 0;
    lastHash = h;
    setActive(parts[0]);
    if (parts[0] === "proyek" && parts[1]) viewProject(v, parts[1], parts[2] || "papan", q);
    else if (parts[0] === "proyek") viewProjects(v, q);
    else if (parts[0] === "tugas") viewMine(v);
    else if (parts[0] === "konten" && K.pages.konten) K.pages.konten(v, q);
    else if (parts[0] === "administrasi" && K.pages.admin) K.pages.admin(v, parts[1] || "", q);
    else if (parts[0] === "keuangan" && K.pages.keuangan) K.pages.keuangan(v, parts[1] || "", q);
    else if (parts[0] === "notifikasi") viewNotifications(v);
    else if (parts[0] === "pengguna") viewUsers(v);
    else if (parts[0] === "profil") viewProfile(v);
    else if (parts[0] === "menu") viewMenu(v);
    else viewDashboard(v);
    if (same) scrollTo(0, keepY); else scrollTo(0, 0);
    const t = q.get("t");
    if (t && !refresh && $("drawer").hidden) openTask(t);
    const kk = q.get("k");
    if (kk && !refresh && $("drawer").hidden && K.openKonten) K.openKonten(kk);
    staleNotice();
  }
  addEventListener("hashchange", () => { route(); check(false, true); });
  K.pages = {};
  K.route = route; K.setTop = (a, b) => setTop(a, b); K.buildNav = () => buildNav();
  /* the Web App still runs an older Kerja.gs: say so once per page */
  function staleNotice() {
    if (!S.stale || document.getElementById("staleNote")) return;
    const n = document.createElement("p"); n.id = "staleNote"; n.className = "note warn"; n.style.margin = "0 0 16px";
    n.textContent = "Versi Apps Script belum diperbarui. Tempel Kerja.gs terbaru, lalu buat versi deployment baru agar semua fitur berfungsi.";
    $("view").prepend(n);
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function viewDashboard(v) {
    setTop("Dasbor");
    const active = S.projects.filter(p => p.status === "berjalan");
    const stats = new Map(S.projects.map(p => [p.id, projStats(p)]));
    const avg = active.length ? Math.round(active.reduce((a, p) => a + stats.get(p.id).pct, 0) / active.length) : 0;
    const open = S.tasks.filter(t => t.status !== "selesai");
    const late = open.filter(isLate), week = open.filter(t => t.due && diffDays(t.due) >= 0 && diffDays(t.due) <= 7);
    const mine = open.filter(t => t.assignee_uid === S.me.id);
    const hour = new Date().getHours(), greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
    const scope = seesAll() ? "Ringkasan semua proyek CHARIS" : "Ringkasan proyek yang Anda ikuti";
    const kpi = (href, n, l, alert) => '<a class="kpi' + (alert && n ? " alert" : "") + '" href="' + href + '"><b>' + n + "</b><span>" + l + "</span></a>";
    const prow = p => { const s = stats.get(p.id), endI = p.end ? dueInfo(p.end, p.status === "selesai") : null;
      return '<a class="prow" href="#/proyek/' + p.id + '"><div style="min-width:0"><div class="nm">' + esc(p.name) + '</div><div class="sub"><span class="chip st st-' + (p.status === "selesai" ? "selesai" : p.status === "berjalan" ? "dikerjakan" : "belum") + '">' + PSTATUS_L[p.status] + "</span>" +
        "<span>" + s.done + "/" + s.total + " tugas</span>" + (s.late ? '<span class="due late">' + s.late + " terlambat</span>" : "") + (endI ? '<span class="due ' + endI.cls + '" title="Berakhir ' + fmtDate(p.end) + '">' + (endI.cls === "late" ? "Lewat " + endI.txt.replace("Terlambat ", "") : endI.cls === "done" ? "Berakhir " + fmtShort(p.end) : "Berakhir " + endI.txt) + "</span>" : "") + "</div></div>" +
        '<div class="bar"><i style="width:' + s.pct + '%"></i></div><div class="pc">' + s.pct + "%</div></a>"; };
    const groupByProject = list => { const g = {}; list.forEach(t => (g[t.project_id] = g[t.project_id] || []).push(t));
      return Object.keys(g).map(pid => '<div class="grp-h"><span>' + esc((proj(pid) || {}).name || "") + "</span><span>" + g[pid].length + "</span></div>" + g[pid].sort((a, b) => String(a.due).localeCompare(String(b.due))).map(trow).join("")).join(""); };
    const sorted = S.projects.slice().sort((a, b) => (a.status === "selesai") - (b.status === "selesai") || stats.get(b.id).late - stats.get(a.id).late || stats.get(a.id).pct - stats.get(b.id).pct);
    v.innerHTML = '<div class="hello"><div><h2>' + greet + ", " + esc(S.me.name.split(" ")[0]) + '</h2><p class="muted">' + scope + ", " + fmtDate(S.today) + ".</p></div>" +
      (seesAll() ? '<button class="btn" id="dNew" type="button">' + ic("plus") + "Proyek baru</button>" : "") + "</div>" +
      '<div class="kpis">' + kpi("#/proyek?status=berjalan", active.length, "Proyek berjalan") + kpi("#/proyek?status=berjalan", avg + "%", "Rata-rata progres") +
      kpi("#/dasbor?f=late", late.length, "Tugas terlambat", true) + kpi("#/dasbor?f=week", week.length, "Tenggat 7 hari") + kpi("#/tugas", mine.length, "Tugas saya terbuka") + "</div>" +
      '<div class="dash"><section class="sec"><div class="sec-h"><h2>Progres proyek</h2><a href="#/proyek" class="small">Semua proyek</a></div><div class="panel">' +
      (sorted.length ? sorted.map(prow).join("") : '<div class="empty"><strong>Belum ada proyek</strong>' + (seesAll() ? "Buat proyek pertama untuk mulai membagi tugas." : "Anda belum ditambahkan ke proyek mana pun.") + "</div>") + "</div></section>" +
      '<div>' + todoPanel() + '<section class="sec" id="secLate"><div class="sec-h"><h2>Perlu perhatian: terlambat</h2></div><div class="panel">' + (late.length ? groupByProject(late) : '<div class="empty">Tidak ada tugas yang terlambat.</div>') + "</div></section>" +
      '<section class="sec" id="secWeek"><div class="sec-h"><h2>Tenggat 7 hari ke depan</h2></div><div class="panel">' + (week.length ? groupByProject(week) : '<div class="empty">Tidak ada tenggat dalam 7 hari.</div>') + "</div></section></div></div>";
    bindRows(v);
    if ($("dNew")) $("dNew").onclick = () => projectForm();
    const f = new URLSearchParams(location.hash.split("?")[1] || "").get("f");
    if (f) { const el = $(f === "late" ? "secLate" : "secWeek"); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 30); }
  }
  /* things waiting for this person: approvals, expiring agreements, content turns, hours this week */
  function todoPanel() {
    const s = S.summary || {}, rows = [];
    const line = (href, iconName, text, right) => '<a class="trow" href="' + href + '" style="text-decoration:none;color:inherit"><span class="nic" style="width:30px;height:30px">' + ic(iconName) + '</span><span style="min-width:0"><span class="t">' + text + "</span></span>" + (right || "") + "</a>";
    if (s.leave_pending) rows.push(line("#/administrasi/cuti", "user", s.leave_pending + " pengajuan cuti menunggu persetujuan Anda", '<span class="due today">Tinjau</span>'));
    (s.contracts_ending || []).forEach(c => rows.push(line("#/administrasi/kontrak?id=" + c.id, "doc", esc(c.kind + ": " + c.title) + (c.party ? '<span class="p">' + esc(c.party) + "</span>" : ""), dueBadge(c.end, false))));
    S.konten.filter(k => k.stage !== "diseminasi" && whoNow(k) === S.me.id).forEach(k => rows.push(line("#/konten?k=" + k.id, "flow", esc(k.title) + '<span class="p">Tahap: ' + esc(K.STAGE_L ? K.STAGE_L[k.stage] : k.stage) + "</span>", k.due ? dueBadge(k.due, false) : "")));
    if (s.req_check) rows.push(line("#/keuangan/pengajuan?f=diajukan", "money", s.req_check + " pengajuan dana perlu diperiksa", '<span class="due today">Periksa</span>'));
    if (s.req_approve) rows.push(line("#/keuangan/pengajuan?f=diperiksa", "money", s.req_approve + " pengajuan dana menunggu persetujuan Anda", '<span class="due today">Tinjau</span>'));
    if (s.req_pay) rows.push(line("#/keuangan/pengajuan?f=disetujui", "money", s.req_pay + " pengajuan dana disetujui dan siap dibayar", '<span class="due today">Bayar</span>'));
    if (s.invoice_due) rows.push(line("#/keuangan/invoice", "doc", s.invoice_due + " invoice jatuh tempo dalam 7 hari atau terlambat", '<span class="due soon">Cek</span>'));
    if (s.my_req_open) rows.push(line("#/keuangan/pengajuan", "money", s.my_req_open + " pengajuan dana Anda sedang diproses", ""));
    if (s.my_leave_pending) rows.push(line("#/administrasi/cuti", "user", "Pengajuan cuti Anda sedang menunggu keputusan", ""));
    rows.push(line("#/administrasi/timesheet", "load", "Jam kerja tercatat minggu ini", '<span class="chip">' + fmtNum(s.week_hours || 0) + " jam</span>"));
    return '<section class="sec"><div class="sec-h"><h2>Perlu tindakan</h2></div><div class="panel todo">' + rows.join("") + "</div></section>";
  }
  function trow(t) {
    return '<button class="trow" type="button" data-task="' + t.id + '">' + avatar(t.assignee_uid, "sm") + '<span style="min-width:0"><span class="t">' + esc(t.title) + '</span><span class="p">' +
      esc(uName(t.assignee_uid)) + (t.milestone_id && ms(t.milestone_id) ? ", " + esc(ms(t.milestone_id).name) : "") + "</span></span>" + dueBadge(t.due, t.status === "selesai") + "</button>";
  }
  function bindRows(root) { root.querySelectorAll("[data-task]").forEach(el => el.addEventListener("click", e => { if (e.target.closest("input")) return; openTask(el.dataset.task); })); }
  Object.assign(K, { trow, bindRows });

  /* ============================================================
     PROJECTS
     ============================================================ */
  function viewProjects(v, q) {
    setTop("Proyek");
    let status = q.get("status") || "aktif", term = "";
    v.innerHTML = '<div class="toolbar"><input class="in grow" id="pSearch" type="search" placeholder="Cari proyek, klien, atau kode" aria-label="Cari proyek">' +
      '<div class="seg" id="pSeg" role="group" aria-label="Filter status">' + [["aktif", "Aktif"], ["berjalan", "Berjalan"], ["perencanaan", "Perencanaan"], ["ditunda", "Ditunda"], ["selesai", "Selesai"], ["semua", "Semua"]]
        .map(([k, l]) => '<button type="button" data-s="' + k + '">' + l + "</button>").join("") + "</div>" + (seesAll() ? '<button class="btn" id="pNew" type="button">' + ic("plus") + "Proyek baru</button>" : "") + '</div><div id="pList"></div>';
    const draw = () => {
      v.querySelectorAll("#pSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === status)));
      const list = S.projects.filter(p => (status === "semua" || (status === "aktif" ? p.status !== "selesai" : p.status === status)) &&
        (!term || [p.name, p.client, p.code, p.id].join(" ").toLowerCase().includes(term)));
      $("pList").innerHTML = list.length ? '<div class="pcards">' + list.map(pcard).join("") + "</div>" : '<div class="panel empty"><strong>Tidak ada proyek</strong>Ubah filter atau kata kunci pencarian.</div>';
    };
    v.querySelectorAll("#pSeg button").forEach(b => (b.onclick = () => { status = b.dataset.s; draw(); }));
    $("pSearch").oninput = e => { term = e.target.value.trim().toLowerCase(); draw(); };
    if ($("pNew")) $("pNew").onclick = () => projectForm();
    draw();
  }
  function pcard(p) {
    const s = projStats(p), endI = p.end ? dueInfo(p.end, p.status === "selesai") : null;
    const team = [p.lead_uid].concat((p.members || []).filter(m => m !== p.lead_uid)).slice(0, 5);
    return '<a class="pcard" href="#/proyek/' + p.id + '"><div class="pc-top"><div style="min-width:0"><div class="meta"><span>' + esc(p.code || p.id) + '</span><span class="chip st st-' + (p.status === "selesai" ? "selesai" : p.status === "berjalan" ? "dikerjakan" : p.status === "ditunda" ? "ditinjau" : "belum") + '">' + PSTATUS_L[p.status] + "</span></div>" +
      '<h3 style="margin-top:6px">' + esc(p.name) + "</h3>" + (p.client ? '<div class="meta" style="margin-top:4px">' + esc(p.client) + "</div>" : "") + "</div>" +
      '<div class="ring" style="--p:' + s.pct + '" data-v="' + s.pct + '%"></div></div>' +
      '<div class="meta"><span>' + s.done + "/" + s.total + " tugas selesai</span>" + (s.late ? '<span class="due late">' + s.late + " terlambat</span>" : "") + "</div>" +
      '<div class="foot"><div class="avs">' + team.map(u => avatar(u, "sm")).join("") + "</div>" + (endI ? '<span class="due ' + endI.cls + '" title="Berakhir ' + fmtDate(p.end) + '">' + (endI.cls === "late" ? "Lewat " + endI.txt.replace("Terlambat ", "") : endI.cls === "done" ? "Berakhir " + fmtShort(p.end) : "Berakhir " + endI.txt) + "</span>" : "") + "</div></a>";
  }

  const VIEWS = [["papan", "Papan", "board"], ["daftar", "Daftar", "list"], ["linimasa", "Linimasa", "gantt"], ["kalender", "Kalender", "cal"], ["beban", "Beban kerja", "load"]];
  const filt = { q: "", who: "", ms: "", prio: "", label: "" };
  let filtProject = "";
  function viewProject(v, pid, view, q) {
    const p = proj(pid);
    if (!p) { setTop("Proyek", "#/proyek"); v.innerHTML = '<div class="panel empty"><strong>Proyek tidak ditemukan</strong>Mungkin sudah dihapus atau Anda tidak memiliki akses.</div>'; return; }
    if (filtProject !== pid) { Object.keys(filt).forEach(k => (filt[k] = "")); filtProject = pid; }
    if (q.get("who")) filt.who = q.get("who");
    setTop(p.name, "#/proyek");
    const s = projStats(p), mss = msOf(pid), endI = p.end ? dueInfo(p.end, p.status === "selesai") : null;
    const portfolio = p.portfolio_id ? S.portfolio.find(x => x.id === p.portfolio_id) : null;
    const repos = String(p.repo_ids || "").split(",").map(x => x.trim()).filter(Boolean);
    const team = [p.lead_uid].concat((p.members || []).filter(m => m !== p.lead_uid));
    const labels = [...new Set(tasksOf(pid).flatMap(t => t.labels))].sort();
    const W = mss.reduce((a, m) => a + m.weight, 0);
    v.innerHTML = '<section class="panel phead"><div class="ring lg" style="--p:' + s.pct + '" data-v="' + s.pct + '%" title="' + (s.weighted ? "Progres berbobot milestone" : "Progres dari jumlah tugas selesai") + '"></div><div style="min-width:0">' +
      '<div class="meta" style="margin-top:0"><span>' + esc(p.code || p.id) + '</span><span class="chip st st-' + (p.status === "selesai" ? "selesai" : p.status === "berjalan" ? "dikerjakan" : p.status === "ditunda" ? "ditinjau" : "belum") + '">' + PSTATUS_L[p.status] + "</span>" +
      (p.start || p.end ? "<span>" + (p.start ? fmtDate(p.start) : "") + (p.end ? " sampai " + fmtDate(p.end) : "") + "</span>" : "") + (endI && p.status !== "selesai" ? '<span class="due ' + endI.cls + '">' + (endI.cls === "late" ? "Lewat " + endI.txt.replace("Terlambat ", "") : "Berakhir " + endI.txt) + "</span>" : "") + "</div>" +
      "<h2>" + esc(p.name) + "</h2>" +
      '<div class="meta">' + (p.client ? "<span>" + esc(p.client) + "</span>" : "") + "<span>" + s.done + "/" + s.total + " tugas selesai</span>" + (s.late ? '<span class="due late">' + s.late + " terlambat</span>" : "") +
      '<span class="avs" title="Tim proyek">' + team.map(u => avatar(u, "sm")).join("") + "</span><span>Penanggung jawab: <b>" + esc(uName(p.lead_uid)) + "</b></span></div>" +
      '<div class="meta">' + (portfolio ? '<a href="../#/portofolio/' + esc(portfolio.id) + '" target="_blank" rel="noopener">' + ic("link", "") + " Portofolio " + esc(portfolio.id) + "</a>" : (p.portfolio_id ? "<span>Portofolio " + esc(p.portfolio_id) + "</span>" : "")) +
      repos.map(r => { const it = S.repo.find(x => x.id === r); return it ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" title="' + esc(it.title) + '">' + esc(r) + "</a>" : "<span>" + esc(r) + "</span>"; }).join("") +
      (p.drive_url ? '<a href="' + esc(p.drive_url) + '" target="_blank" rel="noopener">Folder Drive</a>' : "") + "</div>" +
      (p.description ? '<p class="pdesc">' + esc(p.description) + "</p>" : "") + "</div>" +
      '<div class="acts">' + (canCreate(p) ? '<button class="btn" id="tNew" type="button">' + ic("plus") + "Tugas</button>" : "") + (canManage(p) ? '<button class="btn ghost" id="pEdit" type="button">' + ic("edit") + "Ubah</button>" : "") + "</div></section>" +
      '<section class="sec"><div class="sec-h"><h2>Milestone dan deliverable</h2>' + (mss.length ? '<span class="small muted">Total bobot ' + W + "%</span>" : "") + "</div>" +
      '<div class="mstones">' + mss.map(m => { const st = msStats(m), di = m.due ? dueInfo(m.due, st.total && st.done === st.total) : null;
        return '<button class="ms' + (m.deliverable ? " deliv" : "") + '" type="button" data-ms="' + m.id + '"><div class="h"><b>' + esc(m.name) + "</b>" + (di ? '<span class="due ' + di.cls + '">' + esc(di.txt) + "</span>" : "") + "</div>" +
          '<div class="bar thin"><i style="width:' + Math.round(st.pct * 100) + '%"></i></div><div class="w"><span>Bobot ' + m.weight + "%" + (m.deliverable ? ", deliverable" : "") + "</span><span>" + st.done + "/" + st.total + " tugas, " + Math.round(st.pct * 100) + "%</span></div></button>"; }).join("") +
      (canManage(p) ? '<button class="ms add" type="button" id="msNew">' + ic("plus") + " Milestone</button>" : "") + (!mss.length && !canManage(p) ? '<p class="muted small">Belum ada milestone.</p>' : "") + "</div>" +
      (mss.length && W !== 100 ? '<p class="wsum bad">Total bobot milestone ' + W + "%. Agar progres akurat, jumlahkan bobot menjadi 100%.</p>" : "") + "</section>" +
      '<section class="sec"><div class="sec-h"><div class="seg" role="tablist" aria-label="Tampilan">' + VIEWS.map(([k, l, i]) => '<button type="button" role="tab" data-view="' + k + '" aria-pressed="' + (k === view) + '">' + ic(i) + l + "</button>").join("") + "</div></div>" +
      '<div class="filters"><input class="in grow" id="fQ" type="search" placeholder="Cari tugas" value="' + esc(filt.q) + '" aria-label="Cari tugas">' +
      sel("fWho", "Semua orang", [["__me", "Tugas saya"], ["__none", "Belum ditugaskan"]].concat(team.map(u => [u, uName(u)])), filt.who) +
      sel("fMs", "Semua milestone", mss.map(m => [m.id, m.name]).concat([["__none", "Tanpa milestone"]]), filt.ms) +
      sel("fPrio", "Semua prioritas", PRIO, filt.prio) + (labels.length ? sel("fLab", "Semua label", labels.map(l => [l, l]), filt.label) : "") + "</div>" +
      '<div id="pView"></div></section>';
    v.querySelectorAll("[data-view]").forEach(b => (b.onclick = () => { location.hash = "#/proyek/" + pid + "/" + b.dataset.view; }));
    v.querySelectorAll("[data-ms]").forEach(b => (b.onclick = () => (canManage(p) ? milestoneForm(p, ms(b.dataset.ms)) : setFilter("ms", b.dataset.ms))));
    if ($("msNew")) $("msNew").onclick = () => milestoneForm(p);
    if ($("pEdit")) $("pEdit").onclick = () => projectForm(p);
    if ($("tNew")) $("tNew").onclick = () => openTask(null, { project_id: pid });
    const bindF = (id, k) => { const el = $(id); if (el) el.oninput = e => { filt[k] = e.target.value; drawView(); }; };
    bindF("fQ", "q"); bindF("fWho", "who"); bindF("fMs", "ms"); bindF("fPrio", "prio"); bindF("fLab", "label");
    const setFilter = (k, val) => { filt[k] = val; const el = $({ ms: "fMs" }[k]); if (el) el.value = val; drawView(); };
    function drawView() {
      const list = tasksOf(pid).filter(t => (!filt.q || (t.title + " " + t.description + " " + t.labels.join(" ")).toLowerCase().includes(filt.q.toLowerCase())) &&
        (!filt.who || (filt.who === "__me" ? t.assignee_uid === S.me.id : filt.who === "__none" ? !t.assignee_uid : t.assignee_uid === filt.who)) &&
        (!filt.ms || (filt.ms === "__none" ? !t.milestone_id : t.milestone_id === filt.ms)) && (!filt.prio || t.priority === filt.prio) && (!filt.label || t.labels.includes(filt.label)));
      const fn = K.views[view] || K.views.papan;
      fn($("pView"), { p, tasks: list, milestones: mss, team, setWho: uid => { filt.who = uid; if ($("fWho")) $("fWho").value = uid; location.hash = "#/proyek/" + pid + "/daftar"; } });
    }
    drawView();
  }
  const sel = (id, all, opts, val) => '<select class="in" id="' + id + '" aria-label="' + esc(all) + '"><option value="">' + esc(all) + "</option>" + opts.map(([k, l]) => '<option value="' + esc(k) + '"' + (k === val ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>";

  /* quick status change from a view (board drag, list checkbox) */
  K.setStatus = async (t, status) => {
    if (t.status === status) return;
    if (!canEditTask(t)) { toast("Anda tidak dapat mengubah tugas ini.", true); return; }
    const prev = t.status; t.status = status; route(true);
    try { const j = await api("taskSave", { row: { id: t.id, status } }); Object.assign(t, j.task); route(true); toast("Status: " + STATUS_L[status]); }
    catch (e) { t.status = prev; route(true); toast(e.message, true); }
  };
  K.openTask = (id, preset) => openTask(id, preset);

  /* ---------- project and milestone forms ---------- */
  function projectForm(p) {
    const isNew = !p; p = p || { status: "perencanaan", lead_uid: S.me.id, members: [] };
    const active = S.users.filter(u => u.status === "aktif");
    openModal('<h3>' + (isNew ? "Proyek baru" : "Ubah proyek") + '</h3><form id="mForm" novalidate>' +
      '<label class="field"><span>Nama proyek</span><input class="in" name="name" required value="' + esc(p.name || "") + '"></label>' +
      '<div class="grid2"><label class="field"><span>Kode singkat (opsional)</span><input class="in" name="code" value="' + esc(p.code || "") + '" placeholder="mis. BS-PKM"></label>' +
      '<label class="field"><span>Status</span><select class="in" name="status">' + PSTATUS.map(([k, l]) => '<option value="' + k + '"' + (k === p.status ? " selected" : "") + ">" + l + "</option>").join("") + "</select></label></div>" +
      '<label class="field"><span>Klien atau mitra</span><input class="in" name="client" value="' + esc(p.client || "") + '"></label>' +
      '<div class="grid2"><label class="field"><span>Mulai</span><input class="in" type="date" name="start" value="' + esc(p.start || "") + '"></label><label class="field"><span>Berakhir</span><input class="in" type="date" name="end" value="' + esc(p.end || "") + '"></label></div>' +
      '<label class="field"><span>Penanggung jawab proyek</span><select class="in" name="lead_uid">' + active.map(u => '<option value="' + u.id + '"' + (u.id === p.lead_uid ? " selected" : "") + ">" + esc(u.name) + " (" + ROLE[u.role] + ")</option>").join("") + "</select></label>" +
      '<fieldset class="field" style="border:0;padding:0;margin:0"><span style="font-size:13px;font-weight:700;color:var(--muted)">Anggota tim (melihat dan mengerjakan proyek ini)</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin-top:6px">' +
      active.filter(u => !SEE_ALL.includes(u.role) || (p.members || []).includes(u.id)).map(u => '<label class="check"><input type="checkbox" name="members" value="' + u.id + '"' + ((p.members || []).includes(u.id) ? " checked" : "") + ">" + esc(u.name) + ' <small class="muted">' + ROLE[u.role] + "</small></label>").join("") +
      '</div><small class="muted">Direktur, admin, dan superadmin selalu dapat melihat semua proyek.</small></fieldset>' +
      '<div class="grid2"><label class="field"><span>Tautan Portofolio</span><select class="in" name="portfolio_id"><option value="">Tidak ditautkan</option>' + S.portfolio.map(x => '<option value="' + esc(x.id) + '"' + (x.id === p.portfolio_id ? " selected" : "") + ">" + esc(x.id + ": " + String(x.title || "").slice(0, 60)) + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Produk Repositori terkait</span><input class="in" name="repo_ids" value="' + esc(p.repo_ids || "") + '" placeholder="CHARIS-2026-001, CHARIS-2026-004" list="repoList"><datalist id="repoList">' + S.repo.map(r => '<option value="' + esc(r.id) + '">' + esc(String(r.title).slice(0, 70)) + "</option>").join("") + "</datalist></label></div>" +
      '<label class="field"><span>Folder Google Drive proyek (tautan diawali https://)</span><input class="in" name="drive_url" value="' + esc(p.drive_url || "") + '" inputmode="url"></label>' +
      '<label class="field"><span>Deskripsi singkat</span><textarea class="in" name="description">' + esc(p.description || "") + "</textarea></label>" +
      '<p class="err" id="mErr"></p><div class="m-acts">' + (!isNew && (S.me.role === "superadmin" || S.me.role === "direktur") ? '<button class="btn danger" type="button" id="mDel" style="margin-right:auto">Hapus proyek</button>' : "") +
      '<button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">' + (isNew ? "Buat proyek" : "Simpan") + "</button></div></form>");
    $("mForm").onsubmit = async e => {
      e.preventDefault(); const f = e.target, row = Object.fromEntries(new FormData(f));
      row.members = [...f.querySelectorAll('[name="members"]:checked')].map(x => x.value);
      if (!isNew) row.id = p.id;
      if (!row.name.trim()) { $("mErr").textContent = "Nama proyek wajib diisi."; return; }
      if (row.drive_url && !/^https:\/\//.test(row.drive_url)) { $("mErr").textContent = "Tautan Drive harus diawali https://"; return; }
      await run(f.querySelector('[type="submit"]'), async () => {
        const j = await api("projectSave", { row });
        const i = S.projects.findIndex(x => x.id === j.project.id); if (i >= 0) S.projects[i] = j.project; else S.projects.unshift(j.project);
        closeModal(); toast(isNew ? "Proyek dibuat." : "Proyek disimpan.");
        if (isNew) location.hash = "#/proyek/" + j.project.id; else route(true);
      });
    };
    if ($("mDel")) $("mDel").onclick = () => confirmBox("Hapus proyek ini beserta semua milestone, tugas, dan komentarnya? Tindakan ini tidak dapat dibatalkan.", "Hapus proyek", async () => {
      await api("projectDelete", { id: p.id }); S.projects = S.projects.filter(x => x.id !== p.id); S.tasks = S.tasks.filter(t => t.project_id !== p.id); S.milestones = S.milestones.filter(m => m.project_id !== p.id);
      toast("Proyek dihapus."); location.hash = "#/proyek";
    });
  }
  function milestoneForm(p, m) {
    const isNew = !m; m = m || { weight: 0, deliverable: false };
    const others = msOf(p.id).filter(x => x.id !== m.id).reduce((a, x) => a + x.weight, 0);
    openModal('<h3>' + (isNew ? "Milestone baru" : "Ubah milestone") + '</h3><form id="mForm" novalidate>' +
      '<label class="field"><span>Nama milestone atau tahap</span><input class="in" name="name" required value="' + esc(m.name || "") + '"></label>' +
      '<div class="grid2"><label class="field"><span>Bobot (%)</span><input class="in" type="number" min="0" max="100" name="weight" value="' + (isNew ? Math.max(0, 100 - others) : m.weight) + '"><small class="muted">Milestone lain: ' + others + "%. Total sebaiknya 100%.</small></label>" +
      '<label class="field"><span>Target selesai</span><input class="in" type="date" name="due" value="' + esc(m.due || "") + '"></label></div>' +
      '<label class="check"><input type="checkbox" name="deliverable"' + (m.deliverable ? " checked" : "") + "> Milestone ini menghasilkan deliverable (keluaran yang diserahkan)</label>" +
      '<p class="err" id="mErr"></p><div class="m-acts">' + (!isNew ? '<button class="btn danger" type="button" id="mDel" style="margin-right:auto">Hapus</button>' : "") +
      '<button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">Simpan</button></div></form>');
    $("mForm").onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      const row = { id: m.id, project_id: p.id, name: f.name.value, weight: f.weight.value, due: f.due.value, deliverable: f.deliverable.checked, order: m.order };
      if (!row.name.trim()) { $("mErr").textContent = "Nama milestone wajib diisi."; return; }
      await run(f.querySelector('[type="submit"]'), async () => {
        const j = await api("milestoneSave", { row });
        const i = S.milestones.findIndex(x => x.id === j.milestone.id); if (i >= 0) S.milestones[i] = j.milestone; else S.milestones.push(j.milestone);
        closeModal(); toast("Milestone disimpan."); route(true);
      });
    };
    if ($("mDel")) $("mDel").onclick = () => confirmBox("Hapus milestone ini? Tugas di dalamnya tetap ada, tetapi tidak lagi masuk milestone mana pun.", "Hapus milestone", async () => {
      await api("milestoneDelete", { id: m.id }); S.milestones = S.milestones.filter(x => x.id !== m.id); S.tasks.forEach(t => { if (t.milestone_id === m.id) t.milestone_id = ""; });
      toast("Milestone dihapus."); route(true);
    });
  }

  /* ============================================================
     TASK DRAWER
     ============================================================ */
  let D = null;   /* drawer state: { t, isNew, dirty, mentions } */
  function openTask(id, preset) {
    let t = id ? S.tasks.find(x => x.id === id) : null;
    if (id && !t) { toast("Tugas tidak ditemukan atau Anda tidak memiliki akses.", true); return; }
    const isNew = !t;
    if (isNew) t = Object.assign({ id: "", title: "", description: "", status: "belum", priority: "sedang", labels: [], checklist: [], attachments: [], start: "", due: "", est_hours: 0, assignee_uid: "", milestone_id: "" }, preset || {});
    const p = proj(t.project_id); if (!p) return;
    D = { t: JSON.parse(JSON.stringify(t)), isNew, dirty: false, mentions: [] };
    const full = isNew ? canCreate(p) : canCreate(p);           /* full edit rights on the task fields */
    const edit = isNew || canEditTask(t);
    const team = [...new Set([p.lead_uid].concat(p.members || []))];
    const pool = S.users.filter(u => u.status === "aktif" && (team.includes(u.id) || SEE_ALL.includes(u.role) || canManage(p)));
    const mss = msOf(p.id);
    const dis = full ? "" : " disabled";
    const dr = $("drawer");
    dr.innerHTML = '<div class="dr-h"><span class="crumb">' + esc(p.name) + (isNew ? ": tugas baru" : "") + '</span>' + (!isNew && canDeleteTask(t) ? '<button class="icon-btn" id="dDel" type="button" aria-label="Hapus tugas" title="Hapus tugas">' + ic("trash") + "</button>" : "") +
      '<button class="icon-btn" id="dClose" type="button" aria-label="Tutup">' + ic("close") + "</button></div>" +
      '<div class="dr-b"><div><label class="sr-only" for="dTitle">Judul tugas</label><textarea class="title-in" id="dTitle" rows="1" placeholder="Judul tugas"' + dis + ">" + esc(t.title) + "</textarea></div>" +
      '<div><div class="dlabel"><span>Status</span>' + (!isNew ? dueBadge(t.due, t.status === "selesai") : "") + '</div><div class="stseg" id="dStatus" role="group" aria-label="Status">' +
      STATUS.map(([k, l]) => '<button type="button" data-s="' + k + '" style="--c:var(--s-' + k + ')" aria-pressed="' + (t.status === k) + '"' + (edit ? "" : " disabled") + ">" + l + "</button>").join("") + "</div></div>" +
      '<div class="props">' +
      '<label class="field"><span>Penanggung jawab</span><select class="in" id="dWho"' + dis + '><option value="">Belum ditentukan</option>' + pool.map(u => '<option value="' + u.id + '"' + (u.id === t.assignee_uid ? " selected" : "") + ">" + esc(u.name) + "</option>").join("") +
      (t.assignee_uid && !pool.find(u => u.id === t.assignee_uid) ? '<option value="' + t.assignee_uid + '" selected>' + esc(uName(t.assignee_uid)) + "</option>" : "") + "</select></label>" +
      '<label class="field"><span>Milestone</span><select class="in" id="dMs"' + dis + '><option value="">Tanpa milestone</option>' + mss.map(m => '<option value="' + m.id + '"' + (m.id === t.milestone_id ? " selected" : "") + ">" + esc(m.name) + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Mulai</span><input class="in" type="date" id="dStart" value="' + esc(t.start || "") + '"' + dis + "></label>" +
      '<label class="field"><span>Tenggat</span><input class="in" type="date" id="dDue" value="' + esc(t.due || "") + '"' + dis + "></label>" +
      '<label class="field"><span>Prioritas</span><select class="in" id="dPrio"' + dis + ">" + PRIO.map(([k, l]) => '<option value="' + k + '"' + (k === t.priority ? " selected" : "") + ">" + l + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Perkiraan jam kerja</span><input class="in" type="number" min="0" step="0.5" id="dHours" value="' + (t.est_hours || "") + '"' + dis + "></label>" +
      '<label class="field full"><span>Label (pisahkan dengan koma)</span><input class="in" id="dLabels" value="' + esc(t.labels.join(", ")) + '" placeholder="mis. lapangan, analisis"' + dis + "></label>" +
      '<label class="field full"><span>Deskripsi</span><textarea class="in" id="dDesc" placeholder="Apa yang perlu dikerjakan, hasil yang diharapkan, rujukan"' + dis + ">" + esc(t.description || "") + "</textarea></label></div>" +
      (full ? "" : '<p class="note">Anda dapat memperbarui status, checklist, lampiran, dan komentar. Detail tugas diatur oleh tim proyek.</p>') +
      '<div><div class="dlabel"><span>Checklist</span><span id="dClN"></span></div><div class="cl" id="dCl"></div>' + (edit ? '<div class="cl-add"><input class="in" id="dClIn" placeholder="Tambah butir checklist"><button class="btn ghost small" id="dClAdd" type="button">Tambah</button></div>' : "") + "</div>" +
      '<div><div class="dlabel"><span>Lampiran dari Google Drive</span></div><div class="att" id="dAtt"></div>' + (edit ? '<div class="att-add"><input class="in" id="dAttName" placeholder="Nama dokumen"><input class="in" id="dAttUrl" placeholder="Tautan https://drive.google.com" inputmode="url"><button class="btn ghost small" id="dAttAdd" type="button">Lampirkan</button></div>' : "") + "</div>" +
      (isNew ? "" : '<div id="dHrs"></div>' + COMMENTS_HTML) + "</div>" +
      '<div class="dr-f"><span class="dirty-note" id="dDirty"></span><div style="display:flex;gap:8px;margin-left:auto"><button class="btn ghost" type="button" id="dCancel">' + (isNew ? "Batal" : "Tutup") + '</button>' +
      (full || isNew ? '<button class="btn" type="button" id="dSave"' + (isNew ? "" : " hidden") + ">" + (isNew ? "Buat tugas" : "Simpan perubahan") + "</button>" : "") + "</div></div>";
    dr.hidden = false; $("scrim").hidden = false; document.body.style.overflow = "hidden";
    const title = $("dTitle"), grow = () => { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; };
    grow(); title.addEventListener("input", grow);
    if (isNew) setTimeout(() => title.focus(), 60);
    const markDirty = () => { if (D.isNew) return; D.dirty = true; $("dDirty").textContent = "Ada perubahan yang belum disimpan"; if ($("dSave")) $("dSave").hidden = false; };
    ["dTitle", "dWho", "dMs", "dStart", "dDue", "dPrio", "dHours", "dLabels", "dDesc"].forEach(i => $(i).addEventListener("input", markDirty));
    $("dClose").onclick = () => closeDrawer(); $("dCancel").onclick = () => closeDrawer();
    if ($("dDel")) $("dDel").onclick = () => confirmBox("Hapus tugas ini beserta komentarnya?", "Hapus tugas", async () => {
      await api("taskDelete", { id: t.id }); S.tasks = S.tasks.filter(x => x.id !== t.id); closeDrawer(true); toast("Tugas dihapus."); route(true);
    });
    /* status: saved at once for an existing task */
    $("dStatus").querySelectorAll("button").forEach(b => (b.onclick = async () => {
      D.t.status = b.dataset.s;
      $("dStatus").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      if (!D.isNew) await quickSave({ status: D.t.status }, "Status: " + STATUS_L[D.t.status]);
    }));
    drawChecklist(edit); drawAttachments(edit);
    if ($("dClAdd")) { const add = async () => { const v = $("dClIn").value.trim(); if (!v) return; D.t.checklist.push({ t: v, d: false }); $("dClIn").value = ""; drawChecklist(edit); if (!D.isNew) await quickSave({ checklist: D.t.checklist }); };
      $("dClAdd").onclick = add; $("dClIn").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); add(); } }; }
    if ($("dAttAdd")) $("dAttAdd").onclick = async () => {
      const url = $("dAttUrl").value.trim(), name = $("dAttName").value.trim() || "Dokumen";
      if (!/^https:\/\//.test(url)) { toast("Tautan harus diawali https://", true); return; }
      D.t.attachments.push({ name, url }); $("dAttUrl").value = ""; $("dAttName").value = ""; drawAttachments(edit);
      if (!D.isNew) await quickSave({ attachments: D.t.attachments }, "Lampiran ditambahkan.");
    };
    if ($("dSave")) $("dSave").onclick = () => saveTask();
    if (!isNew) { mountComments(t.id, team); drawHours(t); }
  }
  /* hours logged on a task (timesheet), with a quick entry for the signed-in person */
  function drawHours(t) {
    const box = $("dHrs"); if (!box) return;
    const done = S.hours[t.id] || 0, est = t.est_hours || 0, pct = est ? Math.min(100, Math.round(done / est * 100)) : 0;
    box.innerHTML = '<div class="dlabel"><span>Jam kerja</span><span class="num">' + fmtNum(done) + " jam tercatat" + (est ? " dari perkiraan " + fmtNum(est) + " jam" : "") + "</span></div>" +
      (est ? '<div class="bar thin" style="margin-bottom:10px"><i style="width:' + pct + "%;background:" + (done > est ? "var(--late)" : "var(--teal)") + '"></i></div>' : "") +
      '<div class="hrs-add"><input class="in" type="date" id="hDate" value="' + S.today + '" aria-label="Tanggal"><input class="in" type="number" id="hH" min="0.25" max="24" step="0.25" placeholder="Jam" aria-label="Jumlah jam">' +
      '<input class="in" id="hNote" placeholder="Catatan singkat (opsional)" aria-label="Catatan"><button class="btn ghost small" type="button" id="hAdd">Catat jam</button></div>';
    $("hAdd").onclick = () => run($("hAdd"), async () => {
      const h = Number($("hH").value);
      if (!(h > 0 && h <= 24)) { toast("Isi jumlah jam antara 0 dan 24.", true); return; }
      await api("regSave", { reg: "timesheet", row: { task_id: t.id, date: $("hDate").value, hours: h, note: $("hNote").value } });
      S.hours[t.id] = (S.hours[t.id] || 0) + h; S.summary.week_hours = (S.summary.week_hours || 0) + h;
      drawHours(t); toast(fmtNum(h) + " jam dicatat.");
    });
  }
  const fmtNum = n => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n || 0);
  K.fmtNum = fmtNum;
  function formRow() {
    return { title: $("dTitle").value.trim(), assignee_uid: $("dWho").value, milestone_id: $("dMs").value, start: $("dStart").value, due: $("dDue").value, priority: $("dPrio").value,
      est_hours: $("dHours").value, labels: $("dLabels").value.split(",").map(s => s.trim()).filter(Boolean), description: $("dDesc").value };
  }
  async function saveTask() {
    const r = formRow();
    if (!r.title) { toast("Judul tugas wajib diisi.", true); $("dTitle").focus(); return; }
    if (r.start && r.due && r.start > r.due) { toast("Tanggal mulai tidak boleh setelah tenggat.", true); return; }
    const row = Object.assign(r, { status: D.t.status, checklist: D.t.checklist, attachments: D.t.attachments });
    if (D.isNew) row.project_id = D.t.project_id; else row.id = D.t.id;
    await run($("dSave"), async () => {
      const j = await api("taskSave", { row });
      upsertTask(j.task, j.members);
      toast(D.isNew ? "Tugas dibuat." : "Perubahan disimpan.");
      closeDrawer(true); route(true);
    });
  }
  async function quickSave(patch, msg) {
    try {
      const j = await api("taskSave", { row: Object.assign({ id: D.t.id }, patch) });
      upsertTask(j.task, j.members); if (msg) toast(msg); route(true);
      const db = document.querySelector("#drawer .dlabel .due"); if (db) db.outerHTML = dueBadge(j.task.due, j.task.status === "selesai");
    } catch (e) { toast(e.message, true); }
  }
  function upsertTask(t, members) {
    const i = S.tasks.findIndex(x => x.id === t.id); if (i >= 0) S.tasks[i] = t; else S.tasks.push(t);
    if (members) { const p = proj(t.project_id); if (p) p.members = members; }
  }
  function drawChecklist(edit) {
    const cl = D.t.checklist, done = cl.filter(c => c.d).length;
    $("dClN").textContent = cl.length ? done + "/" + cl.length : "";
    $("dCl").innerHTML = cl.length ? cl.map((c, i) => '<div class="cl-i' + (c.d ? " d" : "") + '"><input type="checkbox" data-i="' + i + '"' + (c.d ? " checked" : "") + (edit ? "" : " disabled") + ' aria-label="Selesai"><span>' + esc(c.t) + "</span>" +
      (edit ? '<button class="icon-btn x" type="button" data-x="' + i + '" aria-label="Hapus butir" style="width:32px;height:32px">' + ic("close") + "</button>" : "<span></span>") + "</div>").join("") : '<p class="muted small">Belum ada butir.</p>';
    $("dCl").querySelectorAll("input").forEach(x => (x.onchange = async () => { cl[x.dataset.i].d = x.checked; drawChecklist(edit); if (!D.isNew) await quickSave({ checklist: cl }); }));
    $("dCl").querySelectorAll("[data-x]").forEach(x => (x.onclick = async () => { cl.splice(Number(x.dataset.x), 1); drawChecklist(edit); if (!D.isNew) await quickSave({ checklist: cl }); }));
  }
  function drawAttachments(edit) {
    const a = D.t.attachments;
    $("dAtt").innerHTML = a.length ? a.map((x, i) => '<div class="att-row"><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + ic("clip") + "<span>" + esc(x.name) + "</span></a>" +
      (edit ? '<button class="icon-btn" type="button" data-x="' + i + '" aria-label="Hapus lampiran" style="width:32px;height:32px">' + ic("close") + "</button>" : "<span></span>") + "</div>").join("") : '<p class="muted small">Belum ada lampiran.</p>';
    $("dAtt").querySelectorAll("[data-x]").forEach(x => (x.onclick = async () => { a.splice(Number(x.dataset.x), 1); drawAttachments(edit); if (!D.isNew) await quickSave({ attachments: a }, "Lampiran dihapus."); }));
  }
  const mentionHtml = body => { let h = esc(body); S.users.slice().sort((a, b) => b.name.length - a.name.length).forEach(u => { h = h.split("@" + esc(u.name)).join('<span class="mention">@' + esc(u.name) + "</span>"); }); return h; };
  let CM = null;   /* comment box state: { id, mentions } */
  const COMMENTS_HTML = '<div><div class="dlabel"><span>Komentar</span></div><div class="comments" id="dCm"><p class="muted small">Memuat komentar</p></div>' +
    '<div class="cm-in" style="margin-top:12px"><textarea class="in" id="dCmIn" rows="2" placeholder="Tulis komentar. Ketik @ untuk menyebut anggota tim."></textarea><div class="mpick" id="dPick" role="listbox" hidden></div><div style="display:flex;justify-content:flex-end"><button class="btn small" id="dCmSend" type="button">Kirim komentar</button></div></div>' +
    '<div class="actlog" id="dLog" style="margin-top:14px"></div></div>';
  function mountComments(id, team) { CM = { id, mentions: [] }; loadComments(id); bindMentions(team); }
  const ACT = [["status ", "mengubah status menjadi "], ["buat tugas", "membuat tugas"], ["ubah tugas", "mengubah tugas"], ["tahap ", "memindahkan ke tahap "], ["buat konten", "membuat item ini"], ["ubah konten", "mengubah item ini"]];
  async function loadComments(tid) {
    try {
      const j = await api("comments", { task_id: tid });
      if (!CM || CM.id !== tid) return;
      $("dCm").innerHTML = j.comments.length ? j.comments.map(c => '<div class="cm">' + avatar(c.uid, "") + '<div><div class="h"><b>' + esc(uName(c.uid)) + "</b> <span>" + esc(fmtTime(c.created)) + "</span>" + '</div><div class="b">' + mentionHtml(c.body) + "</div></div></div>").join("") : '<p class="muted small">Belum ada komentar.</p>';
      $("dLog").innerHTML = j.activity.length ? "<b>Riwayat</b>" + j.activity.slice().reverse().map(a => "<span>" + esc(fmtTime(a.ts)) + ": " + esc(uName(a.uid)) + " " + esc(ACT.reduce((s, [x, y]) => s.indexOf(x) === 0 ? y + s.slice(x.length) : s, a.action)) + "</span>").join("") : "";
    } catch (e) { $("dCm").innerHTML = '<p class="err">' + esc(e.message) + "</p>"; }
  }
  function bindMentions(team) {
    const ta = $("dCmIn"), pick = $("dPick");
    const pool = S.users.filter(u => u.status === "aktif" && u.id !== S.me.id && (team.includes(u.id) || SEE_ALL.includes(u.role)));
    let idx = 0, items = [];
    const at = () => { const pos = ta.selectionStart, m = ta.value.slice(0, pos).match(/@([^\s@]{0,20})$/); return m ? { q: m[1].toLowerCase(), from: pos - m[0].length, to: pos } : null; };
    const close = () => { pick.hidden = true; items = []; };
    const choose = u => { const a = at(); if (!a) return; ta.value = ta.value.slice(0, a.from) + "@" + u.name + " " + ta.value.slice(a.to); const c = a.from + u.name.length + 2; ta.setSelectionRange(c, c); CM.mentions.push(u); close(); ta.focus(); };
    const show = () => {
      const a = at(); if (!a) return close();
      items = pool.filter(u => u.name.toLowerCase().split(/\s+/).some(w => w.startsWith(a.q)) || u.name.toLowerCase().startsWith(a.q)).slice(0, 8);
      if (!items.length) return close();
      idx = Math.min(idx, items.length - 1);
      pick.innerHTML = items.map((u, i) => '<button type="button" role="option" aria-selected="' + (i === idx) + '" data-u="' + u.id + '">' + avatar(u.id, "sm") + esc(u.name) + ' <small class="muted">' + ROLE[u.role] + "</small></button>").join("");
      pick.hidden = false;
      pick.querySelectorAll("button").forEach(b => b.onmousedown = e => { e.preventDefault(); choose(user(b.dataset.u)); });
    };
    ta.addEventListener("input", () => { idx = 0; show(); });
    ta.addEventListener("keydown", e => {
      if (pick.hidden) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("dCmSend").click(); } return; }
      if (e.key === "ArrowDown") { e.preventDefault(); idx = (idx + 1) % items.length; show(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; show(); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); choose(items[idx]); }
      else if (e.key === "Escape") { e.stopPropagation(); close(); }
    });
    ta.addEventListener("blur", () => setTimeout(close, 150));
    $("dCmSend").onclick = () => run($("dCmSend"), async () => {
      const body = ta.value.trim(); if (!body) return;
      const mentions = [...new Set(CM.mentions.filter(u => body.includes("@" + u.name)).map(u => u.id))];
      await api("commentAdd", { task_id: CM.id, body, mentions });
      ta.value = ""; CM.mentions = []; S.ccount[CM.id] = (S.ccount[CM.id] || 0) + 1;
      loadComments(CM.id); toast(mentions.length ? "Komentar terkirim, " + mentions.length + " orang diberi tahu." : "Komentar terkirim.");
    });
  }
  function closeDrawer(force) {
    if (!force && ((D && D.dirty) || (K.extDirty && K.extDirty()))) { confirmBox("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?", "Tutup tanpa menyimpan", async () => closeDrawer(true)); return; }
    $("drawer").hidden = true; $("drawer").innerHTML = ""; $("scrim").hidden = true; document.body.style.overflow = ""; D = null; CM = null; K.extDirty = null;
    if (/[?&][tk]=/.test(location.hash)) history.replaceState(null, "", location.hash.replace(/([?&])[tk]=[^&]*&?/, "$1").replace(/[?&]$/, ""));
  }
  $("scrim").onclick = () => closeDrawer();
  Object.assign(K, { closeDrawer, mountComments, COMMENTS_HTML, sel: (...a) => sel(...a) });
  addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("modal").hidden) closeModal(); else if (!$("drawer").hidden) closeDrawer(); } });

  /* ============================================================
     MODAL
     ============================================================ */
  let lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    $("modalCard").innerHTML = html; $("modal").hidden = false;
    $("modalCard").querySelectorAll("[data-close]").forEach(b => (b.onclick = closeModal));
    const f = $("modalCard").querySelector("input,select,textarea,button"); if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { $("modal").hidden = true; $("modalCard").innerHTML = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("modal").addEventListener("click", e => { if (e.target === $("modal")) closeModal(); });
  function confirmBox(text, okLabel, fn) {
    openModal('<h3>Konfirmasi</h3><p>' + esc(text) + '</p><div class="m-acts"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn danger" type="button" id="cOk">' + esc(okLabel) + "</button></div>");
    $("cOk").onclick = async () => { await run($("cOk"), async () => { closeModal(); await fn(); }); };
  }
  Object.assign(K, { openModal, closeModal, confirmBox });

  /* ============================================================
     MY TASKS
     ============================================================ */
  function viewMine(v) {
    setTop("Tugas saya");
    const mine = S.tasks.filter(t => t.assignee_uid === S.me.id);
    const open = mine.filter(t => t.status !== "selesai").sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
    const g = [["Terlambat", open.filter(isLate)], ["Hari ini", open.filter(t => t.due && diffDays(t.due) === 0)], ["7 hari ke depan", open.filter(t => t.due && diffDays(t.due) > 0 && diffDays(t.due) <= 7)],
      ["Nanti", open.filter(t => t.due && diffDays(t.due) > 7)], ["Tanpa tenggat", open.filter(t => !t.due)]];
    const done = mine.filter(t => t.status === "selesai").sort((a, b) => String(b.done_at).localeCompare(String(a.done_at))).slice(0, 15);
    const row = t => '<button class="trow" type="button" data-task="' + t.id + '"><span class="chip st st-' + t.status + '">' + STATUS_L[t.status] + '</span><span style="min-width:0"><span class="t">' + esc(t.title) + '</span><span class="p">' + esc((proj(t.project_id) || {}).name || "") + "</span></span>" + dueBadge(t.due, t.status === "selesai") + "</button>";
    v.innerHTML = (open.length ? g.filter(x => x[1].length).map(([h, l]) => '<section class="sec"><div class="sec-h"><h2>' + h + ' <span class="muted small">' + l.length + '</span></h2></div><div class="panel">' + l.map(row).join("") + "</div></section>").join("")
      : '<div class="panel empty"><strong>Tidak ada tugas terbuka</strong>Tugas yang ditugaskan kepada Anda akan muncul di sini.</div>') +
      (done.length ? '<section class="sec" style="margin-top:28px"><div class="sec-h"><h2>Baru selesai</h2></div><div class="panel">' + done.map(row).join("") + "</div></section>" : "");
    bindRows(v);
  }

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */
  function viewNotifications(v) {
    setTop("Notifikasi");
    const n = S.notifications, kindIcon = { tugas: "task", sebutan: "chat", tenggat: "flag", terlambat: "alert", proyek: "proj", persetujuan: "check" };
    v.innerHTML = '<div class="sec-h"><p class="muted">Pemberitahuan saat Anda ditugaskan, disebut di komentar, dan saat tenggat mendekat atau terlewat.</p>' + (unread() ? '<button class="btn ghost small" id="nAll" type="button">Tandai semua dibaca</button>' : "") + "</div>" +
      '<div class="panel nlist">' + (n.length ? n.map(x => '<button class="n' + (x.read ? "" : " unread") + '" type="button" data-n="' + esc(x.id) + '"><span class="nic ' + esc(x.kind) + '">' + ic(kindIcon[x.kind] || "bell") + '</span><span><span class="tx">' + esc(x.text) + '</span><br><span class="small muted">' + esc(fmtTime(x.created)) + "</span></span>" + (x.read ? "" : '<span class="due today">Baru</span>') + "</button>").join("")
        : '<div class="empty"><strong>Belum ada notifikasi</strong>Semua kabar penting tentang tugas Anda akan muncul di sini.</div>') + "</div>";
    if ($("nAll")) $("nAll").onclick = () => run($("nAll"), async () => { await api("notifRead", { ids: "all" }); S.notifications.forEach(x => (x.read = true)); buildNav(); route(true); });
    v.querySelectorAll("[data-n]").forEach(b => (b.onclick = async () => {
      const x = S.notifications.find(y => y.id === b.dataset.n);
      if (!x.read) { x.read = true; buildNav(); api("notifRead", { ids: [x.id] }).catch(() => {}); }
      const [kind, id] = String(x.link || "").split(":");
      if (kind === "task") { const t = S.tasks.find(y => y.id === id); if (t) { location.hash = "#/proyek/" + t.project_id + "/papan?t=" + id; } else toast("Tugas ini sudah tidak tersedia.", true); }
      else if (kind === "project") location.hash = "#/proyek/" + id;
      else if (kind === "konten") { if (S.konten.find(y => y.id === id)) location.hash = "#/konten?k=" + id; else toast("Item ini sudah tidak tersedia.", true); }
      else if (kind === "fin") location.hash = "#/keuangan/" + id + (x.link.split(":")[2] ? "?id=" + x.link.split(":")[2] : "");
      else if (kind === "admin") location.hash = "#/administrasi/" + id + (x.link.split(":")[2] ? "?id=" + x.link.split(":")[2] : "");
    }));
  }

  /* ============================================================
     USERS (superadmin manages, direktur views)
     ============================================================ */
  function viewUsers(v) {
    setTop("Pengguna");
    const sup = S.me.role === "superadmin";
    if (!(sup || S.me.role === "direktur")) { v.innerHTML = '<div class="panel empty">Halaman ini khusus superadmin dan direktur.</div>'; return; }
    const list = S.users.slice().sort((a, b) => (a.status !== "aktif") - (b.status !== "aktif") || Object.keys(ROLE).indexOf(a.role) - Object.keys(ROLE).indexOf(b.role) || a.name.localeCompare(b.name));
    v.innerHTML = '<div class="sec-h"><p class="muted">' + list.filter(u => u.status === "aktif").length + " akun aktif. " + (sup ? "Akun baru menerima password sementara yang wajib diganti saat masuk pertama kali." : "") + "</p>" + (sup ? '<button class="btn" id="uNew" type="button">' + ic("plus") + "Tambah pengguna</button>" : "") + "</div>" +
      '<div class="panel"><table class="utable"><thead><tr><th>Nama</th><th>Peran</th><th class="hide-sm">Email</th><th class="hide-sm">Terakhir masuk</th>' + (sup ? "<th></th>" : "") + "</tr></thead><tbody>" +
      list.map(u => '<tr class="' + (u.status === "aktif" ? "" : "off") + '"><td><div class="who">' + avatar(u.id, "") + "<div><b>" + esc(u.name) + '</b><br><span class="small muted">' + esc(u.title || "") + (u.status === "aktif" ? "" : ", nonaktif") + "</span></div></div></td>" +
        '<td><span class="role ' + u.role + '">' + ROLE[u.role] + '</span></td><td class="hide-sm">' + esc(u.email || "") + '</td><td class="hide-sm small muted">' + esc(u.last_login ? fmtTime(u.last_login) : "Belum pernah") + "</td>" +
        (sup ? '<td style="text-align:right"><button class="btn ghost small" type="button" data-u="' + u.id + '">Ubah</button></td>' : "") + "</tr>").join("") + "</tbody></table></div>";
    if ($("uNew")) $("uNew").onclick = () => userForm();
    v.querySelectorAll("[data-u]").forEach(b => (b.onclick = () => userForm(user(b.dataset.u))));
  }
  function userForm(u) {
    const isNew = !u; u = u || { role: "peneliti", status: "aktif" };
    openModal("<h3>" + (isNew ? "Tambah pengguna" : "Ubah pengguna") + '</h3><form id="mForm" novalidate>' +
      '<label class="field"><span>Nama lengkap</span><input class="in" name="name" required value="' + esc(u.name || "") + '"></label>' +
      '<label class="field"><span>Email (dipakai untuk masuk)</span><input class="in" type="email" name="email" required value="' + esc(u.email || "") + '"></label>' +
      '<div class="grid2"><label class="field"><span>Peran</span><select class="in" name="role">' + Object.keys(ROLE).map(k => '<option value="' + k + '"' + (k === u.role ? " selected" : "") + ">" + ROLE[k] + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Jabatan</span><input class="in" name="title" value="' + esc(u.title || "") + '" placeholder="mis. Peneliti senior"></label></div>' +
      '<div class="grid2"><label class="field"><span>Telepon (opsional)</span><input class="in" name="phone" value="' + esc(u.phone || "") + '" inputmode="tel"></label>' +
      (isNew ? "<span></span>" : '<label class="field"><span>Status akun</span><select class="in" name="status"><option value="aktif"' + (u.status === "aktif" ? " selected" : "") + '>Aktif</option><option value="nonaktif"' + (u.status !== "aktif" ? " selected" : "") + ">Nonaktif (tidak bisa masuk)</option></select></label>") + "</div>" +
      '<p class="note small">Superadmin dan direktur melihat semua proyek dan keuangan. Admin melihat semua proyek. Bendahara, peneliti, dan konsultan lepas hanya melihat proyek yang mereka ikuti; konsultan hanya dapat memperbarui tugas miliknya.</p>' +
      '<p class="err" id="mErr"></p><div class="m-acts">' + (!isNew ? '<button class="btn ghost" type="button" id="uReset" style="margin-right:auto">Reset password</button>' : "") +
      '<button class="btn ghost" type="button" data-close>Batal</button><button class="btn" type="submit">' + (isNew ? "Buat akun" : "Simpan") + "</button></div></form>");
    const showSecret = (pw, email) => openModal('<h3>Password sementara</h3><p>Berikan password ini kepada pemilik akun melalui saluran pribadi. Password hanya ditampilkan sekali dan wajib diganti saat masuk pertama kali.</p>' +
      '<div class="secret">' + esc(pw) + '</div><p class="small muted">Alamat masuk: ' + esc(location.origin + location.pathname) + "<br>Email: " + esc(email) + '</p><div class="m-acts"><button class="btn ghost" type="button" id="sCopy">Salin pesan</button><button class="btn" type="button" data-close>Selesai</button></div>');
    $("mForm").onsubmit = async e => {
      e.preventDefault(); const row = Object.fromEntries(new FormData(e.target)); if (!isNew) row.id = u.id; else row.status = "aktif";
      if (!row.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) { $("mErr").textContent = "Nama dan email yang benar wajib diisi."; return; }
      await run(e.target.querySelector('[type="submit"]'), async () => {
        const j = await api("userSave", { row });
        await load(true); buildNav(); route(true);
        if (j.temp_password) { showSecret(j.temp_password, row.email); bindCopy(j.temp_password, row.email); } else { closeModal(); toast("Akun disimpan."); }
      });
    };
    const bindCopy = (pw, email) => { $("sCopy").onclick = () => { const msg = "Akun Ruang Kerja CHARIS Anda sudah dibuat.\nAlamat: " + location.origin + location.pathname + "\nEmail: " + email + "\nPassword sementara: " + pw + "\nSilakan ganti password saat masuk pertama kali.";
      (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => toast("Pesan disalin."), () => toast("Salin manual dari kotak di atas.", true)); }; };
    if ($("uReset")) $("uReset").onclick = () => confirmBox("Buat password sementara baru untuk " + u.name + "? Password lama tidak berlaku lagi dan semua sesinya diakhiri.", "Reset password", async () => {
      const j = await api("userResetPw", { id: u.id }); showSecret(j.temp_password, u.email); bindCopy(j.temp_password, u.email);
    });
  }

  /* ============================================================
     PROFILE
     ============================================================ */
  function viewProfile(v) {
    setTop("Akun saya");
    v.innerHTML = '<div class="panel pad" style="display:flex;gap:16px;align-items:center;margin-bottom:20px;flex-wrap:wrap">' + avatar(S.me.id, "lg") + '<div style="flex:1;min-width:200px"><b style="font-size:17px">' + esc(S.me.name) + '</b><br><span class="muted">' + esc(S.me.email) + '</span></div><span class="role ' + S.me.role + '">' + ROLE[S.me.role] + "</span></div>" +
      (SEE_ALL.includes(S.me.role) ? '<a class="panel pad" href="../admin/" style="display:flex;gap:12px;align-items:center;margin-bottom:20px;text-decoration:none">' + ic("web") + "<span><b>Konten website</b><br><span class=\"small muted\">Berita, portofolio, mitra, dan permintaan laporan. Terbuka langsung tanpa masuk ulang.</span></span></a>" : "") +
      '<section class="panel pad" style="margin-bottom:20px"><h2 style="font-size:16px;margin-bottom:14px">Ganti password</h2><form id="pwForm" style="display:grid;gap:12px;max-width:420px" novalidate>' +
      '<label class="field"><span>Password saat ini</span><input class="in" type="password" id="pCur" autocomplete="current-password"></label>' +
      '<label class="field"><span>Password baru</span><input class="in" type="password" id="pNew" autocomplete="new-password"><small class="muted">Minimal 10 karakter, berisi huruf dan angka.</small></label>' +
      '<label class="field"><span>Ulangi password baru</span><input class="in" type="password" id="pNew2" autocomplete="new-password"></label><p class="err" id="pErr"></p><div><button class="btn" type="submit">Simpan password</button></div></form></section>' +
      '<button class="btn danger" id="pOut" type="button">' + ic("out") + "Keluar</button>";
    $("pwForm").onsubmit = async e => {
      e.preventDefault(); $("pErr").textContent = "";
      if ($("pNew").value !== $("pNew2").value) { $("pErr").textContent = "Kedua password baru belum sama."; return; }
      await run(e.target.querySelector("button"), async () => { await api("changePassword", { current: $("pCur").value, password: $("pNew").value }); e.target.reset(); toast("Password diganti."); });
    };
    $("pOut").onclick = async () => { try { await api("logout"); } catch (e) {} signOutLocal(); location.hash = ""; showGate("login", "Anda sudah keluar."); };
  }

  /* ---------- tooltip for small targets ---------- */
  document.addEventListener("mouseover", e => { const el = e.target.closest("[data-tip]"); const tip = $("tip"); if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false; const r = el.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, r.left) + "px"; tip.style.top = (r.bottom + 6) + "px"; });

  /* ---------- boot ---------- */
  if (token && API) start(); else showGate("login");
})();
