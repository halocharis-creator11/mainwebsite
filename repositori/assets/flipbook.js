/* CHARIS flipbook: previews the first pages (max 5) of a report as a book.
   Used by the website (assets/js/app.js) and by each report page in repositori/.
   CharisFlipbook.open({ pages: [...image urls], title, requestUrl, readUrl, lang })
   Report pages: any element with data-flip-pages='["auto-p1.jpg", ...]' opens it on click. */
(function () {
  "use strict";
  if (window.CharisFlipbook) return;

  const L = {
    id: { page: "Halaman", of: "dari", cover: "Sampul", end: "Akhir pratinjau", prev: "Halaman sebelumnya", next: "Halaman berikutnya", close: "Tutup pratinjau",
          endT: n => "Pratinjau berakhir di halaman " + n, endD: "Halaman selanjutnya ada di PDF lengkap, yang kami kirim setelah permintaan Anda disetujui.",
          req: "Minta PDF lengkap", read: "Baca versi online", hint: "Klik halaman atau gunakan tombol panah untuk membalik", label: "Pratinjau halaman" },
    en: { page: "Page", of: "of", cover: "Cover", end: "End of preview", prev: "Previous page", next: "Next page", close: "Close preview",
          endT: n => "The preview ends at page " + n, endD: "The remaining pages are in the full PDF, which we send once your request is approved.",
          req: "Request full PDF", read: "Read online", hint: "Click a page or use the arrow keys to turn", label: "Page preview" }
  };

  const CSS = `
.fb{border:0;padding:0;margin:0;width:100vw;height:100vh;max-width:none;max-height:none;background:transparent;color:#fff;overflow:hidden}
.fb::backdrop{background:rgba(6,28,26,.92)}
.fb[open]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr)}
.fb-top{min-width:0;display:flex;align-items:center;gap:16px;padding:14px 20px;font:500 14px/1.3 "Plus Jakarta Sans",system-ui,sans-serif}
.fb-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}
.fb-count{color:#B9D2CF;white-space:nowrap}
.fb-x{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:22px;cursor:pointer;transition:background .2s}
.fb-x:hover,.fb-x:focus-visible{background:rgba(255,255,255,.24)}
.fb-stage{position:relative;display:grid;place-items:center;min-height:0;touch-action:pan-y}
.fb-book{position:relative;perspective:2600px;transition:transform .6s cubic-bezier(.3,.1,.2,1)}
.fb-leaf{position:absolute;left:50%;top:0;width:50%;height:100%;transform-origin:left center;transform-style:preserve-3d;transition:transform .75s cubic-bezier(.3,.1,.2,1);cursor:pointer}
.fb-leaf.flipped{transform:rotateY(-180deg)}
.fb-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;overflow:hidden;container-type:size;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.fb-face img{display:block;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
.fb-face::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,rgba(0,0,0,.16),rgba(0,0,0,0) 7%)}
.fb-back{transform:rotateY(180deg)}
.fb-back::after{background:linear-gradient(to left,rgba(0,0,0,.16),rgba(0,0,0,0) 7%)}
.fb-blank{background:#F3F6F5}
.fb-endp{background:#0E5A55;color:#fff;display:flex;flex-direction:column;justify-content:center;gap:4cqh;padding:9cqw;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
.fb-endp h3{font-size:clamp(14px,7cqw,30px);line-height:1.2;margin:0;font-weight:700}
.fb-endp p{font-size:clamp(11px,4.2cqw,17px);line-height:1.5;margin:0;color:#D6E6E4}
.fb-endp .fb-acts{display:flex;flex-direction:column;gap:2.5cqh;align-items:flex-start}
.fb-endp a{display:inline-block;font-weight:700;font-size:clamp(11px,4cqw,16px);padding:2.4cqh 6cqw;border-radius:6px;text-decoration:none;transition:transform .2s,background .2s}
.fb-endp a.fb-req{background:#E8833A;color:#fff}
.fb-endp a.fb-req:hover{background:#CF6F29;transform:translateY(-2px)}
.fb-endp a.fb-read{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6)}
.fb-endp a.fb-read:hover{background:rgba(255,255,255,.12)}
.fb-shapes{display:flex;gap:2cqw;align-items:flex-end}
.fb-shapes i{display:block;width:9cqw;height:9cqw;border-radius:1.6cqw;background:#32736E}
.fb-shapes i:nth-child(2){background:#6E9C99}.fb-shapes i:nth-child(3){border-radius:50%;background:#E8833A;margin-bottom:10cqw;margin-left:-11cqw}
.fb-single{position:relative}
.fb-single .fb-face{animation:fbIn .45s cubic-bezier(.3,.1,.2,1)}
.fb-single .fb-face.back-in{animation-name:fbBack}
@keyframes fbIn{from{opacity:0;transform:translateX(40px) rotateY(-12deg)}to{opacity:1;transform:none}}
@keyframes fbBack{from{opacity:0;transform:translateX(-40px) rotateY(12deg)}to{opacity:1;transform:none}}
.fb-nav{position:absolute;top:50%;width:52px;height:52px;margin-top:-26px;border-radius:50%;border:0;background:#fff;color:#0E5A55;font-size:24px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3);transition:transform .2s,opacity .2s;z-index:50}
.fb-nav:hover:not(:disabled){transform:scale(1.08)}
.fb-nav:disabled{opacity:0;pointer-events:none}
.fb-prev{left:20px}.fb-next{right:20px}
.fb-bottom{display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 16px 18px}
.fb-thumbs{display:flex;gap:8px;list-style:none;margin:0;padding:0}
.fb-thumbs button{display:block;width:40px;height:54px;padding:0;border:2px solid transparent;border-radius:4px;overflow:hidden;background:#fff;cursor:pointer;opacity:.55;transition:opacity .2s,border-color .2s,transform .2s}
.fb-thumbs button:hover{opacity:1;transform:translateY(-3px)}
.fb-thumbs button[aria-current="true"]{opacity:1;border-color:#E8833A}
.fb-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
.fb-thumbs .fb-t-end{background:#0E5A55;color:#fff;font:700 15px system-ui}
.fb-hint{font:400 12px "Plus Jakarta Sans",system-ui,sans-serif;color:#9DBAB7;margin:0}
@media (max-width:759px){.fb-nav{width:44px;height:44px;margin-top:-22px}.fb-prev{left:8px}.fb-next{right:8px}.fb-hint{display:none}.fb-thumbs button{width:32px;height:44px}}
@media (prefers-reduced-motion:reduce){.fb-leaf,.fb-book{transition:none}.fb-single .fb-face{animation:none}}
`;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let styled = false;
  function style() { if (styled) return; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); styled = true; }

  function open(opts) {
    const pages = (opts.pages || []).slice(0, 5);
    if (!pages.length || !window.HTMLDialogElement) return;
    style();
    const lang = (opts.lang || document.documentElement.lang || "id").slice(0, 2) === "en" ? "en" : "id";
    const T = L[lang];
    const n = pages.length;
    const faces = pages.map(src => ({ src })).concat([{ end: true }]);   /* last face: call to action */
    const F = faces.length, LEAVES = Math.ceil(F / 2);
    const back = document.activeElement;

    const d = document.createElement("dialog");
    d.className = "fb"; d.setAttribute("aria-label", T.label + ": " + (opts.title || ""));
    d.innerHTML =
      '<div class="fb-top"><span class="fb-title">' + esc(opts.title || "") + '</span><span class="fb-count" aria-live="polite"></span>' +
      '<button type="button" class="fb-x" aria-label="' + esc(T.close) + '">×</button></div>' +
      '<div class="fb-stage"><button type="button" class="fb-nav fb-prev" aria-label="' + esc(T.prev) + '">‹</button><div class="fb-holder"></div>' +
      '<button type="button" class="fb-nav fb-next" aria-label="' + esc(T.next) + '">›</button></div>' +
      '<div class="fb-bottom"><ol class="fb-thumbs">' +
      faces.map((f, i) => '<li><button type="button" data-face="' + i + '" aria-label="' + (f.end ? esc(T.end) : esc(T.page + " " + (i + 1))) + '"' + (f.end ? ' class="fb-t-end">✓' : '><img src="' + esc(f.src) + '" alt="">') + "</button></li>").join("") +
      '</ol><p class="fb-hint">' + esc(T.hint) + "</p></div>";
    document.body.appendChild(d);
    const holder = d.querySelector(".fb-holder"), count = d.querySelector(".fb-count");
    const prevB = d.querySelector(".fb-prev"), nextB = d.querySelector(".fb-next");

    const faceHTML = (f, cls) => {
      if (!f) return '<div class="fb-face fb-blank ' + (cls || "") + '"></div>';
      if (f.end) return '<div class="fb-face fb-endp ' + (cls || "") + '"><div class="fb-shapes"><i></i><i></i><i></i></div><h3>' + esc(T.endT(n)) + "</h3><p>" + esc(T.endD) + '</p><div class="fb-acts">' +
        (opts.requestUrl ? '<a class="fb-req" href="' + esc(opts.requestUrl) + '">' + esc(T.req) + "</a>" : "") +
        (opts.readUrl ? '<a class="fb-read" href="' + esc(opts.readUrl) + '">' + esc(T.read) + "</a>" : "") + "</div></div>";
      return '<div class="fb-face ' + (cls || "") + '"><img src="' + esc(f.src) + '" alt="' + esc(T.page) + " " + (faces.indexOf(f) + 1) + '" draggable="false"></div>';
    };

    let ratio = 210 / 297, mode = "", cur = 0, face = 0, book = null, leaves = [];
    const spread = () => window.innerWidth >= 760;

    function size() {
      const top = d.querySelector(".fb-top").offsetHeight, bottom = d.querySelector(".fb-bottom").offsetHeight;
      const H = window.innerHeight - top - bottom - 24, W = window.innerWidth - (spread() ? 160 : 24);
      let pw = spread() ? Math.min(H * ratio, W / 2) : Math.min(H * ratio, W);
      pw = Math.max(120, Math.floor(pw));
      const ph = Math.floor(pw / ratio);
      const el = holder.firstElementChild; if (!el) return;
      el.style.width = (spread() ? pw * 2 : pw) + "px"; el.style.height = ph + "px";
    }

    function build() {
      mode = spread() ? "spread" : "single";
      if (mode === "spread") {
        holder.innerHTML = '<div class="fb-book">' + Array.from({ length: LEAVES }, (_, i) =>
          '<div class="fb-leaf" data-leaf="' + i + '">' + faceHTML(faces[2 * i], "fb-front") + faceHTML(faces[2 * i + 1], "fb-back") + "</div>").join("") + "</div>";
        book = holder.firstElementChild; leaves = [...book.children];
        cur = Math.ceil(face / 2);
        leaves.forEach((lf, i) => { lf.classList.toggle("flipped", i < cur); lf.style.zIndex = i < cur ? i + 1 : LEAVES - i; });
        book.addEventListener("click", e => { if (e.target.closest("a")) return; const lf = e.target.closest(".fb-leaf"); if (!lf) return; (+lf.dataset.leaf < cur ? go(-1) : go(1)); });
      } else {
        holder.innerHTML = '<div class="fb-single"></div>';
        showSingle(0);
      }
      size(); update();
    }

    function showSingle(dir) {
      const box = holder.querySelector(".fb-single");
      box.innerHTML = faceHTML(faces[face], dir < 0 ? "back-in" : "");
      box.onclick = e => { if (e.target.closest("a")) return; const r = box.getBoundingClientRect(); go(e.clientX < r.left + r.width / 3 ? -1 : 1); };
    }

    function setLeaf(i, flipped, delay) {
      const lf = leaves[i]; if (!lf) return;
      setTimeout(() => {
        lf.style.zIndex = LEAVES + 2;                      /* the turning leaf rides on top */
        lf.classList.toggle("flipped", flipped);
        setTimeout(() => { lf.style.zIndex = flipped ? i + 1 : LEAVES - i; }, 760);
      }, delay);
    }

    function go(step) {
      if (mode === "spread") jumpLeaf(cur + step);
      else { const nf = Math.max(0, Math.min(F - 1, face + step)); if (nf === face) return; face = nf; showSingle(step); update(); }
    }

    function jumpLeaf(target) {
      target = Math.max(0, Math.min(LEAVES, target));
      if (target === cur) return;
      const fwd = target > cur; let k = 0;
      if (fwd) for (let i = cur; i < target; i++) setLeaf(i, true, k++ * 90);
      else for (let i = cur - 1; i >= target; i--) setLeaf(i, false, k++ * 90);
      cur = target; face = cur === 0 ? 0 : Math.min(F - 1, 2 * cur - 1);
      update();
    }

    function update() {
      let txt, active;
      if (mode === "spread") {
        const left = cur > 0 ? 2 * cur - 1 : -1, right = cur < LEAVES ? 2 * cur : -1;
        const vis = [left, right].filter(i => i >= 0 && i < F);
        active = vis;
        const pg = vis.filter(i => !faces[i].end).map(i => i + 1);
        txt = !pg.length ? T.end : T.page + " " + (pg.length > 1 ? pg[0] + "–" + pg[pg.length - 1] : pg[0]) + " " + T.of + " " + n;
        if (book) book.style.transform = cur === 0 ? "translateX(-25%)" : (right < 0 || right >= F) ? "translateX(25%)" : "none";
        prevB.disabled = cur === 0; nextB.disabled = cur >= LEAVES || 2 * cur >= F;
      } else {
        active = [face];
        txt = faces[face].end ? T.end : T.page + " " + (face + 1) + " " + T.of + " " + n;
        prevB.disabled = face === 0; nextB.disabled = face >= F - 1;
      }
      count.textContent = txt;
      d.querySelectorAll(".fb-thumbs button").forEach(b => b.setAttribute("aria-current", String(active.includes(+b.dataset.face))));
    }

    prevB.addEventListener("click", () => go(-1));
    nextB.addEventListener("click", () => go(1));
    d.querySelector(".fb-thumbs").addEventListener("click", e => {
      const b = e.target.closest("[data-face]"); if (!b) return;
      const f = +b.dataset.face;
      if (mode === "spread") jumpLeaf(Math.ceil(f / 2)); else { const dir = f > face ? 1 : -1; face = f; showSingle(dir); update(); }
    });
    d.addEventListener("keydown", e => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    });
    let sx = null;
    d.addEventListener("pointerdown", e => { sx = e.clientX; });
    d.addEventListener("pointerup", e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    const onResize = () => { if ((spread() ? "spread" : "single") !== mode) build(); else size(); };
    window.addEventListener("resize", onResize);
    const close = () => { if (d.open) d.close(); };
    d.querySelector(".fb-x").addEventListener("click", close);
    d.addEventListener("click", e => { if (e.target === d || e.target.classList.contains("fb-stage")) close(); });
    d.addEventListener("close", () => {
      window.removeEventListener("resize", onResize);
      d.remove(); document.documentElement.style.overflow = "";
      if (back && back.focus) back.focus();
    });

    document.documentElement.style.overflow = "hidden";
    d.showModal();
    build();
    d.querySelector(".fb-x").focus();
    const probe = new Image();
    probe.onload = () => { if (probe.naturalWidth) { ratio = probe.naturalWidth / probe.naturalHeight; size(); } };
    probe.src = pages[0];
    pages.slice(1).forEach(src => { const i = new Image(); i.src = src; });
  }

  window.CharisFlipbook = { open };

  /* report pages: elements carrying data-flip-pages */
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-flip-pages]"); if (!el) return;
    let pages = []; try { pages = JSON.parse(el.getAttribute("data-flip-pages")); } catch (err) { return; }
    if (!pages.length || !window.HTMLDialogElement) return;
    e.preventDefault();
    open({ pages, title: el.getAttribute("data-flip-title") || "", requestUrl: el.getAttribute("data-flip-request") || "", readUrl: el.getAttribute("data-flip-read") || "" });
  });
})();
