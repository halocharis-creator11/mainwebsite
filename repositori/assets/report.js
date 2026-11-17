/* CHARIS report page: table of contents, reading progress, citation tools. */
(function () {
  /* table of contents from h2/h3 */
  const content = document.getElementById("content"), toc = document.getElementById("toc");
  if (content && toc) {
    const heads = [...content.querySelectorAll("h2, h3")];
    heads.forEach((h, i) => { if (!h.id) h.id = "bagian-" + (i + 1); });
    if (heads.length) {
      toc.innerHTML = "<p>Daftar isi</p><ol>" + heads.map(h => '<li class="' + (h.tagName === "H3" ? "sub" : "") + '"><a href="#' + h.id + '">' + h.textContent.replace(/[<>&]/g, "") + "</a></li>").join("") + "</ol>";
      const links = [...toc.querySelectorAll("a")];
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(en => {
            if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
          });
        }, { rootMargin: "-80px 0px -70% 0px" });
        heads.forEach(h => io.observe(h));
      }
    } else toc.hidden = true;
  }

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
      const txt = cite.querySelector('[data-fmt-box="' + fmt + '"]').textContent;
      try { await navigator.clipboard.writeText(txt); copy.textContent = "Tersalin"; }
      catch (e) { copy.textContent = "Salin manual"; }
      setTimeout(() => { copy.textContent = "Salin"; }, 2000);
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
