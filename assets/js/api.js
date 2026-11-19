/* Thin client for the Google Apps Script backend.
   GET  ?action=list&type=<collection>        returns { ok, data: [...] }
   POST text/plain JSON { action: "contact", ... } returns { ok }
   text/plain avoids the CORS preflight that Apps Script cannot answer. */
window.CharisAPI = (function () {
  const cfg = window.CHARIS_CONFIG || {};
  const isDemo = !cfg.API_URL;
  const cache = {};

  /* Knowledge products come from the GitHub repository (repositori/index.json),
     built automatically by GitHub Actions. They are mapped to the publication shape. */
  async function repo() {
    if (cache._repo) return cache._repo;
    let data = null;
    try { const r = await fetch("repositori/index.json", { cache: "no-cache" }); if (r.ok) data = await r.json(); } catch (e) { /* offline preview */ }
    if (!data && window.REPO_INDEX) data = window.REPO_INDEX;
    if (!data) throw new Error("repository index not found");
    const key = k => (window.svcKey ? window.svcKey(k) : k);       /* older service keys map to the current list */
    cache._repo = (data.items || []).map(i => (i.service ? Object.assign({}, i, { service: key(i.service) }) : i));
    return cache._repo;
  }

  /* Portfolio covers uploaded to GitHub (portofolio/<PROJECT-ID>/), indexed by GitHub Actions. */
  async function portfolioCovers() {
    if (cache._pc) return cache._pc;
    let data = null;
    try { const r = await fetch("portofolio/index.json", { cache: "no-cache" }); if (r.ok) data = await r.json(); } catch (e) { /* none yet */ }
    if (!data && window.PORT_INDEX) data = window.PORT_INDEX;
    cache._pc = (data && data.covers) || {};
    return cache._pc;
  }

  async function list(type) {
    if (type === "publications") {
      return (await repo()).map(i => Object.assign({}, i, {
        summary_id: i.abstract_id, summary_en: i.abstract_en, category: i.type, cover_url: i.thumb || i.cover, date: i.date_published, year: (i.date_published || "").slice(0, 4)
      }));
    }
    if (cache[type]) return cache[type];
    if (isDemo) {
      let rows = (window.DEMO_DATA[type] || []).filter(r => r.published !== false);
      if (type === "projects") rows = rows.filter(r => ["A", "B", "C"].includes(r.disclosure)).map(publicProject);   /* mirrors Code.gs */
      if (type === "partners") rows = rows.map(r => Object.assign({}, r, { logo_url: r.logo_ok === true || r.logo_ok === "TRUE" ? r.logo_url : "" }));
      cache[type] = type === "projects" ? rows.map(normSvc) : rows;
      return cache[type];
    }
    const res = await fetch(cfg.API_URL + "?action=list&type=" + encodeURIComponent(type));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "API error");
    cache[type] = type === "projects" ? (json.data || []).map(normSvc) : json.data;
    return cache[type];
  }

  const normSvc = r => (r && r.service && window.svcKey ? Object.assign({}, r, { service: window.svcKey(r.service) }) : r);
  /* same whitelist as PROJECT_PUBLIC in Code.gs (used in demo mode only; the live API filters server-side) */
  const P_NAMED = ["client", "funder", "partners", "official_title", "location_detail", "image_url", "testimonial_id", "testimonial_en", "testimonial_by"];
  function publicProject(r) {
    const o = Object.assign({}, r);
    if (r.disclosure === "C") { const keep = (r.photo_public === true || String(r.photo_public).toUpperCase() === "TRUE") ? r.image_url : ""; P_NAMED.concat(["related_publications"]).forEach(k => delete o[k]); if (keep) o.image_url = keep; }
    if (r.disclosure === "B") delete o.related_publications;
    return o;
  }

  async function post(payload) {
    if (isDemo) {
      console.warn("CHARIS: mode demo, API_URL kosong di assets/js/config.js. Aksi \"" + payload.action + "\" tidak dikirim ke server.");
      await new Promise(r => setTimeout(r, 500));
      if (payload.action === "memberLogin") return String(payload.code || "").toUpperCase() === "DEMO-12345" ? { ok: true, mtoken: "demo", name: "Pengguna Demo" } : { ok: false, error: "invalid" };
      if (payload.action === "memberLibrary") return { ok: true, name: "Pengguna Demo", email: "demo@contoh.org", data: [
        { report_id: "CHARIS-2026-001", title: "Dari Ketergantungan Donor Menuju Pembiayaan Majemuk", status: "disetujui", requested: "2026-11-12 09:10", available: true },
        { report_id: "CHARIS-2026-002", title: "[Contoh] Memperkuat Integrasi Layanan Primer di Tingkat Desa", status: "menunggu", requested: "2026-11-14 08:00", available: false }] };
      if (payload.action === "memberDownload") return { ok: false, error: "demo" };
      return { ok: true, demo: true };
    }
    const res = await fetch(cfg.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  /* Google Drive links to embeddable image / download URLs */
  function driveId(url) {
    if (!url) return "";
    const m = String(url).match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : "";
  }
  function img(url, width) {
    const id = driveId(url);
    return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + (width || 1200) : (url || "");
  }
  function file(url) {
    const id = driveId(url);
    return id ? "https://drive.google.com/uc?export=download&id=" + id : (url || "");
  }

  return { list, repo, portfolioCovers, post, img, file, isDemo };
})();
