#!/usr/bin/env node
/**
 * CHARIS repository builder
 * ------------------------------------------------------------
 * Scans repositori/<folder>/index.html, reads the JSON block
 * <script id="charis-meta">, and generates:
 *   - Google Scholar / Dublin Core / Open Graph / JSON-LD tags in each page head
 *   - the visible title, authors, abstract, metadata and citation block
 *   - repositori/index.json   (read by the website)
 *   - repositori/index.html   (plain HTML browse page, crawlable by Google Scholar)
 *   - sitemap.xml
 * Run by GitHub Actions on every push. Run locally with:  node scripts/build-repo.mjs
 * No dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REPO = path.join(ROOT, "repositori");
const site = JSON.parse(fs.readFileSync(path.join(REPO, "site.json"), "utf8"));
const BASE = site.base_url.replace(/\/+$/, "");

const SERVICES = {
  financing: ["Pembiayaan kesehatan", "Health financing"], analytics: ["Data dan analitik", "Data and analytics"],
  evaluation: ["Riset, monitoring, dan evaluasi", "Research, monitoring, and evaluation"], planning: ["Perencanaan dan tata kelola", "Planning and governance"],
  workforce: ["SDM kesehatan", "Health workforce"], quality: ["Mutu dan akreditasi", "Quality and accreditation"],
  facility_tools: ["Tools operasional fasilitas kesehatan", "Facility operations tools"], grants: ["Kolaborasi penyusunan proposal hibah", "Grant proposal collaboration"],
  promotion: ["Promosi program dan layanan kesehatan", "Health program and service promotion"], media: ["Media dan tools pendukung upaya kesehatan", "Media and tools for health programs"],
  training: ["Pelatihan dan pengembangan kompetensi", "Training and competency development"]
};
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const attr = esc;
const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1]} ${m[1]}` : (d || ""); };
const year = d => (/^(\d{4})/.exec(d || "") || [])[1] || "";
const slash = d => (d || "").slice(0, 10).replace(/-/g, "/");
const doiUrl = doi => doi ? "https://doi.org/" + doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : "";
const cleanDoi = doi => (doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//, "");

function firstCommitDate(file) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%aI -- "${file}"`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n").filter(Boolean);
    if (out.length) return out[out.length - 1];          /* full timestamp, so items added on the same day keep their order */
  } catch (e) { /* not a git checkout */ }
  return fs.statSync(file).mtime.toISOString();
}

/* ---------- covers: image file, or first page of a PDF, plus a thumbnail ---------- */
const tool = name => { try { execSync(`command -v ${name}`, { stdio: "ignore" }); return true; } catch (e) { return false; } };
const HAS_PDFTOPPM = tool("pdftoppm"), HAS_CONVERT = tool("convert") || tool("magick");
const IMG_EXT = /\.(jpe?g|png|webp)$/i;
const sha = f => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const warnings = [];
/* Generated files are named auto-*. They must NOT start with "_": GitHub Pages (Jekyll) hides such files
   whenever .nojekyll is missing, which shows up as broken covers. GEN_VERSION forces a re-render when settings change. */
const GEN_VERSION = 2;
function legacyCleanup(dir) {
  for (const f of fs.readdirSync(dir)) if (/^_(cover\.(jpg|json)|thumb\.jpg|p-?\d+\.jpg)$/.test(f)) fs.unlinkSync(path.join(dir, f));
}

function resolveCover(dir, prefer, extraPdf) {
  const exists = f => f && fs.existsSync(path.join(dir, f));
  const files = fs.readdirSync(dir);
  const pick = names => names.find(exists);
  let img = prefer && IMG_EXT.test(prefer) && exists(prefer) ? prefer
    : pick(["sampul.jpg", "sampul.jpeg", "sampul.png", "sampul.webp", "cover.jpg", "cover.jpeg", "cover.png", "cover.webp"]);
  legacyCleanup(dir);
  const recFile = path.join(dir, "auto-info.json");
  let rec = {}; try { rec = JSON.parse(fs.readFileSync(recFile, "utf8")); } catch (e) { /* first run */ }
  if (rec.v !== GEN_VERSION) rec = { v: GEN_VERSION };   /* new render settings: make everything again */
  if (!img) {
    const pdf = (prefer && /\.pdf$/i.test(prefer) && exists(prefer) && prefer) || pick(["sampul.pdf", "cover.pdf", "pratinjau.pdf", "preview.pdf", extraPdf]) || files.find(f => /\.pdf$/i.test(f));
    if (pdf) {
      const h = sha(path.join(dir, pdf));
      if (!(exists("auto-cover.jpg") && rec.source === pdf && rec.sha === h)) {
        if (!HAS_PDFTOPPM) { warnings.push(`${path.relative(ROOT, dir)}: pdftoppm tidak tersedia, sampul dari PDF tidak dibuat`); }
        else {
          execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-jpeg", "-jpegopt", "quality=92", "-scale-to", "1800", "-aa", "yes", "-aaVector", "yes", "-singlefile", path.join(dir, pdf), path.join(dir, "auto-cover")]);
          rec = { source: pdf, sha: h };
        }
      }
      if (exists("auto-cover.jpg")) img = "auto-cover.jpg";
    }
  } else if (rec.source) { delete rec.source; delete rec.sha; }                /* an image now takes priority over an old PDF render */
  if (!img) { delete rec.source; delete rec.sha; delete rec.thumbOf; delete rec.thumbSha; if (fs.existsSync(recFile)) fs.writeFileSync(recFile, JSON.stringify(rec, null, 2) + "\n"); return { cover: "", thumb: "" }; }
  let thumb = img;
  if (IMG_EXT.test(img) && img !== "auto-cover.jpg" && HAS_CONVERT) {
    try {
      const wpx = +execFileSync(tool("magick") ? "magick" : "identify", (tool("magick") ? ["identify"] : []).concat(["-format", "%w", path.join(dir, img) + "[0]"])).toString();
      if (wpx && wpx < 900) warnings.push(`${path.relative(ROOT, dir)}/${img}: lebar sampul hanya ${wpx} px, sehingga tampak buram. Gunakan gambar minimal 1200 px atau unggah sampul.pdf.`);
    } catch (e) { /* size check is advisory */ }
  }
  if (HAS_CONVERT) {
    const h = sha(path.join(dir, img));
    if (!(exists("auto-thumb.jpg") && rec.thumbOf === img && rec.thumbSha === h)) {
      const bin = tool("magick") ? "magick" : "convert";
      execFileSync(bin, [path.join(dir, img) + "[0]", "-colorspace", "sRGB", "-background", "white", "-alpha", "remove", "-filter", "Lanczos", "-resize", "720x>", "-unsharp", "0x0.6+0.6+0", "-strip", "-sampling-factor", "4:4:4", "-quality", "90", path.join(dir, "auto-thumb.jpg")]);
      rec.thumbOf = img; rec.thumbSha = h;
    }
    thumb = "auto-thumb.jpg";
  }
  const out = JSON.stringify(rec, null, 2) + "\n";
  if (!fs.existsSync(recFile) || fs.readFileSync(recFile, "utf8") !== out) fs.writeFileSync(recFile, out);
  return { cover: img, thumb };
}

/* ---------- flipbook: first pages (max 5) of a preview PDF rendered to images ---------- */
const MAX_PREVIEW = 5;
function resolvePreview(dir, extraPdf) {
  const exists = f => f && fs.existsSync(path.join(dir, f));
  const files = fs.readdirSync(dir);
  const old = files.filter(f => /^auto-p\d+\.jpg$/.test(f));
  const recFile = path.join(dir, "auto-info.json");
  let rec = {}; try { rec = JSON.parse(fs.readFileSync(recFile, "utf8")); } catch (e) { /* none */ }
  const pdf = ["pratinjau.pdf", "preview.pdf", extraPdf].find(exists);
  const clear = () => { old.forEach(f => fs.unlinkSync(path.join(dir, f))); return []; };
  if (!pdf || !HAS_PDFTOPPM) { if (old.length && !pdf) { clear(); delete rec.previewOf; delete rec.previewSha; delete rec.previewCount; fs.writeFileSync(recFile, JSON.stringify(rec, null, 2) + "\n"); } return pdf ? old.sort(byNum) : []; }
  const h = sha(path.join(dir, pdf));
  if (!(rec.previewOf === pdf && rec.previewSha === h && old.length === rec.previewCount)) {
    clear();
    let n = MAX_PREVIEW;
    try { n = Math.min(MAX_PREVIEW, +execFileSync("pdfinfo", [path.join(dir, pdf)]).toString().match(/Pages:\s+(\d+)/)[1]); } catch (e) { /* assume 5 */ }
    execFileSync("pdftoppm", ["-f", "1", "-l", String(n), "-jpeg", "-jpegopt", "quality=88", "-scale-to", "1600", "-aa", "yes", "-aaVector", "yes", path.join(dir, pdf), path.join(dir, "auto-p")]);
    /* pdftoppm pads numbers (auto-p-1 or auto-p-01); normalise to auto-p1.jpg and so on */
    fs.readdirSync(dir).filter(f => /^auto-p-\d+\.jpg$/.test(f)).forEach(f => fs.renameSync(path.join(dir, f), path.join(dir, "auto-p" + parseInt(f.slice(7), 10) + ".jpg")));
    const made = fs.readdirSync(dir).filter(f => /^auto-p\d+\.jpg$/.test(f));
    rec.previewOf = pdf; rec.previewSha = h; rec.previewCount = made.length;
    fs.writeFileSync(recFile, JSON.stringify(rec, null, 2) + "\n");
  }
  return fs.readdirSync(dir).filter(f => /^auto-p\d+\.jpg$/.test(f)).sort(byNum);
}
const byNum = (a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10);

function replaceBlock(html, name, content) {
  const re = new RegExp(`(<!-- CHARIS:AUTO:${name}:START -->)[\\s\\S]*?(<!-- CHARIS:AUTO:${name}:END -->)`);
  if (!re.test(html)) throw new Error(`penanda CHARIS:AUTO:${name} tidak ditemukan`);
  return html.replace(re, `$1\n${content}\n  $2`);
}

/* ---------- citations ---------- */
function authorList(a) {
  const n = a.map(x => x.name);
  return n.length <= 1 ? (n[0] || "") : n.slice(0, -1).join(", ") + ", & " + n[n.length - 1];
}
function citeAPA(m, url) {
  return `${authorList(m.authors)} (${year(m.date_published)}). ${m.title_id}${m.series ? ` (${m.series})` : ""}. ${site.publisher_short}, ${site.institution}. ${m.doi ? doiUrl(m.doi) : url}`;
}
function citeBib(m, url) {
  const key = (m.authors[0] ? m.authors[0].name.split(/\s+/).pop() : "charis").toLowerCase().replace(/[^a-z]/g, "") + year(m.date_published);
  return `@techreport{${key},\n  title       = {${m.title_id}},\n  author      = {${m.authors.map(a => a.name).join(" and ")}},\n  institution = {${site.publisher_short}, ${site.institution}},\n  year        = {${year(m.date_published)}},\n` +
    (m.series ? `  number      = {${m.series}},\n` : "") + (m.doi ? `  doi         = {${cleanDoi(m.doi)}},\n` : "") + `  url         = {${m.doi ? doiUrl(m.doi) : url}}\n}`;
}
function citeRIS(m, url) {
  return ["TY  - RPRT", ...m.authors.map(a => "AU  - " + a.name), "TI  - " + m.title_id, m.title_en ? "T2  - " + m.title_en : "", "PY  - " + year(m.date_published),
    "DA  - " + slash(m.date_published), "PB  - " + site.publisher_short + ", " + site.institution, "CY  - " + site.place, m.series ? "SN  - " + m.series : "",
    m.doi ? "DO  - " + cleanDoi(m.doi) : "", "UR  - " + (m.doi ? doiUrl(m.doi) : url), "AB  - " + m.abstract_id, ...(m.keywords || []).map(k => "KW  - " + k), "LA  - " + (m.language || "id"), "ER  - "].filter(Boolean).join("\n");
}

/* ---------- head tags ---------- */
function headBlock(m, url, slug) {
  const L = [];
  const t = (n, c) => { if (c) L.push(`  <meta name="${n}" content="${attr(c)}">`); };
  L.push(`  <title>${esc(m.title_id)} | ${esc(site.publisher_short)}</title>`);
  L.push(`  <script>try{var q=new URLSearchParams(location.search).get("lang"),s=localStorage.getItem("charis_lang"),l=q||s;if(l==="en"||l==="id")document.documentElement.lang=l}catch(e){}</script>`);
  L.push(`  <meta name="description" content="${attr((m.abstract_id || "").slice(0, 300))}">`);
  L.push(`  <link rel="canonical" href="${attr(url)}">`);
  /* Google Scholar (Highwire Press) */
  t("citation_title", m.title_id);
  m.authors.forEach(a => { t("citation_author", a.name); t("citation_author_institution", a.affiliation); if (a.orcid) t("citation_author_orcid", a.orcid); });
  t("citation_publication_date", slash(m.date_published));
  t("citation_online_date", slash(m.date_published));
  t("citation_technical_report_institution", site.publisher_short + ", " + site.institution);
  t("citation_technical_report_number", m.series || m.id);
  t("citation_publisher", site.publisher);
  t("citation_doi", cleanDoi(m.doi));
  t("citation_language", m.language || "id");
  t("citation_keywords", (m.keywords || []).join("; "));
  t("citation_abstract_html_url", url);
  t("citation_fulltext_html_url", url);
  if (m.pdf_summary) t("citation_pdf_url", url + m.pdf_summary);
  /* Dublin Core */
  L.push(`  <link rel="schema.DC" href="http://purl.org/dc/elements/1.1/">`);
  t("DC.title", m.title_id); m.authors.forEach(a => t("DC.creator", a.name));
  t("DC.date", (m.date_published || "").slice(0, 10)); t("DC.publisher", site.publisher); t("DC.type", "Text.Report");
  t("DC.language", m.language || "id"); t("DC.rights", m.license); t("DC.description", m.abstract_id);
  if (m.doi) t("DC.identifier", "doi:" + cleanDoi(m.doi));
  /* Open Graph */
  L.push(`  <meta property="og:type" content="article">`, `  <meta property="og:title" content="${attr(m.title_id)}">`,
    `  <meta property="og:description" content="${attr((m.abstract_id || "").slice(0, 200))}">`, `  <meta property="og:url" content="${attr(url)}">`);
  if (m.cover) L.push(`  <meta property="og:image" content="${attr(url + m.cover)}">`);
  /* JSON-LD */
  const ld = { "@context": "https://schema.org", "@type": "Report", "name": m.title_id, "alternateName": m.title_en || undefined, "headline": m.title_id,
    "abstract": m.abstract_id, "author": m.authors.map(a => ({ "@type": "Person", "name": a.name, "affiliation": a.affiliation ? { "@type": "Organization", "name": a.affiliation } : undefined, "sameAs": a.orcid ? "https://orcid.org/" + a.orcid : undefined })),
    "datePublished": m.date_published, "inLanguage": m.language || "id", "keywords": (m.keywords || []).join(", "), "license": m.license,
    "publisher": { "@type": "Organization", "name": site.publisher }, "url": url, "identifier": m.doi ? { "@type": "PropertyValue", "propertyID": "DOI", "value": cleanDoi(m.doi) } : m.id,
    "reportNumber": m.series || m.id, "isAccessibleForFree": true };
  L.push(`  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  return L.join("\n");
}

/* ---------- visible header (bilingual: spans marked data-l="id" or data-l="en"; report.js shows one) ---------- */
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDateEn = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${Number(m[3])} ${MONTHS_EN[Number(m[2]) - 1]} ${m[1]}` : (d || ""); };
/* Product types: a short, academic list. Anything else stops the build with a clear message. */
const TYPE_EN = { "Artikel ilmiah": "Research article", "Laporan penelitian": "Research report", "Laporan evaluasi": "Evaluation report",
  "Kertas kerja": "Working paper", "Policy brief": "Policy brief" };
const TYPE_OLD = { "Laporan riset": "Laporan penelitian" };   /* older names, mapped automatically */
/* Creative Commons licence: badge image (CC trademark policy allows the official buttons to mark licensed works) and deed link */
function ccInfo(lic) {
  const m = /^CC\s+(BY(?:-NC)?(?:-ND|-SA)?)\s+(\d\.\d)$/i.exec(String(lic || "").trim());
  if (!m) return null;
  const code = m[1].toLowerCase(), ver = m[2];
  const names = { "by": ["Atribusi", "Attribution"], "by-nc": ["Atribusi-NonKomersial", "Attribution-NonCommercial"], "by-sa": ["Atribusi-BerbagiSerupa", "Attribution-ShareAlike"],
    "by-nd": ["Atribusi-TanpaTurunan", "Attribution-NoDerivatives"], "by-nc-sa": ["Atribusi-NonKomersial-BerbagiSerupa", "Attribution-NonCommercial-ShareAlike"], "by-nc-nd": ["Atribusi-NonKomersial-TanpaTurunan", "Attribution-NonCommercial-NoDerivatives"] };
  return { code, ver, badge: code.replace(/-/g, "_") + ".svg", deed: `https://creativecommons.org/licenses/${code}/${ver}/`, id: `Creative Commons ${names[code][0]} ${ver} Internasional`, en: `Creative Commons ${names[code][1]} ${ver} International` };
}
const ccBadge = (lic, h) => { const c = ccInfo(lic); return c ? `<a class="rp-cc" href="${c.deed}" rel="license noopener" target="_blank" title="${attr(c.en)}"><img src="../assets/cc/${c.badge}" alt="${attr(lic)}" width="${Math.round(h * 120 / 42)}" height="${h}"></a>` : ""; };
const L2 = (id, en) => id === en ? esc(id) : `<span data-l="id">${esc(id)}</span><span data-l="en" lang="en">${esc(en)}</span>`;
const L2h = (id, en) => `<span data-l="id">${id}</span><span data-l="en" lang="en">${en}</span>`;   /* already-escaped HTML */
function bodyBlock(m, url, slug) {
  const svc = SERVICES[m.service];
  const typeEn = m.type_en || TYPE_EN[m.type] || m.type;
  const affs = [...new Set(m.authors.map(a => a.affiliation).filter(Boolean))];
  const authors = m.authors.map(a => `<li><span class="rp-author">${esc(a.name)}</span>${a.affiliation ? `<sup>${affs.indexOf(a.affiliation) + 1}</sup>` : ""}` +
    (a.orcid ? ` <a class="rp-orcid" href="https://orcid.org/${attr(a.orcid)}" aria-label="ORCID ${attr(a.name)}">iD</a>` : "") + "</li>").join("");
  const requestUrl = `../../index.html#/request/${encodeURIComponent(m.id)}`;
  /* every full PDF goes through a request that the CHARIS admin approves */
  const ctaUrl = requestUrl;
  const ctaText = L2("Minta PDF lengkap", "Request full PDF");
  const ctaShort = L2("Minta PDF", "Request PDF");
  const bilingual = !!m.bilingual;
  const n = m.preview.length;
  const flip = n > 1 ? `data-flip-pages="${attr(JSON.stringify(m.preview))}" data-flip-title="${attr(m.title_id)}" data-flip-request="${attr(requestUrl)}"` : "";
  return `  <header class="rp-bar"><div class="rp-wrap rp-bar-in">
    <a class="rp-brand" href="../../index.html"><img src="../../assets/img/charis-mark.svg" alt="CHARIS" width="112" height="30"></a>
    <nav class="rp-crumbs" aria-label="Breadcrumb"><a href="../../index.html#/research">${L2("Repositori", "Repository")}</a><span aria-hidden="true">/</span><span>${L2(m.type, typeEn)}</span></nav>
    ${bilingual ? `<div class="rp-lang" role="group" aria-label="Bahasa / Language"><button type="button" data-setlang="id" aria-pressed="true">ID</button><button type="button" data-setlang="en" aria-pressed="false">EN</button></div>` : ""}
    <a class="rp-bar-cta" href="${attr(ctaUrl)}"><span class="cta-long">${ctaText}</span><span class="cta-short" aria-hidden="true">${ctaShort}</span></a>
  </div></header>
  <section class="rp-hero"><div class="rp-wrap${m.cover ? " rp-hero-cover" : ""}"><div class="rp-hero-text">
    <p class="rp-kind"><span>${L2(m.type, typeEn)}</span>${m.series ? `<span>${L2(m.series, m.series_en || m.series)}</span>` : ""}${svc ? `<span>${L2(svc[0], svc[1])}</span>` : ""}</p>
    <h1 class="rp-title">${m.title_en ? L2(m.title_id, m.title_en) : esc(m.title_id)}</h1>
    ${m.subtitle ? `<p class="rp-subtitle">${L2(m.subtitle, m.subtitle_en !== undefined ? m.subtitle_en : m.subtitle)}</p>` : ""}
    ${m.title_en ? `<p class="rp-title-en"><span data-l="id" lang="en">${esc(m.title_en)}</span><span data-l="en" lang="id">${esc(m.title_id)}</span></p>` : ""}
    <ul class="rp-authors">${authors}</ul>
    ${affs.length ? `<ol class="rp-affs">${affs.map(a => `<li>${esc(a)}</li>`).join("")}</ol>` : ""}
  </div>${m.cover ? `<a class="rp-cover" href="${attr(m.cover)}" ${n > 1 ? `${flip} aria-label="Pratinjau ${n} halaman pertama"` : `data-zoom aria-label="Perbesar sampul"`}><img src="${attr(m.thumb || m.cover)}"${m.thumb && m.thumb !== m.cover ? ` srcset="${attr(m.thumb)} 720w, ${attr(m.cover)} 1800w" sizes="(max-width: 960px) 170px, 240px"` : ""} alt="Sampul ${attr(m.title_id)}" width="240" height="339" decoding="async">${n > 1 ? `<span class="rp-cover-tag">${L2(`Pratinjau ${n} halaman`, `Preview ${n} pages`)}</span>` : ""}</a>` : ""}</div></section>
  <section class="rp-front"><div class="rp-wrap rp-front-in">
    <div class="rp-abstracts">
      <section class="rp-abstract" lang="id" data-l="id"><h2>Abstrak</h2><p>${esc(m.abstract_id)}</p></section>
      ${m.abstract_en ? `<section class="rp-abstract" lang="en"><h2>Abstract</h2><p>${esc(m.abstract_en)}</p></section>` : ""}
      ${(m.keywords || []).length ? `<p class="rp-keywords">${L2h("<strong>Kata kunci:</strong> " + m.keywords.map(esc).join(", "), "<strong>Keywords:</strong> " + (m.keywords_en || m.keywords).map(esc).join(", "))}</p>` : ""}
    </div>
    <aside class="rp-meta" aria-label="Informasi publikasi">
      <dl>
        <div><dt>${L2("Terbit", "Published")}</dt><dd><time datetime="${attr(m.date_published)}">${L2(fmtDate(m.date_published), fmtDateEn(m.date_published))}</time>${m.version ? L2(`, versi ${m.version}`, `, version ${m.version}`) : ""}</dd></div>
        ${m.doi ? `<div><dt>DOI</dt><dd><a href="${attr(doiUrl(m.doi))}">${esc(cleanDoi(m.doi))}</a></dd></div>` : ""}
        <div><dt>${L2("Nomor", "Number")}</dt><dd>${m.series ? L2(m.series, m.series_en || m.series) : esc(m.id)}</dd></div>
        ${m.pages ? `<div><dt>${L2("Halaman", "Pages")}</dt><dd>${esc(m.pages)}</dd></div>` : ""}
        <div><dt>${L2("Bahasa", "Language")}</dt><dd>${bilingual ? L2("Indonesia dan Inggris", "Indonesian and English") : (m.language === "en" ? L2("Inggris", "English") : L2("Indonesia", "Indonesian"))}</dd></div>
        ${m.license ? `<div><dt>${L2("Lisensi", "Licence")}</dt><dd class="rp-lic">${ccBadge(m.license, 28) || esc(m.license)}</dd></div>` : ""}
      </dl>
      <div class="rp-actions">
        <a class="rp-btn" href="${attr(ctaUrl)}">${ctaText}</a>
        ${n > 1 ? `<button type="button" class="rp-btn rp-btn-ghost" ${flip}>${L2(`Pratinjau ${n} halaman pertama`, `Preview first ${n} pages`)}</button>` : ""}
        ${m.pdf_summary ? `<a class="rp-btn rp-btn-ghost" href="${attr(m.pdf_summary)}">${L2("Unduh ringkasan (PDF)", "Download summary (PDF)")}</a>` : ""}
        <button type="button" class="rp-btn rp-btn-ghost" data-open-cite>${L2("Kutip", "Cite")}</button>
        <div class="rp-share" data-share-slot data-share-id="${attr(m.id)}"></div>
      </div>
      <p class="rp-stats" data-stats-for="${attr(m.id)}" aria-label="${attr("Statistik / Metrics")}"></p>
      <p class="rp-note">${L2("Versi HTML terbuka untuk dibaca. PDF lengkap diberikan setelah permintaan disetujui admin CHARIS; arsip DOI memuat pratinjau dokumen.", "The HTML version is open to read. The full PDF is shared once a CHARIS admin approves a request; the DOI archive holds a document preview.")}</p>
    </aside>
  </div></section>
  <section class="rp-cite" id="cite" hidden><div class="rp-wrap">
    <h2>${L2("Cara mengutip", "How to cite")}</h2>
    <div class="rp-cite-tabs" role="group" aria-label="Format kutipan">
      <button type="button" data-fmt="apa" aria-pressed="true">APA</button><button type="button" data-fmt="bib" aria-pressed="false">BibTeX</button><button type="button" data-fmt="ris" aria-pressed="false">RIS</button>
    </div>
    <pre class="rp-cite-box" data-fmt-box="apa">${esc(citeAPA(m, url))}</pre>
    <pre class="rp-cite-box" data-fmt-box="bib" hidden>${esc(citeBib(m, url))}</pre>
    <pre class="rp-cite-box" data-fmt-box="ris" hidden>${esc(citeRIS(m, url))}</pre>
    <div class="rp-cite-actions"><button type="button" class="rp-btn rp-btn-ghost" data-copy-cite>${L2("Salin", "Copy")}</button><a class="rp-btn rp-btn-ghost" href="cite.ris" download>${L2("Unduh .ris", "Download .ris")}</a><a class="rp-btn rp-btn-ghost" href="cite.bib" download>${L2("Unduh .bib", "Download .bib")}</a></div>
  </div></section>`;
}

function footBlock(m) {
  return `  <footer class="rp-foot"><div class="rp-wrap rp-foot-in">
    <p><strong>${esc(site.publisher_short)}</strong>, ${esc(site.institution)}, ${esc(site.place)}</p>
    ${ccInfo(m.license) ? `<p class="rp-foot-lic">${ccBadge(m.license, 31)}<span>${L2h(`Karya ini dilisensikan di bawah <a href="${ccInfo(m.license).deed}" rel="license noopener" target="_blank">${esc(ccInfo(m.license).id)}</a>.`, `This work is licensed under a <a href="${ccInfo(m.license).deed}" rel="license noopener" target="_blank">${esc(ccInfo(m.license).en)}</a> licence.`)}</span></p>` : (m.license ? `<p>${L2(`Karya ini dilisensikan di bawah ${m.license}.`, `This work is licensed under ${m.license}.`)}</p>` : "")}
    <p><span class="rp-foot-links"><a href="../../index.html#/research">${L2("Kembali ke Repositori", "Back to the Repository")}</a><a href="../../index.html#/privacy">${L2("Kebijakan Privasi", "Privacy Policy")}</a></span></p>
  </div></footer>
  <script>document.write('<script src="../../assets/js/config.js?t=' + Date.now() + '"><\\/script>');</script>
  <script src="../../assets/js/share.js"></script>
  <script src="../assets/flipbook.js" defer></script>`;
}

/* ---------- browse page (no JavaScript needed) ---------- */
function browsePage(items) {
  const byYear = {};
  items.forEach(i => { (byYear[year(i.date_published)] = byYear[year(i.date_published)] || []).push(i); });
  const years = Object.keys(byYear).sort().reverse();
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Repositori | ${esc(site.publisher_short)}</title>
  <meta name="description" content="Repositori produk pengetahuan ${esc(site.publisher)}: laporan riset, kertas kerja, policy brief, dan panduan sistem kesehatan.">
  <link rel="canonical" href="${attr(BASE)}/repositori/">
  <link rel="icon" href="../assets/img/favicon.ico" sizes="32x32">
  <link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/report.css">
</head>
<body>
  <!-- Dibuat otomatis oleh scripts/build-repo.mjs. Jangan diedit manual. -->
  <header class="rp-bar"><div class="rp-wrap rp-bar-in">
    <a class="rp-brand" href="../index.html"><img src="../assets/img/charis-mark.svg" alt="CHARIS" width="112" height="30"></a>
    <nav class="rp-crumbs" aria-label="Breadcrumb"><a href="../index.html#/research">Repositori interaktif</a></nav>
  </div></header>
  <section class="rp-hero"><div class="rp-wrap"><h1 class="rp-title">Repositori ${esc(site.publisher_short)}</h1>
  <p class="rp-subtitle">Daftar lengkap produk pengetahuan menurut tahun terbit. Untuk pencarian dan filter, buka <a href="../index.html#/research">repositori interaktif</a>.</p></div></section>
  <main class="rp-wrap rp-browse">
${years.map(y => `    <section><h2>${esc(y)}</h2><ul>
${byYear[y].map(i => `      <li><a href="${attr(i.slug)}/">${esc(i.title_id)}</a><span>${esc(authorList(i.authors))}. ${esc(i.type)}, ${esc(fmtDate(i.date_published))}${i.doi ? `. DOI ${esc(cleanDoi(i.doi))}` : ""}</span></li>`).join("\n")}
    </ul></section>`).join("\n")}
  </main>
</body>
</html>
`;
}

/* ---------- main ---------- */
const folders = fs.readdirSync(REPO, { withFileTypes: true }).filter(d => d.isDirectory() && !/^[_.]/.test(d.name) && d.name !== "assets").map(d => d.name).sort();
const items = [], errors = [], ids = new Set();
let changed = 0;
const write = (file, content) => { if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) { fs.writeFileSync(file, content); changed++; } };

for (const slug of folders) {
  const file = path.join(REPO, slug, "index.html");
  if (!fs.existsSync(file)) { errors.push(`${slug}: index.html tidak ada`); continue; }
  let html = fs.readFileSync(file, "utf8");
  const mm = /<script type="application\/json" id="charis-meta">([\s\S]*?)<\/script>/.exec(html);
  if (!mm) { errors.push(`${slug}: blok DATA PRODUK (charis-meta) tidak ditemukan`); continue; }
  let m;
  try { m = JSON.parse(mm[1]); } catch (e) { errors.push(`${slug}: format JSON DATA PRODUK salah (${e.message}). Periksa tanda kutip dan koma.`); continue; }
  const miss = ["id", "type", "title_id", "abstract_id", "date_published"].filter(k => !m[k]);
  if (!Array.isArray(m.authors) || !m.authors.length) miss.push("authors");
  if (miss.length) { errors.push(`${slug}: kolom wajib kosong: ${miss.join(", ")}`); continue; }
  if (TYPE_OLD[m.type]) m.type = TYPE_OLD[m.type];
  if (!TYPE_EN[m.type]) { errors.push(`${slug}: type "${m.type}" tidak dikenal. Pilih salah satu: ${Object.keys(TYPE_EN).join(", ")}`); continue; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date_published)) { errors.push(`${slug}: date_published harus berformat YYYY-MM-DD`); continue; }
  if (ids.has(m.id)) { errors.push(`${slug}: id "${m.id}" sudah dipakai produk lain`); continue; }
  ids.add(m.id);
  if (m.pdf_summary && !fs.existsSync(path.join(REPO, slug, m.pdf_summary))) { /* checked below */ }
  const cv = resolveCover(path.join(REPO, slug), m.cover, m.pdf_summary && fs.existsSync(path.join(REPO, slug, m.pdf_summary)) ? m.pdf_summary : "");
  m.cover = cv.cover; m.thumb = cv.thumb;
  m.preview = resolvePreview(path.join(REPO, slug), m.pdf_summary && fs.existsSync(path.join(REPO, slug, m.pdf_summary)) ? m.pdf_summary : "");
  if (m.pdf_summary && !fs.existsSync(path.join(REPO, slug, m.pdf_summary))) { errors.push(`${slug}: file ringkasan "${m.pdf_summary}" tidak ditemukan`); continue; }
  const url = `${BASE}/repositori/${slug}/`;
  try {
    html = replaceBlock(html, "HEAD", headBlock(m, url, slug));
    html = replaceBlock(html, "BODY", bodyBlock(m, url, slug));
    html = replaceBlock(html, "FOOT", footBlock(m));
  } catch (e) { errors.push(`${slug}: ${e.message}`); continue; }
  write(file, html);
  write(path.join(REPO, slug, "cite.ris"), citeRIS(m, url) + "\n");
  write(path.join(REPO, slug, "cite.bib"), citeBib(m, url) + "\n");
  /* when the product was added to the website: optional "date_added" in DATA PRODUK, otherwise the first git commit */
  const added = /^\d{4}-\d{2}-\d{2}/.test(m.date_added || "") ? (m.date_added.length === 10 ? m.date_added + "T00:00:00Z" : m.date_added) : firstCommitDate(file);
  const uploaded = added.slice(0, 10);
  items.push({
    id: m.id, slug, url: `repositori/${slug}/`, type: m.type, type_en: m.type_en || TYPE_EN[m.type], series: m.series || "", subtitle_id: m.subtitle || "", subtitle_en: m.subtitle_en !== undefined ? m.subtitle_en : (m.subtitle || ""), title_id: m.title_id, title_en: m.title_en || "",
    abstract_id: m.abstract_id, abstract_en: m.abstract_en || "", authors: m.authors.map(a => ({ name: a.name, affiliation: a.affiliation || "" })),
    date_published: m.date_published, uploaded, added, sort_date: m.date_published || uploaded, language: m.language || "id", keywords: m.keywords || [],
    service: m.service || "", project_id: m.project_id || "", doi: cleanDoi(m.doi), license: m.license || "", pages: m.pages || 0, version: m.version || "",
    cover: m.cover ? `repositori/${slug}/${m.cover}` : "", thumb: m.thumb ? `repositori/${slug}/${m.thumb}` : "", preview: m.preview.map(f => `repositori/${slug}/${f}`), pdf_summary: m.pdf_summary ? `repositori/${slug}/${m.pdf_summary}` : "",
    full_pdf: "request", featured: !!m.featured
  });
}

items.sort((a, b) => b.sort_date.localeCompare(a.sort_date) || b.uploaded.localeCompare(a.uploaded));
write(path.join(REPO, "index.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: items.length, items }, null, 2) + "\n");
write(path.join(REPO, "index.html"), browsePage(items));
const urls = [`${BASE}/`, `${BASE}/repositori/`, ...items.map(i => `${BASE}/${i.url}`)];
write(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`);

/* ---------- portfolio covers: portofolio/<PROJECT-ID>/ ---------- */
const PORT = path.join(ROOT, "portofolio");
const pcovers = {};
if (fs.existsSync(PORT)) {
  for (const d of fs.readdirSync(PORT, { withFileTypes: true }).filter(d => d.isDirectory() && !/^[_.]/.test(d.name))) {
    const cv = resolveCover(path.join(PORT, d.name), "", "");
    if (cv.cover) pcovers[d.name] = { cover: `portofolio/${d.name}/${cv.cover}`, thumb: `portofolio/${d.name}/${cv.thumb}` };
  }
  write(path.join(PORT, "index.json"), JSON.stringify({ count: Object.keys(pcovers).length, covers: pcovers }, null, 2) + "\n");
}

console.log(`Produk: ${items.length}. Sampul portofolio: ${Object.keys(pcovers).length}. File berubah: ${changed}.`);
if (warnings.length) console.warn("Peringatan:\n- " + warnings.join("\n- "));
if (errors.length) {
  console.error("\nMASALAH yang perlu diperbaiki:\n- " + errors.join("\n- "));
  process.exitCode = 1;
}
