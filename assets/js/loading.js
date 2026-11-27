/* Loading indicator shared by the website, the admin panel and Ruang Kerja.
   Every fetch is counted. While anything is loading, a thin bar runs along the top of the screen
   (after a short delay, so fast requests do not flicker). When a request is slow, for example while
   the Apps Script server wakes up, a small "Memuat data" pill appears at the bottom of the screen.
   Background traffic (read and share counters, version checks, the Ruang Kerja sync every 20 s) is ignored. */
(function () {
  "use strict";
  if (window.CHARIS_LOADING || !window.fetch) return;
  const SHOW_AFTER = 220, PILL_AFTER = 1600, MIN_SHOW = 350;
  let pending = 0, shownAt = 0, tBar = 0, tPill = 0, tHide = 0, bar, pill, lastClick = null, lastAt = 0;
  const busyBtns = new Set();
  /* the button that started a request shows a small spinner until the request ends */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("button, .btn, [role=button]");
    if (b && !b.hasAttribute("data-no-ld")) { lastClick = b; lastAt = Date.now(); }
  }, true);
  document.addEventListener("submit", e => { const b = e.submitter || (e.target.querySelector && e.target.querySelector('[type="submit"]')); if (b) { lastClick = b; lastAt = Date.now(); } }, true);
  const lang = () => (document.documentElement.lang || "id").slice(0, 2) === "en" ? "en" : "id";
  const quiet = (url, body) => {
    const u = String(url || ""), b = typeof body === "string" ? body : "";
    return /[?&]action=(stats|track)\b/.test(u) || /"action"\s*:\s*"(track|stats|ping|version)"/.test(b) || /"op"\s*:\s*"(sync|presence|ping)"/.test(b) ||
      /(^|\/)exec\/?$/.test(u) && !b && !/\?/.test(u);
  };
  function build() {
    if (bar) return;
    bar = document.createElement("div"); bar.className = "ld-bar"; bar.setAttribute("aria-hidden", "true"); bar.innerHTML = "<i></i>";
    pill = document.createElement("div"); pill.className = "ld-pill"; pill.setAttribute("role", "status"); pill.setAttribute("aria-live", "polite");
    document.body.appendChild(bar); document.body.appendChild(pill);
  }
  function start() {
    pending++;
    if (lastClick && Date.now() - lastAt < 700 && lastClick.isConnected) { lastClick.classList.add("ld-btn"); lastClick.setAttribute("aria-busy", "true"); busyBtns.add(lastClick); lastClick = null; }
    if (pending > 1) return;
    clearTimeout(tHide);
    tBar = setTimeout(() => { build(); bar.classList.add("on"); shownAt = Date.now(); document.documentElement.setAttribute("aria-busy", "true"); }, SHOW_AFTER);
    tPill = setTimeout(() => { build(); pill.textContent = lang() === "en" ? "Loading data" : "Memuat data"; pill.classList.add("on"); }, PILL_AFTER);
  }
  function end() {
    pending = Math.max(0, pending - 1);
    if (pending) return;
    clearTimeout(tBar); clearTimeout(tPill);
    busyBtns.forEach(b => { b.classList.remove("ld-btn"); b.removeAttribute("aria-busy"); }); busyBtns.clear();
    if (!bar) return;
    const wait = shownAt ? Math.max(0, MIN_SHOW - (Date.now() - shownAt)) : 0;
    tHide = setTimeout(() => {
      if (pending) return;
      bar.classList.add("done"); pill.classList.remove("on"); document.documentElement.removeAttribute("aria-busy");
      setTimeout(() => { if (!pending) { bar.classList.remove("on", "done"); shownAt = 0; } }, 380);
    }, wait);
  }
  const orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (quiet(url, init && init.body)) return orig(input, init);
    start();
    let p;
    try { p = orig(input, init); } catch (e) { end(); throw e; }
    return p.then(r => { end(); return r; }, e => { end(); throw e; });
  };
  /* for work that is not a fetch, such as building a large page: CHARIS_LOADING.wrap(promise) */
  window.CHARIS_LOADING = { start, end, wrap: p => { start(); return Promise.resolve(p).finally(end); }, get busy() { return pending > 0; } };
})();
