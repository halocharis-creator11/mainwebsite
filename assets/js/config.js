/* ============================================================
   CHARIS website configuration
   ------------------------------------------------------------
   API_URL: paste the Google Apps Script Web App URL here after
   deployment (ends with /exec). Leave empty to run in DEMO mode
   with sample content (useful for previewing the design).
   ============================================================ */
window.CHARIS_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbz1Vo950aORV0beuoR48apqLzzAALu1J62dcsv3JKA4XzTQmto3-G9BAZRbyVPf1M6wOQ/exec",
  DEFAULT_LANG: "id",          // "id" or "en"
  CONTACT_EMAIL: "halo@charisforhealth.org",   // shown in footer & contact page
  CONTACT_PHONE: "[telepon]",  // leave in [brackets] to hide
  ADDRESS: "Kec. Blahbatuh, Kab. Gianyar, Bali 80581",
  NIB: "1103260087863",
  /* Main photos. Put the files in assets/img/foto/, then fill src, a short description (alt), and the credit.
     The file name must match the file on GitHub exactly, including capital letters, spaces, and .jpeg or .jpg.
     Leave src "" to show the CHARIS block motif instead.
     pos (optional) moves the focus of the photo, for example "center 30%" shows more of the top. */
  PHOTOS: {
    hero:     { src: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.51.20.jpeg", alt: "Kegiatan tim CHARIS", credit: "", credit_url: "" },   // first slide on the home page
    highlight:{ src: "", alt: "", credit: "", credit_url: "" },                                                          // no longer shown on the site
    about:    { src: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.47.09.jpeg", alt: "Kegiatan tim CHARIS", credit: "", credit_url: "" },   // banner on Tentang Kami
    services: { src: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.51.20.jpeg", alt: "Kegiatan tim CHARIS", credit: "", credit_url: "" },   // banner on Layanan Kami
    vision:   { src: "assets/img/foto/WhatsApp Image 2026-11-19 at 18.17.24.jpeg", alt: "", credit: "", credit_url: "" },   // soft backdrop of the vision and mission band
    svc_a:    { src: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.47.09.jpeg", alt: "", credit: "", credit_url: "" },   // backdrop of Analisis Kesehatan on Layanan
    svc_r:    { src: "assets/img/foto/WhatsApp Image 2026-11-19 at 18.47.35.jpeg", alt: "", credit: "", credit_url: "" },   // backdrop of Penelitian dan Pengembangan
    svc_s:    { src: "assets/img/foto/WhatsApp Image 2026-11-19 at 18.48.08.jpeg", alt: "", credit: "", credit_url: "" }    // backdrop of Layanan Kesehatan Terintegrasi
  },
  /* Optional photo for a single service card, for example:
     financing: { src: "assets/img/foto/lokakarya.jpeg", pos: "center" }
     Service codes are listed in assets/img/foto/README.md. */
  SERVICE_PHOTOS: {},
  /* Older setting, still honoured for the highlight photo. */
  HIGHLIGHT_IMAGE: "",
  /* Social media links. Leave "" to hide an icon. */
  SOCIAL: {
    instagram: "",
    linkedin: "",
    youtube: "",
    facebook: "",
    x: ""
  }
};
