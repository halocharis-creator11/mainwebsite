/* Video links and photo galleries for news items. Shared by the website, the admin panel and the Ruang Kerja editor.
   CHARIS_MEDIA.parse(url)   -> { provider, label, embed, thumb, ratio, url } or null
   CHARIS_MEDIA.list(text)   -> photo links from a gallery field (one per line, commas also accepted)
   CHARIS_MEDIA.img(url, w)  -> a displayable image address (Google Drive links become thumbnails) */
(function () {
  "use strict";
  const driveId = u => { const m = String(u || "").match(/(?:\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : ""; };
  const img = (u, w) => { u = String(u || "").trim(); const id = driveId(u); return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + (w || 1600) : (/^https:\/\//.test(u) ? u : ""); };
  const enc = encodeURIComponent;
  function parse(raw) {
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
  }
  const list = s => String(s || "").split(/[\n,]+/).map(x => x.trim()).filter(x => /^https?:\/\//i.test(x));
  window.CHARIS_MEDIA = { parse, list, img, driveId };
})();
