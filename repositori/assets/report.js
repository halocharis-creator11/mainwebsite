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

  /* ---------- share button and public counters ---------- */
  const CS = window.CharisShare;
  if (CS) {
    document.querySelectorAll("[data-share-slot]").forEach(el => {
      const draw = () => { el.innerHTML = CS.html({ id: el.dataset.shareId, url: location.origin + location.pathname, title: getLang() === "en" && meta.title_en ? meta.title_en : (meta.title_id || document.title), label: getLang() === "en" ? "Share" : "Bagikan" }); };
      draw(); document.addEventListener("charis:lang", draw);
    });
    if (meta.id) CS.track(meta.id, "read");
    CS.paint();
  }

  /* ---------- references: linked DOI/URL plus source and Google Scholar links, journal style ---------- */
  const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:)\]])/g;
  document.querySelectorAll(".rp-content ol.refs > li, .rp-content ol.references > li").forEach(li => {
    if (li.dataset.linked) return; li.dataset.linked = "1";
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode.closest("a") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let first = "";
    nodes.forEach(n => {
      if (!URL_RE.test(n.nodeValue)) return; URL_RE.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = URL_RE.exec(n.nodeValue))) {
        frag.appendChild(document.createTextNode(n.nodeValue.slice(last, m.index)));
        const a = document.createElement("a"); a.href = m[1]; a.textContent = m[1]; a.target = "_blank"; a.rel = "noopener"; a.className = "ref-url"; frag.appendChild(a);
        if (!first) first = m[1]; last = m.index + m[1].length;
      }
      frag.appendChild(document.createTextNode(n.nodeValue.slice(last))); n.parentNode.replaceChild(frag, n);
    });
    li.querySelectorAll("a[href^='http']").forEach(a => { if (!first) first = a.href; a.target = "_blank"; a.rel = "noopener"; });
    const en = (li.closest("[data-l]") ? li.closest("[data-l]").dataset.l : getLang()) === "en";
    const txt = li.textContent.replace(URL_RE, "").trim();
    const tm = /\(\d{4}[a-z]?\)\.\s+(.+?[.?!])(?:\s|$)/.exec(txt);
    const q = (tm ? tm[1] : txt).replace(/\s+/g, " ").slice(0, 240);
    const box = document.createElement("span"); box.className = "ref-links";
    box.innerHTML = (first ? '<a href="' + first.replace(/"/g, "&quot;") + '" target="_blank" rel="noopener">' + (/doi\.org\//.test(first) ? (en ? "Article" : "Artikel") : (en ? "Source" : "Sumber")) + "</a>" : "") +
      '<a href="https://scholar.google.com/scholar?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">Google Scholar</a>';
    li.appendChild(box);
  });

  /* ---------- interactive simulators: glowing marker, page notice and a guided mini tour ---------- */
  const sims = [...document.querySelectorAll("section.sim-box.interactive, section.sim-box[id]")].filter((v, i, a) => a.indexOf(v) === i);
  const T2 = (id, en) => (getLang() === "en" ? en : id);
  const seenKey = id => "charis_tour_" + (meta.id || "") + "_" + id;
  const vis = el => el && el.offsetParent !== null && el.getClientRects().length;
  const escH = x => String(x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  /* text of an element in the current language only */
  const vt = el => { if (!el) return ""; const c = el.cloneNode(true); c.querySelectorAll("[data-l]").forEach(x => { if (x.dataset.l !== getLang()) x.remove(); }); return c.textContent.replace(/\s+/g, " ").trim(); };
  function steps(box) {
    const title0 = escH(vt(box.querySelector(".sim-head h3")));
    const title = /^[A-Z][a-z]/.test(title0) ? title0.charAt(0).toLowerCase() + title0.slice(1) : title0;   /* keep acronyms such as PPCP */
    const q = s => [...box.querySelectorAll(s)].find(vis);
    const out = [{ el: box.querySelector(".sim-head") || box, t: T2("Simulator interaktif", "Interactive simulator"), d: T2("Ini " + title + ". Ubah asumsinya dan lihat hasilnya berubah langsung. Tur singkat ini menunjukkan caranya.", "This is the " + title + ". Change its assumptions and watch the results update instantly. This short tour shows how.") }];
    const seg = q(".seg"); if (seg) out.push({ el: seg.closest(".ctl") || seg, t: T2("Pilih skenario", "Choose a scenario"), d: T2("Tombol ini mengganti skenario, kebijakan, atau tampilan. Coba klik salah satunya.", "These buttons switch the scenario, policy or view. Try clicking one.") });
    const rng = q('input[type="range"]'); if (rng) out.push({ el: rng.closest(".ctl-group") || rng.closest(".ctl") || rng, t: T2("Geser asumsi", "Move the sliders"), d: T2("Geser untuk mengubah angka. Nilai yang dipilih tampil di kanan atas setiap penggeser, dan bisa diatur juga dengan tombol panah keyboard.", "Drag to change a value. The chosen value shows at the top right of each slider, and arrow keys work too.") });
    const run = q(".sim-btn:not(.ghost)"); if (run) out.push({ el: run, t: T2("Jalankan", "Run it"), d: T2("Tekan tombol ini untuk menjalankan atau menghentikan simulasi.", "Press this button to run or pause the simulation.") });
    const ch = q(".chart, canvas"); if (ch) out.push({ el: ch, t: T2("Baca grafiknya", "Read the chart"), d: T2("Grafik diperbarui otomatis setiap kali Anda mengubah asumsi. Arahkan kursor atau sentuh batang dan titik untuk melihat angka rinci.", "The chart updates every time you change an assumption. Hover over or tap bars and points to see exact numbers.") });
    const k = q(".kpis"); if (k) out.push({ el: k, t: T2("Angka kunci", "Key numbers"), d: T2("Ringkasan hasil untuk pengaturan Anda saat ini.", "A summary of results for your current settings.") });
    const n = q(".sim-narr"); if (n) out.push({ el: n, t: T2("Penjelasan otomatis", "Plain-language reading"), d: T2("Paragraf ini menafsirkan hasil dalam kalimat dan ikut berubah bersama pengaturan Anda.", "This paragraph explains the result in words and changes with your settings.") });
    const rs = q(".sim-btn.ghost"); if (rs) out.push({ el: rs, t: T2("Kembali ke awal", "Start over"), d: T2("Kapan saja, tekan tombol ini untuk kembali ke asumsi dasar laporan.", "At any time, press this button to return to the report's base assumptions.") });
    return out;
  }
  let tour = null;
  function endTour(done) {
    if (!tour) return;
    tour.hole.remove(); tour.pop.remove(); window.removeEventListener("scroll", tour.place, true); window.removeEventListener("resize", tour.place);
    document.removeEventListener("keydown", tour.key);
    if (done !== false) { try { localStorage.setItem(seenKey(tour.box.id), "1"); } catch (e) { /* ignore */ } tour.box.classList.add("tried"); }
    const back = tour.box.querySelector(".tour-cta"); tour = null; if (back) back.focus({ preventScroll: true });
  }
  function startTour(box) {
    endTour(false);
    const list = steps(box); if (!list.length) return;
    const hole = document.createElement("div"); hole.className = "tour-hole"; hole.setAttribute("aria-hidden", "true");
    const pop = document.createElement("div"); pop.className = "tour-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "false"); pop.setAttribute("aria-live", "polite");
    document.body.append(hole, pop);
    tour = { box, list, i: 0, hole, pop };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tour.place = () => {
      if (!tour) return;
      const el = tour.list[tour.i].el, r = el.getBoundingClientRect(), pad = 8;
      Object.assign(hole.style, { top: r.top - pad + "px", left: r.left - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      if (window.innerWidth <= 600) { pop.classList.add("sheet"); pop.style.top = pop.style.left = ""; return; }
      pop.classList.remove("sheet");
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let top = r.bottom + 14; if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 14);
      let left = Math.min(Math.max(10, r.left), window.innerWidth - pw - 10);
      pop.style.top = top + "px"; pop.style.left = left + "px";
    };
    const show = i => {
      tour.i = i; const s = tour.list[i], last = i === tour.list.length - 1;
      pop.innerHTML = '<p class="tour-step">' + T2("Langkah ", "Step ") + (i + 1) + T2(" dari ", " of ") + tour.list.length + '</p><h4>' + s.t + "</h4><p>" + s.d + '</p><div class="tour-act"><button type="button" class="tour-skip">' + T2("Tutup tur", "Close tour") + "</button>" +
        (i ? '<button type="button" class="tour-prev">' + T2("Sebelumnya", "Back") + "</button>" : "") + '<button type="button" class="tour-next">' + (last ? T2("Selesai, coba sendiri", "Done, try it") : T2("Berikutnya", "Next")) + "</button></div>";
      pop.setAttribute("aria-label", s.t);
      const far = Math.abs(s.el.getBoundingClientRect().top) > window.innerHeight * 1.5;   /* long jumps: no slow scroll */
      s.el.scrollIntoView({ block: window.innerWidth <= 600 ? "start" : "center", behavior: reduce || far ? "auto" : "smooth" });
      tour.place(); setTimeout(tour.place, 120); setTimeout(tour.place, 450);
      pop.querySelector(".tour-next").focus({ preventScroll: true });
      pop.querySelector(".tour-next").onclick = () => (last ? endTour(true) : show(i + 1));
      const pv = pop.querySelector(".tour-prev"); if (pv) pv.onclick = () => show(i - 1);
      pop.querySelector(".tour-skip").onclick = () => endTour(true);
    };
    tour.key = e => { if (e.key === "Escape") endTour(true); };
    window.addEventListener("scroll", tour.place, true); window.addEventListener("resize", tour.place);
    document.addEventListener("keydown", tour.key);
    show(0);
  }
  if (sims.length) {
    const label = () => T2("Mulai tur singkat", "Take the quick tour");
    sims.forEach(box => {
      box.classList.add("has-tour");
      let seen = false; try { seen = !!localStorage.getItem(seenKey(box.id)); } catch (e) { /* ignore */ }
      if (seen) box.classList.add("tried");
      const head = box.querySelector(".sim-head") || box;
      const bar = document.createElement("div"); bar.className = "tour-bar";
      bar.innerHTML = '<span class="tour-live"><i aria-hidden="true"></i><span></span></span><button type="button" class="tour-cta"></button>';
      head.appendChild(bar);
      const paintBar = () => { bar.querySelector(".tour-live span").textContent = T2("Interaktif, coba sendiri", "Interactive, try it yourself"); bar.querySelector(".tour-cta").textContent = label(); };
      paintBar(); document.addEventListener("charis:lang", paintBar);
      bar.querySelector(".tour-cta").addEventListener("click", () => startTour(box));
      box.addEventListener("input", () => box.classList.add("tried"), { once: true });
    });
    /* notice at the top of the report listing the simulators */
    const content0 = document.getElementById("content");
    if (content0) {
      const note = document.createElement("aside"); note.className = "sim-notice";
      const drawNote = () => {
        const names = sims.map(b => { const h = b.querySelector(".sim-head h3"); return '<li><a href="#' + b.id + '" data-tour-jump="' + b.id + '">' + escH(h ? vt(h) : b.id) + "</a></li>"; }).join("");
        note.innerHTML = '<span class="sn-dot" aria-hidden="true"></span><div><p><strong>' + T2(sims.length > 1 ? "Laporan ini memuat " + sims.length + " simulator interaktif." : "Laporan ini memuat simulator interaktif.", sims.length > 1 ? "This report includes " + sims.length + " interactive simulators." : "This report includes an interactive simulator.") + "</strong> " +
          T2("Ubah asumsinya sendiri dan lihat hasilnya berubah. Pilih untuk langsung memulai tur singkat:", "Change the assumptions yourself and watch the results change. Pick one to start a quick tour:") + "</p><ul>" + names + "</ul></div>";
      };
      drawNote(); document.addEventListener("charis:lang", drawNote);
      content0.insertBefore(note, content0.firstChild);
      note.addEventListener("click", e => { const a = e.target.closest("[data-tour-jump]"); if (!a) return; e.preventDefault(); startTour(document.getElementById(a.dataset.tourJump)); });
    }
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
