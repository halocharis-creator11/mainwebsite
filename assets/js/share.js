/* CHARIS share buttons and public counters (reads, downloads, shares).
   Used by the main website (assets/js/app.js) and by every repository page.
   Counters are stored by the Apps Script backend (tab "stats"); in demo mode they live in this browser only.
   Brand glyphs: Simple Icons (CC0). */
window.CharisShare = (function () {
  "use strict";
  const cfg = window.CHARIS_CONFIG || {};
  const API = cfg.API_URL || "";
  const ICON = {"wa":{"p":"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z","c":"#25D366"},"fb":{"p":"M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z","c":"#0866FF"},"x":{"p":"M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z","c":"#000000"},"tg":{"p":"M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z","c":"#26A5E4"},"li":{"p":"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z","c":"#0A66C2"}};
  const lang = () => (document.documentElement.lang === "en" ? "en" : "id");
  const tr = (id, en) => (lang() === "en" ? en : id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brand = k => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="' + ICON[k].c + '" d="' + ICON[k].p + '"/></svg>';
  const line = d => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
  const I = {
    share: line('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    mail: line('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    link: line('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    more: line('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>'),
    eye: line('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    down: line('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    x: line('<path d="M6 6l12 12M18 6 6 18"/>')
  };

  /* ---------- counters ---------- */
  let statsP = null;
  const demoKey = "charis_stats_demo";
  const demoGet = () => { try { return JSON.parse(localStorage.getItem(demoKey) || "{}"); } catch (e) { return {}; } };
  function stats() {
    if (statsP) return statsP;
    statsP = API
      ? fetch(API + "?action=stats").then(r => r.json()).then(j => (j && j.ok ? j.data : {})).catch(() => ({}))
      : Promise.resolve(demoGet());
    return statsP;
  }
  const FIELD = { read: "reads", download: "downloads", share: "shares" };
  const today = () => new Date().toISOString().slice(0, 10);
  function once(key) { try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, "1"); return true; } catch (e) { return true; } }
  function track(id, event) {
    if (!id || !FIELD[event]) return;
    if (event === "read" && !once("charis_read_" + id + "_" + today())) return;      /* one read per browser per day */
    stats().then(s => { s[id] = s[id] || {}; s[id][FIELD[event]] = (Number(s[id][FIELD[event]]) || 0) + 1; paint(); });
    if (API) {
      fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "track", id: id, event: event }) }).catch(() => {});
    } else { const d = demoGet(); d[id] = d[id] || {}; d[id][FIELD[event]] = (Number(d[id][FIELD[event]]) || 0) + 1; try { localStorage.setItem(demoKey, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  }
  const nf = v => new Intl.NumberFormat(lang() === "en" ? "en-GB" : "id-ID").format(Number(v) || 0);
  function statsHtml(s, noDownloads) {
    s = s || {};
    return '<span class="cs-stat" title="' + esc(tr("Dibaca", "Reads")) + '">' + I.eye + "<b>" + nf(s.reads) + "</b><span>" + esc(tr("dibaca", "reads")) + "</span></span>" +
      (noDownloads ? "" : '<span class="cs-stat" title="' + esc(tr("Diunduh (PDF lengkap)", "Downloads (full PDF)")) + '">' + I.down + "<b>" + nf(s.downloads) + "</b><span>" + esc(tr("diunduh", "downloads")) + "</span></span>") +
      '<span class="cs-stat" title="' + esc(tr("Dibagikan", "Shares")) + '">' + I.share + "<b>" + nf(s.shares) + "</b><span>" + esc(tr("dibagikan", "shares")) + "</span></span>";
  }
  /* fill every [data-stats-for] element on the page */
  function paint() {
    const els = document.querySelectorAll("[data-stats-for]");
    if (!els.length) return;
    stats().then(s => els.forEach(el => { el.innerHTML = statsHtml(s[el.dataset.statsFor], el.dataset.statsKind === "news"); el.classList.add("ready"); }));
  }

  /* ---------- share widget ---------- */
  function html(o) {
    return '<div class="cs-share' + (o.compact ? " compact" : "") + '" data-share-id="' + esc(o.id || "") + '" data-share-url="' + esc(o.url || "") + '" data-share-title="' + esc(o.title || "") + '">' +
      '<button type="button" class="cs-share-btn" data-share-open aria-expanded="false" aria-haspopup="true">' + I.share + '<span class="cs-lbl">' + esc(o.label || tr("Bagikan", "Share")) + "</span></button></div>";
  }
  const NETS = [
    ["wa", "WhatsApp", (u, t) => "https://wa.me/?text=" + encodeURIComponent(t + "\n" + u)],
    ["tg", "Telegram", (u, t) => "https://t.me/share/url?url=" + encodeURIComponent(u) + "&text=" + encodeURIComponent(t)],
    ["fb", "Facebook", u => "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(u)],
    ["x", "X", (u, t) => "https://x.com/intent/post?text=" + encodeURIComponent(t) + "&url=" + encodeURIComponent(u)],
    ["li", "LinkedIn", u => "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(u)],
    ["mail", "Email", (u, t) => "mailto:?subject=" + encodeURIComponent(t) + "&body=" + encodeURIComponent(t + "\n\n" + u)]
  ];
  let open = null;
  function close() {
    if (!open) return;
    const pop = open.querySelector(".cs-pop"); if (pop) pop.remove();
    const b = open.querySelector("[data-share-open]"); b.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cs-sheet-open");
    open = null;
  }
  function absUrl(box) { try { return new URL(box.dataset.shareUrl || location.href, location.href).href; } catch (e) { return location.href; } }
  function show(box) {
    close();
    const url = absUrl(box), title = box.dataset.shareTitle || document.title;
    const pop = document.createElement("div");
    pop.className = "cs-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", tr("Bagikan", "Share"));
    pop.innerHTML = '<div class="cs-pop-head"><strong>' + esc(tr("Bagikan", "Share")) + '</strong><button type="button" class="cs-x" data-share-close aria-label="' + esc(tr("Tutup", "Close")) + '">' + I.x + "</button></div>" +
      '<p class="cs-pop-title">' + esc(title) + "</p><ul>" +
      NETS.map(n => '<li><a href="' + esc(n[2](url, title)) + '" target="_blank" rel="noopener" data-share-net="' + n[0] + '">' + (n[0] === "mail" ? I.mail : brand(n[0])) + "<span>" + esc(n[1]) + "</span></a></li>").join("") +
      '<li><button type="button" data-share-copy>' + I.link + "<span>" + esc(tr("Salin tautan", "Copy link")) + "</span></button></li>" +
      (navigator.share ? '<li><button type="button" data-share-native>' + I.more + "<span>" + esc(tr("Aplikasi lain", "Other apps")) + "</span></button></li>" : "") +
      '</ul><p class="cs-pop-status" role="status"></p>';
    box.appendChild(pop);
    box.querySelector("[data-share-open]").setAttribute("aria-expanded", "true");
    if (window.matchMedia("(max-width: 600px)").matches) document.body.classList.add("cs-sheet-open");
    else {   /* keep the panel on screen */
      const r = pop.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) pop.classList.add("to-left");
      if (r.bottom > window.innerHeight - 8 && box.getBoundingClientRect().top > r.height + 16) pop.classList.add("to-top");
    }
    open = box;
    const first = pop.querySelector("a,button:not(.cs-x)"); if (first) first.focus({ preventScroll: true });
  }
  let lastShare = {};
  function counted(box) {
    const id = box.dataset.shareId; if (!id) return;
    if (lastShare[id] && Date.now() - lastShare[id] < 30000) return;   /* one share per item per 30 seconds */
    lastShare[id] = Date.now(); track(id, "share");
  }
  document.addEventListener("click", async e => {
    const opener = e.target.closest("[data-share-open]");
    if (opener) { e.preventDefault(); const box = opener.closest(".cs-share"); if (open === box) close(); else show(box); return; }
    if (!open) return;
    if (e.target.closest("[data-share-close]")) { const b = open.querySelector("[data-share-open]"); close(); b.focus(); return; }
    const net = e.target.closest("[data-share-net]");
    if (net) { counted(open); setTimeout(close, 50); return; }
    if (e.target.closest("[data-share-copy]")) {
      const box = open, st = box.querySelector(".cs-pop-status");
      try { await navigator.clipboard.writeText(absUrl(box)); st.textContent = tr("Tautan tersalin.", "Link copied."); counted(box); }
      catch (err) { st.textContent = absUrl(box); }
      return;
    }
    if (e.target.closest("[data-share-native]")) {
      const box = open;
      try { await navigator.share({ title: box.dataset.shareTitle, url: absUrl(box) }); counted(box); close(); } catch (err) { /* cancelled */ }
      return;
    }
    if (!e.target.closest(".cs-pop")) close();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && open) { const b = open.querySelector("[data-share-open]"); close(); b.focus(); } });
  document.addEventListener("charis:lang", () => { close(); paint(); });

  /* styles, injected once so the main site and every report page share one source */
  if (!document.getElementById("cs-style")) {
    const st = document.createElement("style"); st.id = "cs-style";
    st.textContent = ".cs-share{position:relative;display:inline-block}\n.cs-share-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 15px var(--font,Arial,sans-serif);min-height:44px;padding:10px 16px;border-radius:6px;border:2px solid var(--teal,#0E5A55);background:#fff;color:var(--teal,#0E5A55);cursor:pointer;width:100%}\n.cs-share-btn:hover{background:var(--mist,#EDF2F0)}\n.cs-share-btn svg{width:18px;height:18px}\n.cs-share.compact .cs-share-btn{min-height:36px;padding:6px 12px;font-size:14px;border-width:1.5px;width:auto}\n.cs-pop{position:absolute;z-index:60;top:calc(100% + 8px);left:0;width:280px;background:#fff;border:1px solid var(--rule,#D3DCD9);border-radius:12px;box-shadow:0 18px 40px rgba(8,48,45,.18);padding:14px 14px 10px;text-align:left}\n.cs-pop.to-left{left:auto;right:0}\n.cs-pop.to-top{top:auto;bottom:calc(100% + 8px)}\n.cs-pop-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}\n.cs-pop-head strong{font-size:15px;color:var(--ink,#142826)}\n.cs-x{border:0;background:none;color:var(--muted,#52615E);width:32px;height:32px;border-radius:50%;cursor:pointer;display:grid;place-items:center}\n.cs-x:hover{background:var(--mist,#EDF2F0)}\n.cs-x svg{width:18px;height:18px}\n.cs-pop-title{margin:0 0 10px;font-size:13px;line-height:1.4;color:var(--muted,#52615E);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.cs-pop ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:4px}\n.cs-pop li a,.cs-pop li button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:8px;border:0;background:none;font:500 14px var(--font,Arial,sans-serif);color:var(--ink,#142826);text-decoration:none;cursor:pointer;text-align:left}\n.cs-pop li a:hover,.cs-pop li button:hover,.cs-pop li a:focus-visible,.cs-pop li button:focus-visible{background:var(--mist,#EDF2F0)}\n.cs-pop li svg{width:20px;height:20px;flex:0 0 20px;color:var(--teal,#0E5A55)}\n.cs-pop-status{margin:6px 2px 0;font-size:13px;color:var(--teal,#0E5A55);min-height:1em;overflow-wrap:anywhere}\n.cs-stat{display:inline-flex;align-items:center;gap:6px;font-size:14px;color:var(--muted,#52615E);white-space:nowrap}\n.cs-stat svg{width:17px;height:17px;color:var(--teal-60,#6E9C99)}\n.cs-stat b{color:var(--ink,#142826);font-weight:700}\n[data-stats-for]:not(.ready){min-height:1.4em}\n@media (max-width:600px){\n body.cs-sheet-open::after{content:\"\";position:fixed;inset:0;background:rgba(8,30,28,.45);z-index:59}\n .cs-pop{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(14px + env(safe-area-inset-bottom));z-index:61}\n .cs-pop.to-left,.cs-pop.to-top{left:0;right:0;top:auto;bottom:0}\n .cs-pop li a,.cs-pop li button{padding:12px}\n}\n@media print{.cs-share,.cs-pop{display:none!important}}";
    (document.head || document.documentElement).appendChild(st);
  }

  return { html, track, stats, statsHtml, paint, close, icon: I };
})();
