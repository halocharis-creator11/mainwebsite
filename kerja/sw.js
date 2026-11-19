/* Ruang Kerja CHARIS: service worker kept minimal on purpose. It lets the app be installed on a phone
   (so a call seen in another app can be shared straight into "Catat peluang") and caches nothing,
   so every visit always uses the latest files and data. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
