/* CHARIS report page: table of contents, reading progress, citation tools. */
(function () {
  /* language: ?lang=, then the choice saved by the main website, then Indonesian */
  const html = document.documentElement;
  const getLang = () => (html.lang === "en" ? "en" : "id");
  let meta = {}; try { meta = JSON.parse(document.getElementById("charis-meta").textContent); } catch (e) { /* no metadata */ }
  const baseTitle = document.title;
  function applyLang(l, save) {
    html.lang = l;
    if (save) { try { localStorage.setItem("charis_lang", l); } catch (e) { /* private mode */ } }
    document.querySelectorAll("[data-setlang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.setlang === l)));
    if (meta.title_en && meta.bilingual) document.title = (l === "en" ? meta.title_en : meta.title_id) + " | CHARIS";
    else document.title = baseTitle;
    buildToc();
    document.dispatchEvent(new CustomEvent("charis:lang", { detail: l }));
  }
  document.querySelectorAll("[data-setlang]").forEach(b => b.addEventListener("click", () => applyLang(b.dataset.setlang, true)));

  /* table of contents from the visible h2/h3 */
  const content = document.getElementById("content"), toc = document.getElementById("toc");
  let io = null;
  function buildToc() {
    if (!content || !toc) return;
    const l = getLang();
    const heads = [...content.querySelectorAll("h2, h3")].filter(h => { const w = h.closest("[data-l]"); return !w || w.dataset.l === l; })
      .filter(h => !h.closest(".sim-box"));
    heads.forEach((h, i) => { if (!h.id) h.id = (l === "en" ? "section-" : "bagian-") + (i + 1); });
    if (io) io.disconnect();
    if (!heads.length) { toc.hidden = true; return; }
    toc.hidden = false;
    toc.innerHTML = "<p>" + (l === "en" ? "Contents" : "Daftar isi") + "</p><ol>" + heads.map(h => '<li class="' + (h.tagName === "H3" ? "sub" : "") + '"><a href="#' + h.id + '">' + h.textContent.replace(/[<>&]/g, "") + "</a></li>").join("") + "</ol>";
    const links = [...toc.querySelectorAll("a")];
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); });
      }, { rootMargin: "-80px 0px -70% 0px" });
      heads.forEach(h => io.observe(h));
    }
  }
  applyLang(getLang(), false);

  /* reading progress bar under the top bar */
  const bar = document.querySelector(".rp-bar");
  if (bar && content) {
    const p = document.createElement("span"); p.className = "rp-progress"; p.setAttribute("aria-hidden", "true"); bar.appendChild(p);
    const upd = () => {
      const r = content.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      p.style.width = Math.max(0, Math.min(100, (-r.top + 80) / Math.max(total, 1) * 100)) + "%";
    };
    window.addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* citation panel */
  const cite = document.getElementById("cite");
  document.querySelectorAll("[data-open-cite]").forEach(b => b.addEventListener("click", () => {
    cite.hidden = false; cite.scrollIntoView({ block: "start" }); const f = cite.querySelector("button"); if (f) f.focus();
  }));
  if (cite) {
    let fmt = "apa";
    cite.querySelectorAll("[data-fmt]").forEach(b => b.addEventListener("click", () => {
      fmt = b.dataset.fmt;
      cite.querySelectorAll("[data-fmt]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      cite.querySelectorAll("[data-fmt-box]").forEach(x => { x.hidden = x.dataset.fmtBox !== fmt; });
    }));
    const copy = cite.querySelector("[data-copy-cite]");
    if (copy) copy.addEventListener("click", async () => {
      const keep = copy.innerHTML;
      const txt = cite.querySelector('[data-fmt-box="' + fmt + '"]').textContent;
      try { await navigator.clipboard.writeText(txt); copy.textContent = getLang() === "en" ? "Copied" : "Tersalin"; }
      catch (e) { copy.textContent = getLang() === "en" ? "Copy manually" : "Salin manual"; }
      setTimeout(() => { copy.innerHTML = keep; }, 2000);
    });
  }
  /* cover zoom */
  document.querySelectorAll("[data-zoom]").forEach(a => a.addEventListener("click", e => {
    if (!window.HTMLDialogElement) return;
    e.preventDefault();
    const d = document.createElement("dialog"); d.className = "rp-zoom";
    d.innerHTML = '<img src="' + a.getAttribute("href") + '" alt="' + (a.querySelector("img") ? a.querySelector("img").alt : "") + '"><button type="button" aria-label="Tutup">×</button>';
    document.body.appendChild(d); d.showModal();
    const close = () => { d.close(); d.remove(); a.focus(); };
    d.querySelector("button").addEventListener("click", close);
    d.addEventListener("click", ev => { if (ev.target === d) close(); });
    d.addEventListener("cancel", () => setTimeout(() => d.remove(), 0));
  }));
})();
