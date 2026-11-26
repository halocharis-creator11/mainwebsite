/* Video links and photo galleries for news items. Shared by the website, the admin panel and the Ruang Kerja editor.
   CHARIS_MEDIA.parse(url)   -> { provider, label, embed, thumb, ratio, url } or null
   CHARIS_MEDIA.list(text)   -> photo links from a gallery field (one per line, commas also accepted)
   CHARIS_MEDIA.img(url, w)  -> a displayable image address (Google Drive links become thumbnails) */
(function () {
  "use strict";
  const driveId = u => { const m = String(u || "").match(/(?:\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : ""; };
  const img = (u, w) => { u = String(u || "").trim(); const id = driveId(u); return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + (w || 1600) : (/^https:\/\//.test(u) ? u : ""); };
  const enc = encodeURIComponent;
  let parse = function (raw) {
    const url = String(raw || "").trim(); if (!/^https?:\/\//i.test(url)) return null;
    let u; try { u = new URL(url); } catch (e) { return null; }
    const h = u.hostname.replace(/^(www|m|mobile)\./, ""), p = u.pathname;
    let m;
    /* YouTube, including Shorts and live */
    if (h === "youtu.be" || /(^|\.)youtube(-nocookie)?\.com$/.test(h)) {
      let id = h === "youtu.be" ? p.slice(1).split("/")[0] : u.searchParams.get("v");
      if (!id && (m = p.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/))) id = m[2];
      if (!id) return null;
      const start = parseInt(u.searchParams.get("t") || u.searchParams.get("start") || "0", 10) || 0;
      return { provider: "youtube", label: "YouTube", url, ratio: /\/shorts\//.test(p) ? "9/16" : "16/9", thumb: "https://i.ytimg.com/vi/" + enc(id) + "/hqdefault.jpg",
        embed: "https://www.youtube-nocookie.com/embed/" + enc(id) + "?rel=0&modestbranding=1&playsinline=1" + (start ? "&start=" + start : "") };
    }
    if (h === "vimeo.com" || h === "player.vimeo.com") {
      if (!(m = p.match(/(\d{6,})/))) return null;
      return { provider: "vimeo", label: "Vimeo", url, ratio: "16/9", thumb: "", embed: "https://player.vimeo.com/video/" + m[1] + "?dnt=1" };
    }
    if (h === "instagram.com") {
      if (!(m = p.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/))) return null;
      const kind = m[1] === "reels" ? "reel" : m[1];
      return { provider: "instagram", label: "Instagram", url, ratio: "ig", thumb: "", embed: "https://www.instagram.com/" + kind + "/" + m[2] + "/embed/captioned/" };
    }
    if (h === "tiktok.com" || h === "vm.tiktok.com" || h === "vt.tiktok.com") {
      if (!(m = p.match(/\/video\/(\d+)/))) return { provider: "tiktok", label: "TikTok", url, ratio: "", thumb: "", embed: "" };
      return { provider: "tiktok", label: "TikTok", url, ratio: "tt", thumb: "", embed: "https://www.tiktok.com/embed/v2/" + m[1] };
    }
    if (h === "facebook.com" || h === "fb.watch" || h === "web.facebook.com") {
      return { provider: "facebook", label: "Facebook", url, ratio: "16/9", thumb: "", embed: "https://www.facebook.com/plugins/video.php?href=" + enc(url) + "&show_text=false" };
    }
    if (h === "linkedin.com") {
      if (!(m = url.match(/(?:urn:li:(?:activity|ugcPost|share):|activity-)(\d{10,})/))) return { provider: "linkedin", label: "LinkedIn", url, ratio: "", thumb: "", embed: "" };
      const kind = /ugcPost/.test(url) ? "ugcPost" : /urn:li:share/.test(url) ? "share" : "activity";
      return { provider: "linkedin", label: "LinkedIn", url, ratio: "li", thumb: "", embed: "https://www.linkedin.com/embed/feed/update/urn:li:" + kind + ":" + m[1] };
    }
    if (h === "drive.google.com" && driveId(url)) {
      return { provider: "drive", label: "Google Drive", url, ratio: "16/9", thumb: img(url, 1200), embed: "https://drive.google.com/file/d/" + driveId(url) + "/preview" };
    }
    if (h === "x.com" || h === "twitter.com") return { provider: "x", label: "X", url, ratio: "", thumb: "", embed: "" };
    return { provider: "link", label: h, url, ratio: "", thumb: "", embed: "" };
  };
  /* only these play cleanly inside the page; social platforms overlay their own "View on ..." prompts, so they get a clean poster that opens the original */
  const INLINE = { youtube: 1, vimeo: 1, drive: 1 };
  const parse0 = parse;
  parse = function (raw) { const p = parse0(raw); if (p) p.inline = !!(p.embed && INLINE[p.provider]); return p; };
  const list = s => String(s || "").split(/[\n,]+/).map(x => x.trim()).filter(x => /^https?:\/\//i.test(x));
  /* project output links: one per line, "Title | https://link" (or just the link). The kind is read from the address and the title. */
  const KINDS = {
    doc: ["Dokumen", "Document"], pub: ["Publikasi", "Publication"], video: ["Video", "Video"], dash: ["Dasbor", "Dashboard"], data: ["Data", "Data"],
    slides: ["Presentasi", "Presentation"], code: ["Kode sumber", "Source code"], repo: ["Repositori CHARIS", "CHARIS repository"], news: ["Berita atau media", "News or media"], web: ["Situs", "Website"]
  };
  function linkKind(url, label) {
    const u = String(url).toLowerCase(), l = String(label || "").toLowerCase();
    if (/charisforhealth\.org\/repositori|^\/?repositori\//.test(u)) return "repo";
    if (/doi\.org|zenodo\.org|scholar\.|pubmed|researchgate|ssrn|osf\.io|journal|jurnal|ojs/.test(u)) return "pub";
    if (/youtube\.|youtu\.be|vimeo\.|instagram\.com\/(reel|tv)|tiktok\.|fb\.watch|facebook\.com\/.*video/.test(u) || /video/.test(l)) return "video";
    if (/lookerstudio|datastudio|tableau|powerbi|app\.powerbi|shinyapps|observablehq|flourish|arcgis|dashboard/.test(u) || /dasbor|dashboard/.test(l)) return "dash";
    if (/docs\.google\.com\/presentation|\.pptx?(\?|$)|slideshare|canva\.com\/design/.test(u) || /presentasi|slide|paparan/.test(l)) return "slides";
    if (/docs\.google\.com\/spreadsheets|\.xlsx?(\?|$)|\.csv(\?|$)|kaggle|data\.go\.id|satudata|dataverse|figshare/.test(u) || /dataset|data /.test(l + " ")) return "data";
    if (/github\.com|gitlab|bitbucket|huggingface|cran\.r-project|pypi\.org/.test(u)) return "code";
    if (/\.pdf(\?|$)|\.docx?(\?|$)|docs\.google\.com\/document|drive\.google\.com/.test(u) || /laporan|report|panduan|modul|pedoman|kebijakan|policy|brief|naskah/.test(l)) return "doc";
    if (/kompas|detik|tempo|antaranews|cnn|kumparan|liputan6|tribun|jpnn|news|berita/.test(u) || /berita|liputan|media/.test(l)) return "news";
    return "web";
  }
  function links(text, lang) {
    const k = lang === "en" ? 1 : 0;
    return String(text || "").split(/\n+/).map(line => {
      line = line.trim(); if (!line) return null;
      const m = line.match(/https?:\/\/\S+/); if (!m) return null;
      const url = m[0].replace(/[),.;]+$/, ""), label = line.replace(m[0], "").replace(/^[\s|:\-]+|[\s|:\-]+$/g, "").trim();
      let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
      const kind = linkKind(url, label);
      let auto = host; const d = url.match(/doi\.org\/(10\.[^\s?#]+)/i); if (d) auto = "DOI " + d[1];
      return { url, label: label || auto, host, kind, kindLabel: KINDS[kind][k] };
    }).filter(Boolean);
  }
  window.CHARIS_MEDIA = { parse, list, img, driveId, links, linkKind, KINDS };
})();
