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
  CONTACT_EMAIL: "[email]",    // shown in footer & contact page
  CONTACT_PHONE: "[telepon]",
  ADDRESS: "Jalan Gunung Sari, Dusun Tojan, Pering, Blahbatuh, Gianyar, Bali 80581",
  NIB: "1103260087863",
  /* Main photos. Put the files in assets/img/foto/ (see the README there for free, legal sources),
     then fill src, a short description (alt), and the credit the licence asks for.
     Leave src "" to show the CHARIS block motif instead. */
  PHOTOS: {
    hero:      { src: "", alt: "", credit: "", credit_url: "" },   // first slide on the home page
    highlight: { src: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.47.09.jpeg", alt: "", credit: "", credit_url: "" },   // "Pembiayaan kesehatan" highlight on the home page
    about:     { src: "", alt: "", credit: "", credit_url: "" },   // banner on Tentang Kami
    services:  { src: "", alt: "", credit: "", credit_url: "" }    // banner on Layanan Kami
  },
  /* Older setting, still honoured for the highlight photo. */
  HIGHLIGHT_IMAGE: "assets/img/foto/WhatsApp Image 2026-11-18 at 09.47.09.jpeg",
  /* Social media links. Leave "" to hide an icon. */
  SOCIAL: {
    instagram: "",
    linkedin: "",
    youtube: "",
    facebook: "",
    x: ""
  }
};
